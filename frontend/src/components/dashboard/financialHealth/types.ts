import type { FinancialHealthHistoryPoint } from '@/types'

export interface DeltaBadge {
  text: string
  tone: 'positive' | 'negative' | 'flat' | 'neutral'
}

export interface HealthHistoryPointView extends FinancialHealthHistoryPoint {
  label: string
}

export type HealthBadgeVariant = 'brand' | 'success' | 'warning' | 'neutral'
