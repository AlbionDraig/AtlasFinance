from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import MoneyDecimal


class DashboardMetrics(BaseModel):
    """Aggregated KPI values shown in the financial dashboard."""
    net_worth: MoneyDecimal
    total_income: MoneyDecimal
    total_expenses: MoneyDecimal
    savings_rate: MoneyDecimal
    cashflow: MoneyDecimal


class MonthlyBreakdown(BaseModel):
    """Income, expense, cashflow and running cumulative for a single calendar month."""
    month: str  # "YYYY-MM"
    income: MoneyDecimal
    expense: MoneyDecimal
    cashflow: MoneyDecimal
    cumulative: MoneyDecimal


class CategoryExpenseRow(BaseModel):
    """Total expense and fixed/variable classification for a single category."""
    name: str
    value: MoneyDecimal
    is_fixed: bool


class FinancialHealthFactor(BaseModel):
    """Score and observed value for one financial health factor."""
    key: str
    score: int
    value: MoneyDecimal
    target: MoneyDecimal
    unit: str
    weight: MoneyDecimal


class FinancialHealthAction(BaseModel):
    """Concrete weekly action associated with one factor."""
    factor: str
    priority: str
    action_key: str
    target_value: MoneyDecimal
    target_unit: str
    estimated_score_gain: int


class FinancialHealthHistoryPoint(BaseModel):
    """Monthly evolution point for the financial health score."""
    month: str
    score: int
    delta: int | None
    change_driver: str
    change_direction: str


class FinancialHealthSnapshot(BaseModel):
    """Current financial health score with factors, plan and history."""
    score: int
    level: str
    factors: list[FinancialHealthFactor]
    weekly_plan: list[FinancialHealthAction]
    history: list[FinancialHealthHistoryPoint]


class StackedMonthRow(BaseModel):
    """Per-month expense breakdown keyed by category name (for stacked charts)."""
    month: str  # "YYYY-MM"
    categories: dict[str, Decimal]


class SmartAlertItem(BaseModel):
    """Single smart alert item emitted by the alerting engine."""

    code: str
    title: str
    severity: str
    detail: str
    amount: MoneyDecimal | None = None
    category_id: int | None = None
    transaction_id: int | None = None
    due_date: str | None = None


class SubscriptionCenterItem(BaseModel):
    """Detected fixed recurring charge grouped as one subscription."""

    key: str
    name: str
    category_id: int | None = None
    monthly_estimate: MoneyDecimal
    annual_cost: MoneyDecimal
    last_charge_at: str
    next_due_date: str | None = None
    confidence: MoneyDecimal


class SmartAlertsKpiItem(BaseModel):
    """Suggested KPI definition for tracking alert impact."""

    key: str
    title: str
    description: str
    value: MoneyDecimal
    unit: str


class SmartAlertsSummary(BaseModel):
    """Payload aggregating smart alerts, subscriptions and suggested KPIs."""

    generated_at: str
    alerts: list[SmartAlertItem]
    subscriptions: list[SubscriptionCenterItem]
    subscriptions_annual_total: MoneyDecimal
    kpis: list[SmartAlertsKpiItem]


class DashboardAggregates(BaseModel):
    """Pre-computed chart data and period totals for the financial dashboard."""
    income: MoneyDecimal
    expenses: MoneyDecimal
    transaction_count: int
    monthly: list[MonthlyBreakdown]
    top_categories: list[CategoryExpenseRow]
    stacked: list[StackedMonthRow]
    stacked_cats: list[str]
    fixed_total: MoneyDecimal
    biggest_expense_amount: MoneyDecimal | None
    biggest_expense_description: str | None
    prev_income: MoneyDecimal
    prev_expenses: MoneyDecimal
    financial_health: FinancialHealthSnapshot

