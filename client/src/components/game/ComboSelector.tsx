// 使用与useGameMode返回类型兼容的定义
interface ComboItem {
  type: string;
  name: string;
  cardIds: string[];
}

interface ComboSelectorProps {
  combos: ComboItem[];
  selectedCards: string[];
  matchedCombo: ComboItem | null;
  onExecuteCombo: () => void;
  onCancel: () => void;
}

/**
 * 连打选择器（Out模式专用）
 * 
 * 显示连打选择UI：
 * - 匹配成功时显示绿色执行按钮
 * - 无法组成时显示提示
 * - 显示可用连打数量
 */
export function ComboSelector({
  combos,
  selectedCards,
  matchedCombo,
  onExecuteCombo,
  onCancel,
}: ComboSelectorProps) {
  // 没有选牌时不显示
  if (selectedCards.length === 0) {
    // 显示可用连打提示
    if (combos.length > 0) {
      return (
        <span className="text-xs text-cream-muted">{combos.length}种连打可用</span>
      );
    }
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* 匹配成功 - 显示执行按钮 */}
      {matchedCombo ? (
        <button
          onClick={onExecuteCombo}
          className="px-4 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-600/25 animate-pulse border border-emerald-400/30"
        >
          {matchedCombo.name} ✓
        </button>
      ) : null}

      {/* 取消选择按钮 - 仅在已选牌时显示 */}
      {selectedCards.length > 0 && (
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-sm text-cream-muted hover:text-cream hover:bg-felt-dark/80 border border-gold/20 transition-all"
        >
          取消
        </button>
      )}
    </div>
  );
}
