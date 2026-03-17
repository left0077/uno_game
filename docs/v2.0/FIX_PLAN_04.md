# 修复4：精简可出牌提示

## 问题
每张可出牌下面显示多个提示标签（颜色匹配、数字匹配、万能牌等），界面拥挤

## 修复文件
- `client/src/pages/Game.tsx`
- `server/src/game/modes/BaseGameMode.ts` (可选：后端只返回主因)

## 修复方案A：前端只显示最高优先级（推荐）

```typescript
// Game.tsx:897
{cardInfo && isPlayable && (
  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
    <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
      {/* ✅ 只显示最高优先级的理由 */}
      {cardInfo.reasons.sort((a, b) => b.priority - a.priority)[0]?.description}
    </span>
  </div>
)}
```

## 修复方案B：hover时才显示全部

```typescript
// 添加hover状态
const [hoveredCard, setHoveredCard] = useState<string | null>(null);

// 卡片区域
<div 
  onMouseEnter={() => setHoveredCard(card.id)}
  onMouseLeave={() => setHoveredCard(null)}
>
  {/* 默认只显示一个 */}
  {cardInfo && isPlayable && hoveredCard !== card.id && (
    <span>{cardInfo.reasons[0]?.description}</span>
  )}
  
  {/* hover显示全部 */}
  {cardInfo && isPlayable && hoveredCard === card.id && (
    <div className="flex flex-col gap-1">
      {cardInfo.reasons.map(r => (
        <span key={r.type}>{r.description}</span>
      ))}
    </div>
  )}
</div>
```

## 验证方式
1. 观察手牌区域
2. 每张牌下面只显示一个提示标签
3. 界面不再拥挤
