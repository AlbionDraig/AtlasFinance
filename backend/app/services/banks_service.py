"""CRUD de bancos del usuario."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.bank import Bank
from app.schemas.bank import BankCreate, BankUpdate
from app.services._common import (
    ensure_country_code_exists,
    get_user,
    persist_and_refresh,
)


def create_bank(db: Session, user_id: int, payload: BankCreate) -> Bank:
    """Crear un banco propiedad del usuario autenticado."""
    get_user(db, user_id)
    normalized_code = ensure_country_code_exists(db, payload.country_code)
    bank = Bank(name=payload.name, country_code=normalized_code, user_id=user_id)
    return persist_and_refresh(db, bank)


def list_banks(db: Session, user_id: int) -> list[Bank]:
    """Listar bancos del usuario, los más recientes primero."""
    query = select(Bank).where(Bank.user_id == user_id).order_by(Bank.created_at.desc())
    return list(db.scalars(query).all())


def update_bank(db: Session, user_id: int, bank_id: int, payload: BankUpdate) -> Bank:
    """Actualizar nombre y país de un banco propiedad del usuario."""
    bank = db.get(Bank, bank_id)
    if not bank or bank.user_id != user_id:
        raise ValueError("Bank not found")
    normalized_code = ensure_country_code_exists(db, payload.country_code)
    bank.name = payload.name
    bank.country_code = normalized_code
    return persist_and_refresh(db, bank)


def delete_bank(db: Session, user_id: int, bank_id: int) -> None:
    """Eliminar un banco propiedad del usuario."""
    bank = db.get(Bank, bank_id)
    if not bank or bank.user_id != user_id:
        raise ValueError("Bank not found")
    db.delete(bank)
    db.commit()
