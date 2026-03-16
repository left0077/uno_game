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

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Zap, 
  Rainbow, 
  RotateCcw, 
  Hand,
  AlertTriangle,
  ChevronRight
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
      return 'bg-slate-700 border-slate-600 text-slate-400';
  }
}

/**
 * 获取优先级标签
 */
function getPriorityLabel(priority: number): string {
  if (priority >= 90) return '推荐';
  if (priority >= 70) return '优选';
  if (priority >= 50) return '可选';
  return '备选';
}

/**
 * 获取优先级颜色
 */
function getPriorityColor(priority: number): string {
  if (priority >= 90) return 'text-green-400 bg-green-500/20';
  if (priority >= 70) return 'text-blue-400 bg-blue-500/20';
  if (priority >= 50) return 'text-yellow-400 bg-yellow-500/20';
  return 'text-slate-400 bg-slate-500/20';
}

/**
 * 惩罚响应面板组件
 */
export function PenaltyResponsePanel({
  options,
  pendingCount,
  onSelect,
  allowCancel = true,
  onCancel,
}: PenaltyResponsePanelProps) {
  // 按优先级排序
  const sortedOptions = [...options].sort((a, b) => b.priority - a.priority);
  
  // 推荐选项（最高优先级）
  const recommendedOption = sortedOptions.find(o => o.priority >= 90);
  
  if (options.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-[350px] left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4"
    >
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl">
        {/* 标题区域 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                ⚠️ 累积 +{pendingCount}
              </h3>
              <p className="text-sm text-slate-400">选择你的响应方式</p>
            </div>
          </div>
          
          {allowCancel && onCancel && (
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-white transition-colors"
            >
              取消
            </button>
          )}
        </div>

        {/* 推荐选项（如果有） */}
        <AnimatePresence>
          {recommendedOption && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4"
            >
              <button
                onClick={() => onSelect(recommendedOption)}
                className={`w-full p-4 rounded-xl border-2 transition-all animate-pulse
                  ${getOptionColor(recommendedOption.type)}
                  hover:scale-[1.02] active:scale-[0.98]
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    {getOptionIcon(recommendedOption.type)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-lg">
                      {recommendedOption.name}
                    </div>
                    <div className="text-sm opacity-80">
                      {recommendedOption.description}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </div>
                <div className="mt-2 text-xs opacity-70">
                  {recommendedOption.detailedEffect}
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 所有选项网格 */}
        <div className="grid grid-cols-2 gap-2">
          {sortedOptions.filter(o => o !== recommendedOption).map((option) => (
            <motion.button
              key={option.type}
              onClick={() => onSelect(option)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-3 rounded-lg border transition-all text-left
                ${getOptionColor(option.type)}
              `}
            >
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded bg-white/10 shrink-0">
                  {getOptionIcon(option.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {option.name}
                  </div>
                  <div className="text-xs opacity-70 truncate">
                    {option.description}
                  </div>
                </div>
              </div>
              
              {/* 结果预览 */}
              <div className="mt-2 text-xs">
                <span className={`inline-block px-1.5 py-0.5 rounded ${getPriorityColor(option.priority)}`}>
                  {getPriorityLabel(option.priority)}
                </span>
                <span className="ml-1 opacity-60">
                  {option.outcome.description}
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* 提示信息 */}
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-400 text-center">
            💡 提示：使用<Zap className="w-3 h-3 inline mx-1"/>跟+可以转移惩罚，
            <Shield className="w-3 h-3 inline mx-1"/>连打可以减免惩罚
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default PenaltyResponsePanel;
