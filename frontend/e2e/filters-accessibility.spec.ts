import { expect, test } from '@playwright/test'
import { ensureAuthenticatedAt } from './helpers/filters'

test.describe('Filters accessibility - mobile keyboard', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticatedAt(page, '/transactions')
    await expect(page.getByTestId('filters-open-button')).toBeVisible({ timeout: 10_000 })
  })

  test('should move focus to close button when opening filters with keyboard', async ({ page }) => {
    const openButton = page.getByTestId('filters-open-button')
    await openButton.focus()
    await expect(openButton).toBeFocused()

    await page.keyboard.press('Enter')

    const closeButton = page.getByTestId('filters-close-button')
    await expect(page.getByTestId('filters-mobile-panel')).toBeVisible()
    await expect(closeButton).toBeFocused()
  })

  test('should keep tab focus inside filters modal', async ({ page }) => {
    const openButton = page.getByTestId('filters-open-button')
    await openButton.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('filters-mobile-panel')).toBeVisible()

    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab')
    }

    const focusInsideAfterTab = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null
      return !!active?.closest('[data-testid="filters-mobile-panel"]')
    })
    expect(focusInsideAfterTab).toBeTruthy()

    for (let i = 0; i < 3; i += 1) {
      await page.keyboard.press('Shift+Tab')
    }

    const focusInsideAfterShiftTab = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null
      return !!active?.closest('[data-testid="filters-mobile-panel"]')
    })
    expect(focusInsideAfterShiftTab).toBeTruthy()
  })

  test('should close filters with escape and restore focus to open button', async ({ page }) => {
    const openButton = page.getByTestId('filters-open-button')
    await openButton.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('filters-mobile-panel')).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(page.getByTestId('filters-mobile-panel')).toHaveCount(0)
    await expect(openButton).toBeFocused()
  })
})
