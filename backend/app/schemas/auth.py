"""Request and response schemas for assignment authentication."""

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_]{3,50}$")
PHONE_PATTERN = re.compile(r"^\+?[1-9]\d{7,14}$")


class RegisterRequest(BaseModel):
    username: str | None = None
    phone: str | None = None
    password: str = Field(min_length=8, max_length=128)
    otp: str = Field(min_length=4, max_length=12)
    display_name: str | None = Field(default=None, min_length=1, max_length=100)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str | None) -> str | None:
        if value is not None and not USERNAME_PATTERN.fullmatch(value):
            raise ValueError("Username must contain 3-50 letters, numbers, or underscores")
        return value.lower() if value else value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is not None and not PHONE_PATTERN.fullmatch(value):
            raise ValueError("Phone must be in international format, for example +919876543210")
        return value

    @model_validator(mode="after")
    def require_identity(self) -> "RegisterRequest":
        if not self.username and not self.phone:
            raise ValueError("Provide a username or phone number")
        return self


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    phone: str | None
    display_name: str
    avatar_url: str | None
    is_online: bool
    last_seen_at: datetime | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LogoutResponse(BaseModel):
    message: str
