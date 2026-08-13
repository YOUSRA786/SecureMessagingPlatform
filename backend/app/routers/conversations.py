"""Authenticated direct and group conversation endpoints."""

from fastapi import APIRouter, HTTPException, status
from fastapi import Response
import asyncio
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.dependencies import CurrentUser, DatabaseSession
from app.models import Conversation, ConversationMember, Message, User
from app.models.enums import ConversationRole, ConversationType
from app.schemas.auth import UserResponse
from app.schemas.conversations import (
    ConversationMemberResponse,
    ConversationResponse,
    DirectConversationCreateRequest,
    GroupConversationCreateRequest,
    AddConversationMemberRequest,
    UpdateConversationMemberRoleRequest,
)
from app.websocket.manager import manager


router = APIRouter(prefix="/conversations", tags=["conversations"])


def get_membership_or_404(session: Session, user_id: int, conversation_id: int) -> ConversationMember:
    """Load membership, returning 404 so private conversation IDs are not exposed."""

    membership = session.scalar(
        select(ConversationMember)
        .where(ConversationMember.conversation_id == conversation_id, ConversationMember.user_id == user_id)
        .options(selectinload(ConversationMember.conversation).selectinload(Conversation.members).selectinload(ConversationMember.user))
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return membership


def get_latest_message(session: Session, conversation_id: int) -> Message | None:
    return session.scalar(select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.desc(), Message.id.desc()).limit(1))


def count_unread_messages(session: Session, membership: ConversationMember) -> int:
    # Only count messages not authored by the membership user.
    if membership.last_read_message_id is None:
        return session.scalar(
            select(func.count())
            .select_from(Message)
            .where(Message.conversation_id == membership.conversation_id, Message.sender_id != membership.user_id)
        ) or 0
    last_read = session.get(Message, membership.last_read_message_id)
    if last_read is None:
        return 0
    return session.scalar(
        select(func.count())
        .select_from(Message)
        .where(Message.conversation_id == membership.conversation_id, Message.created_at > last_read.created_at, Message.sender_id != membership.user_id)
    ) or 0


def to_member_response(member: ConversationMember) -> ConversationMemberResponse:
    return ConversationMemberResponse(user=UserResponse.model_validate(member.user), role=member.role, joined_at=member.joined_at, last_read_message_id=member.last_read_message_id)


def to_conversation_response(session: Session, conversation: Conversation, membership: ConversationMember) -> ConversationResponse:
    latest_message = get_latest_message(session, conversation.id)
    return ConversationResponse(
        id=conversation.id,
        conversation_type=conversation.conversation_type,
        title=conversation.title,
        created_by_id=conversation.created_by_id,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        latest_message_at=latest_message.created_at if latest_message else None,
        last_message_preview=latest_message.content if latest_message else None,
        unread_count=count_unread_messages(session, membership),
        members=[to_member_response(member) for member in conversation.members],
    )


def find_direct_conversation(session: Session, first_user_id: int, second_user_id: int) -> Conversation | None:
    """Find a direct conversation whose member set exactly matches two users."""

    expected_member_ids = {first_user_id, second_user_id}
    candidates = session.scalars(select(Conversation).where(Conversation.conversation_type == ConversationType.DIRECT).options(selectinload(Conversation.members))).all()
    for conversation in candidates:
        if {member.user_id for member in conversation.members} == expected_member_ids:
            return conversation
    return None


@router.get("", response_model=list[ConversationResponse])
def list_conversations(current_user: CurrentUser, database_session: DatabaseSession) -> list[ConversationResponse]:
    """List the signed-in user's conversations by latest message activity."""

    latest_activity = (
        select(
            Message.conversation_id.label("conversation_id"),
            func.max(Message.created_at).label("latest_message_at"),
        )
        .group_by(Message.conversation_id)
        .subquery()
    )
    conversations = database_session.scalars(
        select(Conversation)
        .join(ConversationMember)
        .outerjoin(latest_activity, latest_activity.c.conversation_id == Conversation.id)
        .where(ConversationMember.user_id == current_user.id)
        .options(selectinload(Conversation.members).selectinload(ConversationMember.user))
        .order_by(latest_activity.c.latest_message_at.desc(), Conversation.updated_at.desc())
    ).unique().all()
    memberships = {member.conversation_id: member for member in database_session.scalars(select(ConversationMember).where(ConversationMember.user_id == current_user.id)).all()}
    return [to_conversation_response(database_session, conversation, memberships[conversation.id]) for conversation in conversations]


@router.post("/direct", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_direct_conversation(payload: DirectConversationCreateRequest, current_user: CurrentUser, database_session: DatabaseSession) -> ConversationResponse:
    """Create or return the single direct chat shared by two users."""

    if payload.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot create a conversation with yourself")
    other_user = database_session.get(User, payload.user_id)
    if other_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    conversation = find_direct_conversation(database_session, current_user.id, other_user.id)
    if conversation is None:
        conversation = Conversation(conversation_type=ConversationType.DIRECT, created_by_id=current_user.id)
        database_session.add(conversation)
        database_session.flush()
        database_session.add_all([ConversationMember(conversation_id=conversation.id, user_id=current_user.id), ConversationMember(conversation_id=conversation.id, user_id=other_user.id)])
        database_session.commit()
    membership = get_membership_or_404(database_session, current_user.id, conversation.id)
    return to_conversation_response(database_session, membership.conversation, membership)


@router.post("/group", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_group_conversation(payload: GroupConversationCreateRequest, current_user: CurrentUser, database_session: DatabaseSession) -> ConversationResponse:
    """Create a group and make its creator the first group admin."""

    if current_user.id in payload.member_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Do not include yourself in member_ids")
    users = database_session.scalars(select(User).where(User.id.in_(payload.member_ids))).all()
    missing_ids = sorted(set(payload.member_ids) - {user.id for user in users})
    if missing_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Users not found: {missing_ids}")
    conversation = Conversation(conversation_type=ConversationType.GROUP, title=payload.title, created_by_id=current_user.id)
    database_session.add(conversation)
    database_session.flush()
    database_session.add(ConversationMember(conversation_id=conversation.id, user_id=current_user.id, role=ConversationRole.ADMIN))
    database_session.add_all([ConversationMember(conversation_id=conversation.id, user_id=user.id) for user in users])
    database_session.commit()
    membership = get_membership_or_404(database_session, current_user.id, conversation.id)
    return to_conversation_response(database_session, membership.conversation, membership)


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: int, current_user: CurrentUser, database_session: DatabaseSession) -> ConversationResponse:
    """Fetch a conversation only when the requester is a member."""

    membership = get_membership_or_404(database_session, current_user.id, conversation_id)
    return to_conversation_response(database_session, membership.conversation, membership)


@router.get("/{conversation_id}/members", response_model=list[ConversationMemberResponse])
def list_conversation_members(conversation_id: int, current_user: CurrentUser, database_session: DatabaseSession) -> list[ConversationMemberResponse]:
    """Return members for a conversation that the requester belongs to."""

    membership = get_membership_or_404(database_session, current_user.id, conversation_id)
    return [to_member_response(member) for member in membership.conversation.members]


@router.post("/{conversation_id}/members", response_model=ConversationMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_conversation_member(conversation_id: int, payload: AddConversationMemberRequest, current_user: CurrentUser, database_session: DatabaseSession) -> ConversationMemberResponse:
    """Add a user to a group conversation. Requester must be an admin."""
    membership = get_membership_or_404(database_session, current_user.id, conversation_id)
    conversation = membership.conversation
    if conversation.conversation_type != ConversationType.GROUP:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Conversation is not a group")
    if membership.role != ConversationRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only group admins may add members")

    target_user = database_session.get(User, payload.user_id)
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = database_session.scalar(select(ConversationMember).where(ConversationMember.conversation_id == conversation_id, ConversationMember.user_id == payload.user_id))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member")

    new_member = ConversationMember(conversation_id=conversation_id, user_id=payload.user_id)
    database_session.add(new_member)
    database_session.commit()

    # reload the member with relationships
    database_session.refresh(new_member)
    # prepare broadcast payloads (serialize primitive data before releasing session)
    user_payload = UserResponse.model_validate(target_user).model_dump()
    event = {"type": "group.member_added", "data": {"conversation_id": conversation_id, "user": user_payload}}
    # broadcast to all current members (including the newly added user)
    user_ids = {m.user_id for m in conversation.members} | {payload.user_id}
    # await broadcast for determinism
    await manager.broadcast_to_users(user_ids, event)
    return to_member_response(new_member)


@router.delete("/{conversation_id}/members/{user_id}")
async def remove_conversation_member(conversation_id: int, user_id: int, current_user: CurrentUser, database_session: DatabaseSession) -> Response:
    """Remove a member from a group. Requester must be an admin. Handle self-removal carefully."""
    membership = get_membership_or_404(database_session, current_user.id, conversation_id)
    conversation = membership.conversation
    if conversation.conversation_type != ConversationType.GROUP:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Conversation is not a group")

    # Ensure target membership exists
    target_membership = database_session.scalar(select(ConversationMember).where(ConversationMember.conversation_id == conversation_id, ConversationMember.user_id == user_id))
    if target_membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # Only admins may remove other members
    if membership.role != ConversationRole.ADMIN:
        # allow member to remove themselves (leave) if they are not attempting to remove someone else
        if current_user.id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only group admins may remove members")

    # If removing self and an admin, ensure not the last admin
    if target_membership.user_id == current_user.id and target_membership.role == ConversationRole.ADMIN:
        # count admins
        admin_count = database_session.scalar(select(func.count()).select_from(ConversationMember).where(ConversationMember.conversation_id == conversation_id, ConversationMember.role == ConversationRole.ADMIN)) or 0
        if admin_count <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove yourself as the last admin")

    # If removing another admin, ensure we don't leave zero admins
    if target_membership.user_id != current_user.id and target_membership.role == ConversationRole.ADMIN:
        admin_count = database_session.scalar(select(func.count()).select_from(ConversationMember).where(ConversationMember.conversation_id == conversation_id, ConversationMember.role == ConversationRole.ADMIN)) or 0
        if admin_count <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the last admin")

    # perform removal
    database_session.delete(target_membership)
    database_session.commit()

    # broadcast removal
    event = {"type": "group.member_removed", "data": {"conversation_id": conversation_id, "user_id": user_id}}
    user_ids = {m.user_id for m in conversation.members} - {user_id}
    # include removed user so they learn they've been removed
    user_ids = user_ids | {user_id}
    await manager.broadcast_to_users(user_ids, event)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{conversation_id}/members/{user_id}", response_model=ConversationMemberResponse)
async def update_conversation_member_role(conversation_id: int, user_id: int, payload: UpdateConversationMemberRoleRequest, current_user: CurrentUser, database_session: DatabaseSession) -> ConversationMemberResponse:
    """Promote or demote a member's role. Only admins may change roles; cannot remove last admin."""
    membership = get_membership_or_404(database_session, current_user.id, conversation_id)
    conversation = membership.conversation
    if conversation.conversation_type != ConversationType.GROUP:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Conversation is not a group")
    if membership.role != ConversationRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only group admins may update roles")

    target_membership = database_session.scalar(select(ConversationMember).where(ConversationMember.conversation_id == conversation_id, ConversationMember.user_id == user_id))
    if target_membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # If demoting an admin, ensure not the last admin
    if target_membership.role == ConversationRole.ADMIN and payload.role != ConversationRole.ADMIN:
        admin_count = database_session.scalar(select(func.count()).select_from(ConversationMember).where(ConversationMember.conversation_id == conversation_id, ConversationMember.role == ConversationRole.ADMIN)) or 0
        if admin_count <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove last admin")

    target_membership.role = payload.role
    database_session.add(target_membership)
    database_session.commit()
    database_session.refresh(target_membership)

    # broadcast role update
    event = {"type": "group.member_role_updated", "data": {"conversation_id": conversation_id, "user_id": user_id, "role": payload.role}}
    user_ids = {m.user_id for m in conversation.members}
    await manager.broadcast_to_users(user_ids, event)
    return to_member_response(target_membership)
