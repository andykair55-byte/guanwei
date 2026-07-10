# Mock 数据替换评估报告

## 1. 评估概述

当前项目所有接口均通过 `api.ts` 的 `withFallback` 机制支持 Mock 数据自动降级。随着项目进入验证期，需要评估哪些接口必须替换为真实后端实现。

### 评估维度

| 维度 | 评估标准 |
|------|---------|
| **用户数据一致性** | 接口返回数据是否需要跨设备/会话保持一致 |
| **业务逻辑完整性** | 接口是否包含复杂的业务规则计算 |
| **实时性要求** | 接口数据是否需要实时更新 |
| **状态持久化** | 接口操作是否需要持久化到数据库 |
| **并发安全性** | 多用户同时操作是否可能产生冲突 |

---

## 2. 接口评估清单

### 2.1 用户相关接口

| 接口 | 方法 | 当前状态 | 优先级 | 替换理由 |
|------|------|---------|--------|---------|
| `/users/login` | POST | ✅ Mock | **P0** | 用户认证必须真实，否则无法区分不同用户 |
| `/users/register` | POST | ✅ Mock | **P0** | 新用户注册需要写入数据库 |
| `/users/me` | GET | ✅ Mock | **P0** | 用户信息需要跨会话保持一致 |
| `/users/me/stats` | GET | ✅ Mock | **P0** | 用户统计数据需要实时计算 |
| `/users/me/points` | GET | ✅ Mock | **P0** | 积分记录需要持久化 |
| `/users/me/daily-login` | POST | ✅ Mock | **P0** | 每日登录奖励需要去重判断 |

### 2.2 瓜田相关接口

| 接口 | 方法 | 当前状态 | 优先级 | 替换理由 |
|------|------|---------|--------|---------|
| `/melons` | GET | ✅ Mock | **P0** | 瓜列表需要统一管理，所有用户看到相同内容 |
| `/melons` | POST | ✅ Mock | **P1** | 发布新瓜需要持久化，其他用户可见 |
| `/melons/:id` | GET | ✅ Mock | **P0** | 瓜详情需要实时数据 |
| `/melons/:id/guess` | POST | ✅ Mock | **P0** | 猜瓜记录需要持久化，影响积分和段位 |
| `/melons/:id/my-guess` | GET | ✅ Mock | **P0** | 用户猜瓜历史需要查询 |
| `/melons/:id/evidences` | GET | ✅ Mock | **P0** | 佐证数据需要其他用户可见 |
| `/melons/evidences/:id/upvote` | POST | ✅ Mock | **P1** | 点赞计数需要持久化 |
| `/melons/evidences/:id/downvote` | POST | ✅ Mock | **P1** | 踩计数需要持久化 |
| `/melons/:id/report` | GET | ✅ Mock | **P0** | AI报告需要缓存，避免重复计算 |
| `/melons/:id/like` | POST | ✅ Mock | **P1** | 点赞计数需要持久化 |
| `/melons/:id/comments` | GET | ✅ Mock | **P1** | 评论需要持久化，其他用户可见 |
| `/melons/:id/comments` | POST | ✅ Mock | **P1** | 发表评论需要持久化 |
| `/comments/:id/like` | POST | ✅ Mock | **P2** | 评论点赞计数 |

### 2.3 求证相关接口

| 接口 | 方法 | 当前状态 | 优先级 | 替换理由 |
|------|------|---------|--------|---------|
| `/verify` | POST | ✅ Mock | **P0** | AI求证需要调用真实LLM，避免假数据 |
| `/moderate` | POST | ✅ Mock | **P0** | 内容审核需要真实AI判断 |

### 2.4 模型管理接口

| 接口 | 方法 | 当前状态 | 优先级 | 替换理由 |
|------|------|---------|--------|---------|
| `/models/providers` | GET | ✅ Mock | **P2** | 模型列表可以配置化 |
| `/models/set-provider` | POST | ✅ Mock | **P2** | 模型切换可以配置化 |

---

## 3. 优先级定义

| 优先级 | 定义 | 要求 |
|--------|------|------|
| **P0** | 核心功能 | 必须在验证期前完成替换，否则影响用户体验 |
| **P1** | 重要功能 | 验证期内完成替换，提升用户体验 |
| **P2** | 辅助功能 | 可延迟替换，不影响核心业务 |

### P0 接口汇总（10个）

| 接口 | 说明 |
|------|------|
| `/users/login` | 用户登录 |
| `/users/register` | 用户注册 |
| `/users/me` | 获取当前用户 |
| `/users/me/stats` | 获取用户统计 |
| `/users/me/points` | 获取积分记录 |
| `/users/me/daily-login` | 每日登录奖励 |
| `/melons` | 获取瓜列表 |
| `/melons/:id` | 获取瓜详情 |
| `/melons/:id/guess` | 提交判断 |
| `/melons/:id/my-guess` | 获取我的判断 |
| `/melons/:id/evidences` | 获取佐证列表 |
| `/melons/:id/report` | 获取实锤报告 |
| `/verify` | AI一键求证 |
| `/moderate` | 内容审核 |

---

## 4. 替换策略

### 4.1 分阶段替换

```
阶段 1（核心认证）：用户登录/注册/信息
阶段 2（核心玩法）：瓜田列表/详情/猜瓜/佐证
阶段 3（辅助功能）：点赞/评论/报告缓存
阶段 4（高级功能）：模型管理/社区帖子
```

### 4.2 替换顺序建议

| 顺序 | 阶段 | 接口数 | 预计耗时 |
|------|------|--------|---------|
| 1 | 用户认证 | 6 | 1-2天 |
| 2 | 瓜田核心 | 6 | 2-3天 |
| 3 | 互动功能 | 5 | 2天 |
| 4 | 辅助功能 | 2 | 1天 |

### 4.3 Mock 数据保留策略

即使替换为真实后端，建议保留以下 Mock 数据场景：

| 场景 | 说明 |
|------|------|
| **开发测试** | 本地开发时可快速验证功能 |
| **后端故障降级** | 后端不可用时自动切换，保证服务可用 |
| **演示环境** | 无真实用户时展示产品功能 |
| **性能测试** | 模拟大量数据进行性能测试 |

---

## 5. 后端实现状态检查

### 5.1 已实现的后端接口

| 接口 | 状态 | 文件 |
|------|------|------|
| `/users/login` | ✅ | `api/user_routes.py` |
| `/users/register` | ✅ | `api/user_routes.py` |
| `/users/me` | ✅ | `api/user_routes.py` |
| `/users/me/stats` | ✅ | `api/user_routes.py` |
| `/users/me/points` | ✅ | `api/user_routes.py` |
| `/users/me/daily-login` | ✅ | `api/user_routes.py` |
| `/melons` | ✅ | `api/melon_routes.py` |
| `/melons/:id` | ✅ | `api/melon_routes.py` |
| `/melons/:id/guess` | ✅ | `api/melon_routes.py` |
| `/melons/:id/my-guess` | ✅ | `api/melon_routes.py` |
| `/melons/:id/evidences` | ✅ | `api/melon_routes.py` |
| `/melons/evidences/:id/upvote` | ✅ | `api/melon_routes.py` |
| `/melons/evidences/:id/downvote` | ✅ | `api/melon_routes.py` |
| `/melons/:id/report` | ✅ | `api/melon_routes.py` |
| `/melons/:id/like` | ✅ | `api/melon_routes.py` |
| `/melons/:id/comments` | ✅ | `api/melon_routes.py` |
| `/melons/:id/comments` (POST) | ✅ | `api/melon_routes.py` |
| `/comments/:id/like` | ✅ | `api/melon_routes.py` |
| `/verify` | ✅ | `api/routes.py` |
| `/moderate` | ✅ | `api/routes.py` |
| `/models/providers` | ✅ | `api/routes.py` |
| `/models/set-provider` | ✅ | `api/routes.py` |

### 5.2 数据库模型状态

| 模型 | 状态 | 文件 |
|------|------|------|
| User | ✅ | `models.py` |
| Melon | ✅ | `models.py` |
| Guess | ✅ | `models.py` |
| Evidence | ✅ | `models.py` |
| Report | ✅ | `models.py` |
| PointsRecord | ✅ | `models.py` |

### 5.3 结论

**后端接口已全部实现！** 当前问题仅在于：
1. 前端默认使用 Mock 数据（未配置 `VITE_API_BASE_URL`）
2. 数据库为 SQLite，数据未持久化到共享存储
3. 缺少真实 LLM API 调用（LLM 服务已实现多模型支持，但需配置 API Key）

---

## 6. 验证期前必须完成的工作

### 6.1 配置调整

| 项 | 当前状态 | 目标状态 |
|----|---------|---------|
| `VITE_API_BASE_URL` | 未配置 | 配置为后端地址 |
| 数据库 | SQLite 文件 | PostgreSQL |
| LLM API Key | 未配置 | 配置至少一个模型 Key |
| JWT Secret | 默认值 | 生产环境随机值 |

### 6.2 数据迁移

| 步骤 | 说明 |
|------|------|
| 1 | SQLite 数据导出 |
| 2 | PostgreSQL 数据库创建 |
| 3 | 数据导入 |
| 4 | 后端连接字符串修改 |

### 6.3 验证清单

| 项 | 验证方法 |
|----|---------|
| 用户登录 | 使用不同账号登录，验证数据隔离 |
| 猜瓜记录 | 同一用户不同设备查看猜瓜历史 |
| 积分变动 | 登录、猜瓜后验证积分变化 |
| 佐证点赞 | 多用户点赞同一佐证，验证计数正确 |
| AI求证 | 提交真实内容，验证返回真实分析结果 |

---

## 7. 风险评估

### 7.1 技术风险

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| PostgreSQL 性能不足 | 低 | 500-1000 用户单服务器足够 |
| LLM 调用成本过高 | 中 | 配置成本较低的模型（如 DeepSeek） |
| 并发写入冲突 | 低 | 使用数据库事务保证一致性 |
| JWT 安全漏洞 | 中 | 使用强密钥，设置合理过期时间 |

### 7.2 业务风险

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 用户数据丢失 | 高 | 每日数据库备份 |
| API 接口变更 | 中 | 保持向后兼容，版本管理 |
| Mock 数据残留 | 低 | 验证期前全面测试真实接口 |

---

**文档版本**: v1.0  
**生成时间**: 2026-07-02  
**适用阶段**: MVP → 验证期过渡