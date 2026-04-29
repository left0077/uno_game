/**
 * OutModeV2 — 大逃杀模式（规则书 v2.1）
 *
 * 核心特性：
 * 1. 连打出牌（对子/三连/彩虹/顺子），不产生惩罚卡
 * 2. 固定手牌上限 20，超出淘汰
 * 3. 阶段由 GameClock 时间触发（3/6/9 分钟），注入惩罚卡
 * 4. 惩罚卡跨类型叠加 + 反转弹回
 */

import { Card } from '../../shared/index.js';
import { GameStateV2, GameActionV2, ValidationResult } from './types.js';
import { BaseGameModeV2 } from './BaseGameModeV2.js';

export interface OutState {
  phase: 0 | 1 | 2 | 3;
  maxCards: number;
}

export class OutModeV2 extends BaseGameModeV2 {
  readonly name = 'out';
  readonly description = 'Out模式：连打出牌，手牌超限即淘汰，最后存活者胜';

  // ============================================================================
  // 初始化
  // ============================================================================

  protected onInitialize(): void {
    this.state.outState = { phase: 0, maxCards: 20 };
    console.log(`[OutModeV2] 初始化完成，阶段0，手牌上限20`);
  }

  // ============================================================================
  // 动作验证
  // ============================================================================

  protected validateCombo(action: GameActionV2): ValidationResult {
    const { playerId, cardIds, comboType } = action;

    // 检查回合
    if (this.playerManager.getCurrentPlayerId() !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }

    if (!cardIds || cardIds.length < 2) {
      return { valid: false, error: '连打至少需要2张牌' };
    }
    if (!comboType) {
      return { valid: false, error: '需要指定连打类型' };
    }

    const player = this.state.players.get(playerId);
    if (!player) {
      return { valid: false, error: '玩家不存在' };
    }

    // 验证拥有这些牌
    const cards: Card[] = [];
    for (const cardId of cardIds) {
      const card = player.cards.find(c => c.id === cardId);
      if (!card) return { valid: false, error: `玩家没有牌 ${cardId}` };
      cards.push(card);
    }

    // 分派到具体验证
    switch (comboType) {
      case 'pair': return this.validatePair(cards);
      case 'three': return this.validateThree(cards);
      case 'rainbow': return this.validateRainbow(cards);
      case 'straight': return this.validateStraight(cards);
      default: return { valid: false, error: `未知的连打类型: ${comboType}` };
    }
  }

  private validatePair(cards: Card[]): ValidationResult {
    if (cards.length !== 2) return { valid: false, error: '对子需要2张牌' };
    if (cards.some(c => c.type === 'wild' || c.type === 'draw4'))
      return { valid: false, error: '万能牌不能参与连打' };
    const [c1, c2] = cards;
    if (c1.color !== c2.color && c1.value !== c2.value)
      return { valid: false, error: '对子需要同色或同值' };
    return { valid: true };
  }

  private validateThree(cards: Card[]): ValidationResult {
    if (cards.length !== 3) return { valid: false, error: '三连需要3张牌' };
    if (cards.some(c => c.type === 'wild' || c.type === 'draw4'))
      return { valid: false, error: '万能牌不能参与连打' };
    const color = cards[0].color;
    if (!cards.every(c => c.color === color))
      return { valid: false, error: '三连需要同色' };
    return { valid: true };
  }

  private validateRainbow(cards: Card[]): ValidationResult {
    if (cards.length !== 4) return { valid: false, error: '彩虹需要4张牌' };
    if (cards.some(c => c.type === 'wild' || c.type === 'draw4'))
      return { valid: false, error: '万能牌不能参与连打' };
    if (new Set(cards.map(c => c.color)).size !== 4)
      return { valid: false, error: '彩虹需要四种不同颜色' };
    return { valid: true };
  }

  private validateStraight(cards: Card[]): ValidationResult {
    if (cards.length < 3) return { valid: false, error: '顺子至少需要3张牌' };
    if (cards.some(c => c.type === 'wild' || c.type === 'draw4'))
      return { valid: false, error: '万能牌不能参与连打' };
    const color = cards[0].color;
    if (!cards.every(c => c.color === color))
      return { valid: false, error: '顺子需要同色' };
    const values = cards.map(c => Number(c.value)).sort((a, b) => a - b);
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1)
        return { valid: false, error: '顺子需要连续数字' };
    }
    return { valid: true };
  }

  // ============================================================================
  // 动作执行
  // ============================================================================

  protected executeCombo(action: GameActionV2): void {
    const { playerId, cardIds, comboType, chosenColor } = action;
    const player = this.state.players.get(playerId)!;

    // 移除手牌
    const cards: Card[] = [];
    for (const cardId of cardIds!) {
      const index = player.cards.findIndex(c => c.id === cardId);
      cards.push(player.cards.splice(index, 1)[0]);
      this.state.discardPile.push(cards[cards.length - 1]);
    }
    player.cardCount = player.cards.length;

    // 设置颜色（最后一张牌的颜色）
    const lastCard = cards[cards.length - 1];
    this.state.currentColor =
      lastCard.type === 'wild' || lastCard.type === 'draw4'
        ? chosenColor || 'red'
        : lastCard.color;

    console.log(`[OutModeV2] ${player.nickname} 连打 ${comboType}: ${cardIds!.length}张`);

    // 出完牌 → 完成
    if (player.cards.length === 0) {
      this.playerManager.playerFinished(playerId);
      return;
    }

    // 应用连打效果
    this.applyComboEffect(comboType!, cardIds!.length);

    // 流转回合
    this.playerManager.nextTurn();
  }

  private applyComboEffect(comboType: string, straightLength?: number): void {
    switch (comboType) {
      case 'pair':
        break; // 对子：无效果
      case 'three': {
        // 三条：下家跳过
        const nextId = this.playerManager.getNextPlayerId();
        if (nextId) this.state.skippedPlayerId = nextId;
        break;
      }
      case 'rainbow':
        // 彩虹：目标摸 +3
        this.state.pendingDraw = (this.state.pendingDraw || 0) + 3;
        break;
      case 'straight':
        // 顺子：下家摸 N-2 张
        this.state.pendingDraw = (this.state.pendingDraw || 0) + ((straightLength || 3) - 2);
        break;
    }
  }

  // ============================================================================
  // 覆盖父类方法
  // ============================================================================

  protected executeDraw(action: GameActionV2): void {
    super.executeDraw(action);
    this.checkHandLimit(action.playerId);
  }

  protected onPlayerFinished(playerId: string): void {
    this.playerManager.playerFinished(playerId);
  }

  // ============================================================================
  // 手牌上限与淘汰
  // ============================================================================

  private checkHandLimit(playerId: string): void {
    const player = this.state.players.get(playerId);
    if (!player) return;
    if (player.cards.length > (this.state.outState?.maxCards ?? 20)) {
      console.log(`[OutModeV2] ${player.nickname} 手牌${player.cards.length}张，超上限，淘汰！`);
      this.playerManager.playerEliminated(playerId);
    }
  }

  /** 由 GameClock 调用，推进阶段并注入惩罚卡 */
  advancePhase(newPhase: number): void {
    if (!this.state.outState) return;
    this.state.outState.phase = newPhase as 0 | 1 | 2 | 3;
    console.log(`[OutModeV2] 进入阶段${newPhase}！`);
    // 阶段推进后检查所有在场玩家是否超限
    for (const playerId of [...this.state.tablePlayerIds]) {
      this.checkHandLimit(playerId);
    }
  }
}
