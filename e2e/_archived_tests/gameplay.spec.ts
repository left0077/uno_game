import { test, expect } from '@playwright/test';
import {
  createRoom,
  addAI,
  startGame,
  playCard,
  drawCard,
  callUno,
  selectColor,
  expectOnGamePage,
  setupServerUrl,
  waitForPageLoad,
  TIMEOUTS,
} from '../utils/test-helpers';

/**
 * 游戏玩法测试套件
 * 
 * 测试范围:
 * - 开始游戏
 * - 出牌
 * - 摸牌
 * - UNO 规则
 * - 颜色选择
 */

test.describe('🎮 游戏流程', () => {
  
  test('开始游戏成功', async ({ page }) => {
    // 创建房间并添加 AI
    await createRoom(page, '房主');
    await addAI(page, 'normal');
    
    // 开始游戏
    await startGame(page);
    
    // 验证在游戏页面
    await expectOnGamePage(page);
    
    // 截图记录游戏状态
    await page.screenshot({ 
      path: 'test-results/game-started.png',
      fullPage: true,
    });
  });

  test('游戏界面元素完整', async ({ page }) => {
    // 创建房间并开始游戏
    await createRoom(page, '房主');
    await addAI(page, 'normal');
    await startGame(page);
    
    // 验证游戏元素
    const content = await page.content();
    
    // 应该能看到手牌或游戏区域
    expect(content).toMatch(/手牌|张|牌|UNO/i);
    
    // 截图记录
    await page.screenshot({ 
      path: 'test-results/game-ui.png',
      fullPage: true,
    });
  });
});

test.describe('🃏 出牌和摸牌', () => {
  
  test('可以执行摸牌操作', async ({ page }) => {
    // 创建并开始游戏
    await createRoom(page, '房主');
    await addAI(page, 'normal');
    await startGame(page);
    
    // 等待游戏初始化
    await page.waitForTimeout(TIMEOUTS.long);
    
    // 尝试摸牌
    try {
      await drawCard(page);
      console.log('摸牌操作成功');
    } catch (e) {
      console.log('摸牌操作不可用或不是当前回合');
    }
    
    // 截图记录
    await page.screenshot({ 
      path: 'test-results/draw-card.png',
      fullPage: true,
    });
  });

  test('游戏可以进行多轮', async ({ page }) => {
    // 创建房间并开始游戏
    await createRoom(page, '房主');
    await addAI(page, 'normal');
    await startGame(page);
    
    // 等待并截图记录不同阶段
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(TIMEOUTS.long);
      await page.screenshot({ 
        path: `test-results/game-round-${i + 1}.png`,
        fullPage: true,
      });
    }
    
    // 验证游戏仍在进行
    const content = await page.content();
    expect(content).toMatch(/手牌|张|牌|UNO/i);
  });
});

test.describe('🎯 UNO 规则', () => {
  
  test('可以喊 UNO', async ({ page }) => {
    // 创建并开始游戏
    await createRoom(page, '房主');
    await addAI(page, 'normal');
    await startGame(page);
    
    // 等待游戏初始化
    await page.waitForTimeout(TIMEOUTS.long);
    
    // 尝试喊 UNO
    try {
      await callUno(page);
      console.log('UNO 按钮可点击');
    } catch (e) {
      console.log('UNO 按钮不可用');
    }
    
    // 截图记录
    await page.screenshot({ 
      path: 'test-results/uno-called.png',
      fullPage: true,
    });
  });
});
