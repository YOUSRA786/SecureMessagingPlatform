"""Schemas for conversation creation, lists, and membership details."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import ConversationRole, ConversationType
from app.schemas.auth import UserResponse


class DirectConversationCreateRequest(BaseModel):
    user_id: int = Field(gt=0)


class GroupConversationCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    member_ids: list[int] = Field(min_length=1, max_length=99)

    @field_validator("member_ids")
    @classmethod
    def member_ids_must_be_unique(cls, values: list[int]) -> list[int]:
        if any(value <= 0 for value in values):
            raise ValueError("Member IDs must be positive")
        if len(values) != len(set(values)):
            raise ValueError("A group member may only be included once")
        return values

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Group title cannot be blank")
        return value


class ConversationMemberResponse(BaseModel):
    user: UserResponse
    role: ConversationRole
    joined_at: datetime
    last_read_message_id: int | None


class ConversationResponse(BaseModel):
    id: int
    conversation_type: ConversationType
    title: str | None
    created_by_id: int | None
    created_at: datetime
    updated_at: datetime
    latest_message_at: datetime | None
    last_message_preview: str | None
    unread_count: int
    members: list[ConversationMemberResponse]
