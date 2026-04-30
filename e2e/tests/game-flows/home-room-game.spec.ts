/**
 * 核心流程 E2E 测试
 */
import { test, expect } from '@playwright/test';

const URL = 'http://localhost:3000/uno/';

// 辅助：准备好首页（等标题出现 + 等按钮可用）
async function readyHome(page: any) {
  await page.goto(URL);
  await page.evaluate(() => localStorage.setItem('uno-server-url', 'http://localhost:3001'));
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('UNO');
  // 等按钮变成可用（不再是 disabled 状态）
  await page.waitForFunction(() => {
    const btn = document.querySelector('button');
    return btn && !btn.disabled;
  }, { timeout: 15000 });
}

test.describe('首页', () => {
  test('显示 UNO 标题', async ({ page }) => {
    await readyHome(page);
  });
});

test.describe('房间', () => {
  test('创建房间并显示开始按钮', async ({ page }) => {
    await readyHome(page);
    await page.locator('input[placeholder*="输入"]').first().fill('测试玩家');
    await page.click('text=创建新房间');
    await expect(page.locator('text=开始游戏')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('AI', () => {
  test('添加AI后可见AI标签', async ({ page }) => {
    await readyHome(page);
    await page.locator('input[placeholder*="输入"]').first().fill('测试');
    await page.click('text=创建新房间');
    await expect(page.locator('text=开始游戏')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    await page.click('text=添加 AI');
    await page.waitForTimeout(500);
    await page.click('text=确认添加');
    await page.waitForTimeout(500);

    await expect(page.locator('text=AI').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('游戏', () => {
  test('开始后看到摸牌按钮', async ({ page }) => {
    await readyHome(page);
    await page.locator('input[placeholder*="输入"]').first().fill('测试');
    await page.click('text=创建新房间');
    await expect(page.locator('text=开始游戏')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    await page.click('text=添加 AI');
    await page.waitForTimeout(500);
    await page.click('text=确认添加');
    await page.waitForTimeout(1000);

    await page.click('text=开始游戏');
    await page.waitForTimeout(3000);

    await expect(page.locator('button:has-text("摸牌")')).toBeVisible({ timeout: 10000 });
  });
});
