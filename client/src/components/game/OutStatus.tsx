import { Clock } from 'lucide-react';

interface OutStatusProps {
  phase: number;
  countdown: number;
  maxCards?: number; // 保留供未来使用
}

// 格式化时间
function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Out模式状态栏
 * 显示阶段、倒计时和手牌上限
 * 
 * Phase 0: 正常游戏
 * Phase 1-3: Out模式的不同阶段，显示阶段和倒计时
 */
export function OutStatus({ phase, countdown }: OutStatusProps) {
  // 只在Out模式激活时显示 (phase > 0)
  if (phase === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {/* 倒计时显示 */}
      {phase < 3 && countdown > 0 && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold border ${
            countdown <= 30000
              ? 'bg-red-900/30 text-red-300 border-red-500/50 animate-pulse'
              : countdown <= 60000
              ? 'bg-amber-900/30 text-amber-300 border-amber-500/40'
              : 'bg-felt-dark/80 text-cream border-gold/20'
          }`}
        >
          <span className="text-xs">⏳</span>
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono">{formatTime(Math.floor(countdown / 1000))}</span>
        </div>
      )}

      {/* 阶段指示 */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold border ${
          phase === 1
            ? 'bg-amber-900/30 text-amber-300 border-amber-500/40'
            : phase === 2
            ? 'bg-red-900/30 text-red-300 border-red-500/50'
            : 'bg-purple-900/40 text-purple-300 border-purple-500/50 animate-pulse'
        }`}
      >
        <span className="text-xs">
          {phase === 1 ? 'Phase I' : phase === 2 ? 'Phase II' : 'Phase III'}
        </span>
        <span className="text-xs text-red-400 font-bold">超限淘汰</span>
      </div>
    </div>
  );
}
