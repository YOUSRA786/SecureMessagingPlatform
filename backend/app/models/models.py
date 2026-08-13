"""SQLAlchemy entities for users, contacts, conversations, and message state."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ConversationRole, ConversationType, DeliveryStatus

if TYPE_CHECKING:
    pass


def utc_now() -> datetime:
    """Return a timezone-aware UTC timestamp for Python-side defaults."""

    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    is_online: Mapped[bool] = mapped_column(default=False, nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    memberships: Mapped[list[ConversationMember]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sent_messages: Mapped[list[Message]] = relationship(back_populates="sender", foreign_keys="Message.sender_id")
    message_statuses: Mapped[list[MessageStatus]] = relationship(back_populates="user", cascade="all, delete-orphan")
    contacts: Mapped[list[Contact]] = relationship(
        back_populates="owner", foreign_keys="Contact.owner_id", cascade="all, delete-orphan"
    )
    added_by_contacts: Mapped[list[Contact]] = relationship(back_populates="contact_user", foreign_keys="Contact.contact_user_id")
    created_conversations: Mapped[list[Conversation]] = relationship(back_populates="creator", foreign_keys="Conversation.created_by_id")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_type: Mapped[ConversationType] = mapped_column(Enum(ConversationType, native_enum=False, length=20), nullable=False)
    title: Mapped[str | None] = mapped_column(String(120))
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    creator: Mapped[User | None] = relationship(back_populates="created_conversations", foreign_keys=[created_by_id])
    members: Mapped[list[ConversationMember]] = relationship(back_populates="conversation", cascade="all, delete-orphan")
    messages: Mapped[list[Message]] = relationship(back_populates="conversation", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_conversations_type_updated_at", "conversation_type", "updated_at"),
    )


class ConversationMember(Base):
    __tablename__ = "conversation_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[ConversationRole] = mapped_column(Enum(ConversationRole, native_enum=False, length=20), default=ConversationRole.MEMBER, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now(), nullable=False)
    last_read_message_id: Mapped[int | None] = mapped_column(ForeignKey("messages.id", ondelete="SET NULL"))

    conversation: Mapped[Conversation] = relationship(back_populates="members")
    user: Mapped[User] = relationship(back_populates="memberships")
    last_read_message: Mapped[Message | None] = relationship(foreign_keys=[last_read_message_id])

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="conversation_member"),
        Index("ix_conversation_members_user_conversation", "user_id", "conversation_id"),
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(String(30), default="text", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now(), nullable=False)
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    conversation: Mapped[Conversation] = relationship(back_populates="messages")
    sender: Mapped[User] = relationship(back_populates="sent_messages", foreign_keys=[sender_id])
    statuses: Mapped[list[MessageStatus]] = relationship(back_populates="message", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_messages_conversation_created_at", "conversation_id", "created_at"),
        Index("ix_messages_sender_created_at", "sender_id", "created_at"),
    )


class MessageStatus(Base):
    __tablename__ = "message_statuses"

    id: Mapped[int] = mapped_column(primary_key=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[DeliveryStatus] = mapped_column(Enum(DeliveryStatus, native_enum=False, length=20), default=DeliveryStatus.SENDING, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    message: Mapped[Message] = relationship(back_populates="statuses")
    user: Mapped[User] = relationship(back_populates="message_statuses")

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="message_status_recipient"),
        Index("ix_message_statuses_user_status", "user_id", "status"),
    )


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    contact_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now(), nullable=False)

    owner: Mapped[User] = relationship(back_populates="contacts", foreign_keys=[owner_id])
    contact_user: Mapped[User] = relationship(back_populates="added_by_contacts", foreign_keys=[contact_user_id])

    __table_args__ = (
        UniqueConstraint("owner_id", "contact_user_id", name="contact_owner_user"),
        CheckConstraint("owner_id != contact_user_id", name="not_self"),
        Index("ix_contacts_owner_created_at", "owner_id", "created_at"),
    )
