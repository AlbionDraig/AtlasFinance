import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Tooltip from './Tooltip'

describe('Tooltip', () => {
  it('links trigger and tooltip through aria-describedby', async () => {
    const user = userEvent.setup()

    render(
      <Tooltip content="Helpful details" ariaLabel="More info">
        <span>?</span>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'More info' })
    await user.hover(trigger)

    const tooltip = await screen.findByRole('tooltip')
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.getAttribute('id'))

    await user.unhover(trigger)
  })

  it('falls back to content string as trigger aria label', () => {
    render(
      <Tooltip content="Tooltip content">
        <span>?</span>
      </Tooltip>,
    )

    expect(screen.getByRole('button', { name: 'Tooltip content' })).toBeInTheDocument()
  })
})