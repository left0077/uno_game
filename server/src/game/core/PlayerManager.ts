/**
 * PlayerManager - 玩家状态管理核心类
 * 
 * 职责：
 * 1. 管理玩家在不同状态间的流转
 * 2. 提供回合流转相关方法
 * 3. 提供查询接口
 * 
 * Out模式排名规则（预分配位置）：
 * - 第1个出完的 → 位置0（第1名）
 * - 第2个出完的 → 位置1（第2名）
 * - ...
 * - 最后存活的 → 剩下的空位
 * - 第2个淘汰的 → 倒数第2个位置
 * - 第1个淘汰的 → 最后1个位置（最后一名）
 */

import { Player } from '../../shared/index.js';
import { GameStateV2, getPlayerStatus } from './types.js';

export class PlayerManager {
  private totalPlayers: number;
  private completedCount: number = 0;   // 已出完人数
  private eliminatedCount: number = 0;  // 已淘汰人数
  
  constructor(private state: GameStateV2) {
    this.totalPlayers = state.players.size;
  }

  // ============================================================================
  // 玩家状态流转
  // ============================================================================

  /**
   * 玩家完成游戏（出完所有牌）
   * 位置：从左往右填（第1个出完=第1名，第2个出完=第2名...）
   */
  playerFinished(playerId: string): void {
    if (this.isFinished(playerId)) return;
    
    const tableIndex = this.state.tablePlayerIds.indexOf(playerId);
    if (tableIndex === -1) return;
    
    // 从牌桌移除
    this.state.tablePlayerIds.splice(tableIndex, 1);
    
    // 位置 = 已出完人数（从左往右填）
    const position = this.completedCount;
    this.state.finishedPlayerIds[position] = playerId;
    this.completedCount++;
    
    // 调整当前玩家索引
    this.adjustCurrentIndex(tableIndex);
    
    const player = this.state.players.get(playerId);
    console.log(`[PlayerManager] 玩家 ${player?.nickname || playerId} 完成游戏，排名第${position + 1}`);
    
    this.checkGameOver();
  }

  /**
   * 玩家被淘汰（Out模式）
   * 位置：从右往左填（第1个淘汰=最后一名，第2个淘汰=倒数第二名...）
   */
  playerEliminated(playerId: string): void {
    if (this.isFinished(playerId)) return;
    
    const tableIndex = this.state.tablePlayerIds.indexOf(playerId);
    if (tableIndex === -1) return;
    
    // 从牌桌移除
    this.state.tablePlayerIds.splice(tableIndex, 1);
    
    // 标记淘汰
    const player = this.state.players.get(playerId);
    if (player) {
      player.eliminated = true;
    }
    
    // 位置 = 总人数 - 1 - 已淘汰人数（从右往左填）
    const position = this.totalPlayers - 1 - this.eliminatedCount;
    this.state.finishedPlayerIds[position] = playerId;
    this.eliminatedCount++;
    
    // 调整当前玩家索引
    this.adjustCurrentIndex(tableIndex);
    
    console.log(`[PlayerManager] 玩家 ${player?.nickname || playerId} 被淘汰，当前排名第${position + 1}`);
    
    this.checkGameOver();
  }

  /**
   * 最后存活的玩家（游戏结束时调用）
   * 填入剩下的空位
   */
  finalizeSurvivor(): void {
    if (this.state.tablePlayerIds.length !== 1) return;
    
    const playerId = this.state.tablePlayerIds[0];
    const player = this.state.players.get(playerId);
    
    // 清空牌桌
    this.state.tablePlayerIds = [];
    
    // 填入剩下的空位
    const position = this.completedCount;
    this.state.finishedPlayerIds[position] = playerId;
    
    console.log(`[PlayerManager] 玩家 ${player?.nickname || playerId} 存活到最后，排名第${position + 1}`);
  }

  /**
   * 调整当前玩家索引
   */
  private adjustCurrentIndex(removedIndex: number): void {
    if (removedIndex < this.state.currentPlayerIndex) {
      this.state.currentPlayerIndex--;
    } else if (removedIndex === this.state.currentPlayerIndex) {
      if (this.state.currentPlayerIndex >= this.state.tablePlayerIds.length) {
        this.state.currentPlayerIndex = 0;
      }
    }
  }

  // ============================================================================
  // 回合流转
  // ============================================================================

  getCurrentPlayerId(): string | undefined {
    if (this.state.tablePlayerIds.length === 0) return undefined;
    return this.state.tablePlayerIds[this.state.currentPlayerIndex];
  }

  getCurrentPlayer(): Player | undefined {
    const id = this.getCurrentPlayerId();
    return id ? this.state.players.get(id) : undefined;
  }

  nextTurn(): string | undefined {
    if (this.state.tablePlayerIds.length === 0) return undefined;
    if (this.state.tablePlayerIds.length === 1) {
      this.state.winnerId = this.state.tablePlayerIds[0];
      this.state.phase = 'finished';
      return this.state.tablePlayerIds[0];
    }

    // 清除上一玩家的 UNO 状态
    const prevId = this.state.tablePlayerIds[this.state.currentPlayerIndex];
    const prevPlayer = this.state.players.get(prevId);
    if (prevPlayer) {
      prevPlayer.hasCalledUno = false;
    }

    // 推进到下一玩家
    this.state.currentPlayerIndex =
      (this.state.currentPlayerIndex + this.state.direction + this.state.tablePlayerIds.length)
      % this.state.tablePlayerIds.length;

    // 检查跳过效果：如果当前玩家被标记为跳过，再推进一次
    const currentId = this.state.tablePlayerIds[this.state.currentPlayerIndex];
    if (this.state.skippedPlayerId === currentId) {
      this.state.skippedPlayerId = undefined; // 清除标记
      this.state.currentPlayerIndex =
        (this.state.currentPlayerIndex + this.state.direction + this.state.tablePlayerIds.length)
        % this.state.tablePlayerIds.length;
    }

    this.state.turnStartTime = Date.now();
    return this.state.tablePlayerIds[this.state.currentPlayerIndex];
  }

  reverseDirection(): void {
    this.state.direction *= -1;
  }

  getNextPlayerId(): string | undefined {
    if (this.state.tablePlayerIds.length <= 1) return undefined;
    const nextIndex = (this.state.currentPlayerIndex + this.state.direction + this.state.tablePlayerIds.length) 
      % this.state.tablePlayerIds.length;
    return this.state.tablePlayerIds[nextIndex];
  }

  getPreviousPlayerId(): string | undefined {
    if (this.state.tablePlayerIds.length <= 1) return undefined;
    const prevIndex = (this.state.currentPlayerIndex - this.state.direction + this.state.tablePlayerIds.length) 
      % this.state.tablePlayerIds.length;
    return this.state.tablePlayerIds[prevIndex];
  }

  // ============================================================================
  // 查询方法
  // ============================================================================

  isOnTable(playerId: string): boolean {
    return this.state.tablePlayerIds.includes(playerId);
  }

  isFinished(playerId: string): boolean {
    return this.state.finishedPlayerIds.includes(playerId);
  }

  isEliminated(playerId: string): boolean {
    if (!this.isFinished(playerId)) return false;
    const player = this.state.players.get(playerId);
    return player?.eliminated === true;
  }

  getStatus(playerId: string): 'ontable' | 'finished' {
    return getPlayerStatus(this.state, playerId);
  }

  getOnTableCount(): number {
    return this.state.tablePlayerIds.length;
  }

  getFinishedCount(): number {
    return this.completedCount + this.eliminatedCount;
  }

  getOnTablePlayers(): Player[] {
    return this.state.tablePlayerIds
      .map(id => this.state.players.get(id))
      .filter((p): p is Player => p !== undefined);
  }

  getAllPlayersInOrder(): Player[] {
    const ordered: Player[] = [];
    ordered.push(...this.getOnTablePlayers());
    for (const id of this.state.finishedPlayerIds) {
      const p = this.state.players.get(id);
      if (p) ordered.push(p);
    }
    return ordered;
  }

  // ============================================================================
  // 游戏结束检查
  // ============================================================================

  private checkGameOver(): void {
    if (this.state.tablePlayerIds.length <= 1) {
      this.state.phase = 'finished';
      
      // 把最后存活的玩家填入排名
      if (this.state.tablePlayerIds.length === 1) {
        this.finalizeSurvivor();
        this.state.winnerId = this.state.finishedPlayerIds[0];
      }
      
      console.log(`[PlayerManager] 游戏结束`);
    }
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  static initTable(state: GameStateV2, playerIds: string[]): PlayerManager {
    state.tablePlayerIds = [...playerIds];
    state.currentPlayerIndex = 0;
    state.direction = 1;
    // 预分配数组大小
    state.finishedPlayerIds = new Array(playerIds.length).fill(null);
    return new PlayerManager(state);
  }

  /**
   * 获取最终排名（finishedPlayerIds 就是排名顺序）
   */
  getRankings(): string[] {
    return [...this.state.finishedPlayerIds];
  }
}
