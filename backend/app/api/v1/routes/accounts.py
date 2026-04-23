from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.error_handlers import raise_bad_request_from_value_error
from app.api.deps import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.account import AccountCreate, AccountRead
from app.services.finance_service import create_account, list_accounts

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_account_endpoint(
    payload: AccountCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AccountRead:
    """Create an account linked to a bank owned by the current user."""
    try:
        return create_account(db, current_user.id, payload)
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.get("/")
def list_accounts_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[AccountRead]:
    """Return all accounts that belong to the authenticated user."""
    accounts = list_accounts(db, current_user.id)
    return [AccountRead.model_validate(account) for account in accounts]
