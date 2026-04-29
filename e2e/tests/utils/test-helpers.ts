import { Page, BrowserContext, expect, Locator } from '@playwright/test';

/**
 * UNO Online E2E 测试工具库
 * 
 * 提供稳定、可靠的测试辅助函数
 */

// ==================== 常量定义 ====================

export const SELECTORS = {
  // 首页元素
  home: {
    nicknameInput: 'input[placeholder*="输入昵称"]',
    createRoomBtn: 'button:has-text("创建新房间")',
    joinRoomBtn: 'button:has-text("加入房间")',
    serverUrl: '[data-testid="server-url"], .server-url',
    connectionStatus: '[data-testid="connection-status"], .connection-status',
  },
  // 房间页元素
  room: {
    container: '[data-testid="room-page"], .room-page',
    roomCode: '[data-testid="room-code"], .room-code',
    playerList: '[data-testid="player-list"], .player-list',
    addAIBtn: 'button:has-text("+ 添加 AI")',
    startGameBtn: 'button:has-text("开始游戏")',
    settingsBtn: 'button:has-text("设置")',
    leaveBtn: 'button:has-text("离开")',
  },
  // 游戏页元素
  game: {
    container: '[data-testid="game-page"], .game-page',
    handCards: '[data-testid="hand-cards"], .hand-cards',
    discardPile: '[data-testid="discard-pile"], .discard-pile',
    deck: '[data-testid="deck"], .deck',
    playBtn: 'button:has-text("出牌")',
    drawBtn: 'button:has-text("摸牌")',
    unoBtn: 'button:has-text("UNO")',
    currentPlayer: '[data-testid="current-player"], .current-player',
  },
  // 弹窗和提示
  modal: {
    colorPicker: '[data-testid="color-picker"], .color-picker',
    comboSelector: '[data-testid="combo-selector"], .combo-selector',
    penaltyPanel: '[data-testid="penalty-panel"], .penalty-panel',
  },
} as const;

export const TIMEOUTS = {
  short: 1000,
  medium: 3000,
  long: 10000,
  extraLong: 30000,
} as const;

// ==================== 页面操作 ====================

/**
 * 等待页面加载完成
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * 设置服务器 URL (用于测试前准备)
 */
export async function setupServerUrl(page: Page, url: string = 'http://localhost:3001'): Promise<void> {
  await page.goto('/uno/');
  await page.evaluate((serverUrl) => {
    localStorage.setItem('uno-server-url', serverUrl);
  }, url);
}

/**
 * 等待连接就绪
 */
export async function waitForConnection(page: Page, timeout: number = TIMEOUTS.extraLong): Promise<void> {
  // 等待创建房间按钮可用
  const createBtn = page.locator(SELECTORS.home.createRoomBtn);
  await expect(createBtn).toBeEnabled({ timeout });
}

/**
 * 安全地点击元素
 */
export async function safeClick(
  page: Page, 
  selector: string, 
  options?: { timeout?: number; force?: boolean }
): Promise<void> {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: options?.timeout || TIMEOUTS.long });
  await locator.click({ force: options?.force });
}

/**
 * 安全地填充输入框
 */
export async function safeFill(
  page: Page, 
  selector: string, 
  value: string,
  options?: { timeout?: number }
): Promise<void> {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: options?.timeout || TIMEOUTS.long });
  await locator.fill(value);
}

// ==================== 房间操作 ====================

/**
 * 创建房间
 * @returns 房间号
 */
export async function createRoom(
  page: Page, 
  nickname: string,
  options?: { waitForNavigation?: boolean }
): Promise<string> {
  // 访问首页
  await page.goto('/uno/');
  await waitForPageLoad(page);
  
  // 等待连接就绪（创建房间按钮变为可用）
  await waitForConnection(page);
  
  // 输入昵称
  await safeFill(page, SELECTORS.home.nicknameInput, nickname);
  
  // 点击创建房间
  await safeClick(page, SELECTORS.home.createRoomBtn);
  
  // 等待页面切换（通过检测房间页面特有的元素）
  if (options?.waitForNavigation !== false) {
    // 房间页面应该有 "+ 添加 AI" 或 "开始游戏" 按钮
    await page.waitForFunction(
      () => {
        const content = document.body.innerText;
        return content.includes('+ 添加 AI') || 
               content.includes('开始游戏') || 
               content.includes('房间');
      },
      { timeout: TIMEOUTS.extraLong }
    );
  }
  
  // 等待房间号显示
  await page.waitForTimeout(TIMEOUTS.medium);
  
  // 提取房间号（从页面文本中查找"房间 XXXX"格式）
  const text = await page.innerText('body');
  // 匹配"房间 1234"或"房间: 1234"格式，避免匹配端口号
  const match = text.match(/房间[:\s]\s*(\d{4})/);
  
  if (!match) {
    throw new Error('无法获取房间号，页面内容: ' + text.substring(0, 500));
  }
  
  return match[1];
}

/**
 * 加入房间
 */
export async function joinRoom(
  page: Page,
  nickname: string,
  roomCode: string
): Promise<void> {
  // 先清除 localStorage 避免状态干扰
  await page.goto('/uno/');
  await page.evaluate(() => localStorage.clear());

  // 然后通过邀请链接进入
  await page.goto(`/uno/?room=${roomCode}`);
  await waitForPageLoad(page);
  
  // 等待连接就绪
  await waitForConnection(page);
  
  // 输入昵称
  const nicknameInput = page.locator(SELECTORS.home.nicknameInput);
  await nicknameInput.waitFor({ state: 'visible', timeout: TIMEOUTS.long });
  await nicknameInput.fill(nickname);
  
  // 点击"加入房间"按钮
  const joinBtn = page.locator('button:has-text("加入房间")');
  await joinBtn.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
  await joinBtn.click();
  
  // 输入房间号并确认
  const roomInput = page.locator('input[placeholder*="房间号"], input[maxlength="4"]');
  await roomInput.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
  await roomInput.fill(roomCode);
  
  const confirmBtn = page.locator('button:has-text("进入")');
  await confirmBtn.click();
  
  // 等待进入房间（房间页面特有的元素）
  await page.waitForFunction(
    () => {
      const content = document.body.innerText;
      return content.includes('玩家列表') || content.includes('复制邀请链接');
    },
    { timeout: TIMEOUTS.extraLong }
  );
}

/**
 * 添加 AI - 模拟完整用户操作流程
 */
export async function addAI(
  page: Page,
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
): Promise<void> {
  // 1. 点击"+ 添加 AI"按钮
  const addAIBtn = page.locator('button:has-text("+ 添加 AI")');
  await addAIBtn.click();
  
  // 2. 等待设置面板出现
  await page.waitForSelector('text=确认添加', { timeout: TIMEOUTS.medium });
  
  // 3. 选择难度
  const difficultyMap = {
    easy: '简单',
    normal: '普通', 
    hard: '困难',
  };
  await page.click(`button:has-text("${difficultyMap[difficulty]}")`);
  
  // 4. 点击确认添加
  await page.click('button:has-text("确认添加")');
  
  // 5. 等待 AI 添加完成
  await page.waitForTimeout(TIMEOUTS.medium);
}

/**
 * 设置游戏（创建房间、添加AI、开始游戏）
 */
export async function setupGame(
  page: Page,
  nickname: string,
  options: { aiCount?: number; aiDifficulty?: 'easy' | 'normal' | 'hard' } = {}
): Promise<string> {
  const { aiCount = 1, aiDifficulty = 'easy' } = options;
  
  // 进入首页
  await page.goto('/uno/');
  await waitForPageLoad(page);
  await waitForConnection(page);
  
  // 创建房间
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
 * 等待玩家回合
 */
export async function waitForTurn(page: Page, timeout: number = TIMEOUTS.extraLong): Promise<boolean> {
  try {
    // 等待"你的回合"提示或操作按钮可用
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return text.includes('你的回合') || 
               text.includes('出牌') || 
               text.includes('摸牌');
      },
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * 开始游戏
 */
export async function startGame(page: Page): Promise<void> {
  // 点击开始游戏按钮
  const startBtn = page.getByRole('button', { name: /开始游戏|至少需要/ });
  await startBtn.waitFor({ state: 'visible', timeout: TIMEOUTS.long });
  
  // 检查按钮是否可用
  const isEnabled = await startBtn.isEnabled().catch(() => false);
  if (!isEnabled) {
    throw new Error('开始游戏按钮不可用，可能需要更多玩家');
  }
  
  await startBtn.click();
  
  // 等待一下让页面状态更新
  await page.waitForTimeout(TIMEOUTS.medium);
  
  // 如果出现"开始 Out 模式"按钮，点击它（V2模式）
  const v2StartBtn = page.getByRole('button', { name: '开始 Out 模式' });
  const isV2Visible = await v2StartBtn.isVisible().catch(() => false);
  if (isV2Visible) {
    await v2StartBtn.click();
    // 等待游戏加载
    await page.waitForTimeout(TIMEOUTS.medium);
  }
  
  // 等待游戏页面加载（通过检测游戏页面特有的元素）
  await page.waitForFunction(
    () => {
      const content = document.body.innerText;
      return content.includes('手牌') || 
             content.includes('出牌') || 
             content.includes('摸牌') ||
             content.includes(' deck') ||
             document.querySelector('[class*="card"], [data-card]') !== null;
    },
    { timeout: TIMEOUTS.extraLong }
  );
}

// ==================== 游戏操作 ====================

/**
 * 出牌
 */
export async function playCard(page: Page, cardIndex: number = 0): Promise<void> {
  const cards = page.locator(`${SELECTORS.game.handCards} .card, [data-card]`);
  const count = await cards.count();
  
  if (count === 0) {
    throw new Error('没有手牌可出');
  }
  
  if (cardIndex >= count) {
    cardIndex = 0;
  }
  
  await cards.nth(cardIndex).click();
  await page.waitForTimeout(TIMEOUTS.short);
  
  // 点击出牌按钮
  const playBtn = page.locator(SELECTORS.game.playBtn);
  if (await playBtn.isVisible().catch(() => false)) {
    await playBtn.click();
  }
  
  await page.waitForTimeout(TIMEOUTS.medium);
}

/**
 * 摸牌
 */
export async function drawCard(page: Page): Promise<void> {
  const deck = page.locator(SELECTORS.game.deck);
  await deck.click();
  await page.waitForTimeout(TIMEOUTS.medium);
}

/**
 * 喊 UNO
 */
export async function callUno(page: Page): Promise<void> {
  const unoBtn = page.locator(SELECTORS.game.unoBtn);
  if (await unoBtn.isVisible().catch(() => false)) {
    await unoBtn.click();
    await page.waitForTimeout(TIMEOUTS.short);
  }
}

/**
 * 选择颜色（万能牌）
 */
export async function selectColor(
  page: Page,
  color: 'red' | 'yellow' | 'green' | 'blue'
): Promise<void> {
  const colorMap = {
    red: ['红色', 'Red', 'red'],
    yellow: ['黄色', 'Yellow', 'yellow'],
    green: ['绿色', 'Green', 'green'],
    blue: ['蓝色', 'Blue', 'blue'],
  };
  
  for (const name of colorMap[color]) {
    const btn = page.getByRole('button', { name });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(TIMEOUTS.short);
      return;
    }
  }
}

// ==================== 验证函数 ====================

/**
 * 验证在首页
 */
export async function expectOnHomePage(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.home.createRoomBtn)).toBeVisible({ timeout: TIMEOUTS.long });
  await expect(page.locator(SELECTORS.home.joinRoomBtn)).toBeVisible({ timeout: TIMEOUTS.long });
}

/**
 * 验证在房间页
 */
export async function expectOnRoomPage(page: Page): Promise<void> {
  // 房间页面应该有 "添加AI" 或 "开始游戏" 按钮
  const hasRoomElement = await page.evaluate(() => {
    const content = document.body.innerText;
    return content.includes('添加AI') || 
           content.includes('开始游戏') || 
           content.includes('房间号');
  });
  expect(hasRoomElement).toBeTruthy();
}

/**
 * 验证在游戏页
 */
export async function expectOnGamePage(page: Page): Promise<void> {
  // 游戏页面应该有手牌或出牌区域
  const hasGameElement = await page.evaluate(() => {
    const content = document.body.innerText;
    return content.includes('手牌') || 
           content.includes('出牌') || 
           content.includes('摸牌') ||
           content.includes('UNO');
  });
  expect(hasGameElement).toBeTruthy();
}

/**
 * 验证玩家存在
 */
export async function expectPlayerExists(page: Page, playerName: string): Promise<void> {
  // 使用更精确的选择器，匹配玩家列表中的玩家名
  const playerLocator = page.locator('.player-list, [data-testid="player-list"]').getByText(playerName);
  
  // 如果找不到特定容器，就使用精确匹配
  const count = await playerLocator.count();
  if (count > 0) {
    await expect(playerLocator.first()).toBeVisible({ timeout: TIMEOUTS.long });
  } else {
    // 回退到页面文本检查（使用 innerText 获取渲染后的文本）
    const text = await page.innerText('body');
    expect(text).toContain(playerName);
  }
}

/**
 * 获取当前手牌数量
 */
export async function getHandCardCount(page: Page): Promise<number> {
  const cards = page.locator('[class*="card"], [data-card]');
  return await cards.count();
}

// ==================== 多浏览器支持 ====================

export interface PlayerContext {
  context: BrowserContext;
  page: Page;
  nickname: string;
  roomCode?: string;
}

/**
 * 创建多玩家场景
 */
export async function createMultiPlayerContext(
  browser: any,
  players: Array<{ nickname: string }>
): Promise<PlayerContext[]> {
  const contexts: PlayerContext[] = [];
  
  for (const player of players) {
    const context = await browser.newContext();
    const page = await context.newPage();
    contexts.push({
      context,
      page,
      nickname: player.nickname,
    });
  }
  
  return contexts;
}

/**
 * 清理多玩家场景
 */
export async function cleanupMultiPlayerContext(contexts: PlayerContext[]): Promise<void> {
  for (const ctx of contexts) {
    await ctx.context.close();
  }
}
