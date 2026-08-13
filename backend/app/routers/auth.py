"""Development authentication endpoints using a fixed mock OTP."""

from sqlalchemy import or_, select
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from app.config import get_settings
from app.dependencies import CurrentUser, DatabaseSession, bearer_scheme
from app.models import User
from app.schemas.auth import LoginRequest, LogoutResponse, RegisterRequest, TokenResponse, UserResponse
from app.security import create_access_token, hash_password, revoke_access_token, verify_password


router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, database_session: DatabaseSession) -> TokenResponse:
    """Register a user after validating the fixed local-development OTP."""

    if payload.otp != get_settings().dev_otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid development OTP")

    username = payload.username or f"user_{''.join(character for character in payload.phone or '' if character.isdigit())}"
    identity_filters = [User.username == username]
    if payload.phone:
        identity_filters.append(User.phone == payload.phone)
    existing_user = database_session.scalar(select(User).where(or_(*identity_filters)))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username or phone is already registered")

    # The original schema includes email for future account recovery. The assignment
    # supports username/phone-only registration, so a non-routable placeholder keeps
    # older local databases compatible until a formal migration is added.
    user = User(
        username=username,
        phone=payload.phone,
        email=f"{username}@local.invalid",
        display_name=payload.display_name or payload.username or payload.phone or "Signal user",
        password_hash=hash_password(payload.password),
    )
    database_session.add(user)
    database_session.commit()
    database_session.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id), user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, database_session: DatabaseSession) -> TokenResponse:
    """Authenticate with either a username or a phone number."""

    identifier = payload.identifier.lower()
    user = database_session.scalar(
        select(User).where(or_(User.username == identifier, User.phone == payload.identifier))
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(user.id), user=UserResponse.model_validate(user))


@router.post("/logout", response_model=LogoutResponse)
def logout(
    current_user: CurrentUser,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> LogoutResponse:
    """Revoke the current access token in this local development process."""

    del current_user
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    revoke_access_token(credentials.credentials)
    return LogoutResponse(message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: CurrentUser) -> UserResponse:
    """Return the profile represented by the current bearer token."""

    return UserResponse.model_validate(current_user)
