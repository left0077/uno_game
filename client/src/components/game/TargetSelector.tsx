import { motion } from 'framer-motion';
import type { Player } from '../../../../shared/types';

interface TargetSelectorProps {
  players: Player[];
  currentPlayerId: string;
  onSelect: (targetId: string) => void;
  onCancel: () => void;
}

/**
 * 彩虹目标选择器
 * 
 * 弹出层选择目标玩家（彩虹连打专用）
 * 显示其他非淘汰玩家列表
 */
export function TargetSelector({
  players,
  currentPlayerId,
  onSelect,
  onCancel,
}: TargetSelectorProps) {
  // 过滤出其他非淘汰玩家
  const otherPlayers = players.filter(
    (p) => p.id !== currentPlayerId && !p.eliminated
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="casino-card p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gold-light mb-2 text-center">选择彩虹目标</h3>
        <p className="text-cream-muted text-center mb-6">选择一名玩家承受惩罚</p>

        <div className="grid grid-cols-2 gap-3">
          {otherPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => onSelect(player.id)}
              className="flex items-center gap-3 p-3 bg-felt-dark/80 hover:bg-felt-dark border border-gold/10 hover:border-gold/30 rounded-xl transition-all"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 border-gold/20 ${
                  player.isAI ? 'bg-blue-900/40 text-blue-300' : 'bg-emerald-800/60 text-cream'
                }`}
              >
                {player.isAI ? '🤖' : player.nickname.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="font-medium text-cream truncate max-w-[100px]">
                  {player.nickname}
                </div>
                <div className="text-xs text-cream-muted">{player.cardCount}张牌</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="w-full mt-4 py-3 bg-felt-dark/60 border border-gold/20 text-gold rounded-xl hover:border-gold/40 hover:bg-felt-dark/80 transition-all font-medium"
        >
          取消
        </button>
      </motion.div>
    </motion.div>
  );
}
