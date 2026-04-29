/**
 * GameClock — 游戏时钟
 */

import { Server } from 'socket.io';
import { GameStateV2 } from './types.js';
import { OutModeV2 } from './OutModeV2.js';
import { GAME_MODES } from '../../config/gameConfig.js';

export interface GameClockCallbacks {
  onPhaseAdvance: (phase: number) => void;
  onAITurn: (playerId: string) => void;
  onTurnTimeout: (playerId: string) => void;
  onGlobalTimeout: () => void;
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
  private aiScheduled = false;

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

    this.tickCount++;
    const elapsed = (Date.now() - this.gameStartTime) / 1000;

    if (this.tickCount % 10 === 0) {
      const currentId = this.state.tablePlayerIds[this.state.currentPlayerIndex];
      const currentPlayer = currentId ? this.state.players.get(currentId) : null;
      console.log(`[GameClock] tick ${this.tickCount}: elapsed=${Math.floor(elapsed)}s, turn=${currentPlayer?.nickname}, isAI=${currentPlayer?.isAI}, phase=${this.state.outState?.phase}`);
    }

    this.checkPhaseAdvance(elapsed);

    if (elapsed >= this.globalTimeout) {
      this.callbacks.onGlobalTimeout();
      return;
    }

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

    // 非 AI 回合时重置标志
    if (!player.isAI) {
      this.aiScheduled = false;
      return;
    }

    // AI 回合（防重复调度）
    if (!this.aiScheduled) {
      this.aiScheduled = true;
      this.callbacks.onAITurn(currentId);
    }
  }
}
