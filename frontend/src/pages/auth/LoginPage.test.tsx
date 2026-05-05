import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/hooks/useToast'
import LoginPage from './LoginPage'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
  })

  it('should open the language switcher when the user clicks it', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /language|idioma/i }))

    expect(screen.getByRole('button', { name: 'Español' })).toBeInTheDocument()
  })
})