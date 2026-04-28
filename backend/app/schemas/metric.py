from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class DashboardMetrics(BaseModel):
    """Aggregated KPI values shown in the financial dashboard."""
    net_worth: Decimal
    total_income: Decimal
    total_expenses: Decimal
    savings_rate: Decimal
    cashflow: Decimal

    model_config = ConfigDict(json_encoders={Decimal: float})


class MonthlyBreakdown(BaseModel):
    """Income, expense, cashflow and running cumulative for a single calendar month."""
    month: str  # "YYYY-MM"
    income: Decimal
    expense: Decimal
    cashflow: Decimal
    cumulative: Decimal


class CategoryExpenseRow(BaseModel):
    """Total expense and fixed/variable classification for a single category."""
    name: str
    value: Decimal
    is_fixed: bool


class StackedMonthRow(BaseModel):
    """Per-month expense breakdown keyed by category name (for stacked charts)."""
    month: str  # "YYYY-MM"
    categories: dict[str, Decimal]


class DashboardAggregates(BaseModel):
    """Pre-computed chart data and period totals for the financial dashboard."""
    income: Decimal
    expenses: Decimal
    transaction_count: int
    monthly: list[MonthlyBreakdown]
    top_categories: list[CategoryExpenseRow]
    stacked: list[StackedMonthRow]
    stacked_cats: list[str]
    fixed_total: Decimal
    biggest_expense_amount: Decimal | None
    biggest_expense_description: str | None
    prev_income: Decimal
    prev_expenses: Decimal

    model_config = ConfigDict(json_encoders={Decimal: float})
