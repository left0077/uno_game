import { Room, Player, RoomSettings } from '../shared/index.js';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRoomMap: Map<string, string> = new Map();
  
  // 生成4位房间号
  private generateRoomCode(): string {
    let code: string;
    do {
      code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (this.rooms.has(code));
    return code;
  }
  
  // 创建房间
  createRoom(hostId: string, hostNickname: string, settings?: Partial<RoomSettings>): Room {
    const code = this.generateRoomCode();
    const room: Room = {
      id: uuidv4(),
      code,
      players: [{
        id: hostId,
        nickname: hostNickname,
        isHost: true,
        isAI: false,
        cards: [],
        cardCount: 0,
        isConnected: true,
        isReady: false
      }],
      status: 'waiting',
      hostId,
      maxPlayers: 8,
      createdAt: Date.now(),
      settings: {
        allowStacking: true,
        allowMultipleCards: true,
        allowJumpIn: true,
        scoringMode: true,
        mode: 'standard', // 默认标准模式
        ...settings
      }
    };
    
    this.rooms.set(code, room);
    this.playerRoomMap.set(hostId, code);
    
    return room;
  }
  
  // 加入房间
  joinRoom(roomCode: string, playerId: string, nickname: string): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (room.status !== 'waiting') return null;
    if (room.players.length >= room.maxPlayers) return null;
    if (room.players.some(p => p.id === playerId)) return room;
    
    const player: Player = {
      id: playerId,
      nickname,
      isHost: false,
      isAI: false,
      cards: [],
      cardCount: 0,
      isConnected: true,
      isReady: false
    };
    
    room.players.push(player);
    this.playerRoomMap.set(playerId, roomCode);
    
    return room;
  }
  
  // 离开房间
  leaveRoom(playerId: string): Room | null {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) return null;
    
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    room.players = room.players.filter(p => p.id !== playerId);
    this.playerRoomMap.delete(playerId);
    
    // 如果房主离开，转让房主
    if (room.hostId === playerId && room.players.length > 0) {
      const firstHuman = room.players.find(p => !p.isAI);
      if (firstHuman) {
        room.hostId = firstHuman.id;
        // 先清除所有玩家的isHost，再设置新房主
        room.players.forEach(p => p.isHost = false);
        firstHuman.isHost = true;
      } else {
        // 全是AI，解散房间
        this.rooms.delete(roomCode);
        return null;
      }
    }
    
    // 房间空了，删除房间
    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
      return null;
    }
    
    return room;
  }
  
  // 获取房间
  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }
  
  // 获取玩家所在房间
  getPlayerRoom(playerId: string): Room | undefined {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) return undefined;
    return this.rooms.get(roomCode);
  }
  
  // 添加AI
  addAI(roomCode: string, difficulty: 'easy' | 'normal' | 'hard', aiType: 'bot' | 'host' = 'bot'): Player | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (room.status !== 'waiting') return null;
    if (room.players.length >= room.maxPlayers) return null;
    
    // AI 昵称池 — 抽象互联网文学
    const botNames = [
      '纯真丁真', '赛博丁真', '雪豹闭嘴', '一眼鉴定', '电子烟杆',
      '疯狂奶龙', '暗黑奶龙', '暴龙战士', '超级奶龙', '奶龙战神',
      '不讲武德', '耗子尾汁', '闪电五鞭', '松果痰抖', '浑元形意',
      '中分背带', '你干嘛哎', '篮球坤坤', '练习两年', '鸡你太美',
      '独立宣言', '好果汁儿', '沈阳大街', '东百往事', '土豆刀哥',
      '咬打火机', '烂活刀哥', '白金汉宫', '儒雅随和', '天皇陛下',
      '葬爱家族', '火星文字', '大马猴王', '套你猴子', '十七张牌',
      '伞兵一号', '给阿姨倒', '画画的北', '悬崖上的波妞', '电子木鱼',
      '精神小伙', '退退退', '已黑化', '绝绝子', '无语子',
      '栓Q了', '蚌埠住了', '破防了', '绷不住了', '啊对对对',
    ];
    const hostNames = [
      '托管丁真', '断线奶龙', '挂机坤坤', '离线背带裤',
      '信号被雪豹叼走了', '被老板gank了', '上厕所忘回来了',
      '去理塘旅游了', '正在练习两年半', '摸了摸了',
    ];
    const usedNames = new Set(room.players.map(p => p.nickname));
    
    const namePool = aiType === 'bot' ? botNames : hostNames;
    // 随机打乱名字池，然后找一个未被使用的
    const shuffledNames = [...namePool].sort(() => Math.random() - 0.5);
    const availableName = shuffledNames.find(name => !usedNames.has(name)) || 
                          `网友${room.players.length}号`;
    
    const aiPlayer: Player = {
      id: `ai-${uuidv4()}`,
      nickname: availableName,
      isHost: false,
      isAI: true,
      aiType, // 'bot'=机器人(立即出牌), 'host'=托管
      aiDifficulty: difficulty,
      cards: [],
      cardCount: 0,
      isConnected: true,
      isReady: true
    };
    
    room.players.push(aiPlayer);
    return aiPlayer;
  }
  
  // 移除AI
  removeAI(roomCode: string, aiId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    if (room.status !== 'waiting') return false;
    
    const aiIndex = room.players.findIndex(p => p.id === aiId && p.isAI);
    if (aiIndex === -1) return false;
    
    room.players.splice(aiIndex, 1);
    return true;
  }
  
  // 踢出玩家（房主权限）
  kickPlayer(roomCode: string, targetId: string, hostId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    if (room.hostId !== hostId) return false;
    if (room.status !== 'waiting') return false;
    
    const target = room.players.find(p => p.id === targetId);
    if (!target) return false;
    if (target.isHost) return false;
    
    room.players = room.players.filter(p => p.id !== targetId);
    this.playerRoomMap.delete(targetId);
    
    return true;
  }
  
  // 更新房间设置（房主权限，仅限waiting状态）
  updateSettings(roomCode: string, hostId: string, settings: Partial<RoomSettings>): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    if (room.hostId !== hostId) return false;
    if (room.status !== 'waiting') return false;
    
    room.settings = {
      ...room.settings,
      ...settings
    };
    return true;
  }
  
  // 清理过期房间（30分钟无活动，或游戏已结束，或房间为空）
  cleanupExpiredRooms(): void {
    const now = Date.now();
    const expiredRooms: string[] = [];
    
    this.rooms.forEach((room, code) => {
      // 1. 房间为空，立即删除
      if (room.players.length === 0) {
        expiredRooms.push(code);
        return;
      }
      
      // 2. 检查是否全是AI（没有真人玩家），立即删除
      const hasHumanPlayer = room.players.some(p => !p.isAI);
      if (!hasHumanPlayer) {
        expiredRooms.push(code);
        return;
      }
      
      // 3. 检查是否有玩家断开连接超过5分钟
      const disconnectedPlayers = room.players.filter(p => !p.isConnected && p.disconnectedAt);
      const allDisconnected = room.players.length > 0 && disconnectedPlayers.length === room.players.length;
      const allDisconnectedExpired = allDisconnected && disconnectedPlayers.every(p => 
        p.disconnectedAt && now - p.disconnectedAt > 5 * 60 * 1000
      );
      if (allDisconnectedExpired) {
        expiredRooms.push(code);
        return;
      }
      
      // 4. 30分钟过期的房间
      const isExpired = now - room.createdAt > 30 * 60 * 1000;
      const shouldCleanup = (room.status === 'waiting' || room.status === 'finished') && isExpired;
      
      if (shouldCleanup) {
        expiredRooms.push(code);
      }
    });
    
    expiredRooms.forEach(code => {
      const room = this.rooms.get(code);
      if (room) {
        room.players.forEach(p => this.playerRoomMap.delete(p.id));
        this.rooms.delete(code);
        console.log(`Room ${code} cleaned up`);
      }
    });
    
    if (expiredRooms.length > 0) {
      console.log(`Cleaned up ${expiredRooms.length} rooms`);
    }
  }
  
  // 标记玩家断开连接
  markPlayerDisconnected(playerId: string): Room | null {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) return null;
    
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.isConnected = false;
      player.disconnectedAt = Date.now();
    }
    
    return room;
  }
  
  // 更新玩家房间映射（用于重连）
  updatePlayerRoomMap(playerId: string, roomCode: string, removeOnly: boolean = false): void {
    if (removeOnly) {
      this.playerRoomMap.delete(playerId);
    } else {
      this.playerRoomMap.set(playerId, roomCode);
    }
  }
  
  // 检查断线玩家并自动转为托管（每30秒调用一次）
  checkDisconnectedPlayers(): string[] {
    const now = Date.now();
    const updatedRooms: string[] = [];
    
    this.rooms.forEach((room, code) => {
      // 只处理进行中的游戏
      if (room.status !== 'playing') return;
      
      let updated = false;
      
      room.players.forEach(player => {
        // 非AI、已断线、有断线时间、且断线超过2分钟
        if (!player.isAI && 
            !player.isConnected && 
            player.disconnectedAt &&
            now - player.disconnectedAt > 2 * 60 * 1000) {
          
          console.log(`[RoomManager] 玩家 ${player.nickname} 断线超过2分钟，自动转为托管`);
          
          player.isAI = true;
          player.aiType = 'host';
          player.aiDifficulty = 'normal';
          updated = true;
        }
      });
      
      if (updated) {
        updatedRooms.push(code);
      }
    });
    
    return updatedRooms;
  }
}

// 单例实例
export const roomManager = new RoomManager();

// 启动定时检查（每30秒检查一次断线玩家）
setInterval(() => {
  roomManager.checkDisconnectedPlayers();
}, 30000);
