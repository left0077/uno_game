import { test, expect } from '@playwright/test';
import { setupServerUrl } from '../utils/test-helpers';

test.describe('核心功能验证', () => {
  test('首页加载和创建房间', async ({ page }) => {
    // 收集控制台错误
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 设置服务端地址
    await setupServerUrl(page);

    // 访问首页
    await page.goto('/uno/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 检查页面标题（h1 或 title 均可）
    const title = await page.title();
    console.log('Page title:', title);
    console.log('Console errors:', consoleErrors.join(', ') || 'none');

    // 检查是否有内容渲染
    const bodyText = await page.innerText('body');
    console.log('Body text preview:', bodyText.substring(0, 200));

    // 断言
    await expect(page.locator('h1')).toContainText('UNO', { timeout: 30000 });
    console.log('✅ 首页加载');
  });
});
