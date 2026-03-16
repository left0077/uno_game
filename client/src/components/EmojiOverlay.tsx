import React, { useEffect, useState } from 'react';

export type EmojiType = 
  | 'thinking' 
  | 'happy' 
  | 'sad' 
  | 'angry' 
  | 'surprised' 
  | 'taunt' 
  | 'desperate' 
  | 'victory';

interface EmojiMessage {
  playerId: string;
  emoji: EmojiType;
  target?: string;
  timestamp: number;
}

interface EmojiOverlayProps {
  messages: EmojiMessage[];
  onDismiss: (timestamp: number) => void;
}

const emojiMap: Record<EmojiType, string> = {
  thinking: '🤔',
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😲',
  taunt: '😏',
  desperate: '😰',
  victory: '🏆'
};

const emojiText: Record<EmojiType, string> = {
  thinking: '思考中...',
  happy: '不错！',
  sad: '哎呀...',
  angry: '可恶！',
  surprised: '什么？！',
  taunt: '来啊！',
  desperate: '救命...',
  victory: '赢了！'
};

export const EmojiOverlay: React.FC<EmojiOverlayProps> = ({ messages, onDismiss }) => {
  useEffect(() => {
    // 3秒后自动消失
    const timers = messages.map(msg => 
      setTimeout(() => onDismiss(msg.timestamp), 3000)
    );
    return () => timers.forEach(clearTimeout);
  }, [messages, onDismiss]);

  if (messages.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {messages.map((msg, index) => (
        <div
          key={msg.timestamp}
          className="absolute animate-bounce"
          style={{
            left: `${20 + (index % 3) * 30}%`,
            top: `${20 + Math.floor(index / 3) * 25}%`,
          }}
        >
          <div className="bg-white rounded-full px-4 py-2 shadow-lg border-2 border-yellow-400">
            <span className="text-3xl">{emojiMap[msg.emoji]}</span>
            <span className="ml-2 text-sm font-bold text-gray-700">
              {emojiText[msg.emoji]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmojiOverlay;
