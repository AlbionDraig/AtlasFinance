import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FloatingActionMenu from './FloatingActionMenu'

describe('FloatingActionMenu', () => {
  it('opens menu and focuses the first enabled action', async () => {
    const user = userEvent.setup()

    render(
      <FloatingActionMenu
        items={[
          { key: 'disabled', label: 'Disabled', onClick: vi.fn(), disabled: true },
          { key: 'first', label: 'First action', onClick: vi.fn() },
          { key: 'second', label: 'Second action', onClick: vi.fn() },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /quick actions|acciones rápidas/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'First action' })).toHaveFocus()
  })

  it('triggers menu item callback and closes the menu', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <FloatingActionMenu
        items={[
          { key: 'run', label: 'Run action', onClick },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /quick actions|acciones rápidas/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Run action' }))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})