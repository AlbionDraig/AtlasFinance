import { test, expect } from '@playwright/test'

/**
 * Helpers
 */
const TEST_EMAIL = process.env.E2E_EMAIL ?? 'demo@atlas.local'
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'Demo1234!'

async function fillLoginForm(page: import('@playwright/test').Page, email: string, password: string) {
  // Some auth inputs use visual labels not linked with htmlFor/id.
  const emailField = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i))
  const passwordField = page.getByLabel(/contraseña|password/i).or(page.getByPlaceholder(/contraseña|password/i))
  await emailField.fill(email)
  await passwordField.fill(password)
}

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await fillLoginForm(page, TEST_EMAIL, TEST_PASSWORD)
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
    await fillLoginForm(page, 'wrong@example.com', 'wrongpassword')
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
    // In this screen, creation can be direct or inside the floating actions menu.
    const registerAction = page.getByRole('button', {
      name: /registrar movimiento|register transaction|nuevo movimiento|nueva transacci[oó]n|add/i,
    })

    if (await registerAction.first().isVisible()) {
      await registerAction.first().click()
    } else {
      const actionsMenu = page.getByRole('button', {
        name: /abrir acciones de movimientos|open transaction actions|acciones de movimientos|transaction actions/i,
      })
      await actionsMenu.click()
      await page.getByRole('button', { name: /registrar movimiento|register transaction/i }).click()
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
    // Locate by data-testid: works regardless of sidebar collapsed/expanded state
    // and independent of i18n label, making the test resilient to timing and locale.
    const logoutBtn = page.getByTestId('logout-button')
    await logoutBtn.waitFor({ state: 'visible', timeout: 5_000 })
    await logoutBtn.click()
    // toHaveURL polls with retries — more reliable for SPA client-side navigation
    // than waitForURL which requires a 'load' event that never fires in React Router.
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
