from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.error_handlers import raise_bad_request_from_value_error
from app.db.base import get_db
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryRead
from app.services.finance_service import create_category, list_categories

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_category_endpoint(
    payload: CategoryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CategoryRead:
    """Create a spending category for the authenticated user."""
    try:
        return create_category(db, current_user.id, payload)
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.get("/")
def list_categories_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[CategoryRead]:
    """Return categories that belong to the authenticated user."""
    categories = list_categories(db, current_user.id)
    return [CategoryRead.model_validate(category) for category in categories]
