"""Schemas for persisted conversation messages and delivery state."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import DeliveryStatus
from app.schemas.auth import UserResponse


class MessageCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=10_000)
    content_type: str = Field(default="text", min_length=1, max_length=30)

    @field_validator("content")
    @classmethod
    def content_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message content cannot be blank")
        return value


class MessageStatusResponse(BaseModel):
    user: UserResponse
    status: DeliveryStatus
    sent_at: datetime | None
    delivered_at: datetime | None
    read_at: datetime | None


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    content: str
    content_type: str
    created_at: datetime
    edited_at: datetime | None
    sender: UserResponse
    statuses: list[MessageStatusResponse]


class MessagePageResponse(BaseModel):
    messages: list[MessageResponse]
    next_before_message_id: int | None
