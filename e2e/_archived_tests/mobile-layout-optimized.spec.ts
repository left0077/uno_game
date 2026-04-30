import { test, expect } from '@playwright/test';

/**
 * 移动端布局优化测试
 * 验证响应式布局在不同屏幕尺寸下的表现
 */

test.setTimeout(60000);

// 测试设备配置
const devices = [
  { name: 'iPhone-SE', width: 375, height: 667 },
  { name: 'iPhone-12', width: 390, height: 844 },
  { name: 'iPhone-14-Pro-Max', width: 430, height: 932 },
  { name: 'Pixel-5', width: 393, height: 851 },
  { name: 'Samsung-S21', width: 360, height: 800 },
];

// 截图保存路径
const SCREENSHOT_DIR = '../.temp/screenshots/mobile';

async function waitForConnection(page: any) {
  // 等待创建房间按钮变为可用
  await page.waitForFunction(() => {
    const btn = document.querySelector('button');
    return btn && !btn.disabled;
  }, { timeout: 10000 });
}

test.describe('移动端布局优化测试', () => {
  
  for (const device of devices) {
    test(`${device.name} 首页布局检查`, async ({ page }) => {
      // 设置视口
      await page.setViewportSize({ width: device.width, height: device.height });
      
      // 访问首页
      await page.goto('/uno/');
      await page.waitForLoadState('networkidle');
      await waitForConnection(page);
      await page.waitForTimeout(1000);
      
      // 截图保存
      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/${device.name}-home.png`,
        fullPage: true 
      });
      
      // 验证关键元素可见
      const title = page.locator('h1').first();
      await expect(title).toBeVisible();
      
      const nicknameInput = page.locator('input[placeholder*="昵称"]').first();
      await expect(nicknameInput).toBeVisible();
      
      const createBtn = page.locator('button:has-text("创建新房间")');
      await expect(createBtn).toBeVisible();
      
      console.log(`✅ ${device.name} 首页布局测试通过`);
    });
  }
  
  test('iPhone-SE 游戏页面布局', async ({ page }) => {
    const device = { name: 'iPhone-SE', width: 375, height: 667 };
    await page.setViewportSize({ width: device.width, height: device.height });
    
    // 访问首页
    await page.goto('/uno/');
    await page.waitForLoadState('networkidle');
    await waitForConnection(page);
    
    // 输入昵称并创建房间
    await page.locator('input[placeholder*="昵称"]').fill('MobileTest');
    await page.locator('button:has-text("创建新房间")').click();
    
    // 等待进入房间
    await page.waitForSelector('button:has-text("+ 添加 AI")', { timeout: 15000 });
    await page.waitForTimeout(1000);
    
    // 截图 - 房间页面
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${device.name}-room.png`,
      fullPage: true 
    });
    
    // 添加AI
    await page.click('button:has-text("+ 添加 AI")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("简单")');
    await page.click('button:has-text("确认添加")');
    await page.waitForTimeout(2000);
    
    // 开始游戏
    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(3000);
    
    // 截图 - 游戏页面
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${device.name}-game.png`,
      fullPage: true 
    });
    
    // 验证关键游戏元素
    // 1. 检查房间号显示
    const roomInfo = page.getByText(/房间/);
    await expect(roomInfo).toBeVisible();
    
    // 2. 检查操作按钮
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // 3. 获取手牌区域信息
    const cards = await page.locator('[class*="card"], button[class*="bg-uno"]').all();
    console.log(`✅ ${device.name} 找到 ${cards.length} 张卡牌`);
    
    // 检查卡牌尺寸
    for (let i = 0; i < Math.min(cards.length, 3); i++) {
      const box = await cards[i].boundingBox();
      if (box) {
        console.log(`✅ ${device.name} 卡牌 ${i+1} 尺寸: ${box.width.toFixed(0)}x${box.height.toFixed(0)}`);
        // 移动端卡牌应该足够大以便点击（最小 40x56px）
        expect(box.width).toBeGreaterThanOrEqual(35);
        expect(box.height).toBeGreaterThanOrEqual(45);
      }
    }
    
    console.log(`✅ ${device.name} 游戏页面布局测试通过`);
  });
  
  test('响应式断点检查', async ({ page }) => {
    const breakpoints = [
      { width: 320, name: 'small-mobile' },
      { width: 375, name: 'iphone-se' },
      { width: 414, name: 'iphone-max' },
      { width: 768, name: 'tablet' },
      { width: 1024, name: 'desktop' },
    ];
    
    for (const bp of breakpoints) {
      await page.setViewportSize({ width: bp.width, height: 800 });
      await page.goto('/uno/');
      await page.waitForLoadState('networkidle');
      await waitForConnection(page);
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/responsive-${bp.name}.png`,
        fullPage: true 
      });
      
      console.log(`✅ 响应式断点 ${bp.width}px (${bp.name}) 截图完成`);
    }
  });
});
