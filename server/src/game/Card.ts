import { Card } from '../shared/index.js';
import { v4 as uuidv4 } from 'uuid';

export class CardManager {
  // 创建一副完整的Uno牌（108张）
  static createDeck(): Card[] {
    const deck: Card[] = [];
    const colors = ['red', 'yellow', 'green', 'blue'] as const;
    
    // 数字牌（0-9）
    colors.forEach(color => {
      // 每个颜色1张0
      deck.push({
        id: uuidv4(),
        type: 'number',
        color,
        value: 0
      });
      
      // 每个颜色2张1-9
      for (let i = 1; i <= 9; i++) {
        for (let j = 0; j < 2; j++) {
          deck.push({
            id: uuidv4(),
            type: 'number',
            color,
            value: i
          });
        }
      }
    });
    
    // 功能牌（跳过、反转、+2）
    colors.forEach(color => {
      for (let i = 0; i < 2; i++) {
        deck.push({ id: uuidv4(), type: 'skip', color, value: 'skip' });
        deck.push({ id: uuidv4(), type: 'reverse', color, value: 'reverse' });
        deck.push({ id: uuidv4(), type: 'draw2', color, value: 'draw2' });
      }
    });
    
    // 万能牌（变色、+4）
    for (let i = 0; i < 4; i++) {
      deck.push({ id: uuidv4(), type: 'wild', color: 'wild', value: 'wild' });
      deck.push({ id: uuidv4(), type: 'draw4', color: 'wild', value: 'draw4' });
    }
    
    return this.shuffleDeck(deck);
  }
  
  // 创建惩罚卡（+3/+5 彩色，+8 万能）
  static createPenaltyCards(type: 'draw3' | 'draw5' | 'draw8', count: number): Card[] {
    const cards: Card[] = [];
    const colors = ['red', 'yellow', 'green', 'blue'] as const;

    if (type === 'draw8') {
      // 万能惩罚卡：无固定颜色
      for (let i = 0; i < count; i++) {
        cards.push({ id: uuidv4(), type: 'draw8', color: 'wild', value: 'draw8' });
      }
    } else {
      // 彩色惩罚卡：均分到四种颜色
      const perColor = Math.floor(count / 4);
      const remainder = count % 4;
      for (let ci = 0; ci < 4; ci++) {
        const extra = ci < remainder ? 1 : 0;
        for (let i = 0; i < perColor + extra; i++) {
          cards.push({ id: uuidv4(), type, color: colors[ci], value: type });
        }
      }
    }
    return cards;
  }

  // 将惩罚卡注入牌库并洗牌
  static injectPenaltyCards(deck: Card[], type: 'draw3' | 'draw5' | 'draw8', count: number): Card[] {
    const penaltyCards = this.createPenaltyCards(type, count);
    const combined = [...deck, ...penaltyCards];
    console.log(`[CardManager] 注入 ${count} 张 ${type} 惩罚卡，牌库共 ${combined.length} 张`);
    return this.shuffleDeck(combined);
  }

  // 洗牌（Fisher-Yates算法）
  static shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  // 检查卡牌是否可以打出
  static canPlayCard(card: Card, topCard: Card, currentColor: string): boolean {
    // 万能牌随时可出
    if (card.type === 'wild' || card.type === 'draw4') {
      return true;
    }
    
    // 颜色匹配
    if (card.color === currentColor) {
      return true;
    }
    
    // 数字/类型匹配
    if (card.value === topCard.value) {
      return true;
    }
    
    return false;
  }
  
  // 检查是否是合法的+4（手牌中没有当前颜色的牌）
  static canPlayDraw4(hand: Card[], currentColor: string): boolean {
    return !hand.some(card => card.color === currentColor);
  }
  
  // 获取卡牌显示文本
  static getCardDisplay(card: Card): string {
    const colorEmoji: Record<string, string> = {
      red: '🔴',
      yellow: '🟡',
      green: '🟢',
      blue: '🔵',
      wild: '🌈'
    };
    
    if (card.type === 'number') {
      return `${colorEmoji[card.color]}${card.value}`;
    }
    
    const typeEmoji: Record<string, string> = {
      skip: '🚫',
      reverse: '↩️',
      draw2: '+2',
      wild: '🎨',
      draw4: '+4'
    };
    
    return `${colorEmoji[card.color]}${typeEmoji[card.type]}`;
  }
}
