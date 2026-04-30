import { test, expect } from '@playwright/test'

/**
 * Helpers
 */
const TEST_EMAIL = process.env.E2E_EMAIL ?? 'demo@atlas.local'
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'Demo1234!'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(TEST_EMAIL)
  await page.getByLabel(/contraseña|password/i).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /iniciar sesión|sign in|log in/i }).click()
  // Wait until we leave the login page
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
}

/**
 * Auth flow
 */
test.describe('Authentication', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows validation error for wrong credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/contraseña|password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /iniciar sesión|sign in|log in/i }).click()
    // Some kind of error feedback should appear
    await expect(page.getByRole('alert').or(page.locator('[data-testid="toast"]')).or(page.locator('.text-brand'))).toBeVisible({ timeout: 5_000 })
  })

  test('can log in and reach the dashboard', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/(dashboard|$)/)
    // Main navigation should be visible after login
    await expect(page.getByRole('navigation')).toBeVisible()
  })
})

/**
 * Dashboard
 */
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/dashboard')
  })

  test('renders KPI section', async ({ page }) => {
    // At least one KPI card should be visible (even skeleton counts as visible)
    await expect(page.locator('.app-card, [aria-busy="true"]').first()).toBeVisible()
  })
})

/**
 * Transactions
 */
test.describe('Transactions page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/transactions')
  })

  test('renders the transactions page', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('has an Export CSV button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /csv/i })).toBeVisible()
  })

  test('can open the new transaction modal', async ({ page }) => {
    // FloatingActionMenu or direct button to create a transaction
    const fab = page.getByRole('button', { name: /nuevo movimiento|nueva transacción|add/i })
    if (await fab.isVisible()) {
      await fab.click()
    } else {
      // May be inside a FAB menu
      await page.locator('[aria-label*="menú"]').click()
      await page.getByRole('menuitem', { name: /movimiento|transacción/i }).click()
    }
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 })
  })
})

/**
 * Logout
 */
test.describe('Logout', () => {
  test('can log out and is redirected to login', async ({ page }) => {
    await login(page)
    // Logout button can be in a user menu or sidebar
    const logoutBtn = page.getByRole('button', { name: /cerrar sesión|log out|logout|salir/i })
    await logoutBtn.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })
})
