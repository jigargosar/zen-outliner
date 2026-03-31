import { defineConfig } from '@playwright/test'

const PORT = 5174

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}/zen-outliner/`,
    headless: true,
  },
  webServer: {
    command: `pnpm dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}/zen-outliner/`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
