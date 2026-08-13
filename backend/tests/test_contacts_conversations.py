"""Integration tests for authenticated contacts and conversations."""

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
    body = response.json()
    return body["user"], {"Authorization": f"Bearer {body['access_token']}"}


def test_contacts_direct_conversations_and_private_access() -> None:
    with TestClient(app) as client:
        alice, alice_headers = register(client, "alice")
        bob, bob_headers = register(client, "bob")
        charlie, charlie_headers = register(client, "charlie")

        assert client.get("/users").status_code == 401
        users = client.get("/users/search", params={"query": "bo"}, headers=alice_headers)
        assert users.status_code == 200
        assert [user["username"] for user in users.json()] == ["bob"]

        added_contact = client.post("/contacts", json={"user_id": bob["id"]}, headers=alice_headers)
        assert added_contact.status_code == 201
        contacts = client.get("/contacts", headers=alice_headers)
        assert contacts.status_code == 200
        assert contacts.json()[0]["user"]["id"] == bob["id"]

        direct = client.post("/conversations/direct", json={"user_id": bob["id"]}, headers=alice_headers)
        assert direct.status_code == 201
        conversation_id = direct.json()["id"]
        assert {member["user"]["id"] for member in direct.json()["members"]} == {alice["id"], bob["id"]}

        assert client.get(f"/conversations/{conversation_id}", headers=bob_headers).status_code == 200
        assert client.get(f"/conversations/{conversation_id}", headers=charlie_headers).status_code == 404
        assert client.post("/conversations/direct", json={"user_id": bob["id"]}, headers=alice_headers).json()["id"] == conversation_id


def test_group_creator_is_admin_and_members_can_view_members() -> None:
    with TestClient(app) as client:
        alice, alice_headers = register(client, "alice")
        bob, bob_headers = register(client, "bob")
        charlie, _ = register(client, "charlie")

        response = client.post(
            "/conversations/group",
            json={"title": "Project Team", "member_ids": [bob["id"], charlie["id"]]},
            headers=alice_headers,
        )
        assert response.status_code == 201
        conversation_id = response.json()["id"]
        roles = {member["user"]["id"]: member["role"] for member in response.json()["members"]}
        assert roles[alice["id"]] == "admin"
        assert roles[bob["id"]] == "member"

        members = client.get(f"/conversations/{conversation_id}/members", headers=bob_headers)
        assert members.status_code == 200
        assert len(members.json()) == 3
