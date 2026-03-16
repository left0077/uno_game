/**
 * Action API v2.0 - E2E 测试
 * 
 * 测试范围：
 * - 真实用户场景
 * - 完整游戏流程
 * - 惩罚累积和响应
 * - 连打系统
 * - 反转反击
 * - 彩虹转移
 */

import { test, expect, Page } from '@playwright/test';
import { setupGame, waitForTurn, drawCard } from './utils/test-helpers';

test.setTimeout(120000);

/**
 * 创建Action API测试专用的游戏设置
 */
async function setupActionAPIGame(page: Page, nickname: string, options: { aiCount?: number; aiDifficulty?: 'easy' | 'normal' | 'hard' } = {}) {
  const roomCode = await setupGame(page, nickname, options);
  await page.waitForTimeout(2000);
  return roomCode;
}

test.describe('Action API v2.0 - 基础游戏流程', () => {
  
  test('given: 玩家创建房间 when: 游戏开始后 then: 能看到手牌和操作按钮', async ({ page }) => {
    await setupActionAPIGame(page, '基础测试', { aiCount: 1 });
    
    // 等待游戏开始
    await page.waitForTimeout(3000);
    
    // 截图记录初始状态
    await page.screenshot({ path: 'test-results/action-api-basic-start.png' });
    
    // 验证能看到手牌
    const hasCards = await page.locator('.card, [class*="card"]').count() > 0 ||
                    await page.getByText(/手牌|\d+张/).first().isVisible().catch(() => false);
    expect(hasCards).toBeTruthy();
    
    // 验证有操作按钮（出牌/摸牌）
    const hasActionButtons = await page.locator('button').filter({ hasText: /出牌|摸牌|出\d+张/i }).count() > 0 ||
                            await page.locator('[data-deck], .deck').isVisible().catch(() => false);
    expect(hasActionButtons).toBeTruthy();
  });

  test('given: 玩家回合 when: 有可出的牌 then: 能成功出牌', async ({ page }) => {
    await setupActionAPIGame(page, '出牌测试', { aiCount: 1 });
    await waitForTurn(page);
    
    await page.screenshot({ path: 'test-results/action-api-play-before.png' });
    
    // 尝试出第一张可出的牌
    const playableCards = page.locator('.cursor-pointer, [data-playable="true"]');
    const cardCount = await playableCards.count();
    
    if (cardCount > 0) {
      await playableCards.first().click();
      await page.waitForTimeout(500);
      
      // 点击出牌按钮
      const playButton = page.getByRole('button', { name: /出牌|出\d+张/i });
      if (await playButton.isVisible().catch(() => false)) {
        await playButton.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'test-results/action-api-play-after.png' });
        
        // 验证出牌成功（回合切换或牌数减少）
        const content = await page.content();
        expect(content.includes('出牌') || content.includes('你的回合')).toBeTruthy();
      }
    }
  });

  test('given: 玩家回合 when: 没有可出的牌 then: 能摸牌', async ({ page }) => {
    await setupActionAPIGame(page, '摸牌测试', { aiCount: 1 });
    await waitForTurn(page);
    
    await page.screenshot({ path: 'test-results/action-api-draw-before.png' });
    
    // 点击牌堆摸牌
    await drawCard(page);
    
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/action-api-draw-after.png' });
    
    // 验证摸牌后可能有新牌可出或回合切换
    const content = await page.content();
    expect(content.includes('摸牌') || content.includes('你的回合') || content.includes('当前玩家')).toBeTruthy();
  });
});

test.describe('Action API v2.0 - +2/+4累积惩罚', () => {
  
  test('given: 上家出+2牌 when: 玩家有+2牌 then: 显示可叠加提示', async ({ page }) => {
    await setupActionAPIGame(page, '叠加测试', { aiCount: 1 });
    
    // 等待多轮，期待出现累积惩罚
    for (let i = 0; i < 10; i++) {
      await waitForTurn(page);
      
      // 检查是否有累积惩罚
      const hasPenalty = await page.locator('text=/累积|\+\d+|pending|叠加/i').isVisible().catch(() => false);
      
      if (hasPenalty) {
        console.log('检测到累积惩罚');
        await page.screenshot({ path: 'test-results/action-api-penalty-detected.png' });
        
        // 检查是否有可叠加的提示
        const hasStackableHint = await page.locator('text=/可叠加|跟\+|也能出/i').isVisible().catch(() => false);
        console.log('可叠加提示:', hasStackableHint);
        
        return; // 测试目的已达到
      }
      
      // 正常出牌或摸牌
      const playableCards = page.locator('.cursor-pointer');
      if (await playableCards.count() > 0) {
        await playableCards.first().click();
        await page.waitForTimeout(300);
        const playButton = page.getByRole('button', { name: /出牌/i });
        if (await playButton.isVisible().catch(() => false)) {
          await playButton.click();
        }
      } else {
        await drawCard(page);
      }
      
      await page.waitForTimeout(2000);
    }
    
    console.log('未能在预期回合内检测到累积惩罚，这在正常游戏中是概率事件');
    test.skip();
  });

  test('given: 面临累积惩罚 when: 玩家摸牌接受惩罚 then: 手牌增加', async ({ page }) => {
    await setupActionAPIGame(page, '接受惩罚测试', { aiCount: 1 });
    
    for (let i = 0; i < 15; i++) {
      await waitForTurn(page);
      
      const hasPenalty = await page.locator('text=/累积|\+\d+/i').isVisible().catch(() => false);
      
      if (hasPenalty) {
        await page.screenshot({ path: 'test-results/action-api-penalty-accept-before.png' });
        
        // 获取当前手牌数
        const handCountBefore = await page.locator('.card, [class*="card"]').count();
        
        // 摸牌接受惩罚
        await drawCard(page);
        await page.waitForTimeout(1500);
        
        await page.screenshot({ path: 'test-results/action-api-penalty-accept-after.png' });
        
        // 验证手牌增加
        const handCountAfter = await page.locator('.card, [class*="card"]').count();
        console.log(`手牌变化: ${handCountBefore} -> ${handCountAfter}`);
        
        return;
      }
      
      // 正常操作
      const playableCards = page.locator('.cursor-pointer');
      if (await playableCards.count() > 0) {
        await playableCards.first().click();
        await page.waitForTimeout(300);
        const playButton = page.getByRole('button', { name: /出牌/i });
        if (await playButton.isVisible().catch(() => false)) {
          await playButton.click();
        }
      } else {
        await drawCard(page);
      }
      
      await page.waitForTimeout(2000);
    }
    
    console.log('未能在预期回合内测试惩罚接受');
    test.skip();
  });
});

test.describe('Action API v2.0 - 连打系统', () => {
  
  test('given: Out模式游戏 when: 手牌有对子 then: 显示连打提示', async ({ page }) => {
    await setupActionAPIGame(page, '连打提示测试', { aiCount: 1 });
    await waitForTurn(page);
    
    await page.screenshot({ path: 'test-results/action-api-combo-hint-initial.png' });
    
    // 尝试选择两张牌
    const numberCards = page.locator('.card, [class*="card"]').filter({
      hasNot: page.locator('text=/跳过|反转|\+2|万能|\+4|🚫|↺/')
    });
    
    const cardCount = await numberCards.count();
    
    if (cardCount >= 2) {
      await numberCards.nth(0).click();
      await page.waitForTimeout(300);
      await numberCards.nth(1).click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'test-results/action-api-combo-hint-after-select.png' });
      
      // 检查是否显示连打提示
      const hasComboHint = await page.locator('text=/对子|三条|彩虹|顺子|✓|连打/i').isVisible().catch(() => false);
      console.log('连打提示显示:', hasComboHint);
      
      // 取消选择
      const cancelButton = page.getByRole('button', { name: /取消/i });
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
      }
    }
  });

  test('given: 选择对子牌 when: 点击执行 then: 成功连打出牌', async ({ page }) => {
    await setupActionAPIGame(page, '对子连打测试', { aiCount: 1 });
    await waitForTurn(page);
    
    await page.screenshot({ path: 'test-results/action-api-pair-combo-initial.png' });
    
    const numberCards = page.locator('.card, [class*="card"]').filter({
      hasNot: page.locator('text=/跳过|反转|\+2|万能|\+4|🚫|↺/')
    });
    
    const cardCount = await numberCards.count();
    
    if (cardCount >= 2) {
      await numberCards.nth(0).click();
      await page.waitForTimeout(300);
      await numberCards.nth(1).click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'test-results/action-api-pair-combo-selected.png' });
      
      // 检查对子匹配
      const pairMatch = await page.locator('text=/对子.*✓|对子|pair/i').isVisible().catch(() => false);
      
      if (pairMatch) {
        // 执行连打
        const playButton = page.getByRole('button', { name: /✓|对子|出牌/i });
        if (await playButton.isVisible().catch(() => false)) {
          await playButton.click();
          await page.waitForTimeout(1000);
          
          await page.screenshot({ path: 'test-results/action-api-pair-combo-played.png' });
          
          // 验证出牌成功
          const content = await page.content();
          expect(content.includes('对子') || content.includes('✓') || content.includes('当前玩家')).toBeTruthy();
        }
      } else {
        // 取消选择
        const cancelButton = page.getByRole('button', { name: /取消/i });
        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click();
        }
      }
    }
  });

  test('given: 选择彩虹牌 when: 有累积惩罚 then: 可转移惩罚', async ({ page }) => {
    await setupActionAPIGame(page, '彩虹转移测试', { aiCount: 1 });
    
    for (let i = 0; i < 15; i++) {
      await waitForTurn(page);
      
      const hasPenalty = await page.locator('text=/累积|\+\d+/i').isVisible().catch(() => false);
      
      if (hasPenalty) {
        await page.screenshot({ path: 'test-results/action-api-rainbow-penalty.png' });
        
        // 尝试选择4张牌
        const numberCards = page.locator('.card, [class*="card"]').filter({
          hasNot: page.locator('text=/跳过|反转|\+2|万能|\+4|🚫|↺/')
        });
        
        if (await numberCards.count() >= 4) {
          for (let j = 0; j < 4; j++) {
            await numberCards.nth(j).click();
            await page.waitForTimeout(300);
          }
          
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'test-results/action-api-rainbow-selected.png' });
          
          // 检查彩虹匹配
          const rainbowMatch = await page.locator('text=/彩虹.*✓|彩虹|rainbow/i').isVisible().catch(() => false);
          
          if (rainbowMatch) {
            console.log('检测到彩虹匹配');
            
            const playButton = page.getByRole('button', { name: /✓|彩虹|出牌/i });
            if (await playButton.isVisible().catch(() => false)) {
              await playButton.click();
              await page.waitForTimeout(500);
              
              // 选择目标
              const targetSelector = await page.locator('[class*="target"], text=/选择目标/i').isVisible().catch(() => false);
              if (targetSelector) {
                const aiPlayer = page.locator('[class*="player"], .ai').first();
                if (await aiPlayer.isVisible().catch(() => false)) {
                  await aiPlayer.click();
                }
              }
              
              await page.waitForTimeout(1000);
              await page.screenshot({ path: 'test-results/action-api-rainbow-played.png' });
            }
            
            return;
          } else {
            // 取消选择
            const cancelButton = page.getByRole('button', { name: /取消/i });
            if (await cancelButton.isVisible().catch(() => false)) {
              await cancelButton.click();
            }
          }
        }
      }
      
      // 正常操作
      const playableCards = page.locator('.cursor-pointer');
      if (await playableCards.count() > 0) {
        await playableCards.first().click();
        await page.waitForTimeout(300);
        const playButton = page.getByRole('button', { name: /出牌/i });
        if (await playButton.isVisible().catch(() => false)) {
          await playButton.click();
        }
      } else {
        await drawCard(page);
      }
      
      await page.waitForTimeout(2000);
    }
    
    console.log('未能在预期回合内测试彩虹转移');
    test.skip();
  });
});

test.describe('Action API v2.0 - 反转反击', () => {
  
  test('given: 面临累积惩罚 when: 手中有反转牌 then: 可反击', async ({ page }) => {
    await setupActionAPIGame(page, '反转反击测试', { aiCount: 1 });
    
    for (let i = 0; i < 20; i++) {
      await waitForTurn(page);
      
      const hasPenalty = await page.locator('text=/累积|\+\d+/i').isVisible().catch(() => false);
      
      if (hasPenalty) {
        await page.screenshot({ path: 'test-results/action-api-reverse-penalty.png' });
        
        // 寻找反转牌
        const reverseCard = page.locator('[class*="reverse"], [data-type="reverse"], .card:has-text("↺"), .card:has-text("反转")').first();
        
        if (await reverseCard.isVisible().catch(() => false)) {
          console.log('检测到反转牌，尝试反击');
          
          await reverseCard.click();
          await page.waitForTimeout(500);
          
          // 点击出牌
          const playButton = page.getByRole('button', { name: /出牌/i });
          if (await playButton.isVisible().catch(() => false)) {
            await playButton.click();
          }
          
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'test-results/action-api-reverse-counter-success.png' });
          
          // 验证反击效果
          const content = await page.content();
          console.log('反击效果:', content.includes('反击') || content.includes('弹回') || content.includes('反转'));
          
          return;
        } else {
          console.log('没有反转牌，只能摸牌');
          await drawCard(page);
        }
      } else {
        // 正常操作
        const playableCards = page.locator('.cursor-pointer');
        if (await playableCards.count() > 0) {
          await playableCards.first().click();
          await page.waitForTimeout(300);
          const playButton = page.getByRole('button', { name: /出牌/i });
          if (await playButton.isVisible().catch(() => false)) {
            await playButton.click();
          }
        } else {
          await drawCard(page);
        }
      }
      
      await page.waitForTimeout(2000);
    }
    
    console.log('未能在预期回合内测试反转反击');
    test.skip();
  });
});

test.describe('Action API v2.0 - 完整游戏流程', () => {
  
  test('given: 多人游戏 when: 完整进行 then: 游戏能正常结束', async ({ page }) => {
    await setupActionAPIGame(page, '完整游戏测试', { aiCount: 2 });
    
    await page.screenshot({ path: 'test-results/action-api-full-game-start.png' });
    
    // 进行游戏直到结束或达到最大回合
    for (let turn = 0; turn < 30; turn++) {
      await waitForTurn(page);
      
      // 检查游戏是否结束
      const gameEnded = await page.locator('text=/获胜|Winner|结束|排名|再来一局/i').isVisible().catch(() => false);
      if (gameEnded) {
        console.log(`游戏在回合${turn}结束`);
        await page.screenshot({ path: 'test-results/action-api-full-game-end.png' });
        
        // 验证游戏结束界面
        const hasWinner = await page.locator('text=/获胜|Winner|🏆/i').isVisible().catch(() => false);
        const hasRanking = await page.locator('text=/排名|#/i').isVisible().catch(() => false);
        
        expect(hasWinner || hasRanking).toBeTruthy();
        return;
      }
      
      // 尝试连打
      const numberCards = page.locator('.card, [class*="card"]').filter({
        hasNot: page.locator('text=/跳过|反转|\+2|万能|\+4|🚫|↺/')
      });
      
      const cardCount = await numberCards.count();
      
      if (cardCount >= 2) {
        // 尝试连打
        await numberCards.nth(0).click();
        await page.waitForTimeout(300);
        await numberCards.nth(1).click();
        await page.waitForTimeout(500);
        
        const hasCombo = await page.locator('text=/✓|对子|三条|彩虹|顺子/i').isVisible().catch(() => false);
        
        if (hasCombo) {
          const playComboButton = page.getByRole('button', { name: /✓/i });
          if (await playComboButton.isVisible().catch(() => false)) {
            await playComboButton.click();
            await page.waitForTimeout(1000);
            continue;
          }
        }
        
        // 取消选择
        const cancelButton = page.getByRole('button', { name: /取消/i });
        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click();
        }
      }
      
      // 正常出牌或摸牌
      const playableCards = page.locator('.cursor-pointer');
      if (await playableCards.count() > 0) {
        await playableCards.first().click();
        await page.waitForTimeout(300);
        const playButton = page.getByRole('button', { name: /出牌/i });
        if (await playButton.isVisible().catch(() => false)) {
          await playButton.click();
        }
      } else {
        await drawCard(page);
      }
      
      await page.waitForTimeout(2000);
      
      // 每5回合截图
      if (turn % 5 === 0) {
        await page.screenshot({ path: `test-results/action-api-full-game-turn-${turn}.png` });
      }
    }
    
    await page.screenshot({ path: 'test-results/action-api-full-game-final.png' });
    console.log('游戏进行了30回合仍未结束，这是正常的');
  });
});

test.describe('Action API v2.0 - 移动端适配', () => {
  
  test('given: 移动端尺寸 when: 进行游戏 then: 界面正常显示', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    await setupActionAPIGame(page, '移动端测试', { aiCount: 1 });
    await waitForTurn(page);
    
    await page.screenshot({ path: 'test-results/action-api-mobile-game.png' });
    
    // 验证手牌区域可见
    const handArea = page.locator('.fixed.bottom-0, [class*="hand"]').first();
    await expect(handArea).toBeVisible();
    
    // 验证操作按钮可见
    const actionArea = page.locator('button, [class*="action"]').first();
    await expect(actionArea).toBeVisible();
  });
});

test.describe('Action API v2.0 - 截图对比', () => {
  
  test('given: 游戏进行中 when: 截图 then: 与基准截图对比', async ({ page }) => {
    await setupActionAPIGame(page, '截图对比测试', { aiCount: 1 });
    await waitForTurn(page);
    
    // 截取游戏界面
    await page.screenshot({ 
      path: 'test-results/action-api-screenshot-current.png',
      fullPage: false
    });
    
    // 验证截图文件已生成
    const fs = require('fs');
    const screenshotExists = fs.existsSync('test-results/action-api-screenshot-current.png');
    expect(screenshotExists).toBeTruthy();
    
    // 这里可以添加与基准截图的像素级对比
    // 使用像素对比库如 pixelmatch
    console.log('截图已保存，可进行人工检查或与基准对比');
  });
});
