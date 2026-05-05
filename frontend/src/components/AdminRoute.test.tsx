import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import AdminRoute from '@/components/AdminRoute'
import { useAuthStore } from '@/store/authStore'

beforeEach(() => {
  useAuthStore.setState({ user: null })
})

describe('AdminRoute', () => {
  it('renders children when authenticated user is admin', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'admin@atlas.test', full_name: 'Admin User', role: 'admin' },
    })

    render(
      <MemoryRouter initialEntries={['/management']}>
        <Routes>
          <Route path="/management" element={<AdminRoute><div>Management content</div></AdminRoute>} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Management content')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument()
  })

  it('redirects non-admin users to dashboard', () => {
    useAuthStore.setState({
      user: { id: 2, email: 'user@atlas.test', full_name: 'Regular User', role: 'user' },
    })

    render(
      <MemoryRouter initialEntries={['/management']}>
        <Routes>
          <Route path="/management" element={<AdminRoute><div>Management content</div></AdminRoute>} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Dashboard page')).toBeInTheDocument()
    expect(screen.queryByText('Management content')).not.toBeInTheDocument()
  })
})
