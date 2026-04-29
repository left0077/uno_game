import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } } },
  ],
  webServer: [
    { command: 'cd server && npm run dev', url: 'http://localhost:3001/health', reuseExistingServer: true, timeout: 60000 },
    { command: 'cd client && npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 60000 },
  ],
});
