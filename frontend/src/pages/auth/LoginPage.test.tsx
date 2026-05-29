import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/hooks/useToast'
import LoginPage from './LoginPage'

const navigateMock = vi.fn()
const loginMock = vi.fn()
const meMock = vi.fn()

vi.mock('@/api/auth', () => ({
  authApi: {
    login: (...args: unknown[]) => loginMock(...args),
    me: (...args: unknown[]) => meMock(...args),
  },
}))

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
    loginMock.mockReset()
    meMock.mockReset()
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

  it('should render inline alert when login fails', async () => {
    const user = userEvent.setup()
    loginMock.mockRejectedValueOnce(new Error('network'))

    render(
      <MemoryRouter>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password|contraseña/i), '12345678')
    await user.click(screen.getByRole('button', { name: /sign in|iniciar sesión/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/No se pudo conectar|Could not connect/i)).toBeInTheDocument()
  })
})