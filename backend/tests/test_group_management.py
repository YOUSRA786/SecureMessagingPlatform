"""Tests for group member management endpoints."""

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


def test_admin_adds_and_removes_member() -> None:
    with TestClient(app) as client:
        alice, alice_headers = register(client, "alice")
        bob, bob_headers = register(client, "bob")
        charlie, charlie_headers = register(client, "charlie")

        # Alice creates group with Bob
        resp = client.post("/conversations/group", json={"title": "Team", "member_ids": [bob["id"]]}, headers=alice_headers)
        assert resp.status_code == 201
        conv = resp.json()
        conv_id = conv["id"]

        # Alice (admin) adds Charlie
        add = client.post(f"/conversations/{conv_id}/members", json={"user_id": charlie["id"]}, headers=alice_headers)
        assert add.status_code == 201
        member = add.json()
        assert member["user"]["id"] == charlie["id"]

        # Charlie now appears in member list
        members = client.get(f"/conversations/{conv_id}/members", headers=charlie_headers)
        assert members.status_code == 200
        ids = {m["user"]["id"] for m in members.json()}
        assert charlie["id"] in ids

        # Charlie can fetch conversation
        assert client.get(f"/conversations/{conv_id}", headers=charlie_headers).status_code == 200

        # Alice removes Charlie
        rem = client.delete(f"/conversations/{conv_id}/members/{charlie['id']}", headers=alice_headers)
        assert rem.status_code == 204

        # Charlie no longer in members
        members = client.get(f"/conversations/{conv_id}/members", headers=alice_headers)
        ids = {m["user"]["id"] for m in members.json()}
        assert charlie["id"] not in ids


def test_non_admin_cannot_add_or_remove() -> None:
    with TestClient(app) as client:
        alice, alice_headers = register(client, "alice")
        bob, bob_headers = register(client, "bob")
        charlie, charlie_headers = register(client, "charlie")

        # Alice creates group with Bob
        resp = client.post("/conversations/group", json={"title": "Team2", "member_ids": [bob["id"]]}, headers=alice_headers)
        assert resp.status_code == 201
        conv_id = resp.json()["id"]

        # Bob (not admin) attempts to add Charlie
        add = client.post(f"/conversations/{conv_id}/members", json={"user_id": charlie["id"]}, headers=bob_headers)
        assert add.status_code == 403

        # Bob attempts to remove Alice
        rem = client.delete(f"/conversations/{conv_id}/members/{alice['id']}", headers=bob_headers)
        assert rem.status_code == 403
