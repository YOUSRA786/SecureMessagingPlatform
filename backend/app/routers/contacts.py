"""Authenticated contact-list endpoints."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DatabaseSession
from app.models import Contact, User
from app.schemas.auth import UserResponse
from app.schemas.contacts import ContactCreateRequest, ContactResponse


router = APIRouter(prefix="/contacts", tags=["contacts"])


def to_contact_response(contact: Contact) -> ContactResponse:
    return ContactResponse(id=contact.id, created_at=contact.created_at, user=UserResponse.model_validate(contact.contact_user))


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def add_contact(payload: ContactCreateRequest, current_user: CurrentUser, database_session: DatabaseSession) -> ContactResponse:
    """Add an existing user to the signed-in user's personal contact list."""

    if payload.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot add yourself as a contact")
    contact_user = database_session.get(User, payload.user_id)
    if contact_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    contact = database_session.scalar(select(Contact).where(Contact.owner_id == current_user.id, Contact.contact_user_id == contact_user.id))
    if contact is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a contact")

    contact = Contact(owner_id=current_user.id, contact_user_id=contact_user.id)
    database_session.add(contact)
    database_session.commit()
    database_session.refresh(contact)
    return to_contact_response(contact)


@router.get("", response_model=list[ContactResponse])
def list_contacts(current_user: CurrentUser, database_session: DatabaseSession) -> list[ContactResponse]:
    """Return only contacts owned by the signed-in user."""

    contacts = database_session.scalars(
        select(Contact).where(Contact.owner_id == current_user.id).options(selectinload(Contact.contact_user)).order_by(Contact.created_at.desc())
    ).all()
    return [to_contact_response(contact) for contact in contacts]
