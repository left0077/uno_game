/**
 * gameStore - 游戏状态管理
 * 
 * 职责：
 * - 管理全局 UI 状态
 * - 房间信息缓存
 * - 游戏状态缓存
 * - 用户偏好设置
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Room, GameState, Card } from '../../../shared/types';

interface GameStore {
  // 连接配置
  serverUrl: string;
  setServerUrl: (url: string) => void;

  // 用户信息
  userId: string;
  nickname: string;
  setNickname: (name: string) => void;

  // 房间相关
  room: Room | null;
  setRoom: (room: Room | null) => void;
  inputRoomCode: string;
  setInputRoomCode: (code: string) => void;

  // 游戏状态
  gameState: GameState | null;
  setGameState: (state: GameState | null) => void;
  myHand: Card[];
  setMyHand: (cards: Card[]) => void;

  // 游戏结果
  gameResult: { winnerId?: string; rankings?: any[] } | null;
  setGameResult: (result: { winnerId?: string; rankings?: any[] } | null) => void;

  // UI 状态
  error: string;
  setError: (error: string) => void;
  cardSelectionOpen: boolean;
  setCardSelectionOpen: (open: boolean) => void;

  // 表情消息
  emojiMessages: Array<{ playerId: string; emoji: string; target?: string; timestamp: number }>;
  addEmojiMessage: (msg: { playerId: string; content: string; target?: string; timestamp: number }) => void;
  clearEmojiMessages: () => void;

  // 方法
  resetRoomState: () => void;
  resetGameState: () => void;
  generateUserId: () => string;
}

// 生成唯一 ID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, _get) => ({
      // 初始值
      serverUrl: import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
      userId: generateUUID(),
      nickname: '',
      room: null,
      inputRoomCode: '',
      gameState: null,
      gameResult: null,
      myHand: [],
      error: '',
      cardSelectionOpen: false,
      emojiMessages: [],

      // 设置方法
      setServerUrl: (url) => set({ serverUrl: url }),
      setNickname: (name) => set({ nickname: name }),
      setRoom: (room) => set({ room }),
      setInputRoomCode: (code) => set({ inputRoomCode: code }),
      setGameState: (state) => set({ gameState: state }),
      setMyHand: (cards) => set({ myHand: cards }),
      setError: (error) => set({ error }),
      setGameResult: (result) => set({ gameResult: result }),
      setCardSelectionOpen: (open) => set({ cardSelectionOpen: open }),
      addEmojiMessage: (msg) => set((s) => ({
        emojiMessages: [...s.emojiMessages.slice(-5), { playerId: msg.playerId, emoji: msg.content, target: msg.target, timestamp: msg.timestamp }]
      })),
      clearEmojiMessages: () => set({ emojiMessages: [] }),

      // 重置方法
      resetRoomState: () => set({
        room: null,
        inputRoomCode: '',
        gameState: null,
        gameResult: null,
        myHand: [],
        error: '',
        emojiMessages: [],
      }),

      resetGameState: () => set({
        gameState: null,
        gameResult: null,
        myHand: [],
        cardSelectionOpen: false
      }),

      // 生成新用户 ID
      generateUserId: () => {
        const newId = generateUUID();
        set({ userId: newId });
        return newId;
      }
    }),
    {
      name: 'uno-game-storage',
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        userId: state.userId,
        nickname: state.nickname
      })
    }
  )
);
