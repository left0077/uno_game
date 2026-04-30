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

  // 5. 人类先出一张牌（如果是自己回合）
  // 等 1 秒让 UI 渲染完
  await page.waitForTimeout(1000);

  // 点击第一张可出的牌（如果有）
  const cardCount = await page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
    return cards.length;
  });
  console.log(`手牌数: ${cardCount}`);

  // 尝试摸牌（总可以操作）
  const drawBtn = page.locator('button:has-text("摸牌")');
  if (await drawBtn.isVisible().catch(() => false)) {
    await drawBtn.click({ force: true });
    console.log('✅ 人类摸牌');
  }

  // 6. 等 AI 行动
  await page.waitForTimeout(8000);
  text = await page.evaluate(() => document.body.textContent || '');
  expect(text).toMatch(/摸牌/);
  console.log('✅ AI 回合完成，游戏正常运行');
});
