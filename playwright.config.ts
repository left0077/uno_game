import { defineConfig } from './e2e/node_modules/@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 15000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 5000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } } },
  ],
  // 服务器手动启动，测试直接连已有服务
  webServer: [
    { command: 'cd server && npm run dev', url: 'http://localhost:3001/health', reuseExistingServer: true, timeout: 10000 },
    { command: 'cd client && npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 10000 },
  ],
});
