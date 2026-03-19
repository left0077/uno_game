import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: '/Users/left0077/Projects/Kimi_Uno/test-results/videos/',
      size: { width: 1280, height: 720 }
    }
  });
  
  const page = await context.newPage();
  
  // 打开首页
  await page.goto('http://localhost:3000/uno/');
  await page.waitForTimeout(2000);
  
  // 点击"加入房间"标签
  console.log('点击加入房间...');
  await page.click('text=加入房间');
  await page.waitForTimeout(1000);
  
  // 点击"创建房间"标签
  console.log('点击创建房间...');
  await page.click('text=创建房间');
  await page.waitForTimeout(1000);
  
  // 再点击"加入房间"
  console.log('再次点击加入房间...');
  await page.click('text=加入房间');
  await page.waitForTimeout(2000);
  
  await context.close();
  await browser.close();
  console.log('录屏完成！');
})();
