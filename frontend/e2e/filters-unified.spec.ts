import { expect, test } from '@playwright/test'

test.describe('Unified filters - transactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })

  test('should persist quick period filter in url when page reloads', async ({ page }) => {
    // Act
    await page.getByRole('button', { name: /ultimos 7 dias|últimos 7 días|last 7 days/i }).first().click()
    await expect(page).toHaveURL(/period=7d/)

    await page.reload()

    // Assert
    await expect(page).toHaveURL(/period=7d/)
  })

  test('should clear query params when clear filters is pressed', async ({ page }) => {
    // Arrange
    await page.goto('/transactions?type=INCOME&period=custom&from=2025-01-01&to=2025-01-31')
    await expect(page).toHaveURL(/type=INCOME/)

    // Act
    await page.getByTestId('filters-clear-button').click()

    // Assert
    await expect(page).not.toHaveURL(/type=|period=|from=|to=/)
  })

  test('should remove a single active filter when chip remove is clicked', async ({ page }) => {
    // Arrange
    await page.goto('/transactions?type=INCOME')
    await expect(page).toHaveURL(/type=INCOME/)

    // Act
    await page.getByTestId('filter-chip-remove').first().click()

    // Assert
    await expect(page).not.toHaveURL(/type=INCOME/)
  })
})

test.describe('Unified filters - transactions mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('should open filter modal when open filters button is pressed', async ({ page }) => {
    // Arrange
    await page.goto('/transactions')

    // Act
    await page.getByTestId('filters-open-button').click()

    // Assert
    await expect(page.getByTestId('filters-close-button')).toBeVisible()
  })
})
