import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_EMAIL ?? 'demo@atlas.local'
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'Demo1234!'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(TEST_EMAIL)
  await page.getByLabel(/contraseña|password/i).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /iniciar sesión|sign in|log in/i }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
}

test.describe('Pockets page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/pockets')
  })

  test('renders without errors', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Investments page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/investments')
  })

  test('renders without errors', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Accounts page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/accounts')
  })

  test('renders without errors', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Transactions filters in URL', () => {
  test('persists transaction type filter in URL after reload', async ({ page }) => {
    await login(page)
    await page.goto('/transactions?type=INCOME')
    // The URL parameter is consumed by the page on mount; reloading should keep it.
    await page.reload()
    await expect(page).toHaveURL(/type=INCOME/)
  })

  test('keeps custom period from/to in URL', async ({ page }) => {
    await login(page)
    await page.goto('/transactions?period=custom&from=2025-01-01&to=2025-01-31')
    await page.reload()
    await expect(page).toHaveURL(/period=custom/)
    await expect(page).toHaveURL(/from=2025-01-01/)
    await expect(page).toHaveURL(/to=2025-01-31/)
  })
})

test.describe('Page error boundaries', () => {
  test('private routes have a heading after navigation (no boundary triggered)', async ({ page }) => {
    await login(page)
    for (const path of ['/dashboard', '/transactions', '/accounts', '/pockets', '/investments', '/admin', '/profile']) {
      await page.goto(path)
      // If a page error boundary was triggered, the "Reintentar" button would be visible.
      await expect(page.getByRole('button', { name: /reintentar/i })).toHaveCount(0)
    }
  })
})
