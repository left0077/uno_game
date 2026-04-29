import { useState, useEffect } from 'react';

interface PhaseTimerProps {
  gameStartTime: number;
  phaseTimes: number[];
  currentPhase: number;
  maxCards: number;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PhaseTimer({ gameStartTime, phaseTimes, currentPhase, maxCards }: PhaseTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [nextPhaseIn, setNextPhaseIn] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const e = Math.floor((Date.now() - gameStartTime) / 1000);
      setElapsed(e);

      // 计算距离下一阶段还有多久
      const nextIdx = currentPhase + 1;
      if (nextIdx < phaseTimes.length) {
        const remaining = phaseTimes[nextIdx] - e;
        setNextPhaseIn(remaining > 0 ? remaining : 0);
      } else {
        setNextPhaseIn(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gameStartTime, phaseTimes, currentPhase]);

  const isUrgent = nextPhaseIn !== null && nextPhaseIn <= 30;
  const isWarning = nextPhaseIn !== null && nextPhaseIn <= 60 && nextPhaseIn > 30;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors duration-500 ${
      isUrgent ? 'bg-red-900/40 border border-red-500/50 text-red-300' :
      isWarning ? 'bg-amber-900/30 border border-amber-500/40 text-amber-300' :
      'bg-felt-dark/50 border border-gold/10 text-cream-muted'
    }`}>
      {/* 阶段指示 */}
      <span className="font-bold text-gold">
        Phase {currentPhase}
      </span>
      <span className="opacity-50">|</span>

      {/* 倒计时到下一阶段 */}
      {nextPhaseIn !== null ? (
        <span className={`font-mono ${isUrgent ? 'animate-pulse font-bold' : ''}`}>
          {formatTime(nextPhaseIn)}
        </span>
      ) : (
        <span className="text-cream-muted/60 text-xs">终局</span>
      )}

      <span className="opacity-50">|</span>

      {/* 手牌上限 */}
      <span className="text-cream-muted/70">{maxCards}张</span>

      {/* 已用时间 */}
      <span className="text-cream-muted/40 text-xs ml-1">
        ({formatTime(elapsed)})
      </span>
    </div>
  );
}
