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

// Metric
export interface DashboardMetrics {
  net_worth: number
  total_income: number
  total_expenses: number
  savings_rate: number
  cashflow: number
}
