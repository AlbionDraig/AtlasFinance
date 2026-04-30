import { describe, it, expect } from 'vitest'
import {
  getPasswordChecks,
  getPasswordStrength,
} from '@/lib/passwordStrength'

describe('getPasswordChecks', () => {
  it('marks all checks false for empty string', () => {
    expect(getPasswordChecks('')).toEqual({
      minLength: false,
      hasUpper: false,
      hasNumber: false,
      hasSymbol: false,
    })
  })

  it('detects each rule independently', () => {
    expect(getPasswordChecks('abcdefgh').minLength).toBe(true)
    expect(getPasswordChecks('Abcdefg').hasUpper).toBe(true)
    expect(getPasswordChecks('abcdefg1').hasNumber).toBe(true)
    expect(getPasswordChecks('abcdefg!').hasSymbol).toBe(true)
  })

  it('passes all checks for a strong password', () => {
    const checks = getPasswordChecks('Atlas123!')
    expect(Object.values(checks).every(Boolean)).toBe(true)
  })
})

describe('getPasswordStrength', () => {
  it('reports weak strength for empty input', () => {
    const { score, label } = getPasswordStrength('')
    expect(score).toBe(0)
    expect(label).toBe('Débil')
  })

  it('reports medium strength when half the rules pass', () => {
    // Cumple minLength + hasUpper => 2/4 = 50%.
    const { score, label } = getPasswordStrength('Abcdefgh')
    expect(score).toBe(50)
    expect(label).toBe('Media')
  })

  it('reports strong strength when all rules pass', () => {
    const { score, label } = getPasswordStrength('Atlas123!')
    expect(score).toBe(100)
    expect(label).toBe('Fuerte')
  })
})
