import { chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const E2E_EMAIL = process.env.E2E_EMAIL ?? 'jane.doe@sgb.co'
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'Strong/Pass|123'
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

/**
 * Global setup: performs a single login and persists the browser storage state.
 * All authenticated tests reuse this state instead of calling the login API
 * individually — avoids exhausting the per-minute rate limit when many workers
 * run in parallel.
 */
async function globalSetup() {
  // process.cwd() is the frontend/ directory when running `npm run test:e2e`
  const authDir = path.join(process.cwd(), 'e2e', '.auth')
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Navigate and wait until the React app renders the login form.
  await page.goto(`${BASE_URL}/login`, { timeout: 60_000 })
  await page.waitForURL(/\/login/, { timeout: 60_000 })

  // Use attribute selectors — the FormField component doesn't link <label> with
  // htmlFor, so getByLabel() is unreliable; target inputs by type directly.
  const emailField = page.locator('input[type="email"], input[autocomplete="username"]').first()
  const passwordField = page.locator('input[type="password"], input[autocomplete="current-password"]').first()
  await emailField.waitFor({ state: 'visible', timeout: 30_000 })
  await emailField.fill(E2E_EMAIL)
  await passwordField.fill(E2E_PASSWORD)
  await page.getByRole('button', { name: /iniciar sesión|sign in|log in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 })

  await page.context().storageState({ path: path.join(authDir, 'user.json') })
  await context.close()
  await browser.close()
}

export default globalSetup
