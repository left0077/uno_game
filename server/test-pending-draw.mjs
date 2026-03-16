import { RoomManager } from './dist/rooms/RoomManager.js';
import { UnoGame } from './dist/game/UnoGame.js';

const rm = new RoomManager();
const room = rm.createRoom('p1', '玩家1');
rm.joinRoom(room.code, 'p2', '玩家2');

let lastState = null;
const game = new UnoGame(room, (state) => {
  lastState = state;
}, () => {});

const state = game.getGameState();
const playerId = state.currentPlayerId;
const player = state.players.find(p => p.id === playerId);

// 添加+2牌
player.cards.push({ id: 'd2', type: 'draw2', color: state.currentColor, value: 'draw2' });
player.cardCount++;

console.log('Before play:');
console.log('  pendingDraw:', state.pendingDraw);

// 使用game.playCard
const result = game.playCard(playerId, 'd2');
console.log('Play result:', result);

const afterState = lastState || game.getGameState();
console.log('After play:');
console.log('  pendingDraw:', afterState.pendingDraw);
console.log('  pendingDrawType:', afterState.pendingDrawType);

if (afterState.pendingDraw === 2 && afterState.pendingDrawType === 'draw2') {
  console.log('✅ 测试通过！');
} else {
  console.log('❌ 测试失败！期望 pendingDraw=2, pendingDrawType=draw2');
  process.exit(1);
}
