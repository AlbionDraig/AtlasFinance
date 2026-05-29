import type { Investment } from '@/types'

export function investmentReturnRatio(investment: Pick<Investment, 'amount_invested' | 'current_value'>): number {
  const invested = Number(investment.amount_invested)
  if (invested <= 0) {
    return 0
  }
  return (Number(investment.current_value) - invested) / invested
}

export function compareInvestmentsByReturnDesc(a: Investment, b: Investment): number {
  return investmentReturnRatio(b) - investmentReturnRatio(a)
}

export function compareInvestmentsByReturnAsc(a: Investment, b: Investment): number {
  return investmentReturnRatio(a) - investmentReturnRatio(b)
}

export function compareInvestmentsByCurrentValueDesc(a: Investment, b: Investment): number {
  return Number(b.current_value) - Number(a.current_value)
}

export function compareInvestmentsByStartedAtAsc(a: Investment, b: Investment): number {
  return a.started_at.localeCompare(b.started_at)
}

export function groupCurrentValueByInstrumentType(investments: Investment[]): Array<{ type: string; value: number }> {
  const grouped = new Map<string, number>()

  for (const investment of investments) {
    grouped.set(
      investment.instrument_type,
      (grouped.get(investment.instrument_type) ?? 0) + Number(investment.current_value),
    )
  }

  return Array.from(grouped.entries())
    .map(([type, value]) => ({ type, value }))
    .sort((a, b) => b.value - a.value)
}