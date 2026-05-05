"""CRUD del catálogo global de categorías."""
from sqlalchemy.orm import Session

from app.models.category import Category
from app.repositories.categories import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryUpdate


def create_category(db: Session, payload: CategoryCreate) -> Category:
    """Crear una nueva categoría global."""
    category = Category(
        name=payload.name,
        description=payload.description,
        is_fixed=payload.is_fixed,
    )
    return CategoryRepository(db).add(category)


def update_category(db: Session, category_id: int, payload: CategoryUpdate) -> Category:
    """Actualizar una categoría global."""
    repo = CategoryRepository(db)
    category = repo.get(category_id)
    if not category:
        raise ValueError(f"Category {category_id} not found")
    if payload.name is not None:
        category.name = payload.name
    if payload.description is not None:
        category.description = payload.description
    if payload.is_fixed is not None:
        category.is_fixed = payload.is_fixed
    return repo.commit_refresh(category)


def delete_category(db: Session, category_id: int) -> None:
    """Eliminar una categoría global."""
    repo = CategoryRepository(db)
    category = repo.get(category_id)
    if not category:
        raise ValueError(f"Category {category_id} not found")
    repo.delete(category)


def list_categories(db: Session) -> list[Category]:
    """Listar todas las categorías globales."""
    return CategoryRepository(db).list_all()
