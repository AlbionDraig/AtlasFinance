from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.error_handlers import raise_domain_value_error
from app.db.base import get_db
from app.models.user import User
from app.schemas.investment import InvestmentCreate, InvestmentRead, InvestmentUpdate
from app.services.finance_service import (
    create_investment,
    delete_investment,
    get_investment,
    list_investments,
    update_investment,
)

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_investment_endpoint(
    payload: InvestmentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> InvestmentRead:
    """Register a new investment for the authenticated user."""
    try:
        return create_investment(db, current_user.id, payload)
    except ValueError as exc:
        raise_domain_value_error(exc, not_found_messages=set())


@router.get("/")
def list_investments_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[InvestmentRead]:
    """Return all investments belonging to the authenticated user."""
    investments = list_investments(db, current_user.id)
    return [InvestmentRead.model_validate(inv) for inv in investments]


@router.get("/{investment_id}", responses={404: {"description": "Not Found"}})
def get_investment_endpoint(
    investment_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> InvestmentRead:
    """Return a single investment owned by the authenticated user."""
    try:
        return get_investment(db, current_user.id, investment_id)
    except ValueError as exc:
        raise_domain_value_error(exc, not_found_messages={"Investment not found"})


@router.put("/{investment_id}", responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}})
def update_investment_endpoint(
    investment_id: int,
    payload: InvestmentUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> InvestmentRead:
    """Update an investment owned by the authenticated user."""
    try:
        return update_investment(db, current_user.id, investment_id, payload)
    except ValueError as exc:
        raise_domain_value_error(exc, not_found_messages={"Investment not found"})


@router.delete("/{investment_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {"description": "Not Found"}})
def delete_investment_endpoint(
    investment_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Delete an investment owned by the authenticated user."""
    try:
        delete_investment(db, current_user.id, investment_id)
    except ValueError as exc:
        raise_domain_value_error(exc, not_found_messages={"Investment not found"})
