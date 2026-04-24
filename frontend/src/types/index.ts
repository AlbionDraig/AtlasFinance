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
}

// Transaction
export interface Transaction {
  id: number
  account_id: number
  amount: number
  description: string
  category_id: number | null
  transaction_date: string
  type: 'income' | 'expense'
}

// Pocket
export interface Pocket {
  id: number
  name: string
  target_amount: number
  current_amount: number
  currency: string
}

// Metric
export interface MetricSummary {
  total_income: number
  total_expenses: number
  net_balance: number
  currency: string
}
