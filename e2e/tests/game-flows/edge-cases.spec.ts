import { test, expect } from '@playwright/test';
const URL = 'http://localhost:3000/uno_game/';

test.describe('边缘场景', () => {
  test('Out模式可开始', async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.setItem('uno-server-url', 'http://localhost:3001'));
    await page.goto(URL);
    await expect(page.locator('h1')).toContainText('UNO', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.evaluate(() => (window as any).__E2E__?.setNickname('E2E'));
    await page.locator('button:has-text("创建新房间")').first().click({ force: true });
    await page.waitForTimeout(2000);

    // 切换到 Out 模式
    const outBtn = page.locator('button:has-text("Out模式")');
    if (await outBtn.isVisible().catch(() => false)) {
      await outBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    const text = await page.evaluate(() => document.body.textContent || '');
    expect(text).toMatch(/手牌上限|20张/);
    console.log('✅ Out模式设置可见');
  });

  test('PhaseTimer 显示', async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.setItem('uno-server-url', 'http://localhost:3001'));
    await page.goto(URL);
    await expect(page.locator('h1')).toContainText('UNO', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.evaluate(() => (window as any).__E2E__?.setNickname('E2E'));
    await page.locator('button:has-text("创建新房间")').first().click({ force: true });
    await page.waitForTimeout(2000);

    // 加 AI
    await page.locator('button:has-text("添加 AI")').click({ force: true });
    await page.waitForTimeout(500);
    await page.locator('button:has-text("确认添加")').click({ force: true });
    await page.waitForTimeout(1500);

    // 开始游戏
    await page.locator('button:has-text("开始游戏")').click({ force: true });
    await page.waitForTimeout(3000);

    const text = await page.evaluate(() => document.body.textContent || '');
    expect(text).toMatch(/Phase\s*0|摸牌/);
    console.log('✅ PhaseTimer 显示');
  });
});

// 以下机制由服务端单测覆盖:
// - UNO喊话/挑战: BaseGameModeV2.validateCallUno / validateChallenge
// - JumpIn抢牌: BaseGameModeV2.validateJumpIn / executeJumpIn
// - 连打检测: OutModeV2.validateCombo + detectCombos
// - 叠加惩罚: applyDrawEffect 累加模式
// - 反转弹回: executeReverse + penaltySourceId
// - 游戏胜利: PlayerManager.checkGameOver + calculateResult
// 运行: cd server && npx tsx src/test/index.ts
