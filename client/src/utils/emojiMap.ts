/**
 * AI抽象表情映射
 * 将后端发送的表情代码映射到显示字符
 */

export type EmojiType = 
  | 'long'
  | 'sweat'
  | 'beng'
  | 'ahthis'
  | 'ma'
  | 'ji'
  | 'bailan'
  | 'dian'
  | 'ji2'
  | 'xiao'
  | 'le'
  | 'win'
  | 'panda_angry'
  | 'panda_cry'
  | 'panda_troll'
  | 'doge'
  | 'pepe_hands'
  | 'pepe_sad'
  | 'tom_explode'
  | 'tom_cry'
  | 'spiderman'
  | 'fine'
  | 'cope'
  | 'seethe'
  | 'malding';

/**
 * 表情显示映射
 */
export const EMOJI_DISPLAY: Record<EmojiType | string, string> = {
  long: '🐲',
  sweat: '😅',
  beng: '🤣',
  ahthis: '😶',
  ma: '😑',
  ji: '💀',
  bailan: '🛌',
  dian: '📖',
  ji2: '🔥',
  xiao: '👶',
  le: '🍿',
  win: '🏆',
  panda_angry: '🐼',
  panda_cry: '🐼',
  panda_troll: '🐼',
  doge: '🐕',
  pepe_hands: '🐸',
  pepe_sad: '🐸',
  tom_explode: '💥',
  tom_cry: '😿',
  spiderman: '🕷️',
  fine: '👍',
  cope: '🧢',
  seethe: '😤',
  malding: '🦲',
  // 默认fallback
  thinking: '🤔',
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😲',
  taunt: '😏',
  desperate: '😰',
  victory: '🏆'
};

/**
 * 表情描述
 */
export const EMOJI_DESCRIPTION: Record<EmojiType | string, string> = {
  long: '龙！',
  sweat: '流汗了',
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
  malding: '气秃了',
  thinking: '思考中...',
  happy: '不错！',
  sad: '哎呀...',
  angry: '可恶！',
  surprised: '什么？！',
  taunt: '来啊！',
  desperate: '救命...',
  victory: '赢了！'
};

/**
 * 获取表情显示字符
 */
export function getEmojiDisplay(emojiCode: string): string {
  return EMOJI_DISPLAY[emojiCode] || emojiCode;
}

/**
 * 获取表情描述
 */
export function getEmojiDescription(emojiCode: string): string {
  return EMOJI_DESCRIPTION[emojiCode] || emojiCode;
}
