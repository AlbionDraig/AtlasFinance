"""Endpoints REST para entidades de inversión (banco/broker/exchange).

Se modelan separadas de los bancos porque una entidad puede ser un broker
o exchange que no opera como banco; mantener tablas distintas evita
mezclar dominios y mantiene las consultas específicas (ej. listar exchanges).
"""
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.error_handlers import raise_bad_request_from_value_error
from app.db.base import get_db
from app.models.user import User
from app.schemas.investment_entity import (
    InvestmentEntityCreate,
    InvestmentEntityRead,
    InvestmentEntityUpdate,
)
from app.services.investment_entities_service import (
    create_investment_entity,
    delete_investment_entity,
    list_investment_entities,
    update_investment_entity,
)

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_investment_entity_endpoint(
    payload: InvestmentEntityCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> InvestmentEntityRead:
    """Create an investment entity for the authenticated user."""
    try:
        return InvestmentEntityRead.model_validate(
            create_investment_entity(db, current_user.id, payload)
        )
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.get("/")
def list_investment_entities_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[InvestmentEntityRead]:
    """Return all investment entities owned by the authenticated user."""
    entities = list_investment_entities(db, current_user.id)
    return [InvestmentEntityRead.model_validate(entity) for entity in entities]


@router.put(
    "/{investment_entity_id}",
    responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}},
)
def update_investment_entity_endpoint(
    investment_entity_id: int,
    payload: InvestmentEntityUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> InvestmentEntityRead:
    """Update an investment entity owned by the authenticated user."""
    try:
        return InvestmentEntityRead.model_validate(
            update_investment_entity(db, current_user.id, investment_entity_id, payload)
        )
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.delete(
    "/{investment_entity_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={400: {"description": "Bad Request"}},
)
def delete_investment_entity_endpoint(
    investment_entity_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Delete an investment entity owned by the authenticated user."""
    try:
        delete_investment_entity(db, current_user.id, investment_entity_id)
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)
