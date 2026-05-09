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

    await expect(page.getByRole('button', { name: /limpiar filtros|clear filters/i })).toBeVisible()
  })

  test('should hide clear filters action after resetting selected filters', async ({ page }) => {
    await selectOptionFromFilter(page, /moneda|currency/i, /^COP$/)
    await page.getByRole('button', { name: /limpiar filtros|clear filters/i }).click()

    await expect(page.getByRole('button', { name: /limpiar filtros|clear filters/i })).toHaveCount(0)
  })
})

test.describe('Unified filters - accounts mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('should open filters modal on mobile', async ({ page }) => {
    await page.goto('/accounts')
    await page.getByRole('button', { name: /abrir filtros|open filters/i }).click()

    await expect(page.getByRole('button', { name: /cerrar|close/i })).toBeVisible()
  })
})

test.describe('Unified filters - pockets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pockets')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })

  test('should show clear filters action when a currency filter is selected', async ({ page }) => {
    await selectOptionFromFilter(page, /moneda|currency/i, /^COP$/)

    await expect(page.getByRole('button', { name: /limpiar filtros|clear filters/i })).toBeVisible()
  })

  test('should hide clear filters action after resetting selected filters', async ({ page }) => {
    await selectOptionFromFilter(page, /moneda|currency/i, /^COP$/)
    await page.getByRole('button', { name: /limpiar filtros|clear filters/i }).click()

    await expect(page.getByRole('button', { name: /limpiar filtros|clear filters/i })).toHaveCount(0)
  })
})

test.describe('Unified filters - pockets mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('should open filters modal on mobile', async ({ page }) => {
    await page.goto('/pockets')
    await page.getByRole('button', { name: /abrir filtros|open filters/i }).click()

    await expect(page.getByRole('button', { name: /cerrar|close/i })).toBeVisible()
  })
})
