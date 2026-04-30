import { useState, useEffect } from 'react';

interface PhaseTimerProps {
  gameStartTime: number;
  phaseTimes: number[];
  currentPhase: number;
  maxCards: number;
  turnTimer?: number;
  turnStartTime?: number;
  isMyTurn?: boolean;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function PhaseTimer({ gameStartTime, phaseTimes, currentPhase, turnTimer = 120, turnStartTime, isMyTurn }: PhaseTimerProps) {
  const [phaseNext, setPhaseNext] = useState<number | null>(null);
  const [turnRemain, setTurnRemain] = useState(turnTimer);

  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
      const next = currentPhase + 1;
      setPhaseNext(next < phaseTimes.length ? Math.max(0, phaseTimes[next] - elapsed) : null);
      if (turnStartTime) setTurnRemain(Math.max(0, turnTimer - Math.floor((Date.now() - turnStartTime) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gameStartTime, phaseTimes, currentPhase, turnTimer, turnStartTime]);

  const phaseUrgent = phaseNext !== null && phaseNext <= 30;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors duration-500 border ${
      isMyTurn ? 'bg-gold/10 border-gold/30' :
      phaseUrgent ? 'bg-red-900/30 border-red-500/50' :
      'bg-felt-dark/50 border-gold/10'
    }`}>
      <span className={`font-bold ${phaseUrgent ? 'text-red-300' : 'text-gold'}`}>P{currentPhase}</span>
      {phaseNext !== null && <span className={`font-mono ${phaseUrgent ? 'text-red-300 animate-pulse' : 'text-cream-muted'}`}>{fmt(phaseNext)}</span>}
      <span className="text-cream-muted/30">|</span>
      <span className={`font-mono font-bold ${turnRemain <= 10 ? 'text-red-400' : 'text-gold-light'}`}>{fmt(turnRemain)}</span>
    </div>
  );
}
