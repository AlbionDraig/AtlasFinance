import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'
import { useAuthStore } from '@/store/authStore'

vi.mock('@/api/auth', () => ({
  authApi: {
    me: vi.fn(() => Promise.reject(new Error('not needed in this test'))),
    logout: vi.fn(() => Promise.resolve({ data: null })),
  },
}))

describe('AppLayout', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 1,
        full_name: 'Jane Doe',
        email: 'jane.doe@example.com',
        role: 'admin',
      },
    })
  })

  it('navigates when clicking sidebar link in collapsed state', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>Dashboard page</div>} />
            <Route path="/transactions" element={<div>Transactions page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Dashboard page')).toBeInTheDocument()

    const transactionsLink = container.querySelector('a[href="/transactions"]')
    expect(transactionsLink).toBeTruthy()

    fireEvent.click(transactionsLink as HTMLAnchorElement)

    expect(screen.getByText('Transactions page')).toBeInTheDocument()
  })
})
