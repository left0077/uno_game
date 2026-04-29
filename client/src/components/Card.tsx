import { motion } from 'framer-motion';
import type { Card as CardType } from '../../../shared/types';

interface CardProps {
  card: CardType;
  size?: 'sm' | 'md' | 'lg';
  isSelected?: boolean;
  isPlayable?: boolean;
  isBack?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const sizeClasses = {
  sm: { 
    container: 'w-10 h-14 sm:w-14 sm:h-20', 
    text: 'text-xs sm:text-sm', 
    icon: 'w-4 h-4 sm:w-6 sm:h-6',
    center: 'w-6 h-6 sm:w-10 sm:h-10',
    corner: 'text-[10px] sm:text-xs'
  },
  md: { 
    container: 'w-14 h-20 sm:w-20 sm:h-28', 
    text: 'text-base sm:text-xl', 
    icon: 'w-7 h-7 sm:w-10 sm:h-10',
    center: 'w-10 h-10 sm:w-16 sm:h-16',
    corner: 'text-xs sm:text-sm'
  },
  lg: { 
    container: 'w-20 h-28 sm:w-28 sm:h-40', 
    text: 'text-2xl sm:text-3xl', 
    icon: 'w-10 h-10 sm:w-14 sm:h-14',
    center: 'w-14 h-14 sm:w-22 sm:h-22',
    corner: 'text-base sm:text-lg'
  }
};

const colorClasses: Record<string, string> = {
  red: 'uno-card-red',
  yellow: 'uno-card-yellow',
  green: 'uno-card-green',
  blue: 'uno-card-blue',
  wild: 'uno-card-wild'
};

export function Card({ 
  card, 
  size = 'md', 
  isSelected = false, 
  isPlayable = false,
  isBack = false,
  onClick,
  disabled = false
}: CardProps) {
  const classes = sizeClasses[size];

  if (isBack) {
    return (
      <motion.div
        className={`${classes.container} uno-card uno-card-back flex items-center justify-center`}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
      >
        <div className="relative z-10 flex items-center justify-center">
          <span className="text-3xl filter drop-shadow-lg">🃏</span>
        </div>
      </motion.div>
    );
  }

  const bgClass = colorClasses[card.color] || colorClasses.wild;
  const textColor = 'text-white';

  const getContent = () => {
    switch (card.type) {
      case 'number':
        return <span className={`uno-card-symbol ${classes.text}`}>{card.value}</span>;
      case 'skip':
        return (
          <div className="relative flex items-center justify-center">
            <span className={`${classes.icon} filter drop-shadow-lg`}>🚫</span>
          </div>
        );
      case 'reverse':
        return (
          <div className="relative flex items-center justify-center">
            <span className={`${classes.icon} filter drop-shadow-lg`}>↩️</span>
          </div>
        );
      case 'draw2':
        return <span className={`uno-card-symbol ${classes.text}`}>+2</span>;
      case 'draw3':
        return <span className={`uno-card-symbol ${classes.text}`}>+3</span>;
      case 'draw4':
        return <span className={`uno-card-symbol ${classes.text}`}>+4</span>;
      case 'draw5':
        return <span className={`uno-card-symbol ${classes.text}`}>+5</span>;
      case 'draw8':
        return <span className={`uno-card-symbol ${classes.text}`}>+8</span>;
      case 'wild':
        return (
          <div className="relative flex items-center justify-center">
            <span className={`${classes.icon} filter drop-shadow-lg`}>🌈</span>
          </div>
        );
      default:
        return <span className={`uno-card-symbol ${classes.text}`}>?</span>;
    }
  };

  const getCornerLabel = () => {
    if (card.type === 'number') return card.value;
    return getShortLabel(card.type);
  };

  return (
    <motion.div
      className={`
        ${classes.container} 
        uno-card 
        ${bgClass} 
        flex flex-col 
        justify-between 
        p-2
        cursor-pointer
        select-none
        ${isSelected ? 'uno-card-selected' : ''}
        ${isPlayable ? 'uno-card-playable uno-card-hover' : ''}
        ${disabled ? 'uno-card-disabled' : 'uno-card-hover'}
      `}
      onClick={!disabled ? onClick : undefined}
      whileTap={!disabled ? { scale: 0.95 } : {}}
    >
      {/* 左上角 */}
      <div className={`uno-card-corner ${classes.corner} ${textColor}`}>
        {getCornerLabel()}
      </div>

      {/* 中间椭圆区域 */}
      <div className="flex-1 flex items-center justify-center">
        <div className={`${classes.center} uno-card-center`}>
          {getContent()}
        </div>
      </div>

      {/* 右下角（旋转） */}
      <div className={`uno-card-corner ${classes.corner} ${textColor} rotate-180`}>
        {getCornerLabel()}
      </div>
    </motion.div>
  );
}

function getShortLabel(type: string): string {
  const labels: Record<string, string> = {
    skip: '⊘',
    reverse: '⇄',
    draw2: '+2',
    draw3: '+3',
    draw4: '+4',
    draw5: '+5',
    draw8: '+8',
    wild: '★'
  };
  return labels[type] || type;
}

// 颜色选择器组件
interface ColorPickerProps {
  onSelect: (color: 'red' | 'yellow' | 'green' | 'blue') => void;
  onCancel: () => void;
}

export function ColorPicker({ onSelect, onCancel }: ColorPickerProps) {
  const colors: Array<{ color: 'red' | 'yellow' | 'green' | 'blue'; bg: string; label: string; shadow: string }> = [
    { color: 'red', bg: 'from-red-500 to-red-700', label: '红色', shadow: 'shadow-red-500/50' },
    { color: 'yellow', bg: 'from-yellow-400 to-yellow-600', label: '黄色', shadow: 'shadow-yellow-500/50' },
    { color: 'green', bg: 'from-green-500 to-green-700', label: '绿色', shadow: 'shadow-green-500/50' },
    { color: 'blue', bg: 'from-blue-500 to-blue-700', label: '蓝色', shadow: 'shadow-blue-500/50' }
  ];

  return (
    <motion.div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="casino-card p-4 sm:p-8 max-w-xs sm:max-w-sm w-full mx-auto"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <h3 className="text-gold-light text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">选择颜色</h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {colors.map(({ color, bg, label, shadow }) => (
            <motion.button
              key={color}
              onClick={() => onSelect(color)}
              className={`w-full aspect-square bg-gradient-to-br ${bg} rounded-xl shadow-lg ${shadow} 
                flex flex-col items-center justify-center gap-2 transition-all
                border-2 border-white/20 active:scale-95 sm:active:scale-100`}
              whileHover={{ scale: 1.05, boxShadow: `0 0 30px currentColor` }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm shadow-inner" />
              <span className="text-white font-bold text-sm sm:text-lg drop-shadow-lg">{label}</span>
            </motion.button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full mt-4 sm:mt-6 py-2.5 sm:py-3 bg-felt-dark/60 border border-gold/20 text-gold rounded-xl 
            hover:border-gold/40 transition-all font-medium hover:bg-felt-dark/80 text-sm sm:text-base"
        >
          取消
        </button>
      </motion.div>
    </motion.div>
  );
}
