import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ToastProvider, useToast } from './useToast'

function ToastHarness() {
  const { toasts, toast, dismiss } = useToast()

  return (
    <div>
      <button type="button" onClick={() => toast('ok', 'success')}>success</button>
      <button type="button" onClick={() => toast('err', 'error')}>error</button>
      <button type="button" onClick={() => toast('dup', 'error')}>dup-error</button>
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
      <span data-testid="messages">{toasts.map((t) => t.message).join(',')}</span>
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

  it('keeps only the latest 3 toasts', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'many' }))
    expect(screen.getByTestId('count')).toHaveTextContent('3')
  })

  it('does not duplicate the same error toast message', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'dup-error' }))
    fireEvent.click(screen.getByRole('button', { name: 'dup-error' }))

    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(screen.getByTestId('variants')).toHaveTextContent('error')
    expect(screen.getByTestId('messages')).toHaveTextContent('dup')
  })
})