import { test, expect } from '@playwright/test';

test.describe('倒计时功能测试', () => {
  test('游戏开始后倒计时正常走动', async ({ page }) => {
    // 1. 进入首页创建房间
    await page.goto('/');
    await page.fill('input[placeholder]', '测试玩家');
    await page.click('button:has-text("创建")');
    await page.waitForSelector('text=/房间/', { timeout: 5000 });
    
    // 2. 添加2个AI（确保可以开始游戏）
    await page.click('button:has-text("AI")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("AI")');
    await page.waitForTimeout(500);
    
    // 3. 点击开始游戏（force点击禁用的按钮）
    await page.click('button:has-text("开始")', { force: true });
    
    // 4. 等待游戏界面
    await page.waitForSelector('.fixed.bottom-0', { timeout: 15000 });
    console.log('✅ 游戏开始');
    
    // 5. 读取初始倒计时
    const timer1 = await page.locator('.font-mono').first().textContent();
    console.log('初始倒计时:', timer1);
    expect(timer1).toMatch(/\\d+:\\d+/);
    
    // 6. 等待5秒后再次读取
    await page.waitForTimeout(5000);
    const timer2 = await page.locator('.font-mono').first().textContent();
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
