/**
 * GameClock — 游戏时钟（纯定时器，不包含游戏逻辑）
 *
 * 所有游戏规则判断（阶段推进/AI调度/超时处理）由 BaseGameModeV2.onTick() 负责。
 */

export class GameClock {
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private onTick: () => void) {}

  start(): void {
    this.interval = setInterval(() => this.onTick(), 1000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
