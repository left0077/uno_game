/**
 * GameClock — 游戏时钟
 */

import { Server } from 'socket.io';
import { GameStateV2 } from './types.js';
import { BaseGameModeV2 } from './BaseGameModeV2.js';
import { GAME_MODES } from '../../config/gameConfig.js';

export interface GameClockCallbacks {
  onPhaseAdvance?: (phase: number) => void;
  onAITurn: (playerId: string) => void;
  onTurnTimeout: (playerId: string) => void;
  onGlobalTimeout?: () => void;
  onTick: () => void;
}

export class GameClock {
  private interval: ReturnType<typeof setInterval> | null = null;
  private gameStartTime: number;
  private lastPhase = 0;
  private phases: number[];
  private turnTimer: number;
  private globalTimeout: number;
  private tickCount = 0;
  private lastScheduledAI: string | null = null;
  private isOutMode: boolean;

  constructor(
    private state: GameStateV2,
    private mode: BaseGameModeV2,
    private callbacks: GameClockCallbacks,
    private io: Server,
    private roomCode: string,
  ) {
    this.gameStartTime = state.gameStartTime;
    this.isOutMode = mode.name === 'out';
    this.phases = this.isOutMode ? GAME_MODES.out.phases.map(p => p.at) : [];
    this.turnTimer = GAME_MODES[mode.name as keyof typeof GAME_MODES]?.turnTimer || 120;
    this.globalTimeout = this.isOutMode ? GAME_MODES.out.globalTimeout : 0;
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

    this.tickCount++;
    const elapsed = (Date.now() - this.gameStartTime) / 1000;

    if (this.tickCount % 10 === 0) {
      const currentId = this.state.tablePlayerIds[this.state.currentPlayerIndex];
      const currentPlayer = currentId ? this.state.players.get(currentId) : null;
      console.log(`[GameClock] tick ${this.tickCount}: elapsed=${Math.floor(elapsed)}s, turn=${currentPlayer?.nickname}, isAI=${currentPlayer?.isAI}, phase=${this.state.outState?.phase}`);
    }

    if (this.isOutMode) this.checkPhaseAdvance(elapsed);

    if (this.globalTimeout > 0 && elapsed >= this.globalTimeout) {
      this.callbacks.onGlobalTimeout?.();
      return;
    }

    this.checkTurnTimeout(elapsed);
  }

  private checkPhaseAdvance(elapsed: number): void {
    for (let i = this.lastPhase + 1; i < this.phases.length; i++) {
      if (elapsed >= this.phases[i]) {
        this.lastPhase = i;
        this.callbacks.onPhaseAdvance?.(i);
      }
    }
  }

  private checkTurnTimeout(_elapsed: number): void {
    const currentId = this.state.tablePlayerIds[this.state.currentPlayerIndex];
    if (!currentId) return;

    const player = this.state.players.get(currentId);
    if (!player) return;

    // 非 AI 回合时清除记录
    if (!player.isAI) {
      this.lastScheduledAI = null;
      return;
    }

    // AI 回合：防止对同一玩家重复调度（允许不同 AI 连续调度）
    if (this.lastScheduledAI !== currentId) {
      this.lastScheduledAI = currentId;
      this.callbacks.onAITurn(currentId);
    }
  }
}
