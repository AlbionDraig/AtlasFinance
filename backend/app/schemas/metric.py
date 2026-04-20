from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class DashboardMetrics(BaseModel):
    net_worth: Decimal
    total_income: Decimal
    total_expenses: Decimal
    savings_rate: Decimal
    cashflow: Decimal

    model_config = ConfigDict(json_encoders={Decimal: float})
