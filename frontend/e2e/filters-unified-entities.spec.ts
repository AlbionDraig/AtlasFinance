import { expect, test, type Page } from '@playwright/test'

async function selectOptionFromFilter(page: Page, label: RegExp, option: RegExp) {
  const filterLabel = page.locator('label').filter({ hasText: label }).first()
  const filterContainer = filterLabel.locator('xpath=ancestor::div[1]')

  await filterContainer.getByRole('button').first().click()
  await page.locator('ul.app-menu').getByRole('button', { name: option }).click()
}

test.describe('Unified filters - accounts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounts')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })

  test('should show clear filters action when a currency filter is selected', async ({ page }) => {
    await selectOptionFromFilter(page, /moneda|currency/i, /^COP$/)

    await expect(page.getByTestId('filters-clear-button')).toBeVisible()
  })

  test('should hide clear filters action after resetting selected filters', async ({ page }) => {
    await selectOptionFromFilter(page, /moneda|currency/i, /^COP$/)
    await page.getByTestId('filters-clear-button').click()

    await expect(page.getByTestId('filters-clear-button')).toHaveCount(0)
  })
})

test.describe('Unified filters - accounts mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('should open filters modal on mobile', async ({ page }) => {
    await page.goto('/accounts')
    await page.getByTestId('filters-open-button').click()

    await expect(page.getByTestId('filters-close-button')).toBeVisible()
  })
})

test.describe('Unified filters - pockets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pockets')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })

  test('should show clear filters action when a currency filter is selected', async ({ page }) => {
    await selectOptionFromFilter(page, /moneda|currency/i, /^COP$/)

    await expect(page.getByTestId('filters-clear-button')).toBeVisible()
  })

  test('should hide clear filters action after resetting selected filters', async ({ page }) => {
    await selectOptionFromFilter(page, /moneda|currency/i, /^COP$/)
    await page.getByTestId('filters-clear-button').click()

    await expect(page.getByTestId('filters-clear-button')).toHaveCount(0)
  })
})

test.describe('Unified filters - pockets mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('should open filters modal on mobile', async ({ page }) => {
    await page.goto('/pockets')
    await page.getByTestId('filters-open-button').click()

    await expect(page.getByTestId('filters-close-button')).toBeVisible()
  })
})

test.describe('Unified filters - investments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/investments')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })

  test('should show clear filters action when a currency filter is selected', async ({ page }) => {
    await selectOptionFromFilter(page, /moneda|currency/i, /^COP$/)

    await expect(page.getByTestId('filters-clear-button')).toBeVisible()
  })

  test('should hide clear filters action after resetting selected filters', async ({ page }) => {
    await selectOptionFromFilter(page, /moneda|currency/i, /^COP$/)
    await page.getByTestId('filters-clear-button').click()

    await expect(page.getByTestId('filters-clear-button')).toHaveCount(0)
  })
})

test.describe('Unified filters - investments mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('should open filters modal on mobile', async ({ page }) => {
    await page.goto('/investments')
    await page.getByTestId('filters-open-button').click()

    await expect(page.getByTestId('filters-close-button')).toBeVisible()
  })
})
