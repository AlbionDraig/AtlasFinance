import { expect, test } from '@playwright/test'
import { applySearchFilterAndClear, closeFiltersOnMobile, ensureAuthenticatedAt, openFiltersOnMobile } from './helpers/filters'

test.describe('Unified filters - categories and management', () => {
  test('should clear filters in categories page', async ({ page }) => {
    await applySearchFilterAndClear(page, '/categories')
  })

  test('should clear filters in management page', async ({ page }) => {
    await ensureAuthenticatedAt(page, '/management')

    const hasSearchFilter = (await page.locator('.app-filter-card input[type="text"]').count()) > 0
    if (hasSearchFilter) {
      await applySearchFilterAndClear(page, '/management')
      return
    }

    await expect(page.getByTestId('filters-clear-button')).toHaveCount(0)
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
    await closeFiltersOnMobile(page)
  })

  test('should open and close filters in management page', async ({ page }) => {
    await ensureAuthenticatedAt(page, '/management')

    const hasOpenButton = (await page.getByTestId('filters-open-button').count()) > 0
    if (hasOpenButton) {
      await openFiltersOnMobile(page, '/management')
      await closeFiltersOnMobile(page)
      return
    }

    await expect(page.getByTestId('filters-open-button')).toHaveCount(0)
  })

  test('should open and close filters in admin banks tab', async ({ page }) => {
    await openFiltersOnMobile(page, '/admin?tab=banks')
    await closeFiltersOnMobile(page)
  })

  test('should open and close filters in admin countries tab', async ({ page }) => {
    await openFiltersOnMobile(page, '/admin?tab=countries')
    await closeFiltersOnMobile(page)
  })

  test('should open and close filters in admin investment entities tab', async ({ page }) => {
    await openFiltersOnMobile(page, '/admin?tab=investment-entities')
    await closeFiltersOnMobile(page)
  })

  test('should open and close filters in admin categories tab', async ({ page }) => {
    await openFiltersOnMobile(page, '/admin?tab=categories')
    await closeFiltersOnMobile(page)
  })

  test('should open and close filters in dashboard summary tab', async ({ page }) => {
    await openFiltersOnMobile(page, '/dashboard?tab=resumen')
    await closeFiltersOnMobile(page)
  })

  test('should open and close filters in dashboard investments tab', async ({ page }) => {
    await openFiltersOnMobile(page, '/dashboard?tab=inversiones')
    await closeFiltersOnMobile(page)
  })
})
