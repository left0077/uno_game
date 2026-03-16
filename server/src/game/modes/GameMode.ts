import { Room, GameState, GameAction, Card, Player } from '../../shared/index.js';
import { AvailableActions, ValidationResult, ComboType, ComboDefinition, ComboEffect } from '../../shared/actionApi.js';

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
   * 获取玩家当前可执行的动作列表 (v1.0 - 已弃用)
   * @deprecated 请使用 getAvailableActionsV2
   */
  getAvailableActions(state: GameState, playerId: string): GameAction[];
  
  /**
   * 获取玩家可用的所有动作 (v2.0)
   * 这是新架构的核心接口，返回详细的动作信息
   */
  getAvailableActionsV2(state: GameState, playerId: string): AvailableActions;
  
  /**
   * 验证动作是否合法 (v2.0)
   * 提供更详细的验证结果和错误信息
   */
  validateActionV2(state: GameState, action: GameAction, playerId: string): ValidationResult;
  
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

// 从 actionApi.ts 重新导出类型
export { ComboType, ComboDefinition, ComboEffect, AvailableActions, ValidationResult } from '../../shared/actionApi.js';

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
