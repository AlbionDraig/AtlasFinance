"""Endpoints REST para pockets (sub-saldos virtuales sobre una cuenta).

Un pocket NO es una cuenta real: representa dinero "apartado" para un
propósito (vacaciones, fondo de emergencia). El servicio garantiza que
mover dinero a un pocket descuenta del saldo disponible de la cuenta
madre y deja registro vía transacción para auditoría.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.error_handlers import raise_bad_request_from_value_error, raise_domain_value_error
from app.db.base import get_db
from app.models.user import User
from app.schemas.pocket import (
    PocketCreate,
    PocketMoveCreate,
    PocketRead,
    PocketUpdate,
    PocketWithdrawCreate,
)
from app.schemas.transaction import TransactionRead
from app.services.pockets_service import (
    create_pocket,
    delete_pocket,
    get_pocket,
    list_pockets,
    move_amount_to_pocket,
    update_pocket,
    withdraw_amount_from_pocket,
)

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}})
def create_pocket_endpoint(
    payload: PocketCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> PocketRead:
    """Create a pocket under an account owned by the authenticated user."""
    try:
        return PocketRead.model_validate(create_pocket(db, current_user.id, payload))
    except ValueError as exc:
        raise_bad_request_from_value_error(exc)


@router.get("/")
def list_pockets_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[PocketRead]:
    """Return all pockets that belong to the authenticated user."""
    pockets = list_pockets(db, current_user.id)
    return [PocketRead.model_validate(pocket) for pocket in pockets]


@router.post("/move-funds", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}})
def move_funds_to_pocket_endpoint(
    payload: PocketMoveCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TransactionRead:
    """Move funds from a user account into a pocket and register expense transaction."""
    try:
        return TransactionRead.model_validate(
            move_amount_to_pocket(db, current_user.id, payload)
        )
    except ValueError as exc:
        raise_domain_value_error(exc, not_found_messages={"Pocket not found"})


@router.post("/withdraw", status_code=status.HTTP_201_CREATED, responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}})
def withdraw_from_pocket_endpoint(
    payload: PocketWithdrawCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TransactionRead:
    """Withdraw funds from a pocket back into the account balance and register income transaction."""
    try:
        return TransactionRead.model_validate(
            withdraw_amount_from_pocket(db, current_user.id, payload)
        )
    except ValueError as exc:
        raise_domain_value_error(exc, not_found_messages={"Pocket not found"})


@router.get("/{pocket_id}", responses={404: {"description": "Not Found"}})
def get_pocket_endpoint(
    pocket_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> PocketRead:
    """Return a single pocket owned by the authenticated user."""
    try:
        return PocketRead.model_validate(get_pocket(db, current_user.id, pocket_id))
    except ValueError as exc:
        raise_domain_value_error(exc, not_found_messages={"Pocket not found"})


@router.put("/{pocket_id}", responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}})
def update_pocket_endpoint(
    pocket_id: int,
    payload: PocketUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> PocketRead:
    """Update a pocket owned by the authenticated user."""
    try:
        return PocketRead.model_validate(
            update_pocket(db, current_user.id, pocket_id, payload)
        )
    except ValueError as exc:
        raise_domain_value_error(exc, not_found_messages={"Pocket not found"})


@router.delete("/{pocket_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {"description": "Not Found"}})
def delete_pocket_endpoint(
    pocket_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Delete a pocket owned by the authenticated user."""
    try:
        delete_pocket(db, current_user.id, pocket_id)
    except ValueError as exc:
        raise_domain_value_error(exc, not_found_messages={"Pocket not found"})
