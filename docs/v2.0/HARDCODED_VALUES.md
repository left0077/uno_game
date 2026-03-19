# 前端硬编码值清单

> 需要逐步提取到配置文件的硬编码值

## 🔴 高优先级（应该提取到配置）

### 1. 游戏配置
| 文件 | 行号 | 硬编码值 | 说明 | 状态 |
|------|------|----------|------|------|
| `pages/RoomPage.tsx` | 170 | `7` | 初始手牌数 | ✅ 已改为从 room.settings 读取 |
| `pages/HomePage.tsx` | 83 | `maxLength={12}` | 昵称最大长度 | ✅ 已提取到 GAME_CONFIG |
| `pages/HomePage.tsx` | 130 | `maxLength={6}` | 房间码长度 | ✅ 已提取到 GAME_CONFIG |

### 2. 时间配置
| 文件 | 行号 | 硬编码值 | 说明 | 建议 |
|------|------|----------|------|------|
| `components/EmojiOverlay.tsx` | 51 | `3000` | emoji 显示时间(ms) | 提取到动画配置 |
| `components/SettingsModal.tsx` | 46 | `10000` | 请求超时时间(ms) | 已有 TIMEOUTS 常量，应统一使用 |

### 3. 优先级阈值
| 文件 | 行号 | 硬编码值 | 说明 | 建议 |
|------|------|----------|------|------|
| `components/game/PenaltyResponsePanel.tsx` | 84 | `70` | 优先级阈值 | 提取到配置对象 |
| `components/game/PenaltyResponsePanel.tsx` | 93-95 | `90, 70, 50` | 优先级颜色阈值 | 提取到配置对象 |

---

## 🟡 中优先级（样式相关）

### 4. 尺寸硬编码
| 文件 | 行号 | 硬编码值 | 说明 |
|------|------|----------|------|
| `components/Card.tsx` | 15 | `w-12 h-16` | 卡牌小尺寸 |
| `pages/GamePage.tsx` | 219 | `w-24 h-36` | 抽牌堆尺寸 |
| `pages/GamePage.tsx` | 248 | `w-24 h-36` | 弃牌堆尺寸 |
| `pages/GamePage.tsx` | 293 | `w-20 h-28` | 手牌尺寸 |

### 5. 位置计算
| 文件 | 行号 | 硬编码值 | 说明 |
|------|------|----------|------|
| `components/EmojiOverlay.tsx` | 65-66 | `20 + (index % 3) * 30` | emoji 位置计算 |

---

## 🟢 低优先级（颜色/样式类）

### 6. 颜色类（Tailwind）
大部分组件都有硬编码的颜色类，如：
- `bg-red-500`, `text-white`, `rounded-xl` 等

这些暂时可以接受，但理想情况下应该使用 CSS 变量或主题系统。

---

## ✅ 已提取到配置

| 配置项 | 之前 | 现在 | 状态 |
|--------|------|------|------|
| 最大玩家数 | 硬编码 `4` | `room.maxPlayers` | ✅ 已修复 |
| 服务器地址 | 硬编码 | `VITE_SERVER_URL` 环境变量 | ✅ 已配置 |
| 昵称最大长度 | 硬编码 `12` | `GAME_CONFIG.maxNicknameLength` | ✅ 已修复 |
| 房间码长度 | 硬编码 `6` | `GAME_CONFIG.roomCodeLength` | ✅ 已修复 |
| 初始手牌数 | 硬编码 `7` | `room.settings.initialCards` | ✅ 已修复 |

---

## 📋 已创建的配置文件

```typescript
// client/src/config/index.ts ✅ 已创建
export const GAME_CONFIG = {
  minPlayers: 2,
  maxPlayers: 8,
  initialCards: 7,
  maxNicknameLength: 12,
  roomCodeLength: 6,
};

export const ANIMATION_CONFIG = {
  emojiDisplayTime: 3000,
  toastDuration: 3000,
  transitionDuration: 200,
};

export const PRIORITY_CONFIG = {
  excellent: 90,
  good: 70,
  normal: 50,
};
```

### 使用方式
```typescript
import { GAME_CONFIG } from '../config';

// 替换硬编码值
maxLength={GAME_CONFIG.maxNicknameLength}
```

---

**最后更新**: 2026-03-19（已提取主要配置到 config/index.ts）
