/**
 * ComboSelectorV2 组件
 * 
 * 新的连打选择器 - Action API v2.0
 * 
 * 功能：
 * - 显示所有可用的连打组合
 * - 显示连打需要的卡牌
 * - 风险评估
 * - 推荐标记
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  X, 
  Check, 
  AlertTriangle, 
  Star,
  ChevronRight,
  Info,
  Zap,
  Shield
} from 'lucide-react';
import type { ComboStarter, ComboInfo, ComboType } from '../../../../shared/actionApi';

// Combo 类型图标映射
const comboTypeIcons: Record<ComboType, string> = {
  pair: '👥',
  three: '👤👤👤',
  rainbow: '🌈',
  straight: '🔄'
};

// Combo 类型名称映射
const comboTypeNames: Record<ComboType, string> = {
  pair: '对子',
  three: '三条',
  rainbow: '彩虹',
  straight: '顺子'
};

// 风险等级颜色
const riskColors: Record<ComboInfo['risk']['level'], string> = {
  low: 'text-green-400 bg-green-500/20',
  medium: 'text-yellow-400 bg-yellow-500/20',
  high: 'text-red-400 bg-red-500/20'
};

// 风险等级文字
const riskLabels: Record<ComboInfo['risk']['level'], string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险'
};

interface ComboSelectorV2Props {
  /** 连打启动牌列表 */
  starters: ComboStarter[];
  /** 当前已选中的卡牌 */
  selectedCards: string[];
  /** 是否显示选择器 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 执行连打回调 */
  onExecute: (comboType: ComboType, cardIds: string[]) => void;
  /** 卡牌点击回调（用于高亮/选择）- 预留 */
  // eslint-disable-next-line react/no-unused-prop-types
  onCardClick?: (cardId: string) => void;
}

/**
 * 连打卡片组件
 */
function ComboCard({ combo, isSelected, onSelect }: { 
  combo: ComboInfo; 
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  
  const missingCount = combo.missingCards.length;
  const hasAllCards = missingCount === 0;
  
  return (
    <motion.div
      layout
      className={`
        relative p-4 rounded-xl border transition-all cursor-pointer
        ${isSelected
          ? 'bg-gold/10 border-gold/50 shadow-lg shadow-gold/10'
          : 'bg-felt-dark/60 border-gold/10 hover:border-gold/30'
        }
        ${combo.recommended ? 'ring-2 ring-gold/50' : ''}
      `}
      onClick={onSelect}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* 推荐标记 */}
      {combo.recommended && (
        <div className="absolute -top-2 -right-2 px-2 py-1 bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full flex items-center gap-1">
          <Star className="w-3 h-3" />
          推荐
        </div>
      )}
      
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{comboTypeIcons[combo.type]}</span>
          <div>
            <div className="font-bold text-gold-light">{combo.name}</div>
            <div className="text-xs text-cream-muted">{comboTypeNames[combo.type]}</div>
          </div>
        </div>
        
        {/* 风险标签 */}
        <span className={`px-2 py-1 rounded-full text-xs ${riskColors[combo.risk.level]}`}>
          {riskLabels[combo.risk.level]}
        </span>
      </div>
      
      {/* 效果描述 */}
      <div className="mb-3 p-2 bg-felt-dark/80 rounded-lg border border-gold/10">
        <div className="text-sm text-cream flex items-center gap-2">
          <Zap className="w-4 h-4 text-gold" />
          {combo.effect.description}
        </div>
        {combo.effect.target && (
          <div className="text-xs text-cream-muted mt-1">
            目标: {combo.effect.target}
          </div>
        )}
      </div>
      
      {/* 需要的卡牌 */}
      <div className="space-y-2">
        <div className="text-xs text-cream-muted">需要的卡牌:</div>
        <div className="flex flex-wrap gap-1">
          {combo.requiredCards.map((card) => (
            <div
              key={card.cardId}
              className={`
                px-2 py-1 rounded text-xs font-mono
                ${card.inHand 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400 line-through'
                }
              `}
            >
              {card.card.color} {card.card.value}
            </div>
          ))}
        </div>
      </div>
      
      {/* 缺失卡牌提示 */}
      {!hasAllCards && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300">
            还缺 {missingCount} 张牌才能组成此连打
          </span>
        </div>
      )}
      
      {/* 详情按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowDetails(!showDetails);
        }}
        className="mt-3 text-xs text-cream-muted hover:text-cream flex items-center gap-1"
      >
        <Info className="w-3 h-3" />
        {showDetails ? '收起详情' : '查看详情'}
      </button>
      
      {/* 详情面板 */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-gold/10 space-y-2">
              {/* 风险因素 */}
              {combo.risk.factors.length > 0 && (
                <div>
                  <div className="text-xs text-cream-muted mb-1">风险因素:</div>
                  <ul className="text-xs text-cream-muted list-disc list-inside">
                    {combo.risk.factors.map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* 评分 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-cream-muted">推荐度:</span>
                <div className="flex-1 h-2 bg-felt-dark rounded-full overflow-hidden border border-gold/10">
                  <div
                    className="h-full bg-gradient-to-r from-gold-dark to-gold"
                    style={{ width: `${combo.score}%` }}
                  />
                </div>
                <span className="text-xs text-cream">{combo.score}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * 连打选择器 v2 组件
 */
export function ComboSelectorV2({
  starters,
  isOpen,
  onClose,
  onExecute,
}: ComboSelectorV2Props) {
  const [selectedCombo, setSelectedCombo] = useState<ComboInfo | null>(null);
  
  // 收集所有连打选项
  const allCombos = useMemo(() => {
    const combos: Array<{ combo: ComboInfo; starter: ComboStarter }> = [];
    for (const starter of starters) {
      for (const combo of starter.combos) {
        combos.push({ combo, starter });
      }
    }
    // 按推荐度和分数排序
    return combos.sort((a, b) => {
      if (a.combo.recommended !== b.combo.recommended) {
        return a.combo.recommended ? -1 : 1;
      }
      return b.combo.score - a.combo.score;
    });
  }, [starters]);
  
  // 可执行的连打（所有牌都在手牌中）
  const executableCombos = useMemo(() => {
    return allCombos.filter(({ combo }) => combo.missingCards.length === 0);
  }, [allCombos]);
  
  // 缺少卡牌的连打
  const incompleteCombos = useMemo(() => {
    return allCombos.filter(({ combo }) => combo.missingCards.length > 0);
  }, [allCombos]);
  
  // 处理执行
  const handleExecute = () => {
    if (!selectedCombo) return;
    
    const cardIds = selectedCombo.requiredCards.map(c => c.cardId);
    onExecute(selectedCombo.type, cardIds);
    setSelectedCombo(null);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="casino-card max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gold/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Layers className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gold-light">连打选择</h2>
              <p className="text-sm text-cream-muted">
                {executableCombos.length > 0
                  ? `有 ${executableCombos.length} 种可执行的连打`
                  : '暂无完整连打组合'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-felt-dark/80 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-cream-muted" />
          </button>
        </div>
        
        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {executableCombos.length > 0 ? (
            <div className="space-y-6">
              {/* 可执行的连打 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-cream">可执行</h3>
                </div>
                <div className="grid gap-3">
                  {executableCombos.map(({ combo, starter }) => (
                    <ComboCard
                      key={`${starter.cardId}-${combo.type}`}
                      combo={combo}
                      isSelected={selectedCombo === combo}
                      onSelect={() => setSelectedCombo(combo)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Layers className="w-12 h-12 text-gold/30 mx-auto mb-4" />
              <p className="text-cream-muted">暂无可执行的连打组合</p>
              <p className="text-sm text-cream-muted/60 mt-2">
                收集更多相同数字或颜色的牌来组成连打
              </p>
            </div>
          )}
          
          {/* 不完整的连打 */}
          {incompleteCombos.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gold/10">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-cream-muted" />
                <h3 className="text-sm font-bold text-cream-muted">即将完成</h3>
              </div>
              <div className="grid gap-3 opacity-60">
                {incompleteCombos.slice(0, 3).map(({ combo, starter }) => (
                  <ComboCard
                    key={`incomplete-${starter.cardId}-${combo.type}`}
                    combo={combo}
                    isSelected={false}
                    onSelect={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* 底部操作栏 */}
        <div className="flex items-center justify-between p-6 border-t border-gold/10 bg-felt-dark/30">
          <div className="text-sm text-cream-muted">
            {selectedCombo ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                已选择: {selectedCombo.name}
              </span>
            ) : (
              '选择一种连打执行'
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-cream-muted hover:text-cream transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleExecute}
              disabled={!selectedCombo}
              className={`
                px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all
                ${selectedCombo
                  ? 'btn-soft-green text-white'
                  : 'bg-felt-dark/60 text-cream-muted border border-gold/20 cursor-not-allowed'
                }
              `}
            >
              执行连打
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ComboSelectorV2;
