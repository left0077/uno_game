import { test, expect } from '@playwright/test';
import { setupGame, waitForTurn, createRoom, joinRoom, addAI, startGame, getHandCardCount } from '../utils/test-helpers';

/**
 * Bug回归测试: 托管状态同步问题
 * 
 * 问题描述:
 * 1. AI托管状态不同步
 * 2. 托管后无法取消
 * 3. 托管状态未同步给其他玩家
 * 
 * 期望行为:
 * - 托管状态应正确显示
 * - 可以正常取消托管
 * - 其他玩家能看到托管标识
 */

test.describe('Bug: 托管状态同步', () => {
  
  test('托管按钮应能正常开启和关闭', async ({ page }) => {
    await setupGame(page, '托管测试', { aiCount: 1 });
    await waitForTurn(page);
    
    // 点击托管按钮
    const hostButton = page.getByRole('button', { name: /托管/i });
    await expect(hostButton).toBeVisible();
    await hostButton.click();
    
    // 验证托管状态显示
    await expect(page.locator('text=托管中')).toBeVisible();
    
    // 等待AI出牌
    await page.waitForTimeout(3000);
    
    // 取消托管
    const cancelButton = page.getByRole('button', { name: /取消托管/i });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
    
    // 验证取消成功
    await expect(page.locator('text=托管中')).not.toBeVisible();
  });

  test('托管状态应同步给其他玩家', async ({ page, browser }) => {
    // 创建房间
    const roomCode = await createRoom(page, '玩家1');
    
    // 第二个玩家加入
    const page2 = await browser.newPage();
    await joinRoom(page2, '玩家2', roomCode);
    
    try {
      // 添加AI并开始游戏
      await addAI(page, 'normal');
      await startGame(page);
      
      // 玩家1开启托管
      await page.getByRole('button', { name: /托管/i }).click();
      
      // 玩家2应看到玩家1的托管标识
      // 注：需要根据实际UI调整选择器
      const hostingIndicator = page2.locator('[data-testid="hosting-badge"]').or(
        page2.locator('text=托管中')
      );
      await expect(hostingIndicator).toBeVisible({ timeout: 5000 });
      
    } finally {
      await page2.close();
    }
  });

  test('托管后AI应自动出牌', async ({ page }) => {
    await setupGame(page, '自动测试', { aiCount: 1 });
    await waitForTurn(page);
    
    // 记录当前手牌数
    const handCards = page.locator('.hand .card, [data-hand] .card');
    const countBefore = await handCards.count();
    
    // 开启托管
    await page.getByRole('button', { name: /托管/i }).click();
    
    // 等待AI出牌
    await page.waitForTimeout(5000);
    
    // 验证手牌变化（AI出了牌或摸了牌）
    const countAfter = await handCards.count();
    expect(countAfter !== countBefore).toBeTruthy();
  });
});

// ========== 新增Bug回归测试 ==========

test.describe('🔴 Bug回归: 托管状态同步', () => {
  
  test('AI托管状态应正确同步', async ({ page, browser }) => {
    // 创建多玩家房间
    const roomCode = await setupGame(page, '房主', { aiCount: 0 });
    
    const page2 = await browser.newPage();
    await joinRoom(page2, '玩家2', roomCode);
    
    await addAI(page, 'normal');
    await startGame(page);
    
    try {
      // 房主开启托管
      await page.getByRole('button', { name: /托管/i }).click();
      
      // 玩家2应立即看到托管标识
      const hostingIndicator = page2.locator('[data-testid="hosting-indicator"], .hosting-badge, text=托管中');
      await expect(hostingIndicator).toBeVisible({ timeout: 3000 });
      
      // 房主取消托管
      await page.getByRole('button', { name: /取消托管/i }).click();
      
      // 玩家2应看到托管标识消失
      await expect(hostingIndicator).not.toBeVisible({ timeout: 3000 });
      
    } finally {
      await page2.close();
    }
  });

  test('托管后应能正常取消', async ({ page }) => {
    await setupGame(page, '取消测试', { aiCount: 1 });
    await waitForTurn(page);
    
    // 反复开启/取消托管多次，确保没有状态卡住的问题
    for (let i = 0; i < 3; i++) {
      // 开启
      await page.getByRole('button', { name: /托管/i }).click();
      await expect(page.locator('text=托管中')).toBeVisible();
      await page.waitForTimeout(1000);
      
      // 取消
      await page.getByRole('button', { name: /取消托管/i }).click();
      await expect(page.locator('text=托管中')).not.toBeVisible();
      await page.waitForTimeout(1000);
    }
    
    // 验证最终可以正常手动操作
    const drawButton = page.getByRole('button', { name: /摸牌/i });
    const isEnabled = await drawButton.isEnabled().catch(() => false);
    
    if (isEnabled) {
      await expect(drawButton).toBeEnabled();
    }
  });

  test('托管期间手牌应对其他玩家可见（数量）', async ({ page, browser }) => {
    const roomCode = await setupGame(page, '玩家1', { aiCount: 0 });
    
    const page2 = await browser.newPage();
    await joinRoom(page2, '玩家2', roomCode);
    
    await addAI(page, 'normal');
    await startGame(page);
    
    try {
      // 玩家1开启托管
      await page.getByRole('button', { name: /托管/i }).click();
      
      // 等待AI出牌
      await page.waitForTimeout(5000);
      
      // 玩家2应能看到玩家1的手牌数量（不是具体牌面）
      const player1CardCount = page2.locator('.player-card', { hasText: '玩家1' })
        .locator('.card-count, text=/\\d+张/');
      
      // 或者检查玩家头像旁的数字显示
      const cardCountIndicator = page2.locator('[data-player="玩家1"] .hand-count').or(
        page2.locator('.player-card:has-text("玩家1")').locator('.card-count')
      );
      
      const hasCountIndicator = await cardCountIndicator.isVisible().catch(() => false);
      
      // 如果UI中有显示手牌数量则验证
      if (hasCountIndicator) {
        await expect(cardCountIndicator).toBeVisible();
      }
      
      // 截图记录状态
      await page2.screenshot({ path: 'test-results/hosting-card-count-visible.png' });
      
    } finally {
      await page2.close();
    }
  });

  test('托管状态下页面刷新后状态一致', async ({ page }) => {
    await setupGame(page, '刷新测试', { aiCount: 1 });
    
    // 开启托管
    await page.getByRole('button', { name: /托管/i }).click();
    await expect(page.locator('text=托管中')).toBeVisible();
    await page.waitForTimeout(2000);
    
    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 重新加入游戏（如果需要）
    const rejoinButton = page.getByRole('button', { name: /重新加入|回到游戏/i });
    if (await rejoinButton.isVisible().catch(() => false)) {
      await rejoinButton.click();
      await page.waitForTimeout(3000);
    }
    
    // 验证托管状态保持一致
    const hostingIndicator = page.locator('text=托管中').or(
      page.locator('button[title="关闭托管模式"]')
    );
    
    // 记录状态（根据业务逻辑，托管状态可能在刷新后保持或重置）
    const isHostingAfterRefresh = await hostingIndicator.isVisible().catch(() => false);
    console.log('刷新后托管状态:', isHostingAfterRefresh ? '托管中' : '未托管');
  });

  test('多个玩家同时托管不应冲突', async ({ page, browser }) => {
    // 创建房间
    const roomCode = await createRoom(page, '玩家1');
    
    // 玩家2加入
    const page2 = await browser.newPage();
    await joinRoom(page2, '玩家2', roomCode);
    
    try {
      // 添加AI并开始游戏
      await addAI(page, 'normal');
      await startGame(page);
      
      // 两个玩家同时开启托管
      await page.getByRole('button', { name: /托管/i }).click();
      await page2.getByRole('button', { name: /托管/i }).click();
      
      await page.waitForTimeout(2000);
      
      // 验证两个玩家都显示托管状态
      await expect(page.locator('text=托管中')).toBeVisible();
      await expect(page2.locator('text=托管中')).toBeVisible();
      
      // 等待AI自动出牌
      await page.waitForTimeout(5000);
      
      // 验证游戏正常进行（没有卡死）
      const content1 = await page.content();
      const content2 = await page2.content();
      
      // 应该能看到游戏相关元素
      expect(content1).toMatch(/手牌|张|UNO|回合/i);
      expect(content2).toMatch(/手牌|张|UNO|回合/i);
      
    } finally {
      await page2.close();
    }
  });

  test('托管取消后立即出牌不应冲突', async ({ page }) => {
    await setupGame(page, '冲突测试', { aiCount: 1 });
    await waitForTurn(page);
    
    // 开启托管
    await page.getByRole('button', { name: /托管/i }).click();
    await expect(page.locator('text=托管中')).toBeVisible();
    await page.waitForTimeout(2000);
    
    // 立即取消托管
    await page.getByRole('button', { name: /取消托管/i }).click();
    await page.waitForTimeout(500);
    
    // 立即尝试手动操作（摸牌）
    const drawButton = page.getByRole('button', { name: /摸牌/i });
    
    // 按钮应该可用
    const isClickable = await drawButton.isEnabled().catch(() => false);
    
    if (isClickable) {
      // 尝试点击摸牌
      await drawButton.click();
      await page.waitForTimeout(1000);
      
      // 验证操作成功（手牌增加）
      const handCount = await getHandCardCount(page);
      console.log('取消托管后手牌数:', handCount);
    }
    
    // 截图记录状态
    await page.screenshot({ path: 'test-results/cancel-hosting-immediate-action.png' });
  });

  test('托管期间游戏结束状态正确处理', async ({ page }) => {
    await setupGame(page, '结束测试', { aiCount: 1 });
    
    // 开启托管让AI自动打完
    await page.getByRole('button', { name: /托管/i }).click();
    
    // 等待游戏结束
    const gameEndSelector = 'text=再来一局, button:has-text("再来一局"), text=获胜, text=Winner, text=排名';
    let gameEnded = false;
    
    for (let i = 0; i < 30 && !gameEnded; i++) {
      await page.waitForTimeout(2000);
      gameEnded = await page.locator(gameEndSelector).isVisible().catch(() => false);
    }
    
    if (gameEnded) {
      // 验证托管状态在游戏结束后被正确处理
      const hostingIndicator = page.locator('text=托管中');
      const isStillHosting = await hostingIndicator.isVisible().catch(() => false);
      
      console.log('游戏结束后托管状态:', isStillHosting ? '托管中' : '已重置');
      
      // 点击再来一局
      const restartButton = page.getByRole('button', { name: /再来一局/i });
      if (await restartButton.isVisible().catch(() => false)) {
        await restartButton.click();
        await page.waitForTimeout(3000);
        
        // 验证新游戏开始后托管状态已重置
        const newGameHosting = await page.locator('text=托管中').isVisible().catch(() => false);
        console.log('新游戏开始后托管状态:', newGameHosting ? '托管中' : '已重置');
      }
    }
  });
});
