"""REST endpoints for budget management.

This layer is intentionally thin: only translates HTTP ↔ services.
Business logic (spending calculations, status determination) lives in budgets_service.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.error_handlers import (
    raise_bad_request_from_value_error,
)
from app.db.base import get_db
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetListResponse, BudgetRead, BudgetUpdate
from app.services.budgets_service import (
    create_budget,
    delete_budget,
    get_budget_with_spending,
    list_budgets_by_month,
    update_budget,
)

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_budget_endpoint(
    payload: BudgetCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> BudgetRead:
    """Create a monthly budget for a category."""
    try:
        budget = create_budget(db, current_user.id, payload)
        result = get_budget_with_spending(db, current_user.id, budget.id)
        return BudgetRead(
            id=result["budget"].id,
            category_id=result["budget"].category_id,
            year=result["budget"].year,
            month=result["budget"].month,
            amount_limit=result["budget"].amount_limit,
            current_spent=result["current_spent"],
            remaining=result["remaining"],
            status=result["status"],
        )
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.get("/{year}/{month}")
def list_budgets_by_month_endpoint(
    year: Annotated[int, Path(ge=2020, le=2100)],
    month: Annotated[int, Path(ge=1, le=12)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> BudgetListResponse:
    """Get all budgets for a specific month."""
    result = list_budgets_by_month(db, current_user.id, year, month)
    budgets = [
        BudgetRead(
            id=b["id"],
            category_id=b["category_id"],
            year=b["year"],
            month=b["month"],
            amount_limit=b["amount_limit"],
            current_spent=b["current_spent"],
            remaining=b["remaining"],
            status=b["status"],
        )
        for b in result["budgets"]
    ]
    return BudgetListResponse(
        year=result["year"],
        month=result["month"],
        budgets=budgets,
        total_limit=result["total_limit"],
        total_spent=result["total_spent"],
    )


@router.put("/{budget_id}", responses={400: {"description": "Bad Request"}})
def update_budget_endpoint(
    budget_id: int,
    payload: BudgetUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> BudgetRead:
    """Update a budget amount limit."""
    try:
        budget = update_budget(db, current_user.id, budget_id, payload)
        result = get_budget_with_spending(db, current_user.id, budget.id)
        return BudgetRead(
            id=result["budget"].id,
            category_id=result["budget"].category_id,
            year=result["budget"].year,
            month=result["budget"].month,
            amount_limit=result["budget"].amount_limit,
            current_spent=result["current_spent"],
            remaining=result["remaining"],
            status=result["status"],
        )
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT, responses={400: {"description": "Bad Request"}})
def delete_budget_endpoint(
    budget_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Delete a budget."""
    try:
        delete_budget(db, current_user.id, budget_id)
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)
