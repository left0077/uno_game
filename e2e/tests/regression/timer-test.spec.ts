import { test, expect } from '@playwright/test';

test.describe('倒计时功能测试', () => {
  test('游戏开始后倒计时正常走动', async ({ page }) => {
    // 1. 进入首页创建房间
    await page.goto('/');
    await page.waitForSelector('input[placeholder="输入昵称..."]', { timeout: 5000 });
    await page.fill('input[placeholder="输入昵称..."]', '测试玩家');
    // 使用更精确的选择器点击创建按钮（使用force避免动画不稳定问题）
    await page.waitForSelector('button:has-text("创建新房间")', { timeout: 5000 });
    await page.click('button:has-text("创建新房间")', { force: true });
    // 等待房间页面加载（显示房间号）
    await page.waitForSelector('text=房间:', { timeout: 10000 });
    
    // 2. 添加2个AI（确保可以开始游戏）
    // 第一个AI
    await page.waitForSelector('button:has-text("添加 AI")', { timeout: 5000 });
    await page.click('button:has-text("添加 AI")', { force: true });
    await page.waitForSelector('button:has-text("确认添加")', { timeout: 5000 });
    await page.click('button:has-text("确认添加")', { force: true });
    await page.waitForTimeout(500);
    // 第二个AI
    await page.click('button:has-text("添加 AI")', { force: true });
    await page.waitForSelector('button:has-text("确认添加")', { timeout: 5000 });
    await page.click('button:has-text("确认添加")', { force: true });
    await page.waitForTimeout(500);
    
    // 3. 选择 Out 模式（服务器目前只支持此模式）
    await page.click('button:has-text("Out模式")', { force: true });
    await page.waitForTimeout(500);
    // 点击开始游戏（等待按钮可用）
    await page.waitForSelector('button:has-text("开始游戏")', { timeout: 5000 });
    await page.click('button:has-text("开始游戏")', { force: true });
    
    // 4. 等待游戏界面加载（通过检测游戏页面的特定元素）
    // 游戏页面有 "剩余时间:" 文本，而房间页面没有
    await page.waitForSelector('text=剩余时间:', { timeout: 15000 });
    console.log('✅ 游戏开始');
    
    // 5. 读取初始倒计时
    const timer1 = (await page.locator('[data-testid="turn-timer"]').textContent())?.trim();
    console.log('初始倒计时:', timer1);
    expect(timer1).toMatch(/^\d+:\d+$/);
    
    // 6. 等待5秒后再次读取
    await page.waitForTimeout(5000);
    const timer2 = (await page.locator('[data-testid="turn-timer"]').textContent())?.trim();
    console.log('5秒后倒计时:', timer2);
    
    // 7. 验证倒计时在减少
    const parseTime = (t: string) => {
      const [m, s] = t.split(':').map(Number);
      return m * 60 + s;
    };
    
    const time1 = parseTime(timer1!);
    const time2 = parseTime(timer2!);
    
    console.log(`时间差: ${time1 - time2}秒`);
    expect(time1).toBeGreaterThan(time2);
    
    // 8. 截图
    await page.screenshot({ path: '/tmp/uno-timer-test.png' });
    
    console.log('✅ 倒计时测试通过!');
  });
});
