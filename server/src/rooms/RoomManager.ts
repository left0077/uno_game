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
    // 先离开之前的房间（防止一个玩家同时存在于多个房间）
    this.leaveRoom(hostId);

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

    // 先离开之前的房间（防止一个玩家同时存在于多个房间）
    this.leaveRoom(playerId);

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
    
    const botNames = [
      // 丁真系
      '电子丁真', '纯真算法', '赛博牦牛', '丁真输入法',
      // 奶龙系
      '狂暴奶龙', '奶龙缓冲区', '高速奶龙', '奶龙404',
      // 坤坤系
      '背带裤.exe', '中分编译器', '只因处理器', '篮球数据流',
      // 马保国系
      '闪电五连鞭', '浑元形意八卦掌', '耗子尾汁分发器',
      // 刀哥系
      '沈阳大街办事处', '电子咬打火机', '好果汁儿酿造厂',
      // 独立抽象
      '雪豹已读不回', '悲伤烤冷面', '凌晨三点半出牌',
      '精神小伙延迟', '电子木鱼敲一下', '赛博功德箱',
      '抽象情绪缓存', '野生烂梗收割机', '互联网嘴替',
      '反向操作带师', '沉默是今晚的牌堆', '这把我必赢',
      '最后一根网线', '低电量自动托管', '已黑化九十九',
    ];
    const hostNames = [
      '雪豹把网线咬了', '去理塘充电了', '信号被牦牛踩断了',
      '临时去背带裤专卖店', '正在练闪电五连鞭',
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
