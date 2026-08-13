"""Schemas for a user's contact list."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.auth import UserResponse


class ContactCreateRequest(BaseModel):
    user_id: int = Field(gt=0)


class ContactResponse(BaseModel):
    id: int
    created_at: datetime
    user: UserResponse
