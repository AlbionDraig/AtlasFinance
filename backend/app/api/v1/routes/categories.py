from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.error_handlers import raise_bad_request_from_value_error
from app.db.base import get_db
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.services.categories_service import (
    create_category,
    delete_category,
    list_categories,
    update_category,
)

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_category_endpoint(
    payload: CategoryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CategoryRead:
    """Create a global spending category."""
    try:
        return CategoryRead.model_validate(create_category(db, payload))
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.get("/")
def list_categories_endpoint(
    db: Annotated[Session, Depends(get_db)],
) -> list[CategoryRead]:
    """Return all global categories (public catalog — no auth required)."""
    # Read access is intentionally public because categories are global/shared.
    categories = list_categories(db)
    return [CategoryRead.model_validate(category) for category in categories]


@router.put("/{category_id}", responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}})
def update_category_endpoint(
    category_id: int,
    payload: CategoryUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CategoryRead:
    """Update a global category."""
    try:
        return CategoryRead.model_validate(update_category(db, category_id, payload))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {"description": "Not Found"}})
def delete_category_endpoint(
    category_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Delete a global category."""
    try:
        delete_category(db, category_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
