/**
 * OutModeV2 - Out模式实现（重构版）
 * 
 * 核心特性：
 * 1. 连打出牌（对子/三连/彩虹/顺子）
 * 2. 手牌上限惩罚机制
 * 3. 逐步淘汰系统
 */

import { Card } from '../../shared/index.js';
import { 
  GameStateV2, 
  GameActionV2, 
  ValidationResult 
} from './types.js';
import { BaseGameModeV2 } from './BaseGameModeV2.js';

export interface OutState {
  phase: 0 | 1 | 2 | 3;     // 当前阶段
  maxCards: number;          // 当前手牌上限
  nextOutAt: number;         // 下阶段触发阈值
}

export class OutModeV2 extends BaseGameModeV2 {
  readonly name = 'out';
  readonly description = 'Out模式：连打出牌，手牌超限即淘汰，最后存活者胜';
  
  // Out模式配置
  protected config = {
    cardsPerPlayer: 7,
    turnTimer: 120,
    allowStacking: true,
    allowJumpIn: true
  };
  
  // 阶段配置
  private static readonly PHASE_CONFIG = [
    { maxCards: 12, nextOutAt: 10 },  // 阶段0: ≤12张，10张进入阶段1
    { maxCards: 10, nextOutAt: 8 },   // 阶段1: ≤10张，8张进入阶段2
    { maxCards: 8, nextOutAt: 6 },    // 阶段2: ≤8张，6张进入阶段3
    { maxCards: 6, nextOutAt: 0 }     // 阶段3: ≤6张，无上限
  ];

  // 连打类型与惩罚映射
  private static readonly COMBO_PENALTY = {
    pair: 'draw3',      // 对子 +3
    three: 'draw5',     // 三连 +5
    rainbow: 'draw5',   // 彩虹 +5
    straight: 'draw8'   // 顺子 +8
  };

  // ============================================================================
  // 初始化
  // ============================================================================
  
  protected onInitialize(): void {
    // 初始化Out模式状态
    this.state.outState = {
      phase: 0,
      maxCards: OutModeV2.PHASE_CONFIG[0].maxCards,
      nextOutAt: OutModeV2.PHASE_CONFIG[0].nextOutAt
    };
    
    console.log(`[OutModeV2] 初始化完成，阶段0，手牌上限${this.state.outState.maxCards}`);
  }

  // ============================================================================
  // 动作验证
  // ============================================================================

  /**
   * 验证连打出牌
   */
  protected validateCombo(action: GameActionV2): ValidationResult {
    const { playerId, cardIds, comboType } = action;
    
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
    
    // 验证玩家拥有这些牌
    const cards: Card[] = [];
    for (const cardId of cardIds) {
      const card = player.cards.find(c => c.id === cardId);
      if (!card) {
        return { valid: false, error: `玩家没有牌 ${cardId}` };
      }
      cards.push(card);
    }
    
    // 验证连打规则
    switch (comboType) {
      case 'pair':
        return this.validatePair(cards);
      case 'three':
        return this.validateThree(cards);
      case 'rainbow':
        return this.validateRainbow(cards);
      case 'straight':
        return this.validateStraight(cards);
      default:
        return { valid: false, error: `未知的连打类型: ${comboType}` };
    }
  }

  /**
   * 验证对子（相同颜色或相同数字）
   */
  private validatePair(cards: Card[]): ValidationResult {
    if (cards.length !== 2) {
      return { valid: false, error: '对子需要2张牌' };
    }
    
    const [c1, c2] = cards;
    
    // 万能牌不能参与连打
    if (c1.type === 'wild' || c1.type === 'draw4' || 
        c2.type === 'wild' || c2.type === 'draw4') {
      return { valid: false, error: '万能牌不能参与连打' };
    }
    
    // 同色或同值
    const sameColor = c1.color === c2.color;
    const sameValue = c1.value === c2.value;
    
    if (!sameColor && !sameValue) {
      return { valid: false, error: '对子需要同色或同值' };
    }
    
    return { valid: true };
  }

  /**
   * 验证三连（三张同色）
   */
  private validateThree(cards: Card[]): ValidationResult {
    if (cards.length !== 3) {
      return { valid: false, error: '三连需要3张牌' };
    }
    
    // 不能包含万能牌
    if (cards.some(c => c.type === 'wild' || c.type === 'draw4')) {
      return { valid: false, error: '万能牌不能参与连打' };
    }
    
    // 同色
    const color = cards[0].color;
    if (!cards.every(c => c.color === color)) {
      return { valid: false, error: '三连需要同色' };
    }
    
    return { valid: true };
  }

  /**
   * 验证彩虹（四色各一张）
   */
  private validateRainbow(cards: Card[]): ValidationResult {
    if (cards.length !== 4) {
      return { valid: false, error: '彩虹需要4张牌' };
    }
    
    // 不能包含万能牌
    if (cards.some(c => c.type === 'wild' || c.type === 'draw4')) {
      return { valid: false, error: '万能牌不能参与连打' };
    }
    
    // 四种不同颜色
    const colors = new Set(cards.map(c => c.color));
    if (colors.size !== 4) {
      return { valid: false, error: '彩虹需要四种不同颜色' };
    }
    
    return { valid: true };
  }

  /**
   * 验证顺子（三张连续数字）
   */
  private validateStraight(cards: Card[]): ValidationResult {
    if (cards.length !== 3) {
      return { valid: false, error: '顺子需要3张牌' };
    }
    
    // 不能包含万能牌
    if (cards.some(c => c.type === 'wild' || c.type === 'draw4')) {
      return { valid: false, error: '万能牌不能参与连打' };
    }
    
    // 同色
    const color = cards[0].color;
    if (!cards.every(c => c.color === color)) {
      return { valid: false, error: '顺子需要同色' };
    }
    
    // 连续数字
    const values = cards.map(c => Number(c.value)).sort((a, b) => a - b);
    if (values[1] !== values[0] + 1 || values[2] !== values[1] + 1) {
      return { valid: false, error: '顺子需要连续数字' };
    }
    
    return { valid: true };
  }

  // ============================================================================
  // 动作执行
  // ============================================================================

  /**
   * 执行连打出牌
   */
  protected executeCombo(action: GameActionV2): void {
    const { playerId, cardIds, comboType, chosenColor } = action;
    const player = this.state.players.get(playerId)!;
    
    // 移除手牌
    const cards: Card[] = [];
    for (const cardId of cardIds!) {
      const index = player.cards.findIndex(c => c.id === cardId);
      const card = player.cards.splice(index, 1)[0];
      cards.push(card);
      this.state.discardPile.push(card);
    }
    
    // 设置颜色（最后一张牌的颜色，如果是wild则使用chosenColor）
    const lastCard = cards[cards.length - 1];
    if (lastCard.type === 'wild' || lastCard.type === 'draw4') {
      this.state.currentColor = chosenColor || 'red';
    } else {
      this.state.currentColor = lastCard.color;
    }
    
    player.cardCount = player.cards.length;
    
    console.log(`[OutModeV2] 玩家 ${player.nickname} 连打 ${comboType}: ${cardIds!.length}张牌`);
    
    // 检查是否出完牌
    if (player.cards.length === 0) {
      this.playerManager.playerFinished(playerId);
      this.checkPhaseProgression();
      return;
    }
    
    // 设置连打惩罚
    this.applyComboPenalty(comboType!);
    
    // 流转回合
    this.playerManager.nextTurn();
  }

  /**
   * 应用连打惩罚
   */
  private applyComboPenalty(comboType: string): void {
    const penaltyType = OutModeV2.COMBO_PENALTY[comboType as keyof typeof OutModeV2.COMBO_PENALTY];
    if (!penaltyType) return;
    
    const drawCount = parseInt(penaltyType.replace('draw', ''));
    this.state.pendingDraw = drawCount;
    this.state.pendingDrawType = penaltyType as any;
    
    console.log(`[OutModeV2] 连打惩罚: 下家需要摸 ${drawCount}张牌`);
  }

  /**
   * 执行摸牌（覆盖以检查手牌上限）
   */
  protected executeDraw(action: GameActionV2): void {
    super.executeDraw(action);
    
    // 检查手牌上限
    this.checkHandLimit(action.playerId);
  }

  /**
   * 检查手牌上限并执行淘汰
   */
  private checkHandLimit(playerId: string): void {
    const player = this.state.players.get(playerId);
    if (!player) return;
    
    const outState = this.state.outState!;
    
    if (player.cards.length > outState.maxCards) {
      console.log(`[OutModeV2] 玩家 ${player.nickname} 手牌${player.cards.length}张，超过上限${outState.maxCards}，被淘汰！`);
      this.playerManager.playerEliminated(playerId);
      
      // 检查阶段推进
      this.checkPhaseProgression();
    }
  }

  /**
   * 检查是否推进阶段
   * 当有玩家手牌 ≤ nextOutAt 时，进入下一阶段
   */
  private checkPhaseProgression(): void {
    if (!this.state.outState) return;
    
    const currentPhase = this.state.outState.phase;
    if (currentPhase >= 3) return; // 最后阶段
    
    // 检查是否有玩家手牌达到阈值
    const threshold = this.state.outState.nextOutAt;
    let shouldProgress = false;
    
    for (const playerId of this.state.tablePlayerIds) {
      const player = this.state.players.get(playerId);
      if (player && player.cards.length <= threshold) {
        shouldProgress = true;
        break;
      }
    }
    
    // 检查已结束玩家
    for (const playerId of this.state.finishedPlayerIds) {
      if (playerId === null) continue;
      const player = this.state.players.get(playerId);
      if (player && player.cards.length <= threshold) {
        shouldProgress = true;
        break;
      }
    }
    
    if (shouldProgress) {
      this.progressPhase();
    }
  }

  /**
   * 推进到下一阶段
   */
  private progressPhase(): void {
    const currentPhase = this.state.outState!.phase;
    const nextPhase = (currentPhase + 1) as 0 | 1 | 2 | 3;
    
    const config = OutModeV2.PHASE_CONFIG[nextPhase];
    this.state.outState = {
      phase: nextPhase,
      maxCards: config.maxCards,
      nextOutAt: config.nextOutAt
    };
    
    console.log(`[OutModeV2] 进入阶段${nextPhase}！手牌上限${config.maxCards}，下阶段阈值${config.nextOutAt}`);
    
    // 检查是否有玩家因阶段推进而超限
    for (const playerId of [...this.state.tablePlayerIds]) {
      this.checkHandLimit(playerId);
    }
  }

  // ============================================================================
  // 覆盖父类方法
  // ============================================================================

  /**
   * 覆盖出牌后的检查
   */
  protected onPlayerFinished(playerId: string): void {
    this.playerManager.playerFinished(playerId);
    this.checkPhaseProgression();
  }

  /**
   * 覆盖惩罚牌处理
   */
  protected applyDrawEffect(type: 'draw2' | 'draw4'): void {
    if (!this.state.pendingDraw) {
      this.state.pendingDraw = type === 'draw2' ? 2 : 4;
      this.state.pendingDrawType = type;
    }
  }
}
