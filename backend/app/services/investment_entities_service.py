"""CRUD de entidades de inversión."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.investment_entity import InvestmentEntity
from app.schemas.investment_entity import (
    InvestmentEntityCreate,
    InvestmentEntityUpdate,
)
from app.services._common import (
    ensure_country_code_exists,
    get_user,
    persist_and_refresh,
)


def create_investment_entity(
    db: Session, user_id: int, payload: InvestmentEntityCreate
) -> InvestmentEntity:
    """Crear una entidad de inversión propiedad del usuario."""
    get_user(db, user_id)
    normalized_code = ensure_country_code_exists(db, payload.country_code)
    entity = InvestmentEntity(
        name=payload.name,
        entity_type=payload.entity_type,
        country_code=normalized_code,
        user_id=user_id,
    )
    return persist_and_refresh(db, entity)


def list_investment_entities(db: Session, user_id: int) -> list[InvestmentEntity]:
    """Listar entidades de inversión del usuario, las más recientes primero."""
    query = (
        select(InvestmentEntity)
        .where(InvestmentEntity.user_id == user_id)
        .order_by(InvestmentEntity.created_at.desc())
    )
    return list(db.scalars(query).all())


def update_investment_entity(
    db: Session,
    user_id: int,
    investment_entity_id: int,
    payload: InvestmentEntityUpdate,
) -> InvestmentEntity:
    """Actualizar una entidad de inversión propiedad del usuario."""
    entity = db.get(InvestmentEntity, investment_entity_id)
    if not entity or entity.user_id != user_id:
        raise ValueError("Investment entity not found")
    normalized_code = ensure_country_code_exists(db, payload.country_code)
    entity.name = payload.name
    entity.entity_type = payload.entity_type
    entity.country_code = normalized_code
    return persist_and_refresh(db, entity)


def delete_investment_entity(db: Session, user_id: int, investment_entity_id: int) -> None:
    """Eliminar una entidad de inversión propiedad del usuario."""
    entity = db.get(InvestmentEntity, investment_entity_id)
    if not entity or entity.user_id != user_id:
        raise ValueError("Investment entity not found")
    db.delete(entity)
    db.commit()
