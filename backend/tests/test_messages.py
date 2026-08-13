"""Integration tests for persisted, access-controlled conversation messages."""

import os

os.environ["DATABASE_URL"] = "sqlite:///./test_signal_clone.db"
os.environ["AUTH_SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"
os.environ["DEV_OTP"] = "123456"

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def register(client: TestClient, username: str) -> tuple[dict, dict[str, str]]:
    response = client.post(
        "/auth/register",
        json={"username": username, "password": "strong-password", "otp": "123456"},
    )
    assert response.status_code == 201
    payload = response.json()
    return payload["user"], {"Authorization": f"Bearer {payload['access_token']}"}


def test_send_and_retrieve_messages_chronologically() -> None:
    with TestClient(app) as client:
        alice, alice_headers = register(client, "alice")
        bob, bob_headers = register(client, "bob")
        direct = client.post("/conversations/direct", json={"user_id": bob["id"]}, headers=alice_headers)
        conversation_id = direct.json()["id"]

        first = client.post(
            f"/conversations/{conversation_id}/messages",
            json={"content": "First message"},
            headers=alice_headers,
        )
        second = client.post(
            f"/conversations/{conversation_id}/messages",
            json={"content": "Second message"},
            headers=bob_headers,
        )
        assert first.status_code == 201
        assert second.status_code == 201
        assert first.json()["sender"]["id"] == alice["id"]
        assert first.json()["statuses"][0]["status"] == "sent"
        assert first.json()["created_at"]

        history = client.get(f"/conversations/{conversation_id}/messages", headers=alice_headers)
        conversation_list = client.get("/conversations", headers=alice_headers)

    assert history.status_code == 200
    assert [message["content"] for message in history.json()["messages"]] == ["First message", "Second message"]
    assert history.json()["messages"][1]["sender"]["id"] == bob["id"]
    assert conversation_list.json()[0]["last_message_preview"] == "Second message"


def test_non_member_cannot_send_or_read_messages() -> None:
    with TestClient(app) as client:
        _, alice_headers = register(client, "alice")
        bob, _ = register(client, "bob")
        _, charlie_headers = register(client, "charlie")
        direct = client.post("/conversations/direct", json={"user_id": bob["id"]}, headers=alice_headers)
        conversation_id = direct.json()["id"]

        send = client.post(
            f"/conversations/{conversation_id}/messages",
            json={"content": "Not allowed"},
            headers=charlie_headers,
        )
        history = client.get(f"/conversations/{conversation_id}/messages", headers=charlie_headers)

    assert send.status_code == 404
    assert history.status_code == 404
