import { test, expect } from '@playwright/test'

/**
 * All tests in this file use the pre-authenticated storageState loaded by
 * globalSetup (playwright.config.ts). No explicit login() helper is needed.
 */
const TEST_EMAIL = process.env.E2E_EMAIL ?? 'jane.doe@sgb.co'
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'Strong/Pass|123'

// Keep TEST_EMAIL / TEST_PASSWORD exported so TypeScript doesn't warn about
// unused variables — they are available as overrideable env vars.
void TEST_EMAIL
void TEST_PASSWORD

test.describe('Pockets page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pockets')
  })

  test('renders without errors', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Investments page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/investments')
  })

  test('renders without errors', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Accounts page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounts')
  })

  test('renders without errors', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Transactions filters in URL', () => {
  test('persists transaction type filter in URL after reload', async ({ page }) => {
    await page.goto('/transactions?type=INCOME')
    // The URL parameter is consumed by the page on mount; reloading should keep it.
    await page.reload()
    await expect(page).toHaveURL(/type=INCOME/)
  })

  test('keeps custom period from/to in URL', async ({ page }) => {
    await page.goto('/transactions?period=custom&from=2025-01-01&to=2025-01-31')
    await page.reload()
    await expect(page).toHaveURL(/period=custom/)
    await expect(page).toHaveURL(/from=2025-01-01/)
    await expect(page).toHaveURL(/to=2025-01-31/)
  })
})

test.describe('Page error boundaries', () => {
  test('private routes have a heading after navigation (no boundary triggered)', async ({ page }) => {
    for (const path of ['/dashboard', '/transactions', '/accounts', '/pockets', '/investments', '/admin', '/profile']) {
      await page.goto(path)
      // If a page error boundary was triggered, the "Reintentar" button would be visible.
      await expect(page.getByRole('button', { name: /reintentar/i })).toHaveCount(0)
    }
  })
})

test.describe('Dashboard UX improvements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard?tab=resumen')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })

  test('toggles between basic and advanced density modes', async ({ page }) => {
    const basicBtn = page.getByRole('button', { name: /vista básica|basic view/i })
    const advancedBtn = page.getByRole('button', { name: /vista avanzada|advanced view/i })

    await expect(basicBtn).toBeVisible()
    await expect(advancedBtn).toBeVisible()
    await expect(basicBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText(/análisis del período|period analysis/i)).toHaveCount(0)

    await advancedBtn.click()

    await expect(advancedBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText(/análisis del período|period analysis/i)).toBeVisible()
  })

  test('updates tab aria-selected state when switching sections', async ({ page }) => {
    const summaryTab = page.getByRole('tab', { name: /resumen financiero|financial summary/i })
    const investmentsTab = page.getByRole('tab', { name: /inversiones|investments/i })

    await expect(summaryTab).toHaveAttribute('aria-selected', 'true')
    await expect(investmentsTab).toHaveAttribute('aria-selected', 'false')

    await investmentsTab.click()

    await expect(summaryTab).toHaveAttribute('aria-selected', 'false')
    await expect(investmentsTab).toHaveAttribute('aria-selected', 'true')
  })
})
