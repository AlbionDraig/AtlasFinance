from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryRead
from app.services.finance_service import create_category

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_category_endpoint(
    payload: CategoryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CategoryRead:
    try:
        return create_category(db, current_user.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
