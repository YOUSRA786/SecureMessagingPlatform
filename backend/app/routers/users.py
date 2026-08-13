"""Authenticated user-directory endpoints."""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select

from app.dependencies import CurrentUser, DatabaseSession
from app.models import User
from app.schemas.auth import UserResponse


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(current_user: CurrentUser, database_session: DatabaseSession, limit: int = Query(default=50, ge=1, le=100)) -> list[UserResponse]:
    """List other registered users for contact and conversation selection."""

    users = database_session.scalars(
        select(User).where(User.id != current_user.id).order_by(User.display_name, User.username).limit(limit)
    ).all()
    return [UserResponse.model_validate(user) for user in users]


@router.get("/search", response_model=list[UserResponse])
def search_users(current_user: CurrentUser, database_session: DatabaseSession, query: str = Query(min_length=1, max_length=100), limit: int = Query(default=20, ge=1, le=50)) -> list[UserResponse]:
    """Find users by display name, username, or phone number."""

    normalized_query = query.strip()
    if not normalized_query:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Search query cannot be blank")
    pattern = f"%{normalized_query}%"
    users = database_session.scalars(
        select(User).where(User.id != current_user.id, or_(User.username.ilike(pattern), User.display_name.ilike(pattern), User.phone.ilike(pattern))).order_by(User.display_name, User.username).limit(limit)
    ).all()
    return [UserResponse.model_validate(user) for user in users]
