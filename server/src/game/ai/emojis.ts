/**
 * 抽象表情类型
 * 符合当下网络流行文化
 */
export type EmojiType = 
  | 'long'           // 龙图 - 强大/威慑
  | 'sweat'          // 流汗黄豆 - 尴尬/无奈
  | 'beng'           // 蚌埠住了 - 绷不住/想笑
  | 'ahthis'         // 啊这 - 无语/震惊
  | 'ma'             // 麻了 - 麻木/放弃
  | 'ji'             // 寄了 - 完蛋/失败
  | 'bailan'         // 摆烂 - 躺平/无所谓
  | 'dian'           // 典 - 经典/离谱
  | 'ji2'            // 急 - 急了
  | 'xiao'           // 孝 - 孝了
  | 'le'             // 乐 - 看乐子
  | 'win'            // 赢 - 赢麻了
  | 'panda_angry'    // 熊猫头愤怒
  | 'panda_cry'      // 熊猫头哭泣
  | 'panda_troll'    // 熊猫头嘲讽
  | 'doge'           // 狗头 - 保命/调侃
  | 'pepe_hands'     // 佩佩摊手 - 无奈
  | 'pepe_sad'       // 悲伤蛙 - 难过
  | 'tom_explode'    // 汤姆爆炸 - 震惊
  | 'tom_cry'        // 汤姆哭泣
  | 'spiderman'      // 蜘蛛侠互指 - 你懂的
  | 'fine'           // Fine meme - 我很好（假的）
  | 'cope'           // Cope - 精神胜利
  | 'seethe'         // Seethe - 嫉妒/生气
  | 'malding';       // Malding - 气秃了

/**
 * 表情显示映射（使用Unicode或描述）
 * 实际游戏中应该使用图片资源
 */
export const EMOJI_DISPLAY: Record<EmojiType, string> = {
  long: '🐲',              // 龙
  sweat: '😅',             // 流汗
  beng: '🤣',              // 蚌埠
  ahthis: '😶',            // 啊这
  ma: '😑',                // 麻了
  ji: '💀',                // 寄
  bailan: '🛌',            // 摆烂
  dian: '📖',              // 典
  ji2: '🔥',               // 急
  xiao: '👶',              // 孝
  le: '🍿',                // 乐
  win: '🏆',               // 赢
  panda_angry: '🐼🔥',     // 熊猫怒
  panda_cry: '🐼😭',       // 熊猫哭
  panda_troll: '🐼😏',     // 熊猫嘲讽
  doge: '🐕',              // 狗头
  pepe_hands: '🐸🤷',      // 佩佩摊手
  pepe_sad: '🐸😢',        // 悲伤蛙
  tom_explode: '💥',       // 爆炸
  tom_cry: '😿',           // 哭
  spiderman: '🕷️',         // 蜘蛛侠
  fine: '👍💀',             // 我很好
  cope: '🧢',              // 帽子（Coping）
  seethe: '😤',            // 生气
  malding: '🦲'            // 秃头
};

/**
 * 抽象表情描述
 */
export const EMOJI_DESCRIPTION: Record<EmojiType, string> = {
  long: '龙！',
  sweat: '流汗了家人们',
  beng: '蚌埠住了',
  ahthis: '啊这...',
  ma: '麻了',
  ji: '寄！',
  bailan: '开摆！',
  dian: '典',
  ji2: '急了？',
  xiao: '孝',
  le: '乐',
  win: '赢！',
  panda_angry: '熊猫头怒',
  panda_cry: '蚌埠住哭',
  panda_troll: '熊猫头嘲讽',
  doge: '狗头保命',
  pepe_hands: '那咋办嘛',
  pepe_sad: '悲伤那么大',
  tom_explode: '我炸了',
  tom_cry: '汤姆哭',
  spiderman: '你懂的',
  fine: '我很好啊',
  cope: '精神胜利',
  seethe: '气死我了',
  malding: '气秃了'
};

/**
 * 表情包分类
 */
export const EMOJI_CATEGORIES = {
  // 攻击性/嘲讽
  aggressive: ['long', 'panda_troll', 'ji2', 'win', 'le'] as EmojiType[],
  
  // 防御性/自嘲
  defensive: ['sweat', 'doge', 'ma', 'bailan', 'fine', 'cope'] as EmojiType[],
  
  // 负面情绪
  negative: ['ji', 'pepe_sad', 'tom_cry', 'malding', 'seethe'] as EmojiType[],
  
  // 震惊/无语
  shocked: ['ahthis', 'beng', 'tom_explode', 'dian'] as EmojiType[],
  
  // 经典三件套
  sanjian: ['dian', 'ji2', 'xiao'] as EmojiType[]
};

/**
 * 根据游戏情况获取抽象表情
 */
export function getAbstractEmoji(
  situation: 'owning' | 'getting_owned' | 'clutch' | 'throwing' | 'sweating' | 'winning' | 'tilted',
  intensity: 'low' | 'medium' | 'high'
): EmojiType {
  const map: Record<string, Record<string, EmojiType[]>> = {
    owning: {
      low: ['win'],
      medium: ['long', 'le'],
      high: ['panda_troll', 'win', 'ji2']
    },
    getting_owned: {
      low: ['sweat', 'doge'],
      medium: ['ma', 'pepe_sad'],
      high: ['ji', 'tom_cry', 'malding']
    },
    clutch: {
      low: ['win'],
      medium: ['long', 'beng'],
      high: ['win', 'win', 'win']
    },
    throwing: {
      low: ['sweat'],
      medium: ['ahthis', 'beng'],
      high: ['ji', 'tom_explode']
    },
    sweating: {
      low: ['sweat'],
      medium: ['ma', 'fine'],
      high: ['bailan', 'seethe']
    },
    winning: {
      low: ['le'],
      medium: ['win', 'long'],
      high: ['win', 'panda_troll', 'cope']
    },
    tilted: {
      low: ['ji2'],
      medium: ['seethe', 'ahthis'],
      high: ['malding', 'ji', 'tom_explode']
    }
  };
  
  const options = map[situation]?.[intensity] || ['sweat'];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * 获取随机抽象三连
 */
export function getRandomSanjian(): [EmojiType, EmojiType, EmojiType] {
  const shuffled = [...EMOJI_CATEGORIES.sanjian].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1], shuffled[2]];
}
