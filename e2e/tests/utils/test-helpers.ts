import { Page, expect } from '@playwright/test';

/**
 * E2E 测试工具函数
 */

export interface TestContext {
  page: Page;
  roomCode?: string;
  playerId?: string;
}

/**
 * 创建房间
 */
export async function createRoom(page: Page, nickname: string): Promise<string> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  await page.getByPlaceholder(/昵称/i).first().fill(nickname);
  await page.getByRole('button', { name: /创建房间/i }).click();
  await page.waitForTimeout(3000);
  
  // 提取房间号
  const pageContent = await page.content();
  const roomMatch = pageContent.match(/(\d{4})/);
  return roomMatch ? roomMatch[1] : '';
}

/**
 * 加入房间
 */
export async function joinRoom(page: Page, nickname: string, roomCode: string): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  await page.getByPlaceholder(/昵称/i).first().fill(nickname);
  await page.getByRole('button', { name: /加入房间/i }).click();
  await page.waitForTimeout(500);
  
  // 输入房间号
  const roomInput = page.locator('input[placeholder*="房间号"], input[maxlength="4"]');
  await roomInput.fill(roomCode);
  
  await page.getByRole('button', { name: /进入|确认/i }).click();
  await page.waitForTimeout(3000);
}

/**
 * 添加AI
 */
export async function addAI(page: Page, difficulty: 'easy' | 'normal' | 'hard' = 'normal'): Promise<void> {
  await page.getByRole('button', { name: /添加AI/i }).click();
  await page.waitForTimeout(500);
  
  const difficultyMap = {
    easy: /简单|easy/i,
    normal: /普通|normal/i,
    hard: /困难|hard/i
  };
  
  await page.getByRole('button', { name: difficultyMap[difficulty] }).click();
  await page.waitForTimeout(2000);
}

/**
 * 开始游戏
 */
export async function startGame(page: Page): Promise<void> {
  const startButton = page.getByRole('button', { name: /开始游戏/i });
  await expect(startButton).toBeVisible({ timeout: 15000 });
  await startButton.click();
  await page.waitForTimeout(3000);
}

/**
 * 创建房间并添加AI开始游戏（快捷方法）
 */
export async function setupGame(
  page: Page, 
  nickname: string, 
  options: { 
    aiCount?: number;
    aiDifficulty?: 'easy' | 'normal' | 'hard';
  } = {}
): Promise<string> {
  const { aiCount = 1, aiDifficulty = 'normal' } = options;
  
  const roomCode = await createRoom(page, nickname);
  
  // 添加AI
  for (let i = 0; i < aiCount; i++) {
    await addAI(page, aiDifficulty);
  }
  
  // 开始游戏
  await startGame(page);
  
  return roomCode;
}

/**
 * 出牌
 */
export async function playCard(page: Page, cardSelector?: string): Promise<void> {
  if (cardSelector) {
    await page.locator(cardSelector).first().click();
  } else {
    // 出第一张可出的牌
    const playableCards = page.locator('[data-playable="true"]').or(page.locator('.cursor-pointer'));
    await playableCards.first().click();
  }
  await page.waitForTimeout(500);
  
  // 点击出牌按钮
  await page.getByRole('button', { name: /出牌|出\d+张/i }).click();
  await page.waitForTimeout(1000);
}

/**
 * 摸牌
 */
export async function drawCard(page: Page): Promise<void> {
  // 点击牌堆
  await page.locator('.deck, [data-deck], .card-back').first().click();
  await page.waitForTimeout(1000);
}

/**
 * 喊UNO
 */
export async function callUno(page: Page): Promise<void> {
  await page.getByRole('button', { name: /UNO/i }).click();
  await page.waitForTimeout(500);
}

/**
 * 选择颜色（万能牌）
 */
export async function selectColor(page: Page, color: 'red' | 'yellow' | 'green' | 'blue'): Promise<void> {
  const colorMap = {
    red: /红色|red/i,
    yellow: /黄色|yellow/i,
    green: /绿色|green/i,
    blue: /蓝色|blue/i
  };
  
  await page.getByRole('button', { name: colorMap[color] }).click();
  await page.waitForTimeout(500);
}

/**
 * 验证游戏状态
 */
export async function verifyGameState(page: Page, expectedState: 'playing' | 'finished' | 'waiting'): Promise<void> {
  const pageContent = await page.content();
  
  switch (expectedState) {
    case 'playing':
      expect(pageContent).toMatch(/手牌|张|UNO|弃牌/i);
      break;
    case 'finished':
      expect(pageContent).toMatch(/获胜|Winner|结束|再来一局/i);
      break;
    case 'waiting':
      expect(pageContent).toMatch(/等待|房间|玩家/i);
      break;
  }
}

/**
 * 等待回合
 */
export async function waitForTurn(page: Page, timeout: number = 30000): Promise<void> {
  // 等待"你的回合"提示或手牌可点击
  await page.waitForSelector('[data-my-turn="true"], .my-turn, .cursor-pointer', {
    timeout,
    state: 'visible'
  });
}

/**
 * 获取手牌数量
 */
export async function getHandCardCount(page: Page): Promise<number> {
  const cards = await page.locator('.hand .card, [data-hand] .card').count();
  return cards;
}
