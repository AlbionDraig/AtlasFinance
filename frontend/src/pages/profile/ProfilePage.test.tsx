import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/hooks/useToast'
import { useAuthStore } from '@/store/authStore'
import ProfilePage from './ProfilePage'

const updateProfileMock = vi.fn()

vi.mock('@/api/auth', () => ({
  authApi: {
    updateProfile: (...args: unknown[]) => updateProfileMock(...args),
  },
}))

describe('ProfilePage', () => {
  beforeEach(() => {
    updateProfileMock.mockReset()
    useAuthStore.setState({
      user: {
        id: 1,
        email: 'user@example.com',
        full_name: 'User Example',
        role: 'user',
      },
    })
  })

  it('should show inline alert when profile submit fails due to wrong current password', async () => {
    const user = userEvent.setup()
    updateProfileMock.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { detail: 'Incorrect current password' },
      },
    })

    render(
      <ToastProvider>
        <ProfilePage />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: /^change$|^cambiar$/i }))
    await user.type(screen.getByLabelText(/current password|contraseña actual/i), 'bad-pass')
    await user.type(screen.getByLabelText(/^new password$|^nueva contraseña$/i), 'Password1!')
    await user.type(screen.getByLabelText(/confirm.*password|confirmar.*contraseña/i), 'Password1!')
    await user.click(screen.getByRole('button', { name: /save changes|guardar cambios/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/contraseña actual es incorrecta|Current password is incorrect/i)).toBeInTheDocument()
  })
})
