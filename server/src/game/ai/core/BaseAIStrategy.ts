import { Player, GameState, Card, GameAction } from '../../../shared/index.js';
import { AIContext, PenaltyResponse, ComboOption, SinglePlayOption, AIDifficultyConfig } from '../types.js';
import { EmojiType } from '../emojis.js';

/**
 * AI能力等级
 */
export enum AICapability {
  NONE = 0,
  BASIC = 1,
  MEMORY = 2,
  PREDICTION = 3,
  DECEPTION = 4,
  OPTIMAL = 5
}

/**
 * 游戏记忆
 */
export interface GameMemory {
  playedCards: Map<string, number>;
  playerActions: Map<string, ActionHistory[]>;
  deckEstimate: Map<string, number>;
  lastUpdate: number;
}

export interface ActionHistory {
  action: string;
  card?: Card;
  timestamp: number;
}

/**
 * AI策略抽象基类
 */
export abstract class BaseAIStrategy {
  protected playerId: string;
  protected difficulty: 'easy' | 'normal' | 'hard';
  protected capabilities: Set<AICapability>;
  protected memory?: GameMemory;
  protected lastEmojiTime: number = 0;
  protected emojiCooldown: number = 3000;
  
  public onSendEmoji?: (emoji: EmojiType, target?: string) => void;
  
  constructor(playerId: string, difficulty: 'easy' | 'normal' | 'hard') {
    this.playerId = playerId;
    this.difficulty = difficulty;
    this.capabilities = this.initCapabilities();
    
    if (this.hasCapability(AICapability.MEMORY)) {
      this.memory = {
        playedCards: new Map(),
        playerActions: new Map(),
        deckEstimate: new Map(),
        lastUpdate: Date.now()
      };
    }
  }
  
  protected abstract initCapabilities(): Set<AICapability>;
  
  protected hasCapability(cap: AICapability): boolean {
    return this.capabilities.has(cap);
  }
  
  protected updateMemory(ctx: AIContext): void {
    if (!this.hasCapability(AICapability.MEMORY) || !this.memory) return;
    
    const { gameState } = ctx;
    
    for (const card of gameState.discardPile) {
      const count = this.memory.playedCards.get(card.id) || 0;
      this.memory.playedCards.set(card.id, count + 1);
    }
    
    this.memory.lastUpdate = Date.now();
  }
  
  protected sendEmoji(emoji: EmojiType, target?: string): void {
    const now = Date.now();
    if (now - this.lastEmojiTime < this.emojiCooldown) return;
    this.lastEmojiTime = now;
    this.onSendEmoji?.(emoji, target);
  }
  
  protected randomChoice<T>(arr: T[]): T | null {
    if (arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }
  
  protected randomChance(probability: number): boolean {
    return Math.random() < probability;
  }
  
  protected makeMistake(): boolean {
    if (this.difficulty !== 'easy') return false;
    return this.randomChance(0.2);
  }
  
  abstract makeDecision(ctx: AIContext): GameAction | null;
  abstract evaluatePenaltyResponses(ctx: AIContext): PenaltyResponse[];
  abstract evaluateComboOptions(ctx: AIContext): ComboOption[];
}
