import { expect, test } from '@playwright/test'
import { ensureAuthenticatedAt, selectOptionFromFilterByValue } from './helpers/filters'

test.describe('Unified filters - accounts', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticatedAt(page, '/accounts')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })

  test('should show clear filters action when a currency filter is selected', async ({ page }) => {
    await selectOptionFromFilterByValue(page, /moneda|currency/i, 'COP')

    await expect(page.getByTestId('filters-clear-button')).toBeVisible()
  })

  test('should hide clear filters action after resetting selected filters', async ({ page }) => {
    await selectOptionFromFilterByValue(page, /moneda|currency/i, 'COP')
    await page.getByTestId('filters-clear-button').click()

    await expect(page.getByTestId('filters-clear-button')).toHaveCount(0)
  })
})

test.describe('Unified filters - accounts mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('should open filters modal on mobile', async ({ page }) => {
    await ensureAuthenticatedAt(page, '/accounts')
    await page.getByTestId('filters-open-button').click()

    await expect(page.getByTestId('filters-close-button')).toBeVisible()
  })
})

test.describe('Unified filters - pockets', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticatedAt(page, '/pockets')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })

  test('should show clear filters action when a currency filter is selected', async ({ page }) => {
    await selectOptionFromFilterByValue(page, /moneda|currency/i, 'COP')

    await expect(page.getByTestId('filters-clear-button')).toBeVisible()
  })

  test('should hide clear filters action after resetting selected filters', async ({ page }) => {
    await selectOptionFromFilterByValue(page, /moneda|currency/i, 'COP')
    await page.getByTestId('filters-clear-button').click()

    await expect(page.getByTestId('filters-clear-button')).toHaveCount(0)
  })
})

test.describe('Unified filters - pockets mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('should open filters modal on mobile', async ({ page }) => {
    await ensureAuthenticatedAt(page, '/pockets')
    await page.getByTestId('filters-open-button').click()

    await expect(page.getByTestId('filters-close-button')).toBeVisible()
  })
})

test.describe('Unified filters - investments', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticatedAt(page, '/investments')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })

  test('should show clear filters action when a currency filter is selected', async ({ page }) => {
    await selectOptionFromFilterByValue(page, /moneda|currency/i, 'COP')

    await expect(page.getByTestId('filters-clear-button')).toBeVisible()
  })

  test('should hide clear filters action after resetting selected filters', async ({ page }) => {
    await selectOptionFromFilterByValue(page, /moneda|currency/i, 'COP')
    await page.getByTestId('filters-clear-button').click()

    await expect(page.getByTestId('filters-clear-button')).toHaveCount(0)
  })
})

test.describe('Unified filters - investments mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('should open filters modal on mobile', async ({ page }) => {
    await ensureAuthenticatedAt(page, '/investments')
    await page.getByTestId('filters-open-button').click()

    await expect(page.getByTestId('filters-close-button')).toBeVisible()
  })
})
