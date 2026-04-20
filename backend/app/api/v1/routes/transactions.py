from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionRead
from app.services.finance_service import (
    delete_transaction,
    list_transactions,
    register_transaction,
    update_transaction,
)

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_transaction_endpoint(
    payload: TransactionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TransactionRead:
    """Create a transaction and update account balance accordingly."""
    try:
        return register_transaction(db, current_user.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/")
def list_transactions_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    start_date: Annotated[datetime | None, Query()] = None,
    end_date: Annotated[datetime | None, Query()] = None,
) -> list[TransactionRead]:
    """List user transactions with optional date range filtering."""
    transactions = list_transactions(db, current_user.id, start_date=start_date, end_date=end_date)
    return [TransactionRead.model_validate(t) for t in transactions]


@router.put("/{transaction_id}", responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}})
def update_transaction_endpoint(
    transaction_id: int,
    payload: TransactionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TransactionRead:
    """Update a transaction and keep balances consistent."""
    try:
        return update_transaction(db, current_user.id, transaction_id, payload)
    except ValueError as exc:
        detail = str(exc)
        if detail == "Transaction not found":
            raise HTTPException(status_code=404, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {"description": "Not Found"}})
def delete_transaction_endpoint(
    transaction_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Delete a transaction and reverse its balance effect."""
    try:
        delete_transaction(db, current_user.id, transaction_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
