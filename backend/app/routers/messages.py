"""Authenticated message history and creation endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DatabaseSession
from app.models import ConversationMember, Message, MessageStatus
from app.models.enums import DeliveryStatus
from app.routers.conversations import get_membership_or_404
from app.schemas.auth import UserResponse
from app.schemas.messages import MessageCreateRequest, MessagePageResponse, MessageResponse, MessageStatusResponse


router = APIRouter(prefix="/conversations", tags=["messages"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_message_response(message: Message) -> MessageResponse:
    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        content=message.content,
        content_type=message.content_type,
        created_at=message.created_at,
        edited_at=message.edited_at,
        sender=UserResponse.model_validate(message.sender),
        statuses=[
            MessageStatusResponse(
                user=UserResponse.model_validate(message_status.user),
                status=message_status.status,
                sent_at=message_status.sent_at,
                delivered_at=message_status.delivered_at,
                read_at=message_status.read_at,
            )
            for message_status in message.statuses
        ],
    )


def message_with_relations(database_session: DatabaseSession, message_id: int) -> Message:
    message = database_session.scalar(
        select(Message)
        .where(Message.id == message_id)
        .options(selectinload(Message.sender), selectinload(Message.statuses).selectinload(MessageStatus.user))
    )
    if message is None:  # Defensive: the message was just persisted in this request.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return message


@router.get("/{conversation_id}/messages", response_model=MessagePageResponse)
def list_messages(
    conversation_id: int,
    current_user: CurrentUser,
    database_session: DatabaseSession,
    before_message_id: int | None = Query(default=None, gt=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> MessagePageResponse:
    """Return a chronological page of messages for a conversation member."""

    get_membership_or_404(database_session, current_user.id, conversation_id)
    filters = [Message.conversation_id == conversation_id]
    if before_message_id is not None:
        cursor = database_session.scalar(
            select(Message).where(Message.id == before_message_id, Message.conversation_id == conversation_id)
        )
        if cursor is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message pagination cursor not found")
        filters.append(
            or_(
                Message.created_at < cursor.created_at,
                and_(Message.created_at == cursor.created_at, Message.id < cursor.id),
            )
        )

    newest_first = database_session.scalars(
        select(Message)
        .where(*filters)
        .options(selectinload(Message.sender), selectinload(Message.statuses).selectinload(MessageStatus.user))
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(limit + 1)
    ).unique().all()
    has_more = len(newest_first) > limit
    page = newest_first[:limit]
    next_before_message_id = page[-1].id if has_more and page else None
    return MessagePageResponse(
        messages=[to_message_response(message) for message in reversed(page)],
        next_before_message_id=next_before_message_id,
    )


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: int,
    payload: MessageCreateRequest,
    current_user: CurrentUser,
    database_session: DatabaseSession,
) -> MessageResponse:
    """Persist a message and initialise a sent status for every recipient."""

    membership = get_membership_or_404(database_session, current_user.id, conversation_id)
    now = utc_now()
    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=payload.content,
        content_type=payload.content_type,
        created_at=now,
    )
    database_session.add(message)
    database_session.flush()

    recipients = [member for member in membership.conversation.members if member.user_id != current_user.id]
    database_session.add_all(
        [
            MessageStatus(
                message_id=message.id,
                user_id=recipient.user_id,
                status=DeliveryStatus.SENT,
                sent_at=now,
            )
            for recipient in recipients
        ]
    )
    # This drives conversation-list ordering even before WebSocket delivery is added.
    membership.conversation.updated_at = now
    database_session.commit()
    return to_message_response(message_with_relations(database_session, message.id))
