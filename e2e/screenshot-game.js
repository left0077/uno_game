const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }
  });
  const page = await context.newPage();
  
  try {
    // 访问首页
    await page.goto('http://localhost:3000/uno/');
    await page.waitForTimeout(4000);
    
    // 首页截图
    await page.screenshot({ 
      path: '../.temp/screenshots/mobile/iphone-se-home-final.png', 
      fullPage: true 
    });
    console.log('✅ 首页截图完成');
    
    // 输入昵称
    await page.locator('input[placeholder*="昵称"]').fill('MobileTest');
    await page.waitForTimeout(1000);
    
    // 点击创建房间
    await page.click('button:has-text("创建新房间")');
    await page.waitForTimeout(3000);
    
    // 房间页面截图
    await page.screenshot({ 
      path: '../.temp/screenshots/mobile/iphone-se-room-final.png', 
      fullPage: true 
    });
    console.log('✅ 房间页截图完成');
    
    // 添加AI
    await page.click('button:has-text("+ 添加 AI")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("简单")');
    await page.click('button:has-text("确认添加")');
    await page.waitForTimeout(2000);
    
    // 开始游戏
    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(5000);
    
    // 游戏页面截图
    await page.screenshot({ 
      path: '../.temp/screenshots/mobile/iphone-se-game-final.png', 
      fullPage: true 
    });
    console.log('✅ 游戏页截图完成');
    
  } catch (error) {
    console.error('测试失败:', error.message);
  } finally {
    await browser.close();
  }
})();
