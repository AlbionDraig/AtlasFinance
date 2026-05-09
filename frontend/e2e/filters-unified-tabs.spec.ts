import { expect, test, type Page } from '@playwright/test'

async function applySearchFilterAndClear(page: Page, url: string) {
  await page.goto(url)

  const searchInput = page.locator('.app-filter-card input[type="text"]').first()
  await searchInput.fill('qa')

  await expect(page.getByTestId('filters-clear-button')).toBeVisible()

  await page.getByTestId('filters-clear-button').click()

  await expect(page.getByTestId('filters-clear-button')).toHaveCount(0)
}

async function openFiltersOnMobile(page: Page, url: string) {
  await page.goto(url)

  await page.getByTestId('filters-open-button').click()
  await expect(page.getByTestId('filters-mobile-panel')).toBeVisible()

  await page.getByTestId('filters-close-button').click()
  await expect(page.getByTestId('filters-mobile-panel')).toHaveCount(0)
}

test.describe('Unified filters - categories and management', () => {
  test('should clear filters in categories page', async ({ page }) => {
    await applySearchFilterAndClear(page, '/categories')
  })

  test('should clear filters in management page', async ({ page }) => {
    await page.goto('/management')

    const hasSearchFilter = (await page.locator('.app-filter-card input[type="text"]').count()) > 0
    test.skip(!hasSearchFilter, 'management filters require admin session')

    await applySearchFilterAndClear(page, '/management')
  })
})

test.describe('Unified filters - admin tabs', () => {
  test('should clear filters in admin banks tab', async ({ page }) => {
    await applySearchFilterAndClear(page, '/admin?tab=banks')
  })

  test('should clear filters in admin countries tab', async ({ page }) => {
    await applySearchFilterAndClear(page, '/admin?tab=countries')
  })

  test('should clear filters in admin investment entities tab', async ({ page }) => {
    await applySearchFilterAndClear(page, '/admin?tab=investment-entities')
  })

  test('should clear filters in admin categories tab', async ({ page }) => {
    await applySearchFilterAndClear(page, '/admin?tab=categories')
  })
})

test.describe('Unified filters - mobile tabs', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('should open and close filters in categories page', async ({ page }) => {
    await openFiltersOnMobile(page, '/categories')
  })

  test('should open and close filters in management page', async ({ page }) => {
    await page.goto('/management')

    const hasOpenButton = (await page.getByTestId('filters-open-button').count()) > 0
    test.skip(!hasOpenButton, 'management filters require admin session')

    await openFiltersOnMobile(page, '/management')
  })

  test('should open and close filters in admin banks tab', async ({ page }) => {
    await openFiltersOnMobile(page, '/admin?tab=banks')
  })

  test('should open and close filters in admin countries tab', async ({ page }) => {
    await openFiltersOnMobile(page, '/admin?tab=countries')
  })

  test('should open and close filters in admin investment entities tab', async ({ page }) => {
    await openFiltersOnMobile(page, '/admin?tab=investment-entities')
  })

  test('should open and close filters in admin categories tab', async ({ page }) => {
    await openFiltersOnMobile(page, '/admin?tab=categories')
  })

  test('should open and close filters in dashboard summary tab', async ({ page }) => {
    await openFiltersOnMobile(page, '/dashboard?tab=resumen')
  })

  test('should open and close filters in dashboard investments tab', async ({ page }) => {
    await openFiltersOnMobile(page, '/dashboard?tab=inversiones')
  })
})
