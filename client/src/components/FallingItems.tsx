/**
 * FallingItems - 掉落动画组件
 * 
 * 筹码和Uno牌从顶部掉落的背景效果（2D版本）
 */

import { useEffect, useState } from 'react';

interface FallingItem {
  id: number;
  type: 'chip' | 'card';
  x: number; // 水平位置 (0-100%)
  delay: number; // 延迟时间
  duration: number; // 掉落持续时间
  size: number; // 大小
  rotation: number; // 初始旋转角度
  rotationSpeed: number; // 旋转速度
  swayAmount: number; // 摇摆幅度
  color?: string; // 筹码颜色
  cardColor?: 'red' | 'yellow' | 'blue' | 'green' | 'wild'; // Uno牌颜色
  cardValue?: string; // Uno牌数值
}

export function FallingItems() {
  const [items, setItems] = useState<FallingItem[]>([]);

  useEffect(() => {
    // 生成掉落物品
    const generateItems = (): FallingItem[] => {
      const items: FallingItem[] = [];
      const chipColors = ['red', 'blue', 'green', 'black'];
      const cardColors: ('red' | 'yellow' | 'blue' | 'green' | 'wild')[] = ['red', 'yellow', 'blue', 'green', 'wild'];
      const cardValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+2', '🚫', '↔️', '+4', '🌈'];
      
      // 生成筹码
      for (let i = 0; i < 15; i++) {
        items.push({
          id: i,
          type: 'chip',
          x: Math.random() * 100,
          delay: Math.random() * 8,
          duration: 6 + Math.random() * 4,
          size: 32 + Math.random() * 20,
          rotation: Math.random() * 360,
          rotationSpeed: 30 + Math.random() * 60, // 旋转速度（度/秒）
          swayAmount: 10 + Math.random() * 20,
          color: chipColors[Math.floor(Math.random() * chipColors.length)],
        });
      }
      
      // 生成Uno牌
      for (let i = 15; i < 28; i++) {
        const color = cardColors[Math.floor(Math.random() * cardColors.length)];
        const value = cardValues[Math.floor(Math.random() * cardValues.length)];
        items.push({
          id: i,
          type: 'card',
          x: Math.random() * 100,
          delay: Math.random() * 10,
          duration: 7 + Math.random() * 5,
          size: 45 + Math.random() * 15,
          rotation: Math.random() * 360,
          rotationSpeed: 20 + Math.random() * 40,
          swayAmount: 15 + Math.random() * 25,
          cardColor: color,
          cardValue: value,
        });
      }
      
      return items;
    };

    setItems(generateItems());
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute animate-fall-sway"
          style={{
            left: `${item.x}%`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
            '--sway-amount': `${item.swayAmount}px`,
          } as React.CSSProperties}
        >
          {item.type === 'chip' ? (
            <FallingChip 
              color={item.color!} 
              size={item.size} 
              rotation={item.rotation}
              rotationSpeed={item.rotationSpeed}
              duration={item.duration}
            />
          ) : (
            <FallingUnoCard 
              color={item.cardColor!} 
              value={item.cardValue!}
              size={item.size} 
              rotation={item.rotation}
              rotationSpeed={item.rotationSpeed}
              duration={item.duration}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// 2D筹码 - 简单旋转下落
function FallingChip({ 
  color, 
  size, 
  rotation,
  rotationSpeed,
  duration
}: { 
  color: string; 
  size: number; 
  rotation: number;
  rotationSpeed: number;
  duration: number;
}) {
  const colorMap: Record<string, { bg: string; border: string; inner: string; text: string }> = {
    red: { 
      bg: 'bg-gradient-to-br from-red-500 to-red-700', 
      border: 'border-red-400',
      inner: 'bg-red-800',
      text: 'text-red-100'
    },
    blue: { 
      bg: 'bg-gradient-to-br from-blue-500 to-blue-700', 
      border: 'border-blue-400',
      inner: 'bg-blue-800',
      text: 'text-blue-100'
    },
    green: { 
      bg: 'bg-gradient-to-br from-emerald-500 to-emerald-700', 
      border: 'border-emerald-400',
      inner: 'bg-emerald-800',
      text: 'text-emerald-100'
    },
    black: { 
      bg: 'bg-gradient-to-br from-slate-600 to-slate-800', 
      border: 'border-slate-500',
      inner: 'bg-slate-900',
      text: 'text-slate-200'
    },
  };

  const colors = colorMap[color];
  const totalRotation = rotation + rotationSpeed * duration;

  return (
    <div
      className={`relative rounded-full border-2 shadow-lg ${colors.bg} ${colors.border}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        animation: `chip-spin ${duration}s linear infinite`,
        animationDelay: '0s',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3), inset 0 2px 5px rgba(255,255,255,0.2)',
      }}
    >
      {/* 内部装饰 - 随筹码一起旋转 */}
      <div 
        className="absolute inset-0 rounded-full flex items-center justify-center"
        style={{
          animation: `chip-spin ${duration}s linear infinite`,
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {/* 外圈虚线 */}
        <div className="absolute inset-1.5 rounded-full border-2 border-dashed border-white/30" />
        
        {/* 内圈 */}
        <div className={`w-1/2 h-1/2 rounded-full border border-white/20 flex items-center justify-center ${colors.inner}`}>
          <span className={`text-xs font-bold ${colors.text}`}>$</span>
        </div>
        
        {/* 边缘装饰点 */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full"
            style={{
              top: '8px',
              left: '50%',
              transform: `rotate(${i * 60}deg) translateX(-50%)`,
              transformOrigin: `0 ${size/2 - 8}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// 2D Uno牌 - 简单旋转下落
function FallingUnoCard({ 
  color, 
  value,
  size, 
  rotation,
  rotationSpeed,
  duration
}: { 
  color: 'red' | 'yellow' | 'blue' | 'green' | 'wild'; 
  value: string;
  size: number; 
  rotation: number;
  rotationSpeed: number;
  duration: number;
}) {
  const colorMap = {
    red: { bg: '#dc2626', gradient: 'from-red-500 to-red-700' },
    yellow: { bg: '#ca8a04', gradient: 'from-yellow-500 to-yellow-700' },
    blue: { bg: '#2563eb', gradient: 'from-blue-500 to-blue-700' },
    green: { bg: '#16a34a', gradient: 'from-emerald-500 to-emerald-700' },
    wild: { bg: '#1f2937', gradient: 'from-slate-700 to-slate-900' },
  };

  const colors = colorMap[color];
  const isWild = color === 'wild';

  return (
    <div
      className="relative rounded-lg shadow-lg overflow-hidden"
      style={{
        width: `${size * 0.7}px`,
        height: `${size}px`,
        background: isWild 
          ? 'linear-gradient(135deg, #dc2626 0%, #ca8a04 25%, #16a34a 50%, #2563eb 75%, #1f2937 100%)'
          : colors.bg,
        animation: `card-float ${duration}s ease-in-out infinite`,
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {/* 白色内框 */}
      <div className="absolute inset-1.5 bg-white rounded-md flex flex-col p-1">
        {/* 顶部数值 */}
        <div 
          className="text-[8px] font-black leading-none self-start px-0.5 rounded"
          style={{ color: isWild ? '#dc2626' : colors.bg }}
        >
          {value}
        </div>
        
        {/* 中央椭圆 */}
        <div className="flex-1 flex items-center justify-center -rotate-12">
          <div 
            className="w-3/4 h-1/2 rounded-full flex items-center justify-center shadow-inner"
            style={{
              background: isWild 
                ? 'linear-gradient(135deg, #dc2626, #2563eb)'
                : colors.bg,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            <span className="text-white text-sm font-black drop-shadow-md">
              {value}
            </span>
          </div>
        </div>
        
        {/* 底部数值（旋转180度） */}
        <div 
          className="text-[8px] font-black leading-none self-end px-0.5 rounded rotate-180"
          style={{ color: isWild ? '#dc2626' : colors.bg }}
        >
          {value}
        </div>
      </div>
      
      {/* UNO标志 */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[5px] font-bold text-white/70 tracking-wider">
        UNO
      </div>
    </div>
  );
}
