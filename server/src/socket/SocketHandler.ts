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
  io.on('connection', (socket: Socket) => {
    console.log('[V2] Client connected:', socket.id);

    // ========== 认证 ==========
    socket.on('auth', (data: { userId: string; nickname: string }) => {
      socketUserMap.set(socket.id, data.userId);
      console.log(`[V2] Socket ${socket.id} authenticated as ${data.userId}`);
    });

    // ========== 房间管理 ==========
    
    socket.on(SocketEvents.CREATE_ROOM, (data: { nickname: string; userId?: string }) => {
      try {
        const userId = data.userId || socketUserMap.get(socket.id) || socket.id;
        const room = roomManager.createRoom(userId, data.nickname);
        socket.join(room.code);
        socket.emit('room:created', { success: true, room, userId });
        console.log(`[V2] Room created: ${room.code}`);
      } catch (error) {
        socket.emit(SocketEvents.ERROR, { code: 'CREATE_ROOM_FAILED', message: '创建房间失败' });
      }
    });

    socket.on(SocketEvents.JOIN_ROOM, (data: { roomCode: string; nickname: string; userId?: string }) => {
      try {
        const userId = data.userId || socketUserMap.get(socket.id) || socket.id;
        const room = roomManager.joinRoom(data.roomCode, userId, data.nickname);
        if (!room) {
          socket.emit(SocketEvents.ERROR, { code: 'ROOM_NOT_FOUND', message: '房间不存在' });
          return;
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

    // ========== V2 游戏开始 ==========
    
    socket.on('v2:gameStart', (data: { roomCode: string; mode: 'standard' | 'out' }) => {
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
        const mode = data.mode === 'out' ? new OutModeV2() : null;
        if (!mode) {
          socket.emit(SocketEvents.ERROR, { code: 'MODE_NOT_SUPPORTED', message: '该模式尚未支持' });
          return;
        }

        mode.initialize(state);
        
        const gameInstance: V2GameInstance = {
          roomCode: data.roomCode,
          state,
          mode,
          playerManager: new PlayerManager(state)
        };
        
        v2Games.set(data.roomCode, gameInstance);
        room.status = 'playing';
        
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

      const success = game.mode.handleAction(action);
      
      if (success) {
        // 广播新状态
        broadcastGameStateV2(io, data.roomCode, game);
        
        // 检查游戏结束
        if (game.state.phase === 'finished') {
          handleGameEndV2(io, data.roomCode, game);
        }
      } else {
        socket.emit('v2:actionFailed', { 
          action: data.action,
          reason: 'INVALID_ACTION'
        });
      }
    });

    // ========== 快捷动作 ==========
    
    socket.on('v2:playCard', (data: { roomCode: string; cardId: string; chosenColor?: string }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      socket.emit('v2:action', {
        roomCode: data.roomCode,
        action: {
          type: 'play',
          playerId: userId,
          cardIds: [data.cardId],
          chosenColor: data.chosenColor as any
        }
      });
    });

    socket.on('v2:playCombo', (data: { 
      roomCode: string; 
      cardIds: string[]; 
      comboType: string;
      chosenColor?: string;
    }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      socket.emit('v2:action', {
        roomCode: data.roomCode,
        action: {
          type: 'combo',
          playerId: userId,
          cardIds: data.cardIds,
          comboType: data.comboType as any,
          chosenColor: data.chosenColor as any
        }
      });
    });

    socket.on('v2:draw', (data: { roomCode: string }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      socket.emit('v2:action', {
        roomCode: data.roomCode,
        action: {
          type: 'draw',
          playerId: userId
        }
      });
    });

    socket.on('v2:callUno', (data: { roomCode: string }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      socket.emit('v2:action', {
        roomCode: data.roomCode,
        action: {
          type: 'uno',
          playerId: userId
        }
      });
    });

    socket.on('v2:challenge', (data: { roomCode: string; targetId: string }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      socket.emit('v2:action', {
        roomCode: data.roomCode,
        action: {
          type: 'challenge',
          playerId: userId,
          targetId: data.targetId
        }
      });
    });

    // ========== 查询接口 ==========
    
    socket.on('v2:getState', (data: { roomCode: string }) => {
      const game = v2Games.get(data.roomCode);
      if (game) {
        socket.emit('v2:gameState', serializeGameStateV2(game));
      }
    });

    socket.on('v2:getAvailableActions', (data: { roomCode: string }) => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      const game = v2Games.get(data.roomCode);
      
      if (!game) return;
      
      const actions = calculateAvailableActionsV2(game, userId);
      socket.emit('v2:availableActions', { playerId: userId, actions });
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
  const state = serializeGameStateV2(game);
  io.to(roomCode).emit('v2:gameState', state);
  
  // 为每个玩家单独发送其手牌
  for (const playerId of game.state.tablePlayerIds) {
    const player = game.state.players.get(playerId);
    if (player) {
      // 找到玩家的 socket
      const roomSockets = io.sockets.adapter.rooms.get(roomCode);
      if (roomSockets) {
        for (const socketId of roomSockets) {
          const socket = io.sockets.sockets.get(socketId);
          if (socket && socketUserMap.get(socketId) === playerId) {
            socket.emit('v2:playerHand', {
              playerId,
              cards: player.cards,
              cardCount: player.cards.length
            });
            break;
          }
        }
      }
    }
  }
}

/**
 * 序列化 V2 游戏状态为前端格式
 */
function serializeGameStateV2(game: V2GameInstance): any {
  const state = game.state;
  const pm = game.playerManager;
  
  return {
    version: 'v2',
    phase: state.phase,
    currentPlayerId: pm.getCurrentPlayerId(),
    currentPlayerIndex: state.currentPlayerIndex,
    direction: state.direction,
    
    // 牌堆
    deckCount: state.deck.length,
    discardPile: state.discardPile,
    topCard: state.discardPile[state.discardPile.length - 1] || null,
    currentColor: state.currentColor,
    
    // 惩罚状态
    pendingDraw: state.pendingDraw || 0,
    pendingDrawType: state.pendingDrawType,
    skippedPlayerId: state.skippedPlayerId,
    
    // 玩家列表（不包含手牌，手牌单独发送）
    players: pm.getAllPlayersInOrder().map(p => ({
      id: p.id,
      nickname: p.nickname,
      cardCount: p.cards.length,
      status: pm.isOnTable(p.id) ? 'ontable' : 'finished',
      eliminated: p.eliminated,
      hasCalledUno: p.hasCalledUno,
      isAI: p.isAI
    })),
    
    // 排名（游戏结束时）
    rankings: state.phase === 'finished' 
      ? calculateResult(state).rankings
      : null,
    
    // Out模式特有
    outState: state.outState,
    
    // 元数据
    turnStartTime: state.turnStartTime,
    lastAction: state.lastAction
  };
}

/**
 * 计算玩家可用动作
 */
function calculateAvailableActionsV2(game: V2GameInstance, playerId: string): any[] {
  const actions: any[] = [];
  const player = game.state.players.get(playerId);
  
  if (!player || !game.playerManager.isOnTable(playerId)) {
    return actions;
  }
  
  const isCurrentTurn = game.playerManager.getCurrentPlayerId() === playerId;
  
  if (isCurrentTurn) {
    // 可出的牌
    const topCard = game.state.discardPile[game.state.discardPile.length - 1];
    
    for (const card of player.cards) {
      let canPlay = false;
      
      // 有累积惩罚时只能叠加
      if (game.state.pendingDraw && game.state.pendingDraw > 0) {
        canPlay = card.type === game.state.pendingDrawType;
      } else {
        // 万能牌
        if (card.type === 'wild' || card.type === 'draw4') canPlay = true;
        // 颜色匹配
        else if (card.color === game.state.currentColor) canPlay = true;
        // 数值匹配
        else if (topCard && card.value === topCard.value) canPlay = true;
      }
      
      if (canPlay) {
        actions.push({
          type: 'play',
          cardId: card.id,
          requiresColor: card.type === 'wild' || card.type === 'draw4'
        });
      }
    }
    
    // 摸牌
    actions.push({ type: 'draw' });
    
    // 喊UNO
    if (player.cards.length <= 2) {
      actions.push({ type: 'uno' });
    }
  }
  
  return actions;
}

/**
 * 处理游戏结束
 */
function handleGameEndV2(io: Server, roomCode: string, game: V2GameInstance): void {
  const result = calculateResult(game.state);
  const room = roomManager.getRoom(roomCode);
  
  if (room) {
    room.status = 'waiting';
    room.gameState = undefined;
  }
  
  io.to(roomCode).emit('v2:gameEnded', {
    winnerId: result.winnerId,
    rankings: result.rankings
  });
  
  v2Games.delete(roomCode);
  
  console.log(`[V2] Game ended in room: ${roomCode}`);
}
