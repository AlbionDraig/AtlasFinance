from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.bank import BankCreate, BankRead
from app.services.finance_service import create_bank

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_bank_endpoint(
    payload: BankCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> BankRead:
    try:
        return create_bank(db, current_user.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
