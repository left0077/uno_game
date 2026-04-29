/**
 * PenaltyResponsePanel 组件
 * 
 * 惩罚响应选择面板 - Action API v2.0
 * 
 * 用于显示被+时的响应选项：
 * - 跟+（如果可叠加）
 * - 连打响应
 * - 彩虹转移（Out模式）
 * - 反转弹回
 * - 接受惩罚
 */

import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  Rainbow,
  RotateCcw,
  Hand,
  AlertTriangle
} from 'lucide-react';
import type { PenaltyOption } from '../../../../shared/actionApi';

interface PenaltyResponsePanelProps {
  /** 惩罚响应选项 */
  options: PenaltyOption[];
  /** 待摸牌数量 */
  pendingCount: number;
  /** 选择回调 */
  onSelect: (option: PenaltyOption, params?: { targetId?: string }) => void;
  /** 是否可以取消 */
  allowCancel?: boolean;
  /** 取消回调 */
  onCancel?: () => void;
}

/**
 * 获取选项图标
 */
function getOptionIcon(type: PenaltyOption['type']) {
  switch (type) {
    case 'stack':
      return <Zap className="w-5 h-5" />;
    case 'rainbow':
      return <Rainbow className="w-5 h-5" />;
    case 'reverse':
      return <RotateCcw className="w-5 h-5" />;
    case 'combo':
      return <Shield className="w-5 h-5" />;
    case 'accept':
      return <Hand className="w-5 h-5" />;
    default:
      return <AlertTriangle className="w-5 h-5" />;
  }
}

/**
 * 获取选项颜色样式
 */
function getOptionColor(type: PenaltyOption['type']): string {
  switch (type) {
    case 'stack':
      return 'bg-orange-500/20 border-orange-500/50 text-orange-400 hover:bg-orange-500/30';
    case 'rainbow':
      return 'bg-purple-500/20 border-purple-500/50 text-purple-400 hover:bg-purple-500/30';
    case 'reverse':
      return 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30';
    case 'combo':
      return 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30';
    case 'accept':
      return 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30';
    default:
      return 'bg-felt-dark/60 border-gold/10 text-cream-muted';
  }
}

/**
 * 惩罚响应面板组件 - 简化版
 */
export function PenaltyResponsePanel({
  options,
  pendingCount,
  onSelect,
}: PenaltyResponsePanelProps) {
  if (options.length === 0) return null;

  // 按优先级排序
  const sortedOptions = [...options].sort((a, b) => b.priority - a.priority);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed top-24 left-4 z-30"
    >
      <div className="casino-card backdrop-blur border border-red-500/30 rounded-xl p-3 shadow-xl">
        {/* 标题 */}
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gold/10">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-bold text-gold-light">+{pendingCount} 惩罚</span>
        </div>

        {/* 选项列表 */}
        <div className="flex flex-col gap-1.5">
          {sortedOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => onSelect(option)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all
                ${getOptionColor(option.type)}
                hover:brightness-110
              `}
            >
              {getOptionIcon(option.type)}
              <span className="font-medium">{option.name}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default PenaltyResponsePanel;
