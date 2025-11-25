import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'reports/playwright-report' }]],
  use: {
    headless: true,
    actionTimeout: 5000,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
