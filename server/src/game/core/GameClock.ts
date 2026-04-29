/**
 * GameClock — 游戏时钟
 *
 * 职责：
 * 1. 每秒 tick，检查阶段推进、回合超时、AI 回合、全局超时
 * 2. 不直接操作游戏状态，通过回调通知外部
 */

import { Server } from 'socket.io';
import { GameStateV2 } from './types.js';
import { OutModeV2 } from './OutModeV2.js';
import { GAME_MODES } from '../../config/gameConfig.js';

export interface GameClockCallbacks {
  /** 阶段推进时调用 */
  onPhaseAdvance: (phase: number) => void;
  /** AI 回合时调用 */
  onAITurn: (playerId: string) => void;
  /** 回合超时 */
  onTurnTimeout: (playerId: string) => void;
  /** 全局超时 */
  onGlobalTimeout: () => void;
  /** 需要广播状态 */
  onTick: () => void;
}

export class GameClock {
  private interval: ReturnType<typeof setInterval> | null = null;
  private gameStartTime: number;
  private lastPhase = 0;
  private phases: number[];
  private turnTimer: number;
  private globalTimeout: number;

  constructor(
    private state: GameStateV2,
    private mode: OutModeV2,
    private callbacks: GameClockCallbacks,
    private io: Server,
    private roomCode: string,
  ) {
    this.gameStartTime = state.gameStartTime;
    this.phases = GAME_MODES.out.phases.map(p => p.at);
    this.turnTimer = GAME_MODES.out.turnTimer;
    this.globalTimeout = GAME_MODES.out.globalTimeout;
  }

  start(): void {
    this.interval = setInterval(() => this.tick(), 1000);
    console.log(`[GameClock] 启动，房间 ${this.roomCode}`);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log(`[GameClock] 停止，房间 ${this.roomCode}`);
  }

  private tick(): void {
    if (this.state.phase !== 'playing') return;

    const elapsed = (Date.now() - this.gameStartTime) / 1000;

    // 1. 阶段推进
    this.checkPhaseAdvance(elapsed);

    // 2. 全局超时
    if (elapsed >= this.globalTimeout) {
      this.callbacks.onGlobalTimeout();
      return;
    }

    // 3. 回合超时 + AI 回合
    this.checkTurnTimeout(elapsed);
  }

  private checkPhaseAdvance(elapsed: number): void {
    for (let i = this.lastPhase + 1; i < this.phases.length; i++) {
      if (elapsed >= this.phases[i]) {
        this.lastPhase = i;
        this.callbacks.onPhaseAdvance(i);
      }
    }
  }

  private checkTurnTimeout(_elapsed: number): void {
    const currentId = this.state.tablePlayerIds[this.state.currentPlayerIndex];
    if (!currentId) return;

    const player = this.state.players.get(currentId);
    if (!player) return;

    // AI 回合
    if (player.isAI) {
      this.callbacks.onAITurn(currentId);
      return;
    }

    // 人类玩家回合超时检查
    const turnElapsed = (Date.now() - this.state.turnStartTime) / 1000;
    if (turnElapsed >= this.turnTimer) {
      this.callbacks.onTurnTimeout(currentId);
    }
  }
}
