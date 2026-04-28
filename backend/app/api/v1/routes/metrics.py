from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.metric import DashboardAggregates, DashboardMetrics
from app.services.finance_service import get_dashboard_aggregates, get_dashboard_metrics

router = APIRouter()


@router.get("/dashboard")
def get_metrics_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    currency: str = "COP",
) -> DashboardMetrics:
    """Return aggregated dashboard metrics in the requested currency."""
    return get_dashboard_metrics(db, current_user.id, target_currency=currency.upper())


@router.get("/aggregates")
def get_aggregates_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    start_date: Annotated[datetime, Query()],
    end_date: Annotated[datetime, Query()],
    prev_start_date: Annotated[datetime, Query()],
    prev_end_date: Annotated[datetime, Query()],
    currency: str = "COP",
) -> DashboardAggregates:
    """Return pre-computed chart data and period totals for the dashboard."""
    return get_dashboard_aggregates(
        db,
        current_user.id,
        start_date=start_date,
        end_date=end_date,
        target_currency=currency.upper(),
        prev_start_date=prev_start_date,
        prev_end_date=prev_end_date,
    )
