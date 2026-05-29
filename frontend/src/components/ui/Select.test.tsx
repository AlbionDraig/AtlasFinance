import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Select from './Select'

describe('Select', () => {
  it('exposes listbox accessibility attributes when opening', async () => {
    const user = userEvent.setup()

    render(
      <Select
        value="a"
        onChange={vi.fn()}
        options={[
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ]}
      />,
    )

    const trigger = screen.getByTestId('select-trigger')
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Option A' })).toHaveAttribute('aria-selected', 'true')
  })

  it('supports keyboard navigation and selection', async () => {
    const onChange = vi.fn()

    render(
      <Select
        value="a"
        onChange={onChange}
        options={[
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
          { value: 'c', label: 'Option C' },
        ]}
      />,
    )

    const trigger = screen.getByTestId('select-trigger')
    trigger.focus()

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('is disabled when options are empty', () => {
    render(<Select value="" onChange={vi.fn()} options={[]} />)
    expect(screen.getByTestId('select-trigger')).toBeDisabled()
  })
})