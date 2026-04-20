from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.pocket import PocketCreate, PocketRead
from app.services.finance_service import create_pocket

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_pocket_endpoint(
    payload: PocketCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> PocketRead:
    try:
        return create_pocket(db, current_user.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
