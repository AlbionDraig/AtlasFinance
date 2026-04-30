"""Helpers compartidos entre los servicios de dominio.

Centralizar aquí evita ciclos entre módulos y mantiene SRP en cada servicio:
- Cada `*_service` se encarga de su agregado de negocio.
- Este módulo concentra utilidades de persistencia, validaciones cruzadas
  y la caché in-process del dashboard.
"""
from decimal import Decimal
from time import monotonic

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.bank import Bank
from app.models.category import Category
from app.models.country import Country
from app.models.enums import TransactionType
from app.models.investment import Investment
from app.models.investment_entity import InvestmentEntity
from app.models.pocket import Pocket
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.metric import DashboardMetrics

# Caché in-process del dashboard: {(user_id, currency) -> (metrics, expires_at)}.
# Reduce lecturas pesadas repetidas en ventanas cortas.
# NOTA: no se comparte entre workers; suficiente para el caso de uso actual.
_METRICS_CACHE: dict[tuple[int, str], tuple[DashboardMetrics, float]] = {}
_METRICS_CACHE_TTL_SECONDS: float = 60.0


def invalidate_metrics_cache(user_id: int) -> None:
    """Eliminar todas las entradas cacheadas de un usuario en cualquier moneda."""
    keys = [key for key in _METRICS_CACHE if key[0] == user_id]
    for key in keys:
        _METRICS_CACHE.pop(key, None)


def get_cached_metrics(user_id: int, target_currency: str) -> DashboardMetrics | None:
    """Devolver métricas cacheadas si la entrada sigue fresca."""
    key = (user_id, target_currency)
    entry = _METRICS_CACHE.get(key)
    if entry is None:
        return None
    metrics, expires_at = entry
    if monotonic() >= expires_at:
        _METRICS_CACHE.pop(key, None)
        return None
    return metrics


def set_cached_metrics(
    user_id: int,
    target_currency: str,
    metrics: DashboardMetrics,
) -> DashboardMetrics:
    """Guardar snapshot de métricas con TTL y devolver el mismo objeto."""
    key = (user_id, target_currency)
    _METRICS_CACHE[key] = (metrics, monotonic() + _METRICS_CACHE_TTL_SECONDS)
    return metrics


def get_user(db: Session, user_id: int) -> User:
    """Recuperar usuario o lanzar ValueError de dominio."""
    user = db.get(User, user_id)
    if not user:
        raise ValueError("User not found")
    return user


def ensure_country_code_exists(db: Session, country_code: str) -> str:
    """Validar código de país contra el catálogo global y normalizar."""
    normalized_code = country_code.strip().upper()
    country_id = db.scalar(select(Country.id).where(Country.code == normalized_code).limit(1))
    if country_id is None:
        raise ValueError("Country code is not registered in countries catalog")
    return normalized_code


def persist_and_refresh(
    db: Session,
    instance: Bank | Account | Pocket | Category | Country | Transaction | Investment | InvestmentEntity,
):
    """Persistir una nueva instancia y devolverla refrescada desde la BD."""
    db.add(instance)
    db.commit()
    db.refresh(instance)
    return instance


def commit_and_refresh(db: Session, instance: Transaction) -> Transaction:
    """Confirmar cambios pendientes y refrescar una transacción."""
    db.commit()
    db.refresh(instance)
    return instance


def apply_transaction_effect(
    account: Account,
    transaction_type: TransactionType,
    amount: Decimal,
) -> None:
    """Aplicar el impacto de la transacción al saldo de la cuenta."""
    if transaction_type == TransactionType.INCOME:
        account.current_balance += amount
    else:
        account.current_balance -= amount


def revert_transaction_effect(
    account: Account,
    transaction_type: TransactionType,
    amount: Decimal,
) -> None:
    """Revertir un efecto previamente aplicado al saldo de la cuenta."""
    if transaction_type == TransactionType.INCOME:
        account.current_balance -= amount
    else:
        account.current_balance += amount


def ensure_sufficient_funds(
    account: Account,
    transaction_type: TransactionType,
    amount: Decimal,
) -> None:
    """Lanzar ValueError si un gasto dejaría el saldo en negativo."""
    if transaction_type == TransactionType.EXPENSE and amount > account.current_balance:
        raise ValueError("Insufficient funds in the selected account.")
