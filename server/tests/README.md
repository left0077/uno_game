# Server 测试脚本

> 独立的测试脚本，用于验证服务端功能

---

## 📋 测试文件列表

| 文件 | 说明 | 用途 |
|------|------|------|
| `test-action-api.mjs` | Action API v2.0 测试 | 测试可用动作、出牌验证、惩罚响应 |
| `test-api.js` | API 基础测试 | 测试房间、游戏基础接口 |
| `test-api-live.js` | 线上 API 测试 | 测试生产环境 API |
| `test-api-standalone.js` | 独立 API 测试 | 不依赖服务器的 API 测试 |
| `test-card.mjs` | 卡牌系统测试 | 测试卡牌生成、洗牌、发牌 |
| `test-core.js` | 核心逻辑测试 | 测试游戏核心功能 |
| `test-debug.mjs` | 调试脚本 | 临时调试使用 |
| `test-game.mjs` | 游戏流程测试 | 测试完整游戏流程 |
| `test-leave.mjs` | 离开房间测试 | 测试玩家离开逻辑 |
| `test-manual.js` | 手动测试 | 手动验证功能 |
| `test-mode.mjs` | 游戏模式测试 | 测试不同模式 |
| `test-out.mjs` | Out 模式测试 | 测试大逃杀模式 |
| `test-pending-draw.mjs` | 累积惩罚测试 | 测试 +2/+4 累积 |
| `test-room.mjs` | 房间系统测试 | 测试创建/加入房间 |

---

## 🚀 运行测试

```bash
# 运行所有测试
npm test

# 运行指定测试
node tests/test-action-api.mjs
node tests/test-game.mjs
node tests/test-room.mjs
```

---

## 📝 测试说明

- 测试脚本使用 `.mjs` 扩展名支持 ES Modules
- 部分测试需要服务器运行在 `localhost:3001`
- 测试前确保已执行 `npm run build` 编译代码
