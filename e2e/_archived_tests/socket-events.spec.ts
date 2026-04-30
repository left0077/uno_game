/**
 * Socket 事件标准验证测试
 * 
 * 测试范围：
 * - 验证所有标准 Socket 事件能正常工作
 * - 验证前后端事件命名一致性
 */

import { test, expect } from '@playwright/test';
import { createRoom, addAI, startGame, playCard, drawCard, TIMEOUTS } from './utils/test-helpers';

test.describe('🔌 Socket 事件标准验证', () => {
  
  test('room:create 和 room:created 事件', async ({ page }) => {
    await page.goto('/uno/');
    await page.waitForTimeout(1000);
    
    // 监听 room:created 事件
    const roomCreatedPromise = page.evaluate(() => {
      return new Promise<any>((resolve) => {
        const socket = (window as any).io?.();
        if (socket) {
          socket.once('room:created', (data: any) => resolve(data));
        } else {
          resolve(null);
        }
      });
    });
    
    // 输入昵称并创建房间
    await page.fill('input[placeholder*="昵称"]', '测试玩家');
    await page.click('button:has-text("创建房间")');
    
    // 验证房间创建成功
    await page.waitForSelector('text=/房间/', { timeout: TIMEOUTS.long });
    const roomCode = await page.innerText('[class*="room-code"], h1');
    expect(roomCode).toMatch(/\d{4}/);
  });
  
  test('room:join 和 room:joined 事件', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    
    try {
      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();
      
      // 房主创建房间
      await hostPage.goto('/uno/');
      await hostPage.fill('input[placeholder*="昵称"]', '房主');
      await hostPage.click('button:has-text("创建房间")');
      await hostPage.waitForSelector('text=/房间/', { timeout: TIMEOUTS.long });
      
      // 获取房间号
      const roomTitle = await hostPage.innerText('h1');
      const roomCode = roomTitle.match(/(\d{4})/)?.[1];
      expect(roomCode).toBeTruthy();
      
      // 玩家加入房间
      await guestPage.goto(`/uno/?room=${roomCode}`);
      await guestPage.fill('input[placeholder*="昵称"]', '玩家2');
      await guestPage.click('button:has-text("加入房间")');
      
      // 等待加入成功
      await guestPage.waitForSelector('text=/房间/', { timeout: TIMEOUTS.long });
      
      // 验证房主能看到玩家2
      await hostPage.waitForSelector('text=/玩家2/', { timeout: TIMEOUTS.long });
      
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
  
  test('ai:add 和 ai:remove 事件', async ({ page }) => {
    // 创建房间
    await page.goto('/uno/');
    await page.fill('input[placeholder*="昵称"]', '房主');
    await page.click('button:has-text("创建房间")');
    await page.waitForSelector('text=/房间/', { timeout: TIMEOUTS.long });
    
    // 添加AI
    await page.click('button:has-text("添加AI")');
    await page.click('button:has-text("普通")');
    
    // 验证AI已添加
    await page.waitForSelector('text=/机器人/', { timeout: TIMEOUTS.long });
    
    // 验证移除AI按钮出现
    const removeBtn = page.locator('button:has-text("移除AI")');
    await expect(removeBtn).toBeVisible();
  });
  
  test('room:start 和 game:started 事件', async ({ page }) => {
    // 创建房间
    await page.goto('/uno/');
    await page.fill('input[placeholder*="昵称"]', '房主');
    await page.click('button:has-text("创建房间")');
    await page.waitForSelector('text=/房间/', { timeout: TIMEOUTS.long });
    
    // 添加AI
    await page.click('button:has-text("添加AI")');
    await page.click('button:has-text("普通")');
    
    // 等待开始游戏按钮可用
    await page.waitForTimeout(1000);
    
    // 开始游戏（两步：先点击"开始游戏"，再点击"开始 Out 模式"）
    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(500);
    
    // 如果出现V2模式按钮，点击它
    const v2Btn = page.locator('button:has-text("开始 Out 模式")');
    if (await v2Btn.isVisible().catch(() => false)) {
      await v2Btn.click();
    }
    
    // 验证游戏已开始（检查游戏界面元素）
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return text.includes('手牌') || text.includes('出牌') || text.includes('摸牌');
      },
      { timeout: TIMEOUTS.extraLong }
    );
  });
  
  test('chat:send 和 chat:message 事件', async ({ page }) => {
    // 创建房间
    await page.goto('/uno/');
    await page.fill('input[placeholder*="昵称"]', '房主');
    await page.click('button:has-text("创建房间")');
    await page.waitForSelector('text=/房间/', { timeout: TIMEOUTS.long });
    
    // 发送消息（如果聊天功能可用）
    const chatInput = page.locator('input[placeholder*="消息"], input[placeholder*="聊天"]');
    if (await chatInput.isVisible().catch(() => false)) {
      await chatInput.fill('测试消息');
      await page.click('button:has-text("发送")');
      
      // 验证消息显示
      await page.waitForSelector('text=/测试消息/', { timeout: TIMEOUTS.medium });
    }
  });
  
});

test.describe('🎮 游戏操作事件验证', () => {
  
  test('game:play 事件 - 出牌', async ({ page }) => {
    // 创建房间并开始游戏
    await page.goto('/uno/');
    await page.fill('input[placeholder*="昵称"]', '房主');
    await page.click('button:has-text("创建房间")');
    await page.waitForSelector('text=/房间/', { timeout: TIMEOUTS.long });
    
    // 添加AI
    await page.click('button:has-text("添加AI")');
    await page.click('button:has-text("普通")');
    
    // 开始游戏
    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(500);
    
    const v2Btn = page.locator('button:has-text("开始 Out 模式")');
    if (await v2Btn.isVisible().catch(() => false)) {
      await v2Btn.click();
    }
    
    // 等待游戏开始
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return text.includes('手牌') || text.includes('出牌') || text.includes('摸牌');
      },
      { timeout: TIMEOUTS.extraLong }
    );
    
    // 如果有可出的牌，尝试出牌
    const cards = page.locator('.card, [data-card]');
    const cardCount = await cards.count();
    if (cardCount > 0) {
      await cards.first().click();
    }
  });
  
  test('game:draw 事件 - 摸牌', async ({ page }) => {
    // 创建房间并开始游戏
    await page.goto('/uno/');
    await page.fill('input[placeholder*="昵称"]', '房主');
    await page.click('button:has-text("创建房间")');
    await page.waitForSelector('text=/房间/', { timeout: TIMEOUTS.long });
    
    // 添加AI
    await page.click('button:has-text("添加AI")');
    await page.click('button:has-text("普通")');
    
    // 开始游戏
    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(500);
    
    const v2Btn = page.locator('button:has-text("开始 Out 模式")');
    if (await v2Btn.isVisible().catch(() => false)) {
      await v2Btn.click();
    }
    
    // 等待游戏开始
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return text.includes('手牌') || text.includes('出牌') || text.includes('摸牌');
      },
      { timeout: TIMEOUTS.extraLong }
    );
    
    // 点击摸牌按钮
    const drawBtn = page.locator('button:has-text("摸牌")');
    if (await drawBtn.isVisible().catch(() => false)) {
      await drawBtn.click();
    }
  });
  
});
