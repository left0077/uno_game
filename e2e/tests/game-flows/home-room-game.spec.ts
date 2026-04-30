import { test, expect } from '@playwright/test';

const URL = 'http://localhost:3000/uno/';

test.describe('首页渲染', () => {
  test('标题 UNO 可见', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('h1')).toContainText('UNO');
  });
});

test.describe('交互：创建房间', () => {
  test('输入昵称点击创建 → 进入房间页', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('h1')).toContainText('UNO');
    await page.waitForTimeout(2000);

    await page.locator('input').first().fill('E2E');
    await page.locator('button:has-text("创建")').first().click();

    // 房间页应该显示房间码
    await expect(page.locator('text=房间:')).toBeVisible({ timeout: 15000 });
  });

  test('添加AI → 开始游戏', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('h1')).toContainText('UNO');
    await page.waitForTimeout(2000);

    // 创建房间
    await page.locator('input').first().fill('E2E');
    await page.locator('button:has-text("创建")').first().click();
    await expect(page.locator('text=房间:')).toBeVisible({ timeout: 15000 });

    // 加 AI
    await page.locator('button:has-text("添加")').first().click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("确认添加")').click();
    await page.waitForTimeout(1500);
    expect(await page.locator('text=AI').count()).toBeGreaterThan(0);

    // 开始游戏
    await page.locator('button:has-text("开始游戏")').click();
    await expect(page.locator('button:has-text("摸牌")')).toBeVisible({ timeout: 15000 });
  });
});
