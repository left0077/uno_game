# UNO Online v2.0 交付文档

## 交付版本
**版本号**: v2.0.0  
**提交哈希**: 50a88a6  
**交付时间**: 2026-03-17  

## 核心功能

### 1. Action API v2.0 (服务端权威架构)
- 服务端提供所有可出牌信息
- 客户端只负责展示，不再硬编码规则
- 前后端规则完全一致

### 2. 连打响应惩罚 (新规则)
- 被+2/+4时可出对子/三条/彩虹/顺子
- 彩虹可指定任意玩家作为"下家"
- 反转可弹回累积惩罚

### 3. 智能AI系统
- **简单AI**: 30%犯错率，随机出牌
- **普通AI**: 10%犯错率，使用记忆系统
- **困难AI**: 不犯错，深度搜索，预测对手

### 4. 抽象表情包
- 龙图🐲、蚌埠住了🤣、麻了😑、寄💀
- 熊猫头、狗头、悲伤蛙等

## 运行方式

### 开发模式
```bash
# 启动服务端
cd server && npm run dev

# 启动客户端  
cd client && npm run dev
```

### 生产模式
```bash
# 构建
npm run build

# 启动服务端
cd server && npm start

# 客户端使用 nginx/caddy 部署 dist/ 目录
```

### 访问地址
- 客户端: http://localhost:3000/uno/
- 服务端: http://localhost:3001
- 健康检查: http://localhost:3001/health

## 测试验证

### 快速验证
```bash
./test-all.sh
```

### 预期结果
```
✅ 后端构建通过
✅ CardManager 测试通过
✅ RoomManager 测试通过
✅ UnoGame 测试通过
✅ 前端构建通过
✅ 客户端单元测试通过
```

## 关键文件

| 文件 | 说明 |
|------|------|
| `docs/API_DESIGN_v2.0.md` | API设计文档 |
| `docs/ARCHITECTURE_REFACTOR.md` | 架构重构方案 |
| `docs/REFACTOR_LOG.md` | 重构日志 |
| `shared/actionApi.ts` | 共享类型定义 |

## 已知限制

1. 集成测试框架已创建，需补充具体场景
2. E2E测试需配置 Playwright 环境
3. +3/+5/+8惩罚卡pendingDraw设置需完善

## 回滚方案

如需回滚到v1.x:
```bash
git checkout main
npm run build
npm run deploy
```

## 技术支持

如有问题，请检查:
1. 端口3000和3001是否被占用
2. Node.js版本 >= 18
3. 依赖是否完整安装 (`npm install`)

---

**交付状态**: ✅ 已完成  
**验收状态**: 待验收  
**负责人**: Kimi
