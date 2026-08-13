"""Idempotent local-development data for the Signal Clone demo."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.database import SessionLocal, initialize_database
from app.models import Contact, Conversation, ConversationMember, Message, MessageStatus, User
from app.models.enums import ConversationRole, ConversationType, DeliveryStatus
from app.security import hash_password


DEMO_PASSWORD = "demo-password"


@dataclass(frozen=True)
class MessageSeed:
    sender: str
    content: str
    age: timedelta
    recipient_statuses: dict[str, DeliveryStatus]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_or_create_user(
    session: Session,
    *,
    username: str,
    display_name: str,
    phone: str,
    is_online: bool,
    last_seen_at: datetime | None,
) -> User:
    user = session.scalar(select(User).where(User.username == username))
    if user is None:
        user = User(
            username=username,
            display_name=display_name,
            phone=phone,
            email=f"{username}@demo.local",
            password_hash=hash_password(DEMO_PASSWORD),
            is_online=is_online,
            last_seen_at=last_seen_at,
        )
        session.add(user)
        session.flush()
    return user


def get_or_create_contact(session: Session, owner: User, contact: User) -> None:
    existing = session.scalar(
        select(Contact).where(Contact.owner_id == owner.id, Contact.contact_user_id == contact.id)
    )
    if existing is None:
        session.add(Contact(owner_id=owner.id, contact_user_id=contact.id))


def get_or_create_direct_conversation(session: Session, first: User, second: User) -> Conversation:
    """Find a direct chat with exactly these two members, or create it."""

    direct_conversations = session.scalars(
        select(Conversation).where(Conversation.conversation_type == ConversationType.DIRECT)
    ).all()
    expected_members = {first.id, second.id}
    for conversation in direct_conversations:
        member_ids = {member.user_id for member in conversation.members}
        if member_ids == expected_members:
            return conversation

    conversation = Conversation(conversation_type=ConversationType.DIRECT, created_by_id=first.id)
    session.add(conversation)
    session.flush()
    session.add_all(
        [
            ConversationMember(conversation_id=conversation.id, user_id=first.id),
            ConversationMember(conversation_id=conversation.id, user_id=second.id),
        ]
    )
    session.flush()
    return conversation


def get_or_create_group_conversation(
    session: Session, title: str, creator: User, members: Iterable[User]
) -> Conversation:
    conversation = session.scalar(
        select(Conversation).where(
            Conversation.conversation_type == ConversationType.GROUP,
            Conversation.title == title,
        )
    )
    if conversation is not None:
        return conversation

    conversation = Conversation(
        conversation_type=ConversationType.GROUP,
        title=title,
        created_by_id=creator.id,
    )
    session.add(conversation)
    session.flush()
    for member in members:
        session.add(
            ConversationMember(
                conversation_id=conversation.id,
                user_id=member.id,
                role=ConversationRole.ADMIN if member.id == creator.id else ConversationRole.MEMBER,
            )
        )
    session.flush()
    return conversation


def get_or_create_message(
    session: Session,
    conversation: Conversation,
    sender: User,
    content: str,
    created_at: datetime,
) -> Message:
    """Seed messages by a stable natural key to make reruns duplicate-free."""

    message = session.scalar(
        select(Message).where(
            Message.conversation_id == conversation.id,
            Message.sender_id == sender.id,
            Message.content == content,
        )
    )
    if message is None:
        message = Message(
            conversation_id=conversation.id,
            sender_id=sender.id,
            content=content,
            created_at=created_at,
        )
        session.add(message)
        session.flush()
    return message


def set_message_status(
    session: Session, message: Message, user: User, delivery_status: DeliveryStatus
) -> None:
    status_record = session.scalar(
        select(MessageStatus).where(
            MessageStatus.message_id == message.id,
            MessageStatus.user_id == user.id,
        )
    )
    if status_record is None:
        status_record = MessageStatus(message_id=message.id, user_id=user.id)
        session.add(status_record)

    status_record.status = delivery_status
    status_record.sent_at = message.created_at
    if delivery_status in {DeliveryStatus.DELIVERED, DeliveryStatus.READ}:
        status_record.delivered_at = message.created_at + timedelta(seconds=2)
    if delivery_status == DeliveryStatus.READ:
        status_record.read_at = message.created_at + timedelta(minutes=1)


def seed_messages(
    session: Session,
    conversation: Conversation,
    users: dict[str, User],
    messages: list[MessageSeed],
) -> list[Message]:
    seeded_messages: list[Message] = []
    now = utc_now()
    for seed in messages:
        message = get_or_create_message(
            session,
            conversation,
            users[seed.sender],
            seed.content,
            now - seed.age,
        )
        for recipient_name, delivery_status in seed.recipient_statuses.items():
            set_message_status(session, message, users[recipient_name], delivery_status)
        seeded_messages.append(message)
    return seeded_messages


def set_last_read_message(
    session: Session, conversation: Conversation, user: User, message: Message | None
) -> None:
    membership = session.scalar(
        select(ConversationMember).where(
            ConversationMember.conversation_id == conversation.id,
            ConversationMember.user_id == user.id,
        )
    )
    if membership is not None:
        membership.last_read_message_id = message.id if message else None


def seed_database() -> dict[str, int]:
    """Populate the configured database with an interview-demo-friendly dataset."""

    initialize_database()
    now = utc_now()
    with SessionLocal.begin() as session:
        users = {
            "yousra": get_or_create_user(
                session,
                username="yousra",
                display_name="Yousra",
                phone="+919876500001",
                is_online=True,
                last_seen_at=None,
            ),
            "alex": get_or_create_user(
                session,
                username="alex",
                display_name="Alex",
                phone="+919876500002",
                is_online=True,
                last_seen_at=None,
            ),
            "sarah": get_or_create_user(
                session,
                username="sarah",
                display_name="Sarah",
                phone="+919876500003",
                is_online=False,
                last_seen_at=now - timedelta(minutes=18),
            ),
            "john": get_or_create_user(
                session,
                username="john",
                display_name="John",
                phone="+919876500004",
                is_online=False,
                last_seen_at=now - timedelta(hours=3),
            ),
            "david": get_or_create_user(
                session,
                username="david",
                display_name="David",
                phone="+919876500005",
                is_online=False,
                last_seen_at=now - timedelta(days=1, hours=2),
            ),
        }

        for contact_name in ("alex", "sarah", "john", "david"):
            get_or_create_contact(session, users["yousra"], users[contact_name])
        get_or_create_contact(session, users["alex"], users["yousra"])
        get_or_create_contact(session, users["alex"], users["sarah"])
        get_or_create_contact(session, users["sarah"], users["yousra"])
        get_or_create_contact(session, users["john"], users["yousra"])

        yousra_alex = get_or_create_direct_conversation(session, users["yousra"], users["alex"])
        alex_messages = seed_messages(
            session,
            yousra_alex,
            users,
            [
                MessageSeed("yousra", "Hey Alex, are we still on for the design review?", timedelta(days=2), {"alex": DeliveryStatus.READ}),
                MessageSeed("alex", "Absolutely. I have the wireframes ready.", timedelta(days=2, minutes=-4), {"yousra": DeliveryStatus.READ}),
                MessageSeed("yousra", "Great — I will bring the API notes too.", timedelta(days=1, hours=5), {"alex": DeliveryStatus.READ}),
                MessageSeed("alex", "Perfect. See you at 3 PM!", timedelta(minutes=12), {"yousra": DeliveryStatus.DELIVERED}),
            ],
        )
        set_last_read_message(session, yousra_alex, users["yousra"], alex_messages[-2])
        set_last_read_message(session, yousra_alex, users["alex"], alex_messages[-1])

        yousra_sarah = get_or_create_direct_conversation(session, users["yousra"], users["sarah"])
        sarah_messages = seed_messages(
            session,
            yousra_sarah,
            users,
            [
                MessageSeed("sarah", "Do you have the interview prep notes?", timedelta(days=1, hours=8), {"yousra": DeliveryStatus.READ}),
                MessageSeed("yousra", "Yes, I will send the system-design checklist.", timedelta(days=1, hours=7, minutes=50), {"sarah": DeliveryStatus.READ}),
                MessageSeed("sarah", "Thank you! That will help a lot.", timedelta(hours=6), {"yousra": DeliveryStatus.READ}),
            ],
        )
        set_last_read_message(session, yousra_sarah, users["yousra"], sarah_messages[-1])
        set_last_read_message(session, yousra_sarah, users["sarah"], sarah_messages[-1])

        yousra_john = get_or_create_direct_conversation(session, users["yousra"], users["john"])
        john_messages = seed_messages(
            session,
            yousra_john,
            users,
            [
                MessageSeed("john", "The database schema looks solid.", timedelta(days=3), {"yousra": DeliveryStatus.READ}),
                MessageSeed("yousra", "Thanks! I am adding indexes for the chat list now.", timedelta(days=2, hours=20), {"john": DeliveryStatus.SENT}),
            ],
        )
        set_last_read_message(session, yousra_john, users["yousra"], john_messages[-1])
        set_last_read_message(session, yousra_john, users["john"], john_messages[0])

        weekend_group = get_or_create_group_conversation(
            session,
            "Weekend Plans",
            users["yousra"],
            [users["yousra"], users["alex"], users["sarah"], users["david"]],
        )
        group_messages = seed_messages(
            session,
            weekend_group,
            users,
            [
                MessageSeed("yousra", "Should we plan a Saturday brunch?", timedelta(hours=30), {"alex": DeliveryStatus.READ, "sarah": DeliveryStatus.READ, "david": DeliveryStatus.DELIVERED}),
                MessageSeed("alex", "I am in. The new cafe near the park looks great.", timedelta(hours=29, minutes=45), {"yousra": DeliveryStatus.READ, "sarah": DeliveryStatus.READ, "david": DeliveryStatus.DELIVERED}),
                MessageSeed("sarah", "Saturday at 11 works for me.", timedelta(hours=27), {"yousra": DeliveryStatus.READ, "alex": DeliveryStatus.READ, "david": DeliveryStatus.DELIVERED}),
                MessageSeed("david", "I will confirm tomorrow morning.", timedelta(minutes=40), {"yousra": DeliveryStatus.READ, "alex": DeliveryStatus.DELIVERED, "sarah": DeliveryStatus.DELIVERED}),
            ],
        )
        set_last_read_message(session, weekend_group, users["yousra"], group_messages[-1])
        set_last_read_message(session, weekend_group, users["alex"], group_messages[-2])
        set_last_read_message(session, weekend_group, users["sarah"], group_messages[-2])
        set_last_read_message(session, weekend_group, users["david"], group_messages[-1])

    with SessionLocal() as session:
        return {
            "users": session.scalar(select(func.count()).select_from(User)) or 0,
            "contacts": session.scalar(select(func.count()).select_from(Contact)) or 0,
            "conversations": session.scalar(select(func.count()).select_from(Conversation)) or 0,
            "messages": session.scalar(select(func.count()).select_from(Message)) or 0,
            "message_statuses": session.scalar(select(func.count()).select_from(MessageStatus)) or 0,
        }


def main() -> None:
    summary = seed_database()
    print("Seed complete:", ", ".join(f"{name}={count}" for name, count in summary.items()))


if __name__ == "__main__":
    main()
