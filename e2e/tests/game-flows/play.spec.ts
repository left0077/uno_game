import { test, expect } from '@playwright/test';

const URL = 'http://localhost:3000/uno/';

test.describe('E2E 渲染验证', () => {
  test('首页加载正常', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('h1')).toContainText('UNO');
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('创建房间按钮存在', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('h1')).toContainText('UNO');
    await expect(page.locator('button:has-text("创建")').first()).toBeAttached();
  });

  test('E2E helper 可用', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('h1')).toContainText('UNO');
    // 验证 __E2E__ 接口已暴露
    const hasHelper = await page.evaluate(() => !!(window as any).__E2E__);
    expect(hasHelper).toBe(true);
  });
});

// 交互测试需要稳定的 socket 连接，暂时通过服务端单测覆盖游戏规则
// 手动验证：打开 http://localhost:3000/uno/ 体验完整流程
