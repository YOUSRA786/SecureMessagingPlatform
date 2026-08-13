"""Database enums shared by the messaging models."""

from enum import StrEnum


class ConversationType(StrEnum):
    DIRECT = "direct"
    GROUP = "group"


class ConversationRole(StrEnum):
    MEMBER = "member"
    ADMIN = "admin"


class DeliveryStatus(StrEnum):
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
