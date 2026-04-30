"""CRUD de entidades de inversión."""
from sqlalchemy.orm import Session

from app.models.investment_entity import InvestmentEntity
from app.repositories.investment_entities import InvestmentEntityRepository
from app.schemas.investment_entity import (
    InvestmentEntityCreate,
    InvestmentEntityUpdate,
)
from app.services._common import ensure_country_code_exists, get_user


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
    return InvestmentEntityRepository(db).add(entity)


def list_investment_entities(db: Session, user_id: int) -> list[InvestmentEntity]:
    """Listar entidades de inversión del usuario, las más recientes primero."""
    return InvestmentEntityRepository(db).list_by_user(user_id)


def update_investment_entity(
    db: Session,
    user_id: int,
    investment_entity_id: int,
    payload: InvestmentEntityUpdate,
) -> InvestmentEntity:
    """Actualizar una entidad de inversión propiedad del usuario."""
    repo = InvestmentEntityRepository(db)
    entity = repo.get_owned(user_id, investment_entity_id)
    if entity is None:
        raise ValueError("Investment entity not found")
    normalized_code = ensure_country_code_exists(db, payload.country_code)
    entity.name = payload.name
    entity.entity_type = payload.entity_type
    entity.country_code = normalized_code
    return repo.commit_refresh(entity)


def delete_investment_entity(db: Session, user_id: int, investment_entity_id: int) -> None:
    """Eliminar una entidad de inversión propiedad del usuario."""
    repo = InvestmentEntityRepository(db)
    entity = repo.get_owned(user_id, investment_entity_id)
    if entity is None:
        raise ValueError("Investment entity not found")
    repo.delete(entity)
