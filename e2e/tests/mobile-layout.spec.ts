import { test, expect, devices } from '@playwright/test';
import { createRoom, addAI, startGame, waitForPageLoad, waitForConnection } from './utils/test-helpers';

/**
 * 移动端布局测试和截图
 * 测试不同屏幕尺寸下的游戏页面布局
 */

test.setTimeout(120000);

// 测试设备配置
const testDevices = [
  { name: 'iPhone-SE', width: 375, height: 667, userAgent: 'iPhone' },
  { name: 'iPhone-12', width: 390, height: 844, userAgent: 'iPhone' },
  { name: 'iPhone-14-Pro-Max', width: 430, height: 932, userAgent: 'iPhone' },
  { name: 'Pixel-5', width: 393, height: 851, userAgent: 'Android' },
  { name: 'Samsung-S21', width: 360, height: 800, userAgent: 'Android' },
  { name: 'iPad-Mini', width: 768, height: 1024, userAgent: 'iPad' },
];

// 截图保存路径
const SCREENSHOT_DIR = '../.temp/screenshots/mobile';

test.describe('移动端布局测试', () => {
  
  for (const device of testDevices) {
    test(`${device.name} 首页布局截图`, async ({ page }) => {
      // 设置视口
      await page.setViewportSize({ width: device.width, height: device.height });
      
      // 访问首页
      await page.goto('/uno/');
      await waitForPageLoad(page);
      await waitForConnection(page);
      
      // 等待页面完全渲染
      await page.waitForTimeout(1000);
      
      // 截图保存
      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/${device.name}-home.png`,
        fullPage: true 
      });
      
      // 验证关键元素可见
      const title = page.locator('h1, .title').first();
      await expect(title).toBeVisible();
      
      const nicknameInput = page.locator('input[placeholder*="昵称"]').first();
      await expect(nicknameInput).toBeVisible();
      
      console.log(`✅ ${device.name} 首页布局测试通过`);
    });
    
    test(`${device.name} 游戏页面布局截图`, async ({ page }) => {
      // 设置视口
      await page.setViewportSize({ width: device.width, height: device.height });
      
      // 访问首页
      await page.goto('/uno/');
      await waitForPageLoad(page);
      await waitForConnection(page);
      
      // 创建房间
      const nicknameInput = page.locator('input[placeholder*="昵称"]').first();
      await nicknameInput.fill('移动端测试');
      
      const createBtn = page.locator('button:has-text("创建新房间")');
      await createBtn.click();
      
      // 等待进入房间
      await page.waitForSelector('button:has-text("+ 添加 AI")', { timeout: 15000 });
      await page.waitForTimeout(1000);
      
      // 截图 - 房间页面
      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/${device.name}-room.png`,
        fullPage: true 
      });
      
      // 添加AI
      await addAI(page, 'easy');
      
      // 开始游戏
      await startGame(page);
      await page.waitForTimeout(2000);
      
      // 截图 - 游戏页面
      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/${device.name}-game.png`,
        fullPage: true 
      });
      
      // 验证关键游戏元素
      // 1. 检查房间号显示
      const roomInfo = page.getByText(/房间/);
      await expect(roomInfo).toBeVisible();
      
      // 2. 检查玩家列表
      const playerList = page.locator('.player-list, [class*="player"]').first();
      if (await playerList.isVisible().catch(() => false)) {
        console.log(`✅ ${device.name} 玩家列表可见`);
      }
      
      // 3. 检查牌堆区域
      const cardArea = page.locator('[class*="card"], [class*="hand"], [class*="deck"]').first();
      if (await cardArea.isVisible().catch(() => false)) {
        console.log(`✅ ${device.name} 牌堆区域可见`);
      }
      
      // 4. 检查操作按钮
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      console.log(`✅ ${device.name} 找到 ${buttonCount} 个按钮`);
      
      console.log(`✅ ${device.name} 游戏页面布局测试通过`);
    });
    
    test(`${device.name} 手牌区域检查`, async ({ page }) => {
      // 设置视口
      await page.setViewportSize({ width: device.width, height: device.height });
      
      // 访问首页并进入游戏
      await page.goto('/uno/');
      await waitForPageLoad(page);
      await waitForConnection(page);
      
      // 创建房间
      const nicknameInput = page.locator('input[placeholder*="昵称"]').first();
      await nicknameInput.fill('手牌测试');
      
      await page.locator('button:has-text("创建新房间")').click();
      await page.waitForSelector('button:has-text("+ 添加 AI")', { timeout: 15000 });
      
      // 添加AI
      await addAI(page, 'easy');
      
      // 开始游戏
      await startGame(page);
      await page.waitForTimeout(2000);
      
      // 获取手牌区域信息
      const handCards = page.locator('[class*="hand"] button, [class*="card"]').all();
      const cardCount = (await handCards).length;
      
      console.log(`${device.name} 手牌数量: ${cardCount}`);
      
      // 截图手牌区域
      const handArea = page.locator('[class*="hand"]').first();
      if (await handArea.isVisible().catch(() => false)) {
        await handArea.screenshot({ 
          path: `${SCREENSHOT_DIR}/${device.name}-hand-area.png` 
        });
        
        // 获取手牌区域尺寸
        const box = await handArea.boundingBox();
        console.log(`${device.name} 手牌区域尺寸: ${box?.width}x${box?.height}`);
      }
      
      // 检查卡牌是否可见和可点击
      const cards = page.locator('[class*="card"], button[class*="bg-uno"]').all();
      let visibleCards = 0;
      for (const card of await cards) {
        if (await card.isVisible().catch(() => false)) {
          visibleCards++;
          // 检查卡牌尺寸
          const box = await card.boundingBox();
          if (box) {
            console.log(`${device.name} 卡牌尺寸: ${box.width.toFixed(0)}x${box.height.toFixed(0)}`);
            // 移动端卡牌应该足够大以便点击
            if (box.width < 30 || box.height < 40) {
              console.warn(`⚠️ ${device.name} 卡牌太小: ${box.width}x${box.height}`);
            }
          }
        }
      }
      
      console.log(`✅ ${device.name} 可见卡牌: ${visibleCards}/${cardCount}`);
      
      // 截图
      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/${device.name}-hand-detail.png`,
        fullPage: true 
      });
    });
  }
  
  test('响应式布局对比', async ({ page }) => {
    // 测试不同宽度下的布局变化
    const widths = [320, 375, 414, 768, 1024];
    
    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/uno/');
      await waitForPageLoad(page);
      await waitForConnection(page);
      
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/responsive-width-${width}.png`,
        fullPage: true 
      });
      
      console.log(`✅ 宽度 ${width}px 截图完成`);
    }
  });
});
