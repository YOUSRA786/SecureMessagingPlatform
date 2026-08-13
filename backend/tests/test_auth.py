"""Integration tests for the assignment authentication flow."""

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


def test_register_creates_user_and_returns_access_token() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/auth/register",
            json={
                "username": "alice",
                "password": "strong-password",
                "otp": "123456",
                "display_name": "Alice",
            },
        )

    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["username"] == "alice"
    assert "password_hash" not in body["user"]


def test_login_and_me_accept_phone_identifier() -> None:
    with TestClient(app) as client:
        registration = client.post(
            "/auth/register",
            json={"phone": "+919876543210", "password": "strong-password", "otp": "123456"},
        )
        assert registration.status_code == 201

        login = client.post(
            "/auth/login",
            json={"identifier": "+919876543210", "password": "strong-password"},
        )
        assert login.status_code == 200

        me = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {login.json()['access_token']}"},
        )

    assert me.status_code == 200
    assert me.json()["phone"] == "+919876543210"


def test_register_rejects_an_invalid_otp() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/auth/register",
            json={"username": "eve", "password": "strong-password", "otp": "000000"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid development OTP"
