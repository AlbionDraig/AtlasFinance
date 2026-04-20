from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.metric import DashboardMetrics
from app.services.finance_service import get_dashboard_metrics

router = APIRouter()


@router.get("/dashboard")
def get_metrics_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    currency: str = "COP",
) -> DashboardMetrics:
    """Return aggregated dashboard metrics in the requested currency."""
    return get_dashboard_metrics(db, current_user.id, target_currency=currency.upper())
