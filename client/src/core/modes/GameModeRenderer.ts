import type { Room, GameState, Card } from '../../../shared/types';

/**
 * 游戏模式渲染器接口
 * 定义不同模式下的UI渲染逻辑
 */
export interface GameModeRenderer {
  readonly name: string;
  readonly description: string;
  
  /**
   * 渲染游戏状态栏
   */
  renderStatusBar(props: {
    gameState: GameState;
    isMyTurn: boolean;
  }): React.ReactNode;
  
  /**
   * 渲染玩家手牌区域
   */
  renderHandArea(props: {
    cards: Card[];
    playableCards: Set<string>;
    selectedCards: string[];
    onCardClick: (card: Card) => void;
  }): React.ReactNode;
  
  /**
   * 渲染控制按钮
   */
  renderControls(props: {
    canPlay: boolean;
    canDraw: boolean;
    selectedCards: string[];
    onPlay: () => void;
    onDraw: () => void;
  }): React.ReactNode;
  
  /**
   * 检测连打组合
   * @param cards 手牌
   * @param gameState 游戏状态（用于检查弃牌堆匹配）
   * @returns 可打的连打组合（已过滤掉第一张牌不匹配的）
   */
  detectCombos?(cards: Card[], gameState?: GameState): Array<{type: string; cardIds: string[]; name: string}>;
  
  /**
   * 获取模式特有的动作提示
   */
  getActionHint?(props: {
    gameState: GameState;
    isMyTurn: boolean;
    selectedCards: string[];
  }): string | null;
}

/**
 * 标准模式渲染器
 */
export class StandardModeRenderer implements GameModeRenderer {
  readonly name = 'standard';
  readonly description = '经典UNO规则';
  
  renderStatusBar({ gameState, isMyTurn }: {
    gameState: GameState;
    isMyTurn: boolean;
  }): React.ReactNode {
    return null; // 标准模式没有特殊状态栏
  }
  
  renderHandArea({ cards, playableCards, selectedCards, onCardClick }: {
    cards: Card[];
    playableCards: Set<string>;
    selectedCards: string[];
    onCardClick: (card: Card) => void;
  }): React.ReactNode {
    return null; // 使用默认渲染
  }
  
  renderControls({ canPlay, canDraw, selectedCards, onPlay, onDraw }: {
    canPlay: boolean;
    canDraw: boolean;
    selectedCards: string[];
    onPlay: () => void;
    onDraw: () => void;
  }): React.ReactNode {
    return null; // 使用默认渲染
  }
}

/**
 * Out模式渲染器
 */
export class OutModeRenderer implements GameModeRenderer {
  readonly name = 'out';
  readonly description = '大逃杀模式';
  
  renderStatusBar({ gameState, isMyTurn }: {
    gameState: GameState;
    isMyTurn: boolean;
  }): React.ReactNode {
    const { outState } = gameState;
    if (!outState) return null;
    
    const remaining = Math.max(0, outState.nextOutAt - Date.now());
    const seconds = Math.floor(remaining / 1000);
    
    return {
      phase: outState.phase,
      countdown: seconds,
      maxCards: outState.maxCards
    };
  }
  
  /**
   * 检测连打组合
   * 
   * 规则：第一张牌必须与弃牌堆顶部的牌匹配（颜色或数字）
   */
  detectCombos(cards: Card[], gameState?: GameState): Array<{type: string; cardIds: string[]; name: string}> {
    const combos: Array<{type: string; cardIds: string[]; name: string}> = [];
    const numberCards = cards.filter(c => c.type === 'number' && typeof c.value === 'number');
    
    // 获取弃牌堆顶部牌信息（用于验证第一张牌是否可出）
    const topCard = gameState?.discardPile?.[gameState.discardPile.length - 1];
    const currentColor = gameState?.currentColor;
    
    // 判断一张牌是否可以作为第一张出牌
    const canPlayAsFirst = (card: Card): boolean => {
      if (!topCard || !currentColor) return true; // 无游戏状态时默认允许
      if (card.type === 'wild' || card.type === 'draw4') return true; // 万能牌随时可出
      if (card.color === currentColor) return true; // 颜色匹配
      if (card.value === topCard.value) return true; // 数字匹配
      return false;
    };
    
    // 按数字分组
    const byNumber = new Map<number, typeof numberCards>();
    const byColor = new Map<string, typeof numberCards>();
    
    for (const card of numberCards) {
      const value = card.value as number;
      if (!byNumber.has(value)) byNumber.set(value, []);
      byNumber.get(value)!.push(card);
      
      if (card.color) {
        if (!byColor.has(card.color)) byColor.set(card.color, []);
        byColor.get(card.color)!.push(card);
      }
    }
    
    // 检测对子、三条、彩虹
    for (const [value, cardList] of byNumber) {
      // 只保留可以作为第一张出的牌
      const playableCards = cardList.filter(canPlayAsFirst);
      
      // 彩虹：需要4种颜色各一张，且至少有一张可作为第一张
      if (cardList.length >= 4) {
        const colors = new Set(cardList.map(c => c.color));
        if (colors.size === 4) {
          // 每种颜色选一张
          const rainbowCards: typeof cardList = [];
          const usedColors = new Set<string>();
          for (const card of cardList) {
            if (card.color && !usedColors.has(card.color)) {
              rainbowCards.push(card);
              usedColors.add(card.color);
            }
          }
          // 检查是否至少有一张可作为第一张
          if (rainbowCards.some(c => canPlayAsFirst(c))) {
            combos.push({ type: 'rainbow', cardIds: rainbowCards.map(c => c.id), name: `彩虹${value}` });
          }
        }
      }
      
      // 三条：需要至少3张，且至少有一张可作为第一张
      if (cardList.length >= 3) {
        // 生成所有可能的三条组合（考虑所有排列，确保可出的牌作为第一张）
        const playableIndices = cardList.map((c, i) => canPlayAsFirst(c) ? i : -1).filter(i => i >= 0);
        
        for (const firstIdx of playableIndices) {
          // 从剩余牌中选2张组成三条
          const remaining = cardList.filter((_, i) => i !== firstIdx);
          for (let i = 0; i < remaining.length - 1; i++) {
            for (let j = i + 1; j < remaining.length; j++) {
              const comboCards = [cardList[firstIdx], remaining[i], remaining[j]];
              combos.push({ 
                type: 'three', 
                cardIds: comboCards.map(c => c.id), 
                name: `三条${value}` 
              });
            }
          }
        }
      }
      
      // 对子：需要至少2张，且至少有一张可作为第一张
      if (cardList.length >= 2) {
        // 生成所有以可出牌为第一张的对子组合
        for (let i = 0; i < cardList.length; i++) {
          if (canPlayAsFirst(cardList[i])) {
            for (let j = 0; j < cardList.length; j++) {
              if (i !== j) {
                const comboCards = [cardList[i], cardList[j]];
                combos.push({ 
                  type: 'pair', 
                  cardIds: comboCards.map(c => c.id), 
                  name: `对子${value}` 
                });
              }
            }
          }
        }
      }
    }
    
    // 检测顺子（第一张必须与弃牌堆匹配）
    for (const [color, cardList] of byColor) {
      const sorted = [...cardList].sort((a, b) => ((a.value as number) || 0) - ((b.value as number) || 0));
      
      for (let i = 0; i < sorted.length; i++) {
        // 顺子的第一张必须可出
        if (!canPlayAsFirst(sorted[i])) continue;
        
        let sequence: typeof numberCards = [sorted[i]];
        
        for (let j = i + 1; j < sorted.length; j++) {
          const lastValue = (sequence[sequence.length - 1]?.value as number) || 0;
          const currentValue = (sorted[j].value as number) || 0;
          
          if (currentValue === lastValue + 1) {
            sequence.push(sorted[j]);
            if (sequence.length >= 3) {
              const start = (sequence[0].value as number) || 0;
              const end = (sequence[sequence.length - 1].value as number) || 0;
              combos.push({ 
                type: 'straight', 
                cardIds: sequence.map(c => c.id),
                name: `${color}${start}-${end}`
              });
            }
          } else if (currentValue > lastValue + 1) {
            break;
          }
        }
      }
    }
    
    return combos;
  }
  
  getActionHint({ gameState, isMyTurn, selectedCards }: {
    gameState: GameState;
    isMyTurn: boolean;
    selectedCards: string[];
  }): string | null {
    if (!isMyTurn) return null;
    
    const { pendingDraw } = gameState;
    if (pendingDraw && pendingDraw > 0) {
      return `累积惩罚: +${pendingDraw}张`;
    }
    
    if (selectedCards.length >= 2) {
      return '点击"出连打"按钮出牌';
    }
    
    return null;
  }
  
  renderStatusBar(): React.ReactNode { return null; }
  renderHandArea(): React.ReactNode { return null; }
  renderControls(): React.ReactNode { return null; }
}

/**
 * 渲染器工厂
 */
export class GameModeRendererFactory {
  private static renderers = new Map<string, new () => GameModeRenderer>();
  
  static register(name: string, RendererClass: new () => GameModeRenderer): void {
    this.renderers.set(name, RendererClass);
  }
  
  static create(name: string): GameModeRenderer {
    const RendererClass = this.renderers.get(name);
    if (!RendererClass) {
      return new StandardModeRenderer();
    }
    return new RendererClass();
  }
  
  static isRegistered(name: string): boolean {
    return this.renderers.has(name);
  }
}

// 注册渲染器
GameModeRendererFactory.register('standard', StandardModeRenderer);
GameModeRendererFactory.register('out', OutModeRenderer);
