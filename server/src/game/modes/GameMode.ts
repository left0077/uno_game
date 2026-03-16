import { Room, GameState, GameAction, Card, Player } from '../../shared/index.js';

/**
 * 游戏模式接口
 * 所有游戏模式必须实现此接口
 */
export interface GameMode {
  readonly name: string;
  readonly description: string;
  
  /**
   * 初始化游戏状态
   */
  initialize(room: Room): GameState;
  
  /**
   * 验证动作是否合法
   */
  validateAction(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): { valid: boolean; error?: string };
  
  /**
   * 执行动作，返回新状态
   */
  executeAction(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): GameState;
  
  /**
   * 获取玩家当前可执行的动作列表
   */
  getAvailableActions(state: GameState, playerId: string): GameAction[];
  
  /**
   * 检查胜利条件
   */
  checkWinCondition(state: GameState): string | null;
  
  /**
   * 回合结束时的处理
   */
  onTurnEnd(state: GameState, playerId: string): GameState;
  
  /**
   * 游戏清理
   */
  destroy?(): void;
}

/**
 * 连打类型
 */
export type ComboType = 'pair' | 'three' | 'rainbow' | 'straight';

/**
 * 连打效果
 */
export interface ComboEffect {
  type: 'draw' | 'skip' | 'transfer' | 'none';
  target: 'next' | 'prev' | 'self' | 'chooser';
  value: number;
  extra?: Record<string, unknown>;
}

/**
 * 连打定义
 */
export interface ComboDefinition {
  readonly type: ComboType;
  readonly name: string;
  readonly minCards: number;
  readonly maxCards?: number;
  validate(cards: Card[]): boolean;
  getEffect(state: GameState, cards: Card[], playerId: string): ComboEffect;
}

/**
 * 游戏模式工厂
 */
export class GameModeFactory {
  private static modes = new Map<string, new () => GameMode>();
  
  static register(name: string, ModeClass: new () => GameMode): void {
    this.modes.set(name, ModeClass);
  }
  
  static create(name: string): GameMode {
    const ModeClass = this.modes.get(name);
    if (!ModeClass) {
      throw new Error(`Unknown game mode: ${name}`);
    }
    return new ModeClass();
  }
  
  static getAvailableModes(): string[] {
    return Array.from(this.modes.keys());
  }
  
  static isRegistered(name: string): boolean {
    return this.modes.has(name);
  }
}

// 导出其他类型
export { BaseGameMode } from './BaseGameMode.js';
export { OutMode } from './OutMode.js';
