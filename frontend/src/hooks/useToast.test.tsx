import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './useToast'

function ToastHarness() {
  const { toasts, toast, dismiss } = useToast()

  return (
    <div>
      <button type="button" onClick={() => toast('ok', 'success')}>success</button>
      <button type="button" onClick={() => toast('err', 'error')}>error</button>
      <button type="button" onClick={() => {
        toast('1', 'success')
        toast('2', 'success')
        toast('3', 'success')
        toast('4', 'success')
      }}>
        many
      </button>
      <button type="button" onClick={() => toasts[0] && dismiss(toasts[0].id)}>dismiss-first</button>
      <span data-testid="count">{toasts.length}</span>
      <span data-testid="variants">{toasts.map((t) => t.variant).join(',')}</span>
    </div>
  )
}

describe('useToast', () => {
  it('throws if used outside provider', () => {
    expect(() => render(<ToastHarness />)).toThrow('useToast must be used inside <ToastProvider>')
  })

  it('creates toasts, supports variants and dismiss', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'success' }))
    fireEvent.click(screen.getByRole('button', { name: 'error' }))

    expect(screen.getByTestId('count')).toHaveTextContent('2')
    expect(screen.getByTestId('variants')).toHaveTextContent('success,error')

    fireEvent.click(screen.getByRole('button', { name: 'dismiss-first' }))
    expect(screen.getByTestId('count')).toHaveTextContent('1')
  })

  it('keeps only the latest 3 toasts and auto-dismisses after timeout', () => {
    vi.useFakeTimers()

    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'many' }))
    expect(screen.getByTestId('count')).toHaveTextContent('3')

    act(() => {
      vi.advanceTimersByTime(4500)
    })

    expect(screen.getByTestId('count')).toHaveTextContent('0')
    vi.useRealTimers()
  })
})