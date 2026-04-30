"""CRUD de inversiones del usuario."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.investment import Investment
from app.models.investment_entity import InvestmentEntity
from app.schemas.investment import InvestmentCreate, InvestmentUpdate
from app.services._common import persist_and_refresh


def create_investment(db: Session, user_id: int, payload: InvestmentCreate) -> Investment:
    """Registrar una nueva inversión asociada a una entidad propia del usuario."""
    entity = db.get(InvestmentEntity, payload.investment_entity_id)
    if not entity or entity.user_id != user_id:
        raise ValueError("Invalid investment entity for user")

    investment = Investment(
        name=payload.name,
        instrument_type=payload.instrument_type,
        amount_invested=payload.amount_invested,
        current_value=payload.current_value,
        currency=payload.currency,
        investment_entity_id=payload.investment_entity_id,
        started_at=payload.started_at,
        user_id=user_id,
    )
    return persist_and_refresh(db, investment)


def list_investments(db: Session, user_id: int) -> list[Investment]:
    """Listar todas las inversiones del usuario."""
    query = (
        select(Investment)
        .where(Investment.user_id == user_id)
        .order_by(Investment.started_at.desc())
    )
    return list(db.scalars(query).all())


def get_investment(db: Session, user_id: int, investment_id: int) -> Investment:
    """Recuperar una inversión propiedad del usuario."""
    investment = db.get(Investment, investment_id)
    if not investment or investment.user_id != user_id:
        raise ValueError("Investment not found")
    return investment


def update_investment(
    db: Session, user_id: int, investment_id: int, payload: InvestmentUpdate
) -> Investment:
    """Actualizar metadatos de una inversión propiedad del usuario."""
    investment = db.get(Investment, investment_id)
    if not investment or investment.user_id != user_id:
        raise ValueError("Investment not found")

    entity = db.get(InvestmentEntity, payload.investment_entity_id)
    if not entity or entity.user_id != user_id:
        raise ValueError("Invalid investment entity for user")

    investment.name = payload.name
    investment.instrument_type = payload.instrument_type
    investment.current_value = payload.current_value
    investment.investment_entity_id = payload.investment_entity_id
    investment.started_at = payload.started_at
    return persist_and_refresh(db, investment)


def delete_investment(db: Session, user_id: int, investment_id: int) -> None:
    """Eliminar una inversión propiedad del usuario."""
    investment = db.get(Investment, investment_id)
    if not investment or investment.user_id != user_id:
        raise ValueError("Investment not found")
    db.delete(investment)
    db.commit()
