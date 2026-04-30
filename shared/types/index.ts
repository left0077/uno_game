// 玩家类型
export interface Player {
  id: string;
  nickname: string;
  avatar?: string;
  isHost: boolean;
  isAI: boolean;
  aiType?: 'bot' | 'host'; // 'bot'=机器人(自动立即出牌), 'host'=托管(玩家离线)
  aiDifficulty?: 'easy' | 'normal' | 'hard';
  cards: Card[];
  cardCount: number;
  isConnected: boolean;
  isReady: boolean;
  disconnectedAt?: number;
  hasCalledUno?: boolean; // 是否已喊UNO
  eliminated?: boolean; // 是否被淘汰（缩圈模式）
}

// 卡牌类型
export interface Card {
  id: string;
  type: 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'draw4' | 'draw3' | 'draw5' | 'draw8';
  color: 'red' | 'yellow' | 'green' | 'blue' | 'wild';
  value: number | string;
}

// 房间状态
export interface Room {
  id: string;
  code: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  hostId: string;
  maxPlayers: number;
  createdAt: number;
  gameState?: GameState;
  settings: RoomSettings;
}

// 游戏模式类型
export type GameMode = 'standard' | 'out';

// 房间设置
export interface RoomSettings {
  allowStacking: boolean;
  allowMultipleCards: boolean;
  allowJumpIn: boolean;
  scoringMode: boolean;
  // 游戏模式
  mode: GameMode;
  // 初始手牌数
  initialCards?: number;
  // 最大玩家数
  maxPlayers?: number;
}

// Out模式状态（3阶段机制）
export interface OutState {
  phase: 0 | 1 | 2 | 3; // 0=正常, 1-3=Out阶段
  maxCards: number; // 当前手牌上限（超出淘汰）
  nextOutAt?: number; // 下阶段阈值（旧字段，保留兼容）
}

// 游戏状态
export interface GameState {
  currentPlayerId: string;
  direction: 'clockwise' | 'counterclockwise' | 1 | -1; // 支持字符串和数字
  deck: Card[];
  discardPile: Card[];
  topCard?: Card; // 弃牌堆顶部的牌（用于显示）
  currentColor: string;
  turnTimer: number;
  turnStartTime: number;
  lastAction?: GameAction;
  winner?: string;
  players: Player[]; // 包含每个玩家的手牌信息（不含具体手牌，只含cardCount）
  playerHandCounts?: Record<string, number>; // 玩家手牌数量映射
  pendingDraw?: number; // 连打累积的摸牌数
  pendingDrawType?: 'draw2' | 'draw3' | 'draw4' | 'draw5' | 'draw8'; // 连打的类型（同类型可叠加，draw8万能可叠加任何）
  rankings?: string[]; // 出完牌的玩家排名（按先后顺序）
  isRoundEnded?: boolean; // 本轮是否已结束
  skippedPlayerId?: string; // 被跳过的玩家ID（用于UI提示）
  outState?: OutState; // Out模式状态
  gameStartTime?: number; // 游戏开始时间戳（缩圈模式需要）
  humanPlayerCount?: number; // 开局真人数量（缩圈模式需要）
  phase?: 'waiting' | 'playing' | 'finished'; // 游戏阶段
  lastPlay?: { playerId: string; type: string; cardCount: number; cards: Card[] } | null; // 最后出牌记录
}

// 游戏动作
export interface GameAction {
  type: 'play' | 'draw' | 'skip' | 'uno' | 'challenge' | 'jumpIn' | 'combo';
  playerId: string;
  card?: Card;
  cards?: Card[];
  cardIds?: string[]; // 连打时使用的牌ID列表
  color?: string;
  chosenColor?: string; // 万能牌选择的颜色
  comboType?: 'pair' | 'three' | 'rainbow' | 'straight'; // 连打类型
  targetId?: string; // 彩虹转移的目标玩家ID
  timestamp: number;
}

// 聊天消息
export interface ChatMessage {
  type: 'emoji' | 'text';
  content: string;
  playerId: string;
  playerName: string;
  timestamp: number;
}

// Socket 事件类型
export enum SocketEvents {
  // 连接
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  
  // 房间
  CREATE_ROOM = 'room:create',
  JOIN_ROOM = 'room:join',
  LEAVE_ROOM = 'room:leave',
  ROOM_UPDATED = 'room:updated',
  PLAYER_JOINED = 'room:playerJoined',
  PLAYER_LEFT = 'room:playerLeft',
  
  // 游戏
  GAME_START = 'game:start',
  GAME_STATE = 'game:state',
  PLAY_CARD = 'game:playCard',
  DRAW_CARD = 'game:drawCard',
  CALL_UNO = 'game:callUno',
  CHALLENGE_UNO = 'game:challengeUno',
  JUMP_IN = 'game:jumpIn',
  TURN_TIMEOUT = 'game:turnTimeout',
  
  // AI
  ADD_AI = 'ai:add',
  REMOVE_AI = 'ai:remove',
  
  // 托管
  TOGGLE_HOSTING = 'player:toggleHosting',
  
  // 聊天
  SEND_MESSAGE = 'chat:send',
  RECEIVE_MESSAGE = 'chat:receive',
  
  // 错误
  ERROR = 'error',
}

// 用户会话信息
export interface UserSession {
  userId: string;  // 客户端生成的固定 UUID
  nickname: string;
}

// 错误类型
export interface SocketError {
  code: string;
  message: string;
}
