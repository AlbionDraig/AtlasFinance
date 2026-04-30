"""Endpoints REST para el catálogo global de países.

A diferencia de bancos/cuentas, los países son globales: se muestran en
selects de bancos/entidades. Por eso los endpoints son compartidos entre
todos los usuarios autenticados.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.error_handlers import raise_bad_request_from_value_error
from app.db.base import get_db
from app.models.user import User
from app.schemas.country import CountryCreate, CountryRead, CountryUpdate
from app.services.finance_service import (
    create_country,
    delete_country,
    list_countries,
    update_country,
)

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_country_endpoint(
    payload: CountryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CountryRead:
    """Create a global country entry."""
    try:
        return CountryRead.model_validate(create_country(db, payload))
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.get("/")
def list_countries_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[CountryRead]:
    """Return all global countries."""
    countries = list_countries(db)
    return [CountryRead.model_validate(country) for country in countries]


@router.put("/{country_id}", responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}})
def update_country_endpoint(
    country_id: int,
    payload: CountryUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CountryRead:
    """Update a global country entry."""
    try:
        return CountryRead.model_validate(update_country(db, country_id, payload))
    except ValueError as exc:
        detail = str(exc)
        # Detectamos "not found" por substring porque finance_service usa mensajes
        # variados ("Country not found", "Country with id X not found"). Mantener
        # esta normalización aquí evita acoplar los servicios a códigos HTTP.
        if "not found" in detail.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc
        raise_bad_request_from_value_error(exc)


@router.delete("/{country_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {"description": "Not Found"}})
def delete_country_endpoint(
    country_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Delete a global country entry."""
    try:
        delete_country(db, country_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc