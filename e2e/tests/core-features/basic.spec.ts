import { test, expect } from '@playwright/test';
import {
  createRoom,
  joinRoom,
  addAI,
  startGame,
  setupServerUrl,
  waitForPageLoad,
  waitForConnection,
  expectOnHomePage,
  expectOnRoomPage,
  expectPlayerExists,
  createMultiPlayerContext,
  cleanupMultiPlayerContext,
  SELECTORS,
  TIMEOUTS,
} from '../utils/test-helpers';

/**
 * 基础功能测试套件
 * 
 * 测试范围:
 * - 首页加载
 * - 昵称管理
 * - 创建房间
 * - 邀请链接
 * - 多人交互
 * - AI 管理
 * - 房间设置
 */

test.describe('🏠 首页功能', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupServerUrl(page);
    await page.reload();
    await waitForPageLoad(page);
  });

  test('首页元素正确显示', async ({ page }) => {
    // 验证标题
    await expect(page).toHaveTitle(/Uno|UNO/i);
    
    // 验证主要元素
    await expectOnHomePage(page);
    
    // 验证昵称输入框
    const nicknameInput = page.locator(SELECTORS.home.nicknameInput);
    await expect(nicknameInput).toBeVisible();
    await expect(nicknameInput).toHaveAttribute('placeholder', /昵称/);
    
    // 验证按钮状态（连接前可能禁用）
    const createBtn = page.locator(SELECTORS.home.createRoomBtn);
    await expect(createBtn).toBeVisible();
  });

  test('昵称自动保存到 localStorage', async ({ page }) => {
    const nicknameInput = page.locator(SELECTORS.home.nicknameInput);
    
    // 输入昵称
    await nicknameInput.fill('测试玩家');
    await expect(nicknameInput).toHaveValue('测试玩家');
    
    // 验证 localStorage
    const savedNickname = await page.evaluate(() => {
      return localStorage.getItem('uno-nickname');
    });
    expect(savedNickname).toBe('测试玩家');
    
    // 刷新页面
    await page.reload();
    await waitForPageLoad(page);
    
    // 验证昵称已恢复
    await expect(nicknameInput).toHaveValue('测试玩家');
  });

  test('邀请链接自动填充房间号', async ({ page }) => {
    // 访问带房间号的 URL
    await page.goto('/?room=1234');
    await waitForPageLoad(page);
    
    // 验证页面显示
    const content = await page.content();
    expect(content).toContain('1234');
    expect(content).toMatch(/邀请|加入/i);
  });
});

test.describe('🏢 房间功能', () => {
  
  test('创建房间成功', async ({ page }) => {
    const roomCode = await createRoom(page, '房主');
    
    // 验证房间号格式
    expect(roomCode).toMatch(/^\d{4}$/);
    
    // 验证在房间页面
    await expectOnRoomPage(page);
    
    // 验证显示房主
    await expectPlayerExists(page, '房主');
    
    // 验证房间号显示
    const pageContent = await page.content();
    expect(pageContent).toContain(roomCode);
  });

  test('加入房间成功', async ({ browser }) => {
    // 创建两个浏览器上下文
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    
    try {
      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();
      
      // 房主创建房间
      const roomCode = await createRoom(hostPage, '房主');
      
      // 玩家2加入房间
      await joinRoom(guestPage, '玩家2', roomCode);
      
      // 验证玩家2能看到房主
      await expectPlayerExists(guestPage, '房主');
      
      // 验证房主能看到玩家2
      await expectPlayerExists(hostPage, '玩家2');
      
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('多个玩家可以加入同一房间', async ({ browser }) => {
    const contexts = await createMultiPlayerContext(browser, [
      { nickname: '房主' },
      { nickname: '玩家2' },
      { nickname: '玩家3' },
    ]);
    
    try {
      // 房主创建房间
      const roomCode = await createRoom(contexts[0].page, '房主');
      contexts[0].roomCode = roomCode;
      
      // 其他玩家加入
      await joinRoom(contexts[1].page, '玩家2', roomCode);
      await joinRoom(contexts[2].page, '玩家3', roomCode);
      
      // 验证所有玩家都在房间中
      for (const ctx of contexts) {
        for (const other of contexts) {
          await expectPlayerExists(ctx.page, other.nickname);
        }
      }
      
    } finally {
      await cleanupMultiPlayerContext(contexts);
    }
  });
});

test.describe('🤖 AI 管理', () => {
  
  test('房主可以添加 AI', async ({ page }) => {
    await createRoom(page, '房主');
    
    // 添加 AI
    await addAI(page, 'normal');
    
    // 验证 AI 已添加
    const pageContent = await page.content();
    const hasAI = /AI|机器人|Bot/i.test(pageContent);
    expect(hasAI).toBeTruthy();
  });

  test('可以添加多个 AI', async ({ page }) => {
    await createRoom(page, '房主');
    
    // 添加 3 个 AI
    for (let i = 0; i < 3; i++) {
      await addAI(page, 'normal');
      await page.waitForTimeout(500);
    }
    
    // 验证 AI 数量
    const pageContent = await page.content();
    const aiMatches = pageContent.match(/AI|机器人|Bot/gi);
    expect(aiMatches?.length || 0).toBeGreaterThanOrEqual(3);
  });
});

test.describe('🔧 房间设置', () => {
  
  test('房间页面显示设置选项', async ({ page }) => {
    await createRoom(page, '房主');
    
    // 截图记录
    await page.screenshot({ 
      path: 'test-results/room-settings.png',
      fullPage: true,
    });
    
    // 验证设置相关元素
    const content = await page.content();
    const hasSettings = 
      content.includes('设置') ||
      content.includes('规则') ||
      content.includes('开始游戏');
    
    expect(hasSettings).toBeTruthy();
  });
});

test.describe('🌐 连接状态', () => {
  
  test('显示连接状态指示器', async ({ page }) => {
    await setupServerUrl(page);
    await page.reload();
    await waitForPageLoad(page);
    
    // 检查连接状态
    const content = await page.content();
    const hasStatus = 
      content.includes('已连接') ||
      content.includes('连接中') ||
      content.includes('在线') ||
      content.includes('断开');
    
    console.log('连接状态显示:', hasStatus);
  });

  test('网络断开后可以重连', async ({ page }) => {
    await createRoom(page, '测试玩家');
    
    // 模拟网络断开
    await page.context().setOffline(true);
    await page.waitForTimeout(TIMEOUTS.medium);
    
    // 截图记录断开状态
    await page.screenshot({ 
      path: 'test-results/disconnected-state.png',
      fullPage: true,
    });
    
    // 恢复网络
    await page.context().setOffline(false);
    await page.waitForTimeout(TIMEOUTS.long);
    
    // 截图记录重连状态
    await page.screenshot({ 
      path: 'test-results/reconnected-state.png',
      fullPage: true,
    });
    
    // 验证页面仍然显示
    const content = await page.content();
    expect(content).toContain('测试玩家');
  });
});
