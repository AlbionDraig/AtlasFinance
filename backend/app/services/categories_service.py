"""CRUD del catálogo global de categorías."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.services._common import persist_and_refresh


def create_category(db: Session, payload: CategoryCreate) -> Category:
    """Crear una nueva categoría global."""
    category = Category(
        name=payload.name,
        description=payload.description,
        is_fixed=payload.is_fixed,
    )
    return persist_and_refresh(db, category)


def update_category(db: Session, category_id: int, payload: CategoryUpdate) -> Category:
    """Actualizar una categoría global."""
    category = db.get(Category, category_id)
    if not category:
        raise ValueError(f"Category {category_id} not found")
    if payload.name is not None:
        category.name = payload.name
    if payload.description is not None:
        category.description = payload.description
    if payload.is_fixed is not None:
        category.is_fixed = payload.is_fixed
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int) -> None:
    """Eliminar una categoría global."""
    category = db.get(Category, category_id)
    if not category:
        raise ValueError(f"Category {category_id} not found")
    db.delete(category)
    db.commit()


def list_categories(db: Session) -> list[Category]:
    """Listar todas las categorías globales."""
    query = select(Category).order_by(Category.created_at.desc())
    return list(db.scalars(query).all())
