import { test, expect } from '@playwright/test';

test.describe('核心功能验证', () => {
  test('首页加载和创建房间', async ({ page }) => {
    // 1. 访问首页
    await page.goto('/uno/');
    await expect(page.locator('h1')).toContainText('Uno');
    console.log('✅ 首页加载');

    // 2. 输入昵称
    await page.fill('input[placeholder*="输入"]', '测试玩家');
    console.log('✅ 输入昵称');

    // 3. 创建房间
    await page.click('button:has-text("创建")');
    await page.waitForSelector('text=/房间/', { timeout: 10000 });
    console.log('✅ 创建房间');

    // 4. 添加AI
    await page.click('button:has-text("AI")');
    await page.waitForTimeout(500);
    console.log('✅ 添加AI区域展开');

    // 5. 确认添加
    await page.click('button:has-text("确认添加")');
    await page.waitForTimeout(1000);
    console.log('✅ 添加AI完成');

    // 6. 检查开始按钮
    await expect(page.locator('button:has-text("开始")')).toBeVisible();
    console.log('✅ 开始按钮可见');

    // 7. 截图
    await page.screenshot({ path: '/tmp/uno-room.png' });
    console.log('✅ 基础功能验证完成');
  });
});
