import { test, expect } from '@playwright/test';

test.describe('核心功能验证', () => {
  test('首页加载正常', async ({ page }) => {
    await page.goto('http://localhost:3000/uno/');
    await expect(page.locator('h1')).toContainText('UNO', { timeout: 15000 });
  });
});
