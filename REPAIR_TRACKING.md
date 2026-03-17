# UNO Online v2.0 修复任务跟踪

> 本文件用于跟踪项目问题的修复进度

---

## 🔴 阻塞性问题（必须立即修复）

| # | 问题 | 文件 | 状态 | 负责人 | 备注 |
|---|------|------|------|--------|------|
| 1 | useSocketV2 引用错误 | `client/src/hooks/useGameActions.ts:8` | ⬜ 待修复 | - | 改为 `useSocket` |
| 2 | 调用不存在的方法 | `client/src/pages/Game.tsx:34,45` | ⬜ 待修复 | - | 移除或实现缺失方法 |
| 3 | 错误导出类型 | `client/src/hooks/index.ts:3` | ⬜ 待修复 | - | 移除 `UseGameActionsReturn` |
| 4 | Socket 快捷事件逻辑错误 | `server/src/socket/SocketHandler.ts:203-212` | ⬜ 待修复 | - | 直接处理而非 emit |
| 5 | 测试脚本引用已删除文件 | `test-all.sh` | ⬜ 待修复 | - | 更新为新的测试命令 |

---

## 🟡 高优先级问题（本周内修复）

| # | 问题 | 文件 | 状态 | 负责人 | 备注 |
|---|------|------|------|--------|------|
| 6 | Socket 事件名称不一致 | `SocketHandler.ts`, `useSocket.ts` | ⬜ 待修复 | - | 统一为 `room:created` 等 |
| 7 | V2 API 返回值类型不匹配 | `SocketHandler.ts:276-284` | ⬜ 待修复 | - | 改为对象格式 |
| 8 | App.tsx 大量未使用代码 | `App.tsx` | ⬜ 待修复 | - | 清理或实现功能 |
| 9 | E2E 测试路径错误 | `e2e/run-tests.sh` | ⬜ 待修复 | - | 修正路径 |
| 10 | 房间创建后页面不跳转 | `App.tsx`, `useSocket.ts` | ⬜ 待修复 | - | 事件监听问题 |

---

## 🟢 中优先级问题（2周内修复）

### 代码质量
- [ ] 清理服务端未使用的导入（5处）
- [ ] 清理客户端未使用的导入（15+处）
- [ ] 修复类型强制转换 `as any`（8处）
- [ ] 移除重复导出声明

### 测试完善
- [ ] 添加 SocketHandler 单元测试
- [ ] 添加 RoomManager 单元测试
- [ ] 添加 React Hooks 测试
- [ ] 修复 E2E 基础功能测试

---

## 📐 长期改进任务

### 架构优化
- [ ] 启用 TypeScript 严格模式
- [ ] 统一共享类型定义
- [ ] 重构 useSocket Hook 简化 API
- [ ] 完善错误处理机制

### 文档完善
- [ ] 更新 README.md
- [ ] 添加 API 文档
- [ ] 添加架构设计文档
- [ ] 完善部署文档

---

## 📊 修复进度统计

```
🔴 阻塞性问题:  0/5  修复完成 (0%)
🟡 高优先级:    0/5  修复完成 (0%)
🟢 中优先级:    0/10 修复完成 (0%)
📐 长期任务:    0/7  修复完成 (0%)

总计: 0/27 (0%)
```

---

## 🚀 快速修复命令

### 1. 修复客户端 Hook 错误
```bash
# 编辑 client/src/hooks/useGameActions.ts
# 将 useSocketV2 改为 useSocket
```

### 2. 修复 Socket 事件名
```bash
# 编辑 server/src/socket/SocketHandler.ts
# 将 SocketEvents.CREATE_ROOM 改为 'room:created'
# 将 SocketEvents.JOIN_ROOM 改为 'room:joined'
```

### 3. 更新测试脚本
```bash
# 编辑 test-all.sh
# 删除对已删除文件的引用
# 改为使用 npm run test
```

### 4. 运行测试验证
```bash
cd /Users/left0077/Projects/Kimi_Uno

# 服务端构建
cd server && npm run build

# 客户端构建
cd ../client && npm run build

# 运行单元测试
cd ../server && npm test

# 运行 E2E 测试
cd ../e2e && npx playwright test
```

---

## 📝 修复记录

### 2026-03-17
- [x] 生成项目问题报告
- [x] 创建修复任务跟踪文档
- [ ] ...

---

**最后更新**: 2026-03-17
