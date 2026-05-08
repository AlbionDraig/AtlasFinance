import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration.
 * Tests run against the dev server (port 5173).
 * Set E2E_BASE_URL env var to override for CI against a deployed environment.
 *
 * Authentication strategy: a single login is performed in globalSetup and the
 * resulting storage state is reused by all tests. This avoids exhausting the
 * per-minute login rate limit when many workers run in parallel.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    storageState: 'e2e/.auth/user.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      testIgnore: /firefox-smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-smoke',
      testMatch: /firefox-smoke\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  // Start the dev server automatically when running locally.
  // In CI the server should already be running (separate step).
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
