/**
 * SocketHandlerV2 - V2 架构专用 Socket 处理器
 * 
 * 特点：
 * 1. 直接使用 GameStateV2
 * 2. 原生支持 action-based API
 * 3. 简化的状态同步
 */

import { Server, Socket } from 'socket.io';
import { RoomManager, roomManager } from '../rooms/RoomManager.js';
import { AIPlayer } from '../game/ai/index.js';
import { SocketEvents, Player, Room, RoomSettings } from '../shared/index.js';
import { ACTION_API_VERSION } from '../shared/actionApi.js';
import { GameStateV2, GameActionV2, calculateResult } from '../game/core/types.js';
import { PlayerManager } from '../game/core/PlayerManager.js';
import { GameInitializer } from '../game/core/GameInitializer.js';
import { BaseGameModeV2 } from '../game/core/BaseGameModeV2.js';
import { OutModeV2 } from '../game/core/OutModeV2.js';
import { StandardModeV2 } from '../game/core/StandardModeV2.js';

// V2 游戏实例
interface V2GameInstance {
  roomCode: string;
  state: GameStateV2;
  mode: BaseGameModeV2;
  playerManager: PlayerManager;
}

// 存储 V2 游戏实例
const v2Games = new Map<string, V2GameInstance>();
const socketUserMap = new Map<string, string>();

export function setupSocketHandlers(io: Server): void {
  // 设置 AI 表情回调
  AIPlayer.onSendEmoji = (playerId, emoji, target) => {
    const room = roomManager.getPlayerRoom(playerId);
    if (room) {
      const player = room.players.find(p => p.id === playerId);
      io.to(room.code).emit('chat:message', {
        type: 'emoji',
        content: emoji,
        playerId,
        playerName: player?.nickname || 'AI',
        timestamp: Date.now()
      });
    }
  };

  io.on('connection', (socket: Socket) => {
    console.log('[V2] Client connected:', socket.id);

    // ========== 认证 ==========
    socket.on('auth', (data: { userId: string; nickname: string }) => {
      socketUserMap.set(socket.id, data.userId);
      console.log(`[V2] Socket ${socket.id} authenticated as ${data.userId}`);

      // 断线重连恢复：检查用户是否在某个房间中是被托管状态，恢复控制权
      const existingRoom = roomManager.getPlayerRoom(data.userId);
      if (existingRoom) {
        const player = existingRoom.players.find(p => p.id === data.userId);
        if (player && player.isAI && player.aiType === 'host') {
          player.isAI = false;
          player.aiType = undefined;
          player.isConnected = true;
          socket.join(existingRoom.code);
          io.to(existingRoom.code).emit(SocketEvents.ROOM_UPDATED, existingRoom);
          console.log(`[V2] Player ${player.nickname} reconnected, control restored`);

          // 如果在游戏中，发送当前状态
          const game = v2Games.get(existingRoom.code);
          if (game) {
            broadcastGameStateV2(io, existingRoom.code, game);
          }
        }
      }
    });

    // ========== 房间管理 ==========
    
    socket.on(SocketEvents.CREATE_ROOM, (data: { nickname: string; userId?: string }) => {
      try {
        const userId = data.userId || socketUserMap.get(socket.id) || socket.id;

        // 离开之前的房间，防止同时存在于多个房间
        const prevRoom = roomManager.getPlayerRoom(userId);
        if (prevRoom) {
          socket.leave(prevRoom.code);
        }

        const room = roomManager.createRoom(userId, data.nickname);
        socket.join(room.code);
        socket.emit('room:created', room);

        // 通知旧房间玩家已离开
        if (prevRoom) {
          io.to(prevRoom.code).emit(SocketEvents.ROOM_UPDATED, prevRoom);
        }

        console.log(`[V2] Room created: ${room.code}`);
      } catch (error) {
        socket.emit(SocketEvents.ERROR, { code: 'CREATE_ROOM_FAILED', message: '创建房间失败' });
      }
    });

    socket.on(SocketEvents.JOIN_ROOM, (data: { roomCode: string; nickname: string; userId?: string }) => {
      try {
        const userId = data.userId || socketUserMap.get(socket.id) || socket.id;

        // 离开之前的房间，防止同时存在于多个房间
        const prevRoom = roomManager.getPlayerRoom(userId);
        if (prevRoom) {
          socket.leave(prevRoom.code);
        }

        const room = roomManager.joinRoom(data.roomCode, userId, data.nickname);
        if (!room) {
          socket.emit(SocketEvents.ERROR, { code: 'ROOM_NOT_FOUND', message: '房间不存在' });
          return;
        }

        // 通知旧房间玩家已离开
        if (prevRoom) {
          io.to(prevRoom.code).emit(SocketEvents.ROOM_UPDATED, prevRoom);
        }

        socket.join(data.roomCode);
        io.to(data.roomCode).emit('room:updated', room);
        socket.emit('room:joined', { success: true, room, userId });
        console.log(`[V2] ${data.nickname} joined room: ${data.roomCode}`);
      } catch (error) {
        socket.emit(SocketEvents.ERROR, { code: 'JOIN_ROOM_FAILED', message: '加入房间失败' });
      }
    });

    socket.on(SocketEvents.LEAVE_ROOM, () => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      const room = roomManager.getPlayerRoom(userId);
      
      if (room) {
        // 游戏进行中转为托管
        if (room.status === 'playing' && v2Games.has(room.code)) {
          const player = room.players.find(p => p.id === userId);
          if (player) {
            player.isConnected = false;
            player.isAI = true;
            player.aiType = 'host';
            io.to(room.code).emit(SocketEvents.ROOM_UPDATED, room);
          }
          socket.leave(room.code);
        } else {
          // 等待状态直接移除
          const updatedRoom = roomManager.leaveRoom(userId);
          if (updatedRoom) {
            socket.leave(updatedRoom.code);
            io.to(updatedRoom.code).emit(SocketEvents.ROOM_UPDATED, updatedRoom);
          }
        }
      }
    });

    // ========== AI 管理 ==========
    
    socket.on(SocketEvents.ADD_AI, (data: { roomCode: string; difficulty: 'easy' | 'normal' | 'hard'; type: 'bot' | 'host' }) => {
      console.log(`[V2] ADD_AI received: roomCode=${data.roomCode}, difficulty=${data.difficulty}, type=${data.type}`);
      try {
        const room = roomManager.getRoom(data.roomCode);
        console.log(`[V2] Room lookup result:`, room ? `found ${room.code}` : 'not found');
        if (!room) {
          socket.emit(SocketEvents.ERROR, { code: 'ROOM_NOT_FOUND', message: '房间不存在' });
          return;
        }
        
        const userId = socketUserMap.get(socket.id) || socket.id;
        if (room.hostId !== userId) {
          socket.emit(SocketEvents.ERROR, { code: 'PERMISSION_DENIED', message: '只有房主可以添加AI' });
          return;
        }
        
        const aiPlayer = roomManager.addAI(data.roomCode, data.difficulty, data.type);
        if (!aiPlayer) {
          socket.emit(SocketEvents.ERROR, { code: 'ADD_AI_FAILED', message: '添加AI失败' });
          return;
        }
        
        io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
        console.log(`[V2] AI added to room ${data.roomCode}: ${aiPlayer.nickname}`);
      } catch (error) {
        console.error('[V2] Add AI failed:', error);
        socket.emit(SocketEvents.ERROR, { code: 'ADD_AI_FAILED', message: '添加AI失败' });
      }
    });

    socket.on(SocketEvents.REMOVE_AI, (data: { roomCode: string; aiId: string }) => {
      try {
        const room = roomManager.getRoom(data.roomCode);
        if (!room) {
          socket.emit(SocketEvents.ERROR, { code: 'ROOM_NOT_FOUND', message: '房间不存在' });
          return;
        }
        
        const userId = socketUserMap.get(socket.id) || socket.id;
        if (room.hostId !== userId) {
          socket.emit(SocketEvents.ERROR, { code: 'PERMISSION_DENIED', message: '只有房主可以移除AI' });
          return;
        }
        
        const success = roomManager.removeAI(data.roomCode, data.aiId);
        if (!success) {
          socket.emit(SocketEvents.ERROR, { code: 'REMOVE_AI_FAILED', message: '移除AI失败' });
          return;
        }
        
        io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
        console.log(`[V2] AI removed from room ${data.roomCode}: ${data.aiId}`);
      } catch (error) {
        console.error('[V2] Remove AI failed:', error);
        socket.emit(SocketEvents.ERROR, { code: 'REMOVE_AI_FAILED', message: '移除AI失败' });
      }
    });

    // ========== 房间设置 ==========
    
    socket.on(SocketEvents.ROOM_SETTINGS, (data: { roomCode: string; settings: Partial<RoomSettings> }) => {
      try {
        const room = roomManager.getRoom(data.roomCode);
        if (!room) {
          socket.emit(SocketEvents.ERROR, { code: 'ROOM_NOT_FOUND', message: '房间不存在' });
          return;
        }
        
        const userId = socketUserMap.get(socket.id) || socket.id;
        if (room.hostId !== userId) {
          socket.emit(SocketEvents.ERROR, { code: 'PERMISSION_DENIED', message: '只有房主可以修改设置' });
          return;
        }
        
        // 更新房间设置
        Object.assign(room.settings, data.settings);
        
        // 广播更新
        io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
        console.log(`[V2] Room settings updated: ${data.roomCode}`);
      } catch (error) {
        console.error('[V2] Update settings failed:', error);
        socket.emit(SocketEvents.ERROR, { code: 'UPDATE_SETTINGS_FAILED', message: '更新设置失败' });
      }
    });

    // ========== 聊天 ==========
    
    socket.on(SocketEvents.CHAT_SEND, (data: { roomCode: string; type: 'text' | 'emoji'; content: string }) => {
      try {
        const room = roomManager.getRoom(data.roomCode);
        if (!room) {
          socket.emit(SocketEvents.ERROR, { code: 'ROOM_NOT_FOUND', message: '房间不存在' });
          return;
        }
        
        const userId = socketUserMap.get(socket.id) || socket.id;
        const player = room.players.find(p => p.id === userId);
        
        if (!player) {
          socket.emit(SocketEvents.ERROR, { code: 'NOT_IN_ROOM', message: '不在房间中' });
          return;
        }
        
        const message = {
          type: data.type,
          content: data.content,
          playerId: userId,
          playerName: player.nickname,
          timestamp: Date.now()
        };
        
        // 广播消息
        io.to(data.roomCode).emit('chat:message', message);
      } catch (error) {
        console.error('[V2] Send message failed:', error);
      }
    });

    // ========== 托管 ==========
    
    socket.on(SocketEvents.PLAYER_HOST, (data: { roomCode: string; enabled: boolean }) => {
      try {
        const room = roomManager.getRoom(data.roomCode);
        if (!room) {
          socket.emit(SocketEvents.ERROR, { code: 'ROOM_NOT_FOUND', message: '房间不存在' });
          return;
        }
        
        const userId = socketUserMap.get(socket.id) || socket.id;
        const player = room.players.find(p => p.id === userId);
        
        if (!player) {
          socket.emit(SocketEvents.ERROR, { code: 'NOT_IN_ROOM', message: '不在房间中' });
          return;
        }
        
        // 切换托管状态
        player.isAI = data.enabled;
        player.aiType = data.enabled ? 'host' : undefined;
        
        // 广播更新
        io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
        console.log(`[V2] Player hosting toggled: ${userId} = ${data.enabled}`);
      } catch (error) {
        console.error('[V2] Toggle hosting failed:', error);
        socket.emit(SocketEvents.ERROR, { code: 'TOGGLE_HOSTING_FAILED', message: '切换托管失败' });
      }
    });

    // ========== 游戏开始 ==========
    
    socket.on(SocketEvents.ROOM_START, (data: { roomCode: string; mode: 'standard' | 'out' }) => {
      const room = roomManager.getRoom(data.roomCode);
      const userId = socketUserMap.get(socket.id) || socket.id;
      
      if (!room || room.hostId !== userId) {
        socket.emit(SocketEvents.ERROR, { code: 'PERMISSION_DENIED', message: '只有房主可以开始游戏' });
        return;
      }
      
      if (room.players.length < 2) {
        socket.emit(SocketEvents.ERROR, { code: 'NOT_ENOUGH_PLAYERS', message: '至少需要2人' });
        return;
      }

      try {
        // 创建 V2 游戏实例
        const state = GameInitializer.createFromRoom(room, {
          cardsPerPlayer: 7,
          turnTimer: 120,
          allowStacking: true,
          allowJumpIn: true
        });

        // 创建模式
        const mode = data.mode === 'out'
          ? new OutModeV2()
          : new StandardModeV2();

        mode.initialize(state);

        const gameInstance: V2GameInstance = {
          roomCode: data.roomCode,
          state,
          mode,
          playerManager: mode.getPlayerManager()  // 使用 mode 内的实例，避免双重实例化
        };
        
        v2Games.set(data.roomCode, gameInstance);
        room.status = 'playing';

        // 启动游戏循环（所有游戏逻辑由 Mode 内部管理）
        mode.start(() => broadcastGameStateV2(io, data.roomCode, gameInstance));

        // 发送游戏开始事件（通知客户端跳转）
        io.to(data.roomCode).emit('game:started', {
          roomCode: data.roomCode,
          mode: data.mode,
          players: room.players
        });

        // 发送初始状态
        broadcastGameStateV2(io, data.roomCode, gameInstance);

        console.log(`[V2] Game started in room: ${data.roomCode}, mode: ${data.mode}`);
      } catch (error) {
        console.error('[V2] Game start failed:', error);
        socket.emit(SocketEvents.ERROR, { code: 'GAME_START_FAILED', message: '游戏启动失败' });
      }
    });

    // ========== V2 动作处理 ==========
    
    socket.on('v2:action', (data: { 
      roomCode: string; 
      action: Omit<GameActionV2, 'timestamp'>;
    }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      const game = v2Games.get(data.roomCode);
      
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }

      // 验证玩家权限
      if (data.action.playerId !== userId) {
        socket.emit(SocketEvents.ERROR, { code: 'PERMISSION_DENIED', message: '只能执行自己的动作' });
        return;
      }

      // 执行动作
      const action: GameActionV2 = {
        ...data.action,
        timestamp: Date.now()
      };

      const result = game.mode.handleAction(action);

      if (result.success) {
        broadcastAfterAction(io, data.roomCode, game);
      } else {
        socket.emit(SocketEvents.ERROR, {
          action: data.action,
          ...result.error
        });
      }
    });

    // ========== 快捷动作 ==========
    
    socket.on(SocketEvents.GAME_PLAY, (data: { roomCode: string; cardId: string; chosenColor?: string }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      const game = v2Games.get(data.roomCode);

      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }

      // 检测是否在惩罚响应中出反转牌、或非回合抢牌
      const player = game.state.players.get(userId);
      const card = player?.cards.find(c => c.id === data.cardId);
      const isMyTurn = game.playerManager.getCurrentPlayerId() === userId;
      const isReverseDuringPenalty = card?.type === 'reverse' &&
        game.state.pendingDraw && game.state.pendingDraw > 0;
      const isJumpIn = !isMyTurn && card && game.state.discardPile.length > 0 &&
        card.color === game.state.discardPile[game.state.discardPile.length - 1].color &&
        card.value === game.state.discardPile[game.state.discardPile.length - 1].value;

      let actionType: GameActionV2['type'] = 'play';
      if (isReverseDuringPenalty) actionType = 'reverse';
      else if (isJumpIn) actionType = 'jumpIn';

      const action: GameActionV2 = {
        type: actionType,
        playerId: userId,
        cardIds: [data.cardId],
        chosenColor: data.chosenColor as any,
        timestamp: Date.now()
      };

      const success = game.mode.handleAction(action);
      
      if (success) {
        broadcastAfterAction(io, data.roomCode, game);
      } else {
        socket.emit(SocketEvents.ERROR, { 
          action,
          reason: 'INVALID_ACTION'
        });
      }
    });

    socket.on(SocketEvents.GAME_COMBO, (data: { 
      roomCode: string; 
      cardIds: string[]; 
      comboType: string;
      chosenColor?: string;
    }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      const game = v2Games.get(data.roomCode);
      
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }

      const action: GameActionV2 = {
        type: 'combo',
        playerId: userId,
        cardIds: data.cardIds,
        comboType: data.comboType as any,
        chosenColor: data.chosenColor as any,
        timestamp: Date.now()
      };

      const success = game.mode.handleAction(action);
      
      if (success) {
        broadcastAfterAction(io, data.roomCode, game);
      } else {
        socket.emit(SocketEvents.ERROR, { 
          action,
          reason: 'INVALID_ACTION'
        });
      }
    });

    socket.on(SocketEvents.GAME_DRAW, (data: { roomCode: string }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      const game = v2Games.get(data.roomCode);
      
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }

      const action: GameActionV2 = {
        type: 'draw',
        playerId: userId,
        timestamp: Date.now()
      };

      const success = game.mode.handleAction(action);
      
      if (success) {
        broadcastAfterAction(io, data.roomCode, game);
      } else {
        socket.emit(SocketEvents.ERROR, { 
          action,
          reason: 'INVALID_ACTION'
        });
      }
    });

    socket.on(SocketEvents.GAME_UNO, (data: { roomCode: string }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      const game = v2Games.get(data.roomCode);
      
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }

      const action: GameActionV2 = {
        type: 'uno',
        playerId: userId,
        timestamp: Date.now()
      };

      const success = game.mode.handleAction(action);
      
      if (success) {
        broadcastAfterAction(io, data.roomCode, game);
        io.to(data.roomCode).emit('game:event', { type: 'uno_called', playerId: action.playerId });
      } else {
        socket.emit(SocketEvents.ERROR, { action, reason: 'INVALID_ACTION' });
      }
    });

    socket.on(SocketEvents.GAME_CHALLENGE, (data: { roomCode: string; targetId: string }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      const game = v2Games.get(data.roomCode);
      
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }

      const action: GameActionV2 = {
        type: 'challenge',
        playerId: userId,
        targetId: data.targetId,
        timestamp: Date.now()
      };

      const success = game.mode.handleAction(action);
      
      if (success) {
        broadcastAfterAction(io, data.roomCode, game);
        const challengedPlayer = game.state.players.get(action.targetId || '');
        io.to(data.roomCode).emit('game:event', {
          type: 'challenge_success',
          challengerId: action.playerId,
          targetId: action.targetId,
          targetName: challengedPlayer?.nickname || ''
        });
      } else {
        socket.emit(SocketEvents.ERROR, { action, reason: 'INVALID_ACTION' });
      }
    });

    // ========== 查询接口 ==========
    
    socket.on('v2:getState', (data: { roomCode: string }) => {
      const game = v2Games.get(data.roomCode);
      if (game) {
        socket.emit('game:state', game.mode.serializePublicState());
      }
    });

    socket.on(SocketEvents.PLAYER_ACTIONS, (data: { roomCode: string }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      const game = v2Games.get(data.roomCode);
      
      if (!game) return;
      
      const actions = game.mode.getAvailableActions(userId);
      socket.emit('player:actions', { playerId: userId, actions });
    });

    // ========== 断开连接 ==========
    
    socket.on('disconnect', () => {
      const userId = socketUserMap.get(socket.id);
      console.log('[V2] Client disconnected:', socket.id, userId);
      
      if (userId) {
        const room = roomManager.getPlayerRoom(userId);
        if (room && v2Games.has(room.code)) {
          // 游戏进行中，转为托管
          const player = room.players.find(p => p.id === userId);
          if (player) {
            player.isConnected = false;
            player.isAI = true;
            io.to(room.code).emit(SocketEvents.ROOM_UPDATED, room);
          }
        }
      }
      
      socketUserMap.delete(socket.id);
    });
  });
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 广播游戏状态给房间所有玩家
 */
function broadcastGameStateV2(io: Server, roomCode: string, game: V2GameInstance): void {
  const state = game.mode.serializePublicState();
  io.to(roomCode).emit('game:state', state);

  // 为已完成的玩家发送空手牌
  for (const pid of game.state.finishedPlayerIds) {
    if (!pid) continue;
    const fp = game.state.players.get(pid);
    if (!fp) continue;
    const roomSockets = io.sockets.adapter.rooms.get(roomCode);
    if (!roomSockets) continue;
    for (const sid of roomSockets) {
      const s = io.sockets.sockets.get(sid);
      if (s && socketUserMap.get(sid) === pid) {
        s.emit('player:turn', { playerId: pid, cards: [], cardCount: 0, actions: [] });
        break;
      }
    }
  }

  // 为每个玩家单独发送手牌 + 可用动作
  for (const playerId of game.state.tablePlayerIds) {
    const player = game.state.players.get(playerId);
    if (!player) continue;

    const roomSockets = io.sockets.adapter.rooms.get(roomCode);
    if (!roomSockets) continue;

    for (const socketId of roomSockets) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socketUserMap.get(socketId) === playerId) {
        // 合并推送：手牌 + 可用动作
        socket.emit('player:turn', {
          playerId,
          cards: player.cards,
          cardCount: player.cards.length,
          actions: game.mode.getAvailableActions(playerId),
        });
        break;
      }
    }
  }
}

function broadcastAfterAction(io: Server, roomCode: string, game: V2GameInstance): void {
  broadcastGameStateV2(io, roomCode, game);
  if (game.mode.isFinished()) {
    handleGameEndV2(io, roomCode, game);
  }
}

function handleGameEndV2(io: Server, roomCode: string, game: V2GameInstance): void {
  const result = calculateResult(game.state);
  const room = roomManager.getRoom(roomCode);

  if (room) {
    room.status = 'waiting';
    room.gameState = undefined;
  }

  io.to(roomCode).emit('game:ended', {
    winnerId: result.winnerId,
    rankings: result.rankings
  });

  v2Games.delete(roomCode);
  console.log(`[V2] Game ended in room: ${roomCode}`);
}
