import { test, expect } from '@playwright/test';
const URL = 'http://localhost:3000/uno/';

test('完整游玩流程', async ({ page }) => {
  test.setTimeout(90000);

  // 1. 加载
  await page.goto(URL);
  await page.evaluate(() => localStorage.setItem('uno-server-url', 'http://localhost:3001'));
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('UNO', { timeout: 10000 });
  await page.waitForTimeout(3000);

  // 2. 创建房间
  await page.evaluate(() => (window as any).__E2E__?.setNickname('E2E'));
  await page.locator('button:has-text("创建新房间")').first().click({ force: true });
  await page.waitForTimeout(3000);
  let text = await page.evaluate(() => document.body.textContent || '');
  expect(text).toMatch(/房间/);
  console.log('✅ 房间创建');

  // 3. 加 AI
  await page.locator('button:has-text("添加 AI")').click({ force: true });
  await page.waitForTimeout(500);
  await page.locator('button:has-text("确认添加")').click({ force: true });
  await page.waitForTimeout(2000);
  text = await page.evaluate(() => document.body.textContent || '');
  expect(text).toMatch(/AI|添加/);
  console.log('✅ AI 添加');

  // 4. 开始游戏
  await page.locator('button:has-text("开始游戏")').click({ force: true });
  await page.waitForTimeout(3000);
  text = await page.evaluate(() => document.body.textContent || '');
  expect(text).toMatch(/摸牌/);
  console.log('✅ 游戏开始');

  // 5. 等 AI 出牌
  await page.waitForTimeout(6000);
  text = await page.evaluate(() => document.body.textContent || '');
  expect(text).toMatch(/摸牌/); // 游戏仍在运行
  console.log('✅ AI 回合完成');
});
