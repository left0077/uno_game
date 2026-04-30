import { useEffect, useState } from 'react';

export interface EmojiMessage {
  playerId: string;
  playerName?: string;
  emoji: string;
  target?: string;
  timestamp: number;
}

interface EmojiOverlayProps {
  messages: EmojiMessage[];
  players?: Array<{ id: string; nickname: string }>;
  onDismiss: (timestamp: number) => void;
}

export const EmojiOverlay = ({ messages, players, onDismiss }: EmojiOverlayProps) => {
  const [visible, setVisible] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const next: Record<number, boolean> = {};
    messages.forEach(m => { next[m.timestamp] = true; });
    setVisible(next);

    const timers = messages.map(msg =>
      setTimeout(() => {
        setVisible(prev => ({ ...prev, [msg.timestamp]: false }));
        setTimeout(() => onDismiss(msg.timestamp), 300);
      }, 3000)
    );
    return () => timers.forEach(clearTimeout);
  }, [messages, onDismiss]);

  if (messages.length === 0) return null;

  // 最近 5 条
  const recent = messages.slice(-5);

  return (
    <div className="fixed top-20 right-4 z-50 pointer-events-none flex flex-col gap-2">
      {recent.map((msg) => {
        const name = players?.find(p => p.id === msg.playerId)?.nickname || '玩家';
        const show = visible[msg.timestamp] !== false;

        return (
          <div
            key={msg.timestamp}
            className={`flex items-center gap-2 bg-black/80 backdrop-blur rounded-2xl px-3 py-2
              border border-gold/20 shadow-xl transition-all duration-300
              ${show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
          >
            <span className="text-2xl">{msg.emoji}</span>
            <span className="text-cream text-xs max-w-[120px] truncate">{name}</span>
          </div>
        );
      })}
    </div>
  );
};

export default EmojiOverlay;
