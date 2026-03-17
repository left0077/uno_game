import { RoomManager } from './dist/rooms/RoomManager.js';
import { UnoGame } from './dist/game/UnoGame.js';

const rm = new RoomManager();
const room = rm.createRoom('player-1', '玩家1');
rm.joinRoom(room.code, 'player-2', '玩家2');

const game = new UnoGame(
  room,
  (state) => { console.log('State changed, pendingDraw:', state.pendingDraw); },
  (winner) => { }
);

const state = game.getGameState();
const playerId = state.currentPlayerId;
const player = state.players.find(p => p.id === playerId);

console.log('Current player:', playerId);
console.log('Current color:', state.currentColor);
console.log('Player cards:', player.cards.map(c => `${c.color} ${c.type}`));

// 手动设置一张+2牌
const draw2Card = { id: 'draw2-test', type: 'draw2', color: state.currentColor, value: 'draw2' };
player.cards.push(draw2Card);
player.cardCount++;

console.log('\nBefore play:');
console.log('pendingDraw:', state.pendingDraw);
console.log('pendingDrawType:', state.pendingDrawType);

game.playCard(playerId, draw2Card.id);

const afterState = game.getGameState();
console.log('\nAfter play:');
console.log('pendingDraw:', afterState.pendingDraw);
console.log('pendingDrawType:', afterState.pendingDrawType);
