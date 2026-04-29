/**
 * GameInitializer - 游戏初始化工具
 * 
 * 职责：
 * 1. 从Room创建GameStateV2
 * 2. 发牌
 * 3. 设置初始状态
 */

import { Room, Player, Card } from '../../shared/index.js';
import { GameStateV2, GameConfig } from './types.js';
import { PlayerManager } from './PlayerManager.js';
import { CardManager } from '../Card.js';

export class GameInitializer {
  /**
   * 从房间创建初始游戏状态
   */
  static createFromRoom(room: Room, config: GameConfig): GameStateV2 {
    // 1. 准备玩家数据
    const players = new Map<string, Player>();
    const playerIds: string[] = [];
    
    for (const player of room.players) {
      // 深拷贝玩家，避免引用问题
      const playerCopy: Player = {
        ...player,
        cards: [],
        cardCount: 0,
        hasCalledUno: false,
        eliminated: false
      };
      players.set(player.id, playerCopy);
      playerIds.push(player.id);
    }
    
    // 2. 准备牌库
    const deck = GameInitializer.createDeck(playerIds.length);
    const discardPile: Card[] = [];
    
    // 3. 翻开首张牌
    const firstCard = GameInitializer.drawFirstCard(deck);
    discardPile.push(firstCard);
    
    // 4. 发牌
    for (const playerId of playerIds) {
      const player = players.get(playerId)!;
      const cards = deck.splice(-config.cardsPerPlayer, config.cardsPerPlayer);
      player.cards = cards;
      player.cardCount = cards.length;
    }
    
    // 5. 创建游戏状态
    const state: GameStateV2 = {
      players,
      tablePlayerIds: playerIds,
      finishedPlayerIds: new Array(playerIds.length).fill(null), // 预分配
      currentPlayerIndex: 0,
      direction: 1,
      phase: 'playing',
      deck,
      discardPile,
      currentColor: firstCard.color === 'wild' ? 'red' : firstCard.color,
      turnStartTime: Date.now(),
      gameStartTime: Date.now()
    };
    
    console.log(`[GameInitializer] 游戏初始化完成：${playerIds.length}名玩家，每人${config.cardsPerPlayer}张牌`);
    
    return state;
  }

  /**
   * 创建牌库（根据人数决定牌组数量）
   */
  private static createDeck(playerCount: number): Card[] {
    // 2-4人=1副，5-8人=2副，9-12人=3副
    const deckMultiplier = Math.ceil(playerCount / 4);
    
    let deck: Card[] = [];
    for (let i = 0; i < deckMultiplier; i++) {
      deck.push(...CardManager.createDeck());
    }
    
    return CardManager.shuffleDeck(deck);
  }

  /**
   * 抽取首张牌（确保不是万能牌）
   */
  private static drawFirstCard(deck: Card[]): Card {
    let firstCard = deck.pop();
    if (!firstCard) {
      throw new Error('牌库为空，无法抽取首张牌');
    }
    
    // 如果是万能牌，重新抽（最多3次）
    let reshuffleCount = 0;
    while ((firstCard.type === 'wild' || firstCard.type === 'draw4') && reshuffleCount < 3) {
      deck.unshift(firstCard);
      firstCard = deck.pop();
      if (!firstCard) throw new Error('牌库为空');
      reshuffleCount++;
    }
    
    // 如果还是万能牌，强制替换为红色0
    if (firstCard.type === 'wild' || firstCard.type === 'draw4') {
      return {
        id: `forced-${Date.now()}`,
        type: 'number',
        color: 'red',
        value: 0
      };
    }
    
    return firstCard;
  }

  /**
   * 转换旧版GameState到V2（迁移用）
   */
  static migrateFromV1(oldState: any): GameStateV2 {
    // 创建新的players Map
    const players = new Map<string, Player>();
    const tablePlayerIds: string[] = [];
    const finishedPlayerIds: string[] = [];
    
    for (const player of oldState.players || []) {
      // 迁移时标记淘汰状态
      const playerCopy = { ...player };
      
      // 判断玩家状态
      if (player.eliminated) {
        playerCopy.eliminated = true;
        finishedPlayerIds.push(player.id);
      } else if (player.cards.length === 0 || oldState.rankings?.includes(player.id)) {
        finishedPlayerIds.push(player.id);
      } else {
        tablePlayerIds.push(player.id);
      }
      
      players.set(player.id, playerCopy);
    }
    
    // 找到当前玩家索引
    let currentPlayerIndex = 0;
    const currentId = oldState.currentPlayerId;
    if (currentId) {
      const idx = tablePlayerIds.indexOf(currentId);
      if (idx !== -1) currentPlayerIndex = idx;
    }
    
    return {
      players,
      tablePlayerIds,
      finishedPlayerIds,
      currentPlayerIndex,
      direction: oldState.direction === 'counterclockwise' ? -1 : 1,
      phase: oldState.winner || oldState.isRoundEnded ? 'finished' : 'playing',
      winnerId: oldState.winner,
      deck: oldState.deck || [],
      discardPile: oldState.discardPile || [],

      currentColor: oldState.currentColor || 'red',
      pendingDraw: oldState.pendingDraw,
      pendingDrawType: oldState.pendingDrawType,
      skippedPlayerId: oldState.skippedPlayerId,
      turnStartTime: oldState.turnStartTime || Date.now(),
      outState: oldState.outState
    };
  }
}
