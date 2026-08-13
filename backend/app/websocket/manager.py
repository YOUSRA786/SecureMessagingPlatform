"""A simple WebSocket connection manager for per-user connections and broadcasts.

This manager tracks multiple WebSocket connections per authenticated user id,
allows sending events to individual users, and broadcasting to a list of users.
"""

from __future__ import annotations

import asyncio
import json
from typing import Dict, Set

import logging

from fastapi import WebSocket

logger = logging.getLogger("app.websocket.manager")


class ConnectionManager:
    def __init__(self) -> None:
        # user_id -> set of WebSocket
        self._connections: Dict[int, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        async with self._lock:
            conns = self._connections.setdefault(user_id, set())
            conns.add(websocket)
            logger.debug("WebSocketManager.connect: connected websocket for uid=%s", user_id)

    async def disconnect(self, websocket: WebSocket, user_id: int) -> None:
        async with self._lock:
            conns = self._connections.get(user_id)
            if not conns:
                return
            conns.discard(websocket)
            if not conns:
                # remove empty entry
                del self._connections[user_id]
            logger.debug("WebSocketManager.disconnect: disconnected websocket for uid=%s", user_id)

    async def has_connections(self, user_id: int) -> bool:
        """Return True if the given user_id has one or more active connections."""
        async with self._lock:
            conns = self._connections.get(user_id)
            return bool(conns)

    async def connected_user_ids(self) -> set[int]:
        """Return a snapshot of currently connected user ids."""
        async with self._lock:
            return set(self._connections.keys())

    async def send_personal_event(self, user_id: int, event: dict) -> None:
        conns = self._connections.get(user_id)
        if not conns:
            return
        data = json.dumps(event)
        # Send sequentially so we can remove any failed sockets.
        to_remove: list[WebSocket] = []
        total_sent = 0
        for conn in tuple(conns):
            try:
                await conn.send_text(data)
                total_sent += 1
            except Exception:
                logger.exception("WebSocketManager: error sending personal event to uid=%s", user_id)
                to_remove.append(conn)

        if to_remove:
            async with self._lock:
                cur = self._connections.get(user_id)
                if cur:
                    for c in to_remove:
                        cur.discard(c)
                    if not cur:
                        # remove empty entry
                        del self._connections[user_id]

    async def broadcast_to_users(self, user_ids: set[int], event: dict, exclude_user_ids: set[int] | None = None) -> None:
        if exclude_user_ids is None:
            exclude_user_ids = set()
        data = json.dumps(event)
        # Log the broadcast attempt at debug level and send reliably.
        try:
            logger.debug("WebSocketManager.broadcast_to_users: event=%s targets=%s exclude=%s", event.get("type"), user_ids, exclude_user_ids)
            total_sent = 0
            # Send sequentially so exceptions per socket can be handled and counted.
            to_remove: list[tuple[int, WebSocket]] = []
            for uid in user_ids:
                if uid in exclude_user_ids:
                    continue
                conns = self._connections.get(uid)
                if not conns:
                    logger.debug("WebSocketManager: no connections for uid=%s", uid)
                    continue
                for conn in tuple(conns):
                    try:
                        await conn.send_text(data)
                        total_sent += 1
                    except Exception:
                        logger.exception("WebSocketManager: error sending to uid=%s", uid)
                        to_remove.append((uid, conn))
            # prune failed sockets
            if to_remove:
                async with self._lock:
                    for uid, conn in to_remove:
                        conns = self._connections.get(uid)
                        if not conns:
                            continue
                        conns.discard(conn)
                        if not conns:
                            del self._connections[uid]
            if total_sent:
                logger.debug("WebSocketManager: broadcast complete, total_sent=%d", total_sent)
            else:
                logger.debug("WebSocketManager: broadcast complete, no sockets sent for event %s", event.get("type"))
        except Exception:
            logger.exception("WebSocketManager: unexpected error in broadcast_to_users")


# Single global manager instance used by the app
manager = ConnectionManager()
