import { defineConfig, devices } from '@playwright/test';

/**
 * UNO Online E2E 测试配置
 * 
 * 特性:
 * - 自动启动前后端服务器
 * - 支持本地开发和CI环境
 * - 失败自动重试
 * - 截图和视频记录
 */

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  
  // 并行配置
  fullyParallel: false, // E2E 测试通常需要顺序执行避免干扰
  forbidOnly: isCI,
  
  // 重试配置
  retries: isCI ? 2 : 1,
  
  // Worker 配置
  workers: 1, // 单 worker 避免测试间干扰
  
  // 超时配置
  timeout: 60000, // 单个测试 60 秒超时
  expect: {
    timeout: 10000, // expect 断言 10 秒超时
  },
  
  // 报告配置
  reporter: [
    ['list'],
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never',
    }],
    ['json', { 
      outputFile: 'test-results/test-results.json',
    }],
  ],
  
  // 共享配置
  use: {
    // 基础 URL
    baseURL: 'http://localhost:3000',
    
    // 追踪配置
    trace: 'on-first-retry',
    
    // 截图配置
    screenshot: 'only-on-failure',
    
    // 视频配置
    video: 'retain-on-failure',
    
    // 视口配置
    viewport: { width: 1280, height: 720 },
    
    // 动作超时
    actionTimeout: 15000,
    
    // 导航超时
    navigationTimeout: 20000,
  },

  // 项目配置
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
  ],

  // 本地开发服务器配置
  webServer: [
    // 后端服务器
    {
      command: 'cd ../server && npm run dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !isCI,
      timeout: 60000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    // 前端开发服务器
    {
      command: 'cd ../client && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !isCI,
      timeout: 60000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
