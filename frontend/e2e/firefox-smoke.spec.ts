import { test, expect } from '@playwright/test'

test.describe('Firefox smoke', () => {
  test('logs in and renders dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('opens transactions and renders the page shell', async ({ page }) => {
    await page.goto('/transactions')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  })
})
