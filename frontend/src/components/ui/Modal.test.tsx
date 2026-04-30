import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Modal from './Modal'

describe('Modal', () => {
  it('renders as an accessible dialog and restores body scroll on unmount', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <Modal onClose={onClose}>
        <div>Contenido</div>
      </Modal>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('focuses the first interactive element and traps tab navigation', () => {
    const onClose = vi.fn()
    render(
      <Modal onClose={onClose}>
        <div>
          <button type="button">Primero</button>
          <button type="button">Ultimo</button>
        </div>
      </Modal>,
    )

    const first = screen.getByRole('button', { name: 'Primero' })
    const last = screen.getByRole('button', { name: 'Ultimo' })

    expect(document.activeElement).toBe(first)

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('closes on Escape and overlay click', () => {
    const onClose = vi.fn()
    render(
      <Modal onClose={onClose}>
        <button type="button">Cerrar</button>
      </Modal>,
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    const overlay = document.querySelector('div[aria-hidden="true"]')
    expect(overlay).not.toBeNull()
    fireEvent.click(overlay as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})