from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.error_handlers import raise_bad_request_from_value_error
from app.db.base import get_db
from app.models.user import User
from app.schemas.bank import BankCreate, BankRead, BankUpdate
from app.services.finance_service import create_bank, list_banks, update_bank, delete_bank

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_bank_endpoint(
    payload: BankCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> BankRead:
    """Create a bank for the authenticated user."""
    try:
        return create_bank(db, current_user.id, payload)
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.get("/")
def list_banks_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[BankRead]:
    """Return all banks owned by the authenticated user."""
    banks = list_banks(db, current_user.id)
    return [BankRead.model_validate(bank) for bank in banks]


@router.put("/{bank_id}", responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}})
def update_bank_endpoint(
    bank_id: int,
    payload: BankUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> BankRead:
    """Update a bank owned by the authenticated user."""
    try:
        return update_bank(db, current_user.id, bank_id, payload)
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.delete("/{bank_id}", status_code=status.HTTP_204_NO_CONTENT, responses={400: {"description": "Bad Request"}})
def delete_bank_endpoint(
    bank_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Delete a bank owned by the authenticated user."""
    try:
        delete_bank(db, current_user.id, bank_id)
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)
