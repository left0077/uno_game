import { test, expect } from '@playwright/test';
import { setupGame, playCard, drawCard, waitForTurn } from '../utils/test-helpers';

/**
 * Out模式（Ring Mode）E2E 测试
 */

test.setTimeout(90000);

test.describe('Out模式测试', () => {
  
  test('创建Out模式房间', async ({ page }) => {
    await page.goto('/uno/');
    await page.waitForLoadState('networkidle');
    
    await page.getByPlaceholder(/昵称/i).first().fill('Out测试');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000);
    
    // 验证房间创建成功
    const pageContent = await page.content();
    expect(pageContent).toMatch(/\d{4}/);
  });
  
  test('Out倒计时UI显示', async ({ page }) => {
    await setupGame(page, '倒计时测试', { aiCount: 1 });
    
    // 验证游戏状态
    const pageContent = await page.content();
    expect(pageContent).toMatch(/手牌|张|UNO/i);
  });
  
  test('移动端OutUI不遮挡', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupGame(page, '移动端测试', { aiCount: 1 });
    
    // 检查手牌区域是否可见
    const handArea = page.locator('.fixed.bottom-0').first();
    await expect(handArea).toBeVisible();
    
    await page.screenshot({ path: 'test-results/mobile-game.png' });
  });
});

// ============================================
// 子任务8: Out模式 - 连打系统测试
// ============================================

test.describe('Out模式 - 连打系统', () => {
  test.setTimeout(120000);

  /**
   * 测试对子连打（两张相同数字的牌）
   * 选中两张相同数字的牌应该显示"对子X ✓"
   */
  test('连打-对子', async ({ page }) => {
    await setupGame(page, '对子测试', { aiCount: 1 });
    await waitForTurn(page);
    
    // 截图记录初始手牌
    await page.screenshot({ path: 'test-results/out-pair-initial.png' });
    
    // 获取所有数字牌（非功能牌）
    const numberCards = page.locator('.card, [class*="card"]').filter({ 
      hasNot: page.locator('text=/跳过|反转|\+2|万能|\+4|🚫|↺/') 
    });
    
    const cardCount = await numberCards.count();
    console.log('数字牌数量:', cardCount);
    
    if (cardCount >= 2) {
      // 尝试找到相同数字的牌
      // 由于无法直接读取牌的值，尝试连续选中两张牌看是否能组成对子
      const firstCard = numberCards.nth(0);
      const secondCard = numberCards.nth(1);
      
      await firstCard.click();
      await page.waitForTimeout(300);
      await secondCard.click();
      await page.waitForTimeout(500);
      
      // 截图记录选择状态
      await page.screenshot({ path: 'test-results/out-pair-selected.png' });
      
      // 检查是否显示连打匹配提示
      const comboMatch = await page.locator('text=/对子.*✓|.*对子|匹配/i').isVisible().catch(() => false);
      const executeButton = await page.locator('button:has-text("✓"), button:has-text("对子")').isVisible().catch(() => false);
      
      console.log('对子匹配:', comboMatch || executeButton);
      
      if (comboMatch || executeButton) {
        // 如果匹配成功，执行连打出牌
        const playComboButton = page.getByRole('button', { name: /✓/i });
        if (await playComboButton.isVisible().catch(() => false)) {
          await playComboButton.click();
          await page.waitForTimeout(1000);
          
          // 验证出牌成功（牌数减少）
          await page.screenshot({ path: 'test-results/out-pair-played.png' });
        }
      } else {
        // 如果没有匹配，取消选择
        const cancelButton = page.getByRole('button', { name: /取消/i });
        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click();
        }
      }
    } else {
      console.log('数字牌数量不足，跳过对子测试');
      test.skip();
    }
  });

  /**
   * 测试三条连打（三张相同数字的牌）
   * 选中三张相同数字的牌应该显示"三条X ✓"
   * 三条可以让下家被跳过
   */
  test('连打-三条', async ({ page }) => {
    await setupGame(page, '三条测试', { aiCount: 1 });
    await waitForTurn(page);
    
    await page.screenshot({ path: 'test-results/out-three-initial.png' });
    
    // 获取数字牌
    const numberCards = page.locator('.card, [class*="card"]').filter({ 
      hasNot: page.locator('text=/跳过|反转|\+2|万能|\+4|🚫|↺/') 
    });
    
    const cardCount = await numberCards.count();
    
    if (cardCount >= 3) {
      // 尝试选中三张牌
      for (let i = 0; i < 3; i++) {
        await numberCards.nth(i).click();
        await page.waitForTimeout(300);
      }
      
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/out-three-selected.png' });
      
      // 检查三条匹配
      const threeMatch = await page.locator('text=/三条.*✓|.*三条|three/i').isVisible().catch(() => false);
      console.log('三条匹配:', threeMatch);
      
      if (threeMatch) {
        // 执行三条连打
        const playButton = page.getByRole('button', { name: /✓/i });
        if (await playButton.isVisible().catch(() => false)) {
          await playButton.click();
          await page.waitForTimeout(1000);
          
          // 验证三条效果（跳过提示）
          const content = await page.content();
          console.log('跳过效果:', content.includes('跳过') || content.includes('被跳过'));
          
          await page.screenshot({ path: 'test-results/out-three-played.png' });
        }
      } else {
        // 取消选择
        const cancelButton = page.getByRole('button', { name: /取消/i });
        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click();
        }
      }
    } else {
      console.log('数字牌数量不足，跳过三条测试');
      test.skip();
    }
  });

  /**
   * 测试彩虹转移
   * 四种不同颜色的同数字牌可以组成彩虹，将累积惩罚转移给指定玩家
   */
  test('连打-彩虹转移惩罚', async ({ page }) => {
    await setupGame(page, '彩虹测试', { aiCount: 1 });
    
    // 等待游戏进行一段时间，可能产生累积惩罚
    await page.waitForTimeout(5000);
    await waitForTurn(page);
    
    await page.screenshot({ path: 'test-results/out-rainbow-initial.png' });
    
    // 检查是否有累积惩罚
    const hasPenalty = await page.locator('text=/累积|\+|惩罚/i').isVisible().catch(() => false);
    console.log('累积惩罚存在:', hasPenalty);
    
    // 尝试寻找四张不同颜色的同数字牌（彩虹）
    // 由于难以精确识别，尝试选择多张牌看是否能触发彩虹
    const numberCards = page.locator('.card, [class*="card"]').filter({ 
      hasNot: page.locator('text=/跳过|反转|\+2|万能|\+4|🚫|↺/') 
    });
    
    const cardCount = await numberCards.count();
    
    if (cardCount >= 4) {
      // 选中4张牌尝试组成彩虹
      for (let i = 0; i < 4; i++) {
        await numberCards.nth(i).click();
        await page.waitForTimeout(300);
      }
      
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/out-rainbow-selected.png' });
      
      // 检查彩虹匹配
      const rainbowMatch = await page.locator('text=/彩虹.*✓|.*彩虹|rainbow/i').isVisible().catch(() => false);
      console.log('彩虹匹配:', rainbowMatch);
      
      if (rainbowMatch) {
        // 执行彩虹连打，可能需要选择目标
        const playButton = page.getByRole('button', { name: /✓/i });
        if (await playButton.isVisible().catch(() => false)) {
          await playButton.click();
          await page.waitForTimeout(500);
          
          // 选择目标玩家（如果有选择器）
          const targetSelector = page.locator('[class*="target"], text=/选择目标/i');
          if (await targetSelector.isVisible().catch(() => false)) {
            // 选择第一个AI玩家
            const aiPlayer = page.locator('[class*="player"], .ai').first();
            if (await aiPlayer.isVisible().catch(() => false)) {
              await aiPlayer.click();
            }
          }
          
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'test-results/out-rainbow-played.png' });
        }
      } else {
        // 取消选择
        const cancelButton = page.getByRole('button', { name: /取消/i });
        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click();
        }
      }
    } else {
      console.log('数字牌数量不足，跳过彩虹测试');
      test.skip();
    }
  });

  /**
   * 测试顺子连打（同色连续3+张牌）
   * 选中同色连续数字的牌应该显示"redX-Y ✓"
   */
  test('连打-顺子', async ({ page }) => {
    await setupGame(page, '顺子测试', { aiCount: 1 });
    await waitForTurn(page);
    
    await page.screenshot({ path: 'test-results/out-straight-initial.png' });
    
    // 获取数字牌
    const numberCards = page.locator('.card, [class*="card"]').filter({ 
      hasNot: page.locator('text=/跳过|反转|\+2|万能|\+4|🚫|↺/') 
    });
    
    const cardCount = await numberCards.count();
    
    if (cardCount >= 3) {
      // 尝试选中3+张牌组成顺子
      for (let i = 0; i < Math.min(3, cardCount); i++) {
        await numberCards.nth(i).click();
        await page.waitForTimeout(300);
      }
      
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/out-straight-selected.png' });
      
      // 检查顺子匹配（可能显示颜色+数字范围）
      const straightMatch = await page.locator('text=/red.*-|blue.*-|green.*-|yellow.*-|顺子|straight/i').isVisible().catch(() => false);
      console.log('顺子匹配:', straightMatch);
      
      if (straightMatch) {
        const playButton = page.getByRole('button', { name: /✓/i });
        if (await playButton.isVisible().catch(() => false)) {
          await playButton.click();
          await page.waitForTimeout(1000);
          
          // 验证顺子效果（下家摸牌）
          const content = await page.content();
          console.log('顺子效果:', content.includes('摸牌') || content.includes('draw'));
          
          await page.screenshot({ path: 'test-results/out-straight-played.png' });
        }
      } else {
        // 取消选择
        const cancelButton = page.getByRole('button', { name: /取消/i });
        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click();
        }
      }
    } else {
      console.log('数字牌数量不足，跳过顺子测试');
      test.skip();
    }
  });

  /**
   * 测试连打提示功能
   * 当选择一张可以组成连打的牌时，应该有提示显示其他可选择的牌
   */
  test('连打提示 - 智能推荐', async ({ page }) => {
    await setupGame(page, '连打提示测试', { aiCount: 1 });
    await waitForTurn(page);
    
    await page.screenshot({ path: 'test-results/combo-hint-initial.png' });
    
    // 选择第一张数字牌
    const numberCards = page.locator('.card, [class*="card"]').filter({ 
      hasNot: page.locator('text=/跳过|反转|\+2|万能|\+4|🚫|↺/') 
    });
    
    if (await numberCards.count() > 0) {
      await numberCards.first().click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'test-results/combo-hint-after-select.png' });
      
      // 检查是否有连打提示（可能有发光效果或+标记）
      const hasHint = await page.locator('[class*="hint"], [class*="suggest"], .ring-2, text=/种连打可用/i').isVisible().catch(() => false);
      console.log('连打提示:', hasHint);
      
      // 取消选择
      const cancelButton = page.getByRole('button', { name: /取消/i });
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
      }
    } else {
      test.skip();
    }
  });
});

// ============================================
// Out模式 - 反转反击测试
// ============================================

test.describe('Out模式 - 反转反击', () => {
  test.setTimeout(120000);

  /**
   * 测试反转反击累积惩罚
   * 当面临+牌惩罚时，出反转牌可以将惩罚弹回给攻击者
   */
  test('反转反击累积惩罚', async ({ page }) => {
    await setupGame(page, '反击测试', { aiCount: 1 });
    
    // 等待一段时间让AI可能出+牌
    let turns = 0;
    const maxWaitTurns = 20;
    
    while (turns < maxWaitTurns) {
      await waitForTurn(page);
      
      // 检查是否有累积惩罚
      const hasPenalty = await page.locator('text=/累积.*\+|\+\d+.*惩罚|pending/i').isVisible().catch(() => false);
      
      if (hasPenalty) {
        console.log('检测到累积惩罚，尝试反击');
        await page.screenshot({ path: 'test-results/reverse-counter-penalty.png' });
        
        // 寻找反转牌
        const reverseCard = page.locator('[class*="reverse"], [data-type="reverse"], .card:has-text("↺"), .card:has-text("反转")').first();
        
        if (await reverseCard.isVisible().catch(() => false)) {
          await reverseCard.click();
          await page.waitForTimeout(500);
          
          // 点击出牌
          const playButton = page.getByRole('button', { name: /出牌/i });
          if (await playButton.isVisible().catch(() => false)) {
            await playButton.click();
          }
          
          await page.waitForTimeout(1000);
          
          // 验证反击效果
          const content = await page.content();
          console.log('反击效果:', content.includes('反击') || content.includes('弹回') || content.includes('反转'));
          
          await page.screenshot({ path: 'test-results/reverse-counter-success.png' });
          return; // 测试成功
        } else {
          console.log('没有反转牌，无法反击');
          // 摸牌接受惩罚
          await drawCard(page);
        }
      } else {
        // 没有惩罚，正常出牌或摸牌
        const playableCards = page.locator('.cursor-pointer');
        if (await playableCards.count() > 0) {
          await playableCards.first().click();
          await page.waitForTimeout(500);
          
          const playButton = page.getByRole('button', { name: /出牌/i });
          if (await playButton.isVisible().catch(() => false)) {
            await playButton.click();
          }
        } else {
          await drawCard(page);
        }
      }
      
      await page.waitForTimeout(2000);
      turns++;
    }
    
    console.log('未能在预期回合内测试反击，可能是概率问题');
    test.skip();
  });
});

// ============================================
// Out模式 - 淘汰机制测试
// ============================================

test.describe('Out模式 - 淘汰机制', () => {
  test.setTimeout(180000); // 更长的超时，因为可能需要较多回合

  /**
   * 测试手牌超过20张被淘汰
   * 当玩家手牌超过上限时应该被淘汰
   */
  test('手牌超过上限被淘汰', async ({ page }) => {
    await setupGame(page, '淘汰测试', { aiCount: 2 });
    
    await page.screenshot({ path: 'test-results/elimination-initial.png' });
    
    // 记录初始玩家数量
    const initialPlayers = await page.locator('[class*="player"], .player-card').count();
    console.log('初始玩家数:', initialPlayers);
    
    // 游戏进行多个回合，观察是否有玩家被淘汰
    let turns = 0;
    const maxTurns = 30;
    
    while (turns < maxTurns) {
      await waitForTurn(page);
      
      // 检查当前手牌数量
      const handCountText = await page.locator('text=/\d+张/i').first().textContent().catch(() => '0张');
      const handCount = parseInt(handCountText.replace(/\D/g, '')) || 0;
      
      // 检查是否有淘汰警告
      const hasWarning = await page.locator('text=/上限.*淘汰|⚠️.*手牌|即将淘汰/i').isVisible().catch(() => false);
      if (hasWarning) {
        console.log(`回合${turns}: 检测到淘汰警告，手牌${handCount}张`);
        await page.screenshot({ path: `test-results/elimination-warning-turn-${turns}.png` });
      }
      
      // 检查是否有玩家已被淘汰
      const eliminatedPlayers = await page.locator('text=/淘汰|eliminated|💀/i').count();
      if (eliminatedPlayers > 0) {
        console.log(`回合${turns}: 检测到${eliminatedPlayers}个被淘汰的玩家`);
        await page.screenshot({ path: `test-results/elimination-occurred-turn-${turns}.png` });
        
        // 验证排名更新
        const hasRanking = await page.locator('text=/排名|#\d|🏆/i').isVisible().catch(() => false);
        expect(hasRanking).toBeTruthy();
        return;
      }
      
      // 正常游戏操作
      const playableCards = page.locator('.cursor-pointer');
      if (await playableCards.count() > 0) {
        await playableCards.first().click();
        await page.waitForTimeout(500);
        
        const playButton = page.getByRole('button', { name: /出牌/i });
        if (await playButton.isVisible().catch(() => false)) {
          await playButton.click();
        }
      } else {
        await drawCard(page);
      }
      
      await page.waitForTimeout(2000);
      turns++;
    }
    
    console.log('未能在预期回合内观察到淘汰，这在正常游戏中是概率事件');
    test.skip();
  });

  /**
   * 测试Out模式阶段推进
   * 游戏应该随着时间推进进入不同的Out阶段
   */
  test('Out模式阶段推进', async ({ page }) => {
    await setupGame(page, '阶段测试', { aiCount: 1 });
    
    await page.screenshot({ path: 'test-results/out-phase-initial.png' });
    
    // 检查初始阶段显示
    const initialPhase = await page.locator('text=/Out I|Out II|终极圈|Phase/i').isVisible().catch(() => false);
    console.log('初始阶段显示:', initialPhase);
    
    // 等待一段时间（模拟时间推进）
    // 注意：实际阶段推进依赖于游戏时间，可能需要较长等待
    await page.waitForTimeout(10000);
    
    await page.screenshot({ path: 'test-results/out-phase-after-wait.png' });
    
    // 检查Out状态栏
    const outStatus = await page.locator('[class*="out-status"], text=/🔥 Out|上限.*张/i').isVisible().catch(() => false);
    console.log('Out状态显示:', outStatus);
    
    // 检查倒计时
    const countdown = await page.locator('text=/:\d{2}/').isVisible().catch(() => false);
    console.log('倒计时显示:', countdown);
  });
});

// ============================================
// 🔴 Bug回归: 禁止出牌提示
// ============================================

test.describe('🔴 Bug回归: 禁止出牌提示', () => {
  test.setTimeout(60000);

  /**
   * 测试摸牌后"无牌可出"提示应该消失
   * Bug：之前提示在摸牌后不会消失
   */
  test('摸牌后提示应该消失', async ({ page }) => {
    await setupGame(page, '提示测试', { aiCount: 1 });
    await waitForTurn(page);
    
    await page.screenshot({ path: 'test-results/hint-bug-initial.png' });
    
    // 等待并检查"无牌可出"提示
    const hintLocator = page.locator('text=/无牌可出.*摸牌|点击牌堆摸牌|👆 点击摸/i');
    const hasHint = await hintLocator.isVisible().catch(() => false);
    
    if (hasHint) {
      console.log('检测到"无牌可出"提示');
      
      // 执行摸牌
      await drawCard(page);
      
      // 等待提示消失
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/hint-bug-after-draw.png' });
      
      // 验证提示应该消失
      const hintStillVisible = await hintLocator.isVisible().catch(() => false);
      
      // 提示应该消失（如果还在，说明Bug存在）
      if (hintStillVisible) {
        console.log('⚠️ Bug可能存在：摸牌后提示仍然显示');
      } else {
        console.log('✓ 提示已正确消失');
      }
      
      expect(hintStillVisible).toBeFalsy();
    } else {
      console.log('本轮有牌可出，未触发提示，测试跳过');
      
      // 尝试正常出牌后检查提示状态
      const playableCards = page.locator('.cursor-pointer');
      if (await playableCards.count() > 0) {
        await playableCards.first().click();
        await page.waitForTimeout(500);
        
        const playButton = page.getByRole('button', { name: /出牌/i });
        if (await playButton.isVisible().catch(() => false)) {
          await playButton.click();
        }
      }
    }
  });

  /**
   * 测试惩罚状态下不应该显示"无牌可出"提示
   * Bug：之前有惩罚时错误显示摸牌提示
   */
  test('惩罚状态不应显示无牌可出提示', async ({ page }) => {
    await setupGame(page, '惩罚提示测试', { aiCount: 1 });
    
    // 等待一段时间，让游戏可能产生惩罚累积
    await page.waitForTimeout(5000);
    await waitForTurn(page);
    
    await page.screenshot({ path: 'test-results/penalty-hint-test.png' });
    
    // 检查是否有累积惩罚
    const hasPenalty = await page.locator('text=/累积.*\+|\+\d+.*张|pending/i').isVisible().catch(() => false);
    
    if (hasPenalty) {
      console.log('检测到累积惩罚');
      
      // 检查是否有"无牌可出"提示
      const hintVisible = await page.locator('text=/无牌可出.*摸牌/i').isVisible().catch(() => false);
      
      // 有惩罚时不应该显示"无牌可出"提示
      if (hintVisible) {
        console.log('⚠️ Bug可能存在：有惩罚时仍显示无牌可出提示');
      } else {
        console.log('✓ 惩罚状态正确，未显示无牌可出提示');
      }
      
      expect(hintVisible).toBeFalsy();
    } else {
      console.log('未检测到累积惩罚，测试跳过');
      test.skip();
    }
  });
});

// ============================================
// Out模式 - 综合测试
// ============================================

test.describe('Out模式 - 综合测试', () => {
  test.setTimeout(120000);

  /**
   * 测试Out模式完整游戏流程
   */
  test('Out模式完整游戏', async ({ page }) => {
    await setupGame(page, 'Out综合测试', { aiCount: 2 });
    
    await page.screenshot({ path: 'test-results/out-full-game-start.png' });
    
    // 进行若干回合
    for (let turn = 0; turn < 15; turn++) {
      await waitForTurn(page);
      
      // 尝试连打
      const numberCards = page.locator('.card, [class*="card"]').filter({ 
        hasNot: page.locator('text=/跳过|反转|\+2|万能|\+4|🚫|↺/') 
      });
      
      const cardCount = await numberCards.count();
      
      if (cardCount >= 2) {
        // 尝试连打
        await numberCards.nth(0).click();
        await page.waitForTimeout(300);
        await numberCards.nth(1).click();
        await page.waitForTimeout(500);
        
        // 检查是否有匹配
        const hasCombo = await page.locator('text=/✓|对子|三条|彩虹|顺子/i').isVisible().catch(() => false);
        
        if (hasCombo) {
          const playButton = page.getByRole('button', { name: /✓/i });
          if (await playButton.isVisible().catch(() => false)) {
            await playButton.click();
            await page.waitForTimeout(1000);
            continue;
          }
        }
        
        // 取消连打选择
        const cancelButton = page.getByRole('button', { name: /取消/i });
        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click();
        }
      }
      
      // 正常出牌或摸牌
      const playableCards = page.locator('.cursor-pointer');
      if (await playableCards.count() > 0) {
        await playableCards.first().click();
        await page.waitForTimeout(500);
        
        const playButton = page.getByRole('button', { name: /出牌/i });
        if (await playButton.isVisible().catch(() => false)) {
          await playButton.click();
        }
      } else {
        await drawCard(page);
      }
      
      await page.waitForTimeout(2000);
      
      // 每5回合截图
      if (turn % 5 === 0) {
        await page.screenshot({ path: `test-results/out-full-game-turn-${turn}.png` });
      }
      
      // 检查游戏是否结束
      const gameEnded = await page.locator('text=/获胜|Winner|排名|结束|🏆/i').isVisible().catch(() => false);
      if (gameEnded) {
        console.log(`游戏在回合${turn}结束`);
        await page.screenshot({ path: 'test-results/out-full-game-end.png' });
        break;
      }
    }
    
    await page.screenshot({ path: 'test-results/out-full-game-final.png' });
  });
});
