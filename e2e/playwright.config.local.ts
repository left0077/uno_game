import { defineConfig, devices } from '@playwright/test';

/**
 * 本地开发测试配置
 * 
 * 适用于:
 * - 本地开发时快速测试
 * - 已手动启动前后端服务器的情况
 * 
 * 使用方法:
 * npx playwright test --config=playwright.config.local.ts
 */

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  reporter: [
    ['list'],
    ['html', { 
      outputFolder: 'playwright-report-local',
      open: 'never',
    }],
  ],
  use: {
    // 假设开发服务器已在运行
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  // 不自动启动服务器，假设已手动启动
});
