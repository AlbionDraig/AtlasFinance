from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.error_handlers import raise_bad_request_from_value_error
from app.api.deps import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.bank import BankCreate, BankRead
from app.services.finance_service import create_bank, list_banks

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
