"""WebSocket endpoint and runtime event handling for real-time messaging."""

from __future__ import annotations

from datetime import datetime, timezone
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jwt import InvalidTokenError

from app.websocket.manager import manager
from sqlalchemy import select
from app.security import decode_access_token
from app.database import SessionLocal
from app.models import User, MessageStatus, Message, ConversationMember
from app.models.enums import DeliveryStatus


router = APIRouter()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    user_id: int | None = None
    # Expect initial auth message: {"type":"auth","data":{"token":"..."}}
    try:
        init = await websocket.receive_text()
        try:
            payload = json.loads(init)
        except Exception:
            await websocket.close(code=4001)
            return
        if not isinstance(payload, dict) or payload.get("type") != "auth":
            await websocket.close(code=4002)
            return
        token = payload.get("data", {}).get("token")
        if not token:
            await websocket.close(code=4003)
            return
        # validate token
        try:
            claims = decode_access_token(token)
        except Exception:
            await websocket.close(code=4401)
            return
        user_id = int(str(claims["sub"]))

        # register connection
        await manager.connect(websocket, user_id)

        # mark user online in DB
        with SessionLocal.begin() as session:
            user = session.get(User, user_id)
            if user:
                user.is_online = True
                user.last_seen_at = None
                session.add(user)
                # capture primitive fields before the session closes to avoid lazy-load
                broadcast_user_id = user_id
                broadcast_last_seen = None

        # broadcast presence update to all currently connected users (use captured primitives)
        connected_user_ids = await manager.connected_user_ids()
        if connected_user_ids and 'broadcast_user_id' in locals():
            await manager.broadcast_to_users(connected_user_ids, {"type": "presence.update", "data": {"user_id": broadcast_user_id, "is_online": True, "last_seen_at": broadcast_last_seen}})

        # Main receive loop
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
            except Exception:
                continue
            if not isinstance(msg, dict) or "type" not in msg:
                continue
            typ = msg["type"]
            data = msg.get("data") or {}

            # Handle delivered
            if typ == "message.delivered":
                message_id = data.get("message_id")
                if not message_id:
                    continue
                now = utc_now()
                with SessionLocal.begin() as session:
                    status = session.scalar(
                        select(MessageStatus).where(MessageStatus.message_id == message_id, MessageStatus.user_id == user_id)
                    )
                    if status is not None and status.status != DeliveryStatus.DELIVERED:
                        status.status = DeliveryStatus.DELIVERED
                        status.delivered_at = now
                        session.add(status)
                        # notify conversation members
                        # capture message and member ids while session is open
                        message = session.get(Message, message_id)
                        if message:
                            member_user_ids = {m.user_id for m in session.scalars(select(ConversationMember).where(ConversationMember.conversation_id == message.conversation_id)).all()}
                        else:
                            member_user_ids = set()
                    else:
                        member_user_ids = set()
                if member_user_ids:
                    await manager.broadcast_to_users(member_user_ids, {"type": "message.status_update", "data": {"message_id": message_id, "user_id": user_id, "status": "delivered", "delivered_at": now.isoformat()}})

            # Handle read: expects {conversation_id, last_read_message_id}
            elif typ == "message.read":
                conversation_id = data.get("conversation_id")
                last_read_message_id = data.get("last_read_message_id")
                now = utc_now()
                if not conversation_id or not last_read_message_id:
                    continue
                with SessionLocal.begin() as session:
                    # update membership last_read_message_id
                    membership = session.scalar(
                        select(ConversationMember).where(ConversationMember.conversation_id == conversation_id, ConversationMember.user_id == user_id)
                    )
                    if membership:
                        membership.last_read_message_id = last_read_message_id
                        session.add(membership)
                    # Update MessageStatus rows for this user up to the provided message id
                    cursor = session.get(Message, last_read_message_id)
                    if cursor:
                        msgs = session.scalars(
                            select(Message).where(Message.conversation_id == conversation_id, Message.created_at <= cursor.created_at).order_by(Message.created_at)
                        ).all()
                        updated_ids = []
                        for m in msgs:
                            status = session.scalar(select(MessageStatus).where(MessageStatus.message_id == m.id, MessageStatus.user_id == user_id))
                            if status and status.status != DeliveryStatus.READ:
                                status.status = DeliveryStatus.READ
                                status.read_at = now
                                session.add(status)
                                updated_ids.append(m.id)
                        if updated_ids:
                            member_user_ids = {m.user_id for m in session.scalars(select(ConversationMember).where(ConversationMember.conversation_id == conversation_id)).all()}
                        else:
                            member_user_ids = set()
                if updated_ids:
                    await manager.broadcast_to_users(member_user_ids, {"type": "message.status_update", "data": {"message_ids": updated_ids, "user_id": user_id, "status": "read", "read_at": now.isoformat()}})

            # Typing events
            elif typ in {"typing.start", "typing.stop"}:
                conversation_id = data.get("conversation_id")
                if not conversation_id:
                    continue
                # send to other members of the conversation
                with SessionLocal.begin() as session:
                    member_user_ids = {m.user_id for m in session.scalars(select(ConversationMember).where(ConversationMember.conversation_id == conversation_id)).all()}
                    # exclude sender
                    member_user_ids.discard(user_id)
                    await manager.broadcast_to_users(member_user_ids, {"type": typ, "data": {"conversation_id": conversation_id, "user_id": user_id}})

    except WebSocketDisconnect:
        pass
    finally:
        if user_id is not None:
            # disconnect
            await manager.disconnect(websocket, user_id)
            # if user has no remaining connections, mark offline
            if not await manager.has_connections(user_id):
                with SessionLocal.begin() as session:
                    user = session.get(User, user_id)
                    if user:
                        user.is_online = False
                        ts = utc_now()
                        user.last_seen_at = ts
                        session.add(user)
                        # capture primitives for broadcasting after session exit
                        offline_user_id = user_id
                        offline_last_seen_iso = ts.isoformat()

                # broadcast presence update using captured primitives
                connected_ids = set(getattr(manager, "_connections", {}).keys())
                if connected_ids and 'offline_user_id' in locals():
                    await manager.broadcast_to_users(connected_ids, {"type": "presence.update", "data": {"user_id": offline_user_id, "is_online": False, "last_seen_at": offline_last_seen_iso}})
