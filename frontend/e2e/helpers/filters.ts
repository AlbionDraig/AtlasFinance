import { expect, type Page } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_EMAIL ?? 'jane.doe@sgb.co'
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'Strong/Pass|123'

export async function fillLoginForm(page: Page, email: string, password: string) {
  const emailField = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i))
  const passwordField = page.getByLabel(/contraseña|password/i).or(page.getByPlaceholder(/contraseña|password/i))
  await emailField.fill(email)
  await passwordField.fill(password)
}

export async function ensureAuthenticatedAt(page: Page, url: string) {
  await page.goto(url)

  if (/\/login/.test(page.url())) {
    await fillLoginForm(page, TEST_EMAIL, TEST_PASSWORD)
    await page.getByRole('button', { name: /iniciar sesión|sign in|log in/i }).click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await page.goto(url)
  }

  await page.waitForLoadState('domcontentloaded')
}

export async function selectOptionFromFilter(page: Page, label: RegExp, option: RegExp) {
  const filterLabel = page.locator('label').filter({ hasText: label }).first()
  const filterContainer = filterLabel.locator('xpath=ancestor::div[1]')

  await filterContainer.getByTestId('select-trigger').first().click()
  await page.locator('ul.app-menu').getByRole('button', { name: option }).click()
}

export async function selectOptionFromFilterByValue(page: Page, label: RegExp, value: string) {
  const filterLabel = page.locator('label').filter({ hasText: label }).first()
  const filterContainer = filterLabel.locator('xpath=ancestor::div[1]')

  await filterContainer.getByTestId('select-trigger').first().click()
  await page.getByTestId(`select-option-${value}`).first().click()
}

export async function applySearchFilterAndClear(page: Page, url: string, value = 'qa') {
  await ensureAuthenticatedAt(page, url)

  const searchInput = page.locator('.app-filter-card input[type="text"]').first()
  await expect(searchInput).toBeVisible({ timeout: 10_000 })
  await searchInput.fill(value)

  await expect(page.getByTestId('filters-clear-button')).toBeVisible()
  await page.getByTestId('filters-clear-button').click()
  await expect(page.getByTestId('filters-clear-button')).toHaveCount(0)
}

export async function openFiltersOnMobile(page: Page, url: string) {
  await ensureAuthenticatedAt(page, url)

  await expect(page.getByTestId('filters-open-button')).toBeVisible({ timeout: 10_000 })
  await page.getByTestId('filters-open-button').click()
  await expect(page.getByTestId('filters-mobile-panel')).toBeVisible()
}

export async function closeFiltersOnMobile(page: Page) {
  await page.getByTestId('filters-close-button').click()
  await expect(page.getByTestId('filters-mobile-panel')).toHaveCount(0)
}
