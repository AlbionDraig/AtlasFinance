// Auth
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  full_name: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

// User
export interface User {
  id: number
  email: string
  full_name: string
  role: 'admin' | 'user'
}

// Account
export interface Account {
  id: number
  name: string
  bank_id: number
  account_type: string
  currency: string
  balance: number
  current_balance?: number
}

// Transaction
export interface Transaction {
  id: number
  account_id: number
  amount: number
  description: string
  category_id: number | null
  pocket_id: number | null
  currency: string
  transaction_type: 'INCOME' | 'EXPENSE'
  occurred_at: string
}

// Pocket
export interface Pocket {
  id: number
  name: string
  balance: number
  currency: string
  account_id: number
  created_at: string
}

// Investment
export interface Investment {
  id: number
  name: string
  instrument_type: string
  amount_invested: number
  current_value: number
  currency: string
  investment_entity_id: number
  started_at: string
}

// Metric
export interface DashboardMetrics {
  net_worth: number
  total_income: number
  total_expenses: number
  savings_rate: number
  cashflow: number
}

export interface MonthlyBreakdown {
  month: string
  income: number
  expense: number
  cashflow: number
  cumulative: number
}

export interface CategoryExpenseRow {
  name: string
  value: number
  is_fixed: boolean
}

export interface StackedMonthRow {
  month: string
  categories: Record<string, number>
}

export interface FinancialHealthFactor {
  key: 'savings' | 'debt' | 'liquidity' | 'diversification'
  score: number
  value: number
  target: number
  unit: '%' | 'months'
  weight: number
}

export interface FinancialHealthAction {
  factor: 'savings' | 'debt' | 'liquidity' | 'diversification'
  priority: 'high' | 'medium' | 'low'
  action_key:
    | 'increase_savings_rate'
    | 'reduce_debt_ratio'
    | 'build_liquidity_buffer'
    | 'diversify_portfolio'
  target_value: number
  target_unit: '%' | 'months'
  estimated_score_gain: number
}

export interface FinancialHealthHistoryPoint {
  month: string
  score: number
  delta: number | null
  change_driver: 'baseline' | 'stable' | 'savings' | 'liquidity'
  change_direction: 'up' | 'down' | 'stable'
}

export interface FinancialHealthSnapshot {
  score: number
  level: 'strong' | 'stable' | 'attention'
  factors: FinancialHealthFactor[]
  weekly_plan: FinancialHealthAction[]
  history: FinancialHealthHistoryPoint[]
}

export interface DashboardAggregates {
  income: number
  expenses: number
  transaction_count: number
  monthly: MonthlyBreakdown[]
  top_categories: CategoryExpenseRow[]
  stacked: StackedMonthRow[]
  stacked_cats: string[]
  fixed_total: number
  biggest_expense_amount: number | null
  biggest_expense_description: string | null
  prev_income: number
  prev_expenses: number
  financial_health: FinancialHealthSnapshot
}

// Re-exports from api modules to allow single-import patterns in hooks/pages.
export type { Category, CategoryPayload } from '@/api/categories'
export type { InvestmentEntity, InvestmentEntityPayload, InvestmentEntityType } from '@/api/investmentEntities'
