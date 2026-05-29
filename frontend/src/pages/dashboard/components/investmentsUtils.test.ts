import { describe, expect, it } from 'vitest'
import {
  compareInvestmentsByCurrentValueDesc,
  compareInvestmentsByReturnAsc,
  compareInvestmentsByReturnDesc,
  compareInvestmentsByStartedAtAsc,
  groupCurrentValueByInstrumentType,
  investmentReturnRatio,
} from './investmentsUtils'

const baseInvestments = [
  {
    id: 1,
    name: 'Bond A',
    instrument_type: 'bond',
    amount_invested: 100,
    current_value: 120,
    currency: 'USD',
    investment_entity_id: 1,
    started_at: '2026-01-01',
  },
  {
    id: 2,
    name: 'Stock B',
    instrument_type: 'stock',
    amount_invested: 100,
    current_value: 90,
    currency: 'USD',
    investment_entity_id: 1,
    started_at: '2025-12-01',
  },
  {
    id: 3,
    name: 'Stock C',
    instrument_type: 'stock',
    amount_invested: 50,
    current_value: 75,
    currency: 'USD',
    investment_entity_id: 2,
    started_at: '2026-03-01',
  },
] as const

describe('investmentsUtils', () => {
  it('computes return ratios and handles zero invested values', () => {
    expect(investmentReturnRatio(baseInvestments[0])).toBeCloseTo(0.2)
    expect(investmentReturnRatio({ amount_invested: 0, current_value: 10 })).toBe(0)
  })

  it('sorts investments by return and current value', () => {
    const byReturnDesc = [...baseInvestments].sort(compareInvestmentsByReturnDesc)
    const byReturnAsc = [...baseInvestments].sort(compareInvestmentsByReturnAsc)
    const byCurrentValue = [...baseInvestments].sort(compareInvestmentsByCurrentValueDesc)
    const byStartedAt = [...baseInvestments].sort(compareInvestmentsByStartedAtAsc)

    expect(byReturnDesc.map((item) => item.id)).toEqual([3, 1, 2])
    expect(byReturnAsc.map((item) => item.id)).toEqual([2, 1, 3])
    expect(byCurrentValue.map((item) => item.id)).toEqual([1, 2, 3])
    expect(byStartedAt.map((item) => item.id)).toEqual([2, 1, 3])
  })

  it('groups current values by instrument type', () => {
    expect(groupCurrentValueByInstrumentType(baseInvestments as never)).toEqual([
      { type: 'stock', value: 165 },
      { type: 'bond', value: 120 },
    ])
  })
})