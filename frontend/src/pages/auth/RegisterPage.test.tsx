import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/hooks/useToast'
import RegisterPage from './RegisterPage'

const registerMock = vi.fn()
const loginMock = vi.fn()
const meMock = vi.fn()

vi.mock('@/api/auth', () => ({
  authApi: {
    register: (...args: unknown[]) => registerMock(...args),
    login: (...args: unknown[]) => loginMock(...args),
    me: (...args: unknown[]) => meMock(...args),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('RegisterPage', () => {
  beforeEach(() => {
    registerMock.mockReset()
    loginMock.mockReset()
    meMock.mockReset()
  })

  it('should show inline validation error when full name is too short', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ToastProvider>
          <RegisterPage />
        </ToastProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/full name|nombre completo/i), 'A')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.type(screen.getByPlaceholderText(/At least 8 characters|Mínimo 8 caracteres/i), 'Password1!')
  await user.type(screen.getByPlaceholderText(/Repeat your password|Repite tu contraseña/i), 'Password1!')
    await user.click(screen.getByRole('button', { name: /create account|crear cuenta/i }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/al menos 2 caracteres|at least 2 characters/i)).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })

  it('should show inline submit error when register request fails', async () => {
    const user = userEvent.setup()
    registerMock.mockRejectedValueOnce(new Error('network'))

    render(
      <MemoryRouter>
        <ToastProvider>
          <RegisterPage />
        </ToastProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/full name|nombre completo/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
  await user.type(screen.getByPlaceholderText(/At least 8 characters|Mínimo 8 caracteres/i), 'Password1!')
  await user.type(screen.getByPlaceholderText(/Repeat your password|Repite tu contraseña/i), 'Password1!')
    await user.click(screen.getByRole('button', { name: /create account|crear cuenta/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/No se pudo conectar|Could not connect/i)).toBeInTheDocument()
  })
})
