"""Repositorio base con CRUD genérico para cualquier modelo SQLAlchemy."""
from typing import Generic, TypeVar

from sqlalchemy.orm import Session

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """CRUD básico común a todos los repositorios.

    Los repositorios concretos heredan de aquí y agregan queries
    específicas del agregado.
    """

    model: type[ModelT]

    def __init__(self, db: Session) -> None:
        # Guardar la sesión inyectada; permite mockear en tests.
        self.db = db

    def get(self, entity_id: int) -> ModelT | None:
        """Recuperar por PK o devolver None."""
        return self.db.get(self.model, entity_id)

    def add(self, instance: ModelT) -> ModelT:
        """Persistir una instancia y refrescarla desde la BD."""
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def commit_refresh(self, instance: ModelT) -> ModelT:
        """Confirmar cambios pendientes y refrescar la instancia."""
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def delete(self, instance: ModelT) -> None:
        """Eliminar una instancia y confirmar."""
        self.db.delete(instance)
        self.db.commit()
