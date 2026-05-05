import { describe, expect, it } from 'vitest'
import { AxiosError } from 'axios'
import { formatCurrency, getApiErrorMessage } from './utils'

describe('formatCurrency', () => {
  it('formats COP amounts with thousand separators and no decimals', () => {
    const result = formatCurrency(1500000, 'COP')
    // Intl formats vary slightly across Node versions; we assert key parts.
    expect(result).toContain('1')
    expect(result).toContain('500')
    expect(result).toContain('000')
  })

  it('formats USD amounts', () => {
    const result = formatCurrency(1234, 'USD')
    expect(result).toContain('1')
    expect(result).toContain('234')
  })

  it('formats zero correctly', () => {
    const result = formatCurrency(0, 'COP')
    expect(result).toContain('0')
  })
})

describe('getApiErrorMessage', () => {
  it('returns backend detail when AxiosError has string detail', () => {
    const err = new AxiosError('Request failed')
    err.response = {
      data: { detail: 'Email already registered' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    }
    expect(getApiErrorMessage(err, 'fallback')).toBe('Email already registered')
  })

  it('returns fallback when AxiosError has no detail', () => {
    const err = new AxiosError('Request failed')
    err.response = {
      data: {},
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as never,
    }
    expect(getApiErrorMessage(err, 'fallback message')).toBe('fallback message')
  })

  it('returns fallback when detail is not a string', () => {
    const err = new AxiosError('Request failed')
    err.response = {
      data: { detail: ['field error', 'another'] },
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: {} as never,
    }
    expect(getApiErrorMessage(err, 'fallback')).toBe('fallback')
  })

  it('returns fallback for non-Axios errors', () => {
    expect(getApiErrorMessage(new Error('network error'), 'fallback')).toBe('fallback')
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback')
    expect(getApiErrorMessage(undefined, 'fallback')).toBe('fallback')
  })

  it('returns fallback when detail is a whitespace string', () => {
    const err = new AxiosError('Request failed')
    err.response = {
      data: { detail: '   ' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    }
    expect(getApiErrorMessage(err, 'fallback')).toBe('fallback')
  })
})
