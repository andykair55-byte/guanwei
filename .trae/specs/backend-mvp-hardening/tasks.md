# 观微后端 MVP 加固工程 - The Implementation Plan (Decomposed and Prioritized Task List)

## 任务执行原则
- **模块边界优先**: 严格遵守 API 路由层 / 服务层 / 数据模型层 / 管道管理层的分层边界
- **最小侵入**: 只改任务范围内的代码，不顺手优化、不重构无关逻辑
- **先验证后推进**: 每个任务完成后必须通过对应测试，才能进入下一个任务
- **向后兼容**: 所有 API 接口契约保持不变，前端零修改

## 任务依赖关系图

```
Task 1 (基础设施: requirements + 环境变量)
    ↓
Task 2 (PostgreSQL 强制切换 + 连接池调优)
    ↓
Task 3 (Redis 强制启用)
    ↓
Task 4 (SECRET_KEY 安全加固)
    ↓
Task 5 (登录接口限流)
    ↓
Task 6 (服务层重构: GuessService)  ← 核心，先做
    ↓
Task 7 (服务层重构: UserService)     ──┐
Task 8 (服务层重构: MelonService)    ──┤ 并行
    ↓                                 │
Task 9 (Pipeline 异步化)               │
    ↓                                 │
Task 10 (测试补齐: 单元测试)  ←───────┘
Task 11 (测试补齐: 集成测试)
```

---

## [x] Task 1: 依赖与环境变量基础配置
- **Priority**: high
- **Depends On**: None
- **Module Boundary**: 全局配置层，不涉及业务逻辑
- **Description**: 
  - 更新 requirements.txt，添加 redis、fastapi-limiter 依赖
  - 更新 .env.example，添加 DEV_MODE、Redis 配置说明
  - 统一环境变量读取方式
- **Do NOT**:
  - 不修改任何业务逻辑代码
  - 不新增配置项以外的环境变量
  - 不调整现有模块结构
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: requirements.txt 包含 redis 和 fastapi-limiter
  - `programmatic` TR-1.2: .env.example 包含 DEV_MODE 和完整的数据库/Redis 配置项
  - `human-judgement` TR-1.3: 环境变量命名一致，有明确注释说明
- **Files**:
  - Modify: `backend/requirements.txt`
  - Modify: `backend/.env.example`
- **Notes**: 此任务为后续所有任务的基础

---

## [x] Task 2: PostgreSQL 强制切换与连接池调优
- **Priority**: high
- **Depends On**: Task 1
- **Module Boundary**: 数据访问层（database.py），不涉及业务逻辑
- **Description**: 
  - 修改 database.py，生产环境禁止使用 SQLite
  - 调整连接池参数：pool_size=20, max_overflow=30, pool_recycle=1800
  - DEV_MODE=true 时允许使用 SQLite
  - 启动时检查数据库类型并日志记录
- **Do NOT**:
  - 不改 SQLAlchemy 同步模式（异步改造放阶段2）
  - 不改任何模型定义（models.py）
  - 不调整数据库 schema
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-2.1: 非 DEV_MODE 下配置 SQLite URL 启动失败
  - `programmatic` TR-2.2: 连接池参数正确设置（pool_size=20, max_overflow=30）
  - `programmatic` TR-2.3: DEV_MODE=true 时 SQLite 可正常使用
  - `human-judgement` TR-2.4: 错误信息清晰明确，指引用户配置 PostgreSQL
- **Files**:
  - Modify: `backend/database.py`
- **Notes**: 保持 SQLAlchemy 同步模式，不做异步改造

---

## [x] Task 3: Redis 缓存强制启用
- **Priority**: high
- **Depends On**: Task 2
- **Module Boundary**: 缓存服务层（services/cache.py），不侵入业务逻辑
- **Description**: 
  - 修改 cache.py，生产环境 Redis 不可用则启动失败
  - DEV_MODE=true 时允许降级（输出警告日志）
  - 确保缓存服务正确初始化并可被依赖注入
  - 验证现有缓存逻辑（瓜列表、用户积分、用户信息）可正常工作
- **Do NOT**:
  - 不新增缓存策略或缓存键
  - 不改业务代码中的缓存调用方式
  - 不引入 Redis 集群或高级特性
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-3.1: 非 DEV_MODE 下 Redis 不可用时启动失败
  - `programmatic` TR-3.2: DEV_MODE=true 时 Redis 不可用输出警告但不崩溃
  - `programmatic` TR-3.3: 缓存 set/get/delete 基本操作正常
  - `human-judgement` TR-3.4: 缓存键命名规范，有统一前缀
- **Files**:
  - Modify: `backend/services/cache.py`
- **Notes**: 现有缓存逻辑保持不变，只修改可用性检查逻辑

---

## [x] Task 4: SECRET_KEY 安全加固
- **Priority**: high
- **Depends On**: Task 1
- **Module Boundary**: 认证模块（auth.py），不涉及业务逻辑
- **Description**: 
  - 修改 auth.py，移除 SECRET_KEY 默认值
  - 生产环境未配置 SECRET_KEY 时抛出 RuntimeError
  - DEV_MODE=true 时使用开发环境默认值（输出警告）
  - 补充相关注释说明安全风险
- **Do NOT**:
  - 不改 JWT 有效期（维持7天，阶段2再评估）
  - 不加 Refresh Token 机制
  - 不改密码哈希算法
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: 非 DEV_MODE 下未配置 SECRET_KEY 启动失败
  - `programmatic` TR-4.2: DEV_MODE=true 时未配置 SECRET_KEY 使用默认值并输出警告
  - `programmatic` TR-4.3: JWT Token 生成和验证功能正常
  - `human-judgement` TR-4.4: 错误信息包含配置指引
- **Files**:
  - Modify: `backend/auth.py`
- **Notes**: JWT 有效期维持 7 天不变

---

## [x] Task 5: 登录接口速率限制
- **Priority**: high
- **Depends On**: Task 3, Task 4
- **Module Boundary**: API 路由层 + 安全中间件，不侵入业务逻辑
- **Description**: 
  - 集成 fastapi-limiter，使用 Redis 作为存储后端
  - 登录接口 60 秒内最多 5 次尝试
  - 超出限制返回 429 状态码和明确提示
  - 在 main.py 中初始化 limiter
- **Do NOT**:
  - 不对其他接口加限流（仅登录接口）
  - 不改登录业务逻辑
  - 不引入用户级别的限流（仅 IP 级别）
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: 连续调用登录接口 6 次，第 6 次返回 429
  - `programmatic` TR-5.2: 60 秒后限流重置，可再次调用
  - `programmatic` TR-5.3: 不同 IP 地址独立计数
  - `human-judgement` TR-5.4: 限流错误提示清晰友好
- **Files**:
  - Modify: `backend/main.py`（初始化 limiter）
  - Modify: `backend/api/user_routes.py`（登录接口加限流）
  - Modify: `backend/requirements.txt`（确认依赖）
- **Notes**: 仅对登录接口限流，其他接口暂不限流

---

## [x] Task 6: 服务层重构 - GuessService（猜瓜业务）
- **Priority**: high
- **Depends On**: Task 3
- **Module Boundary**: 业务服务层（services/guess_service.py），路由层只做参数校验和调用
- **Description**: 
  - 创建 services/guess_service.py
  - 将 melon_routes.py 中猜瓜相关的业务逻辑抽离到 GuessService
  - 包括：创建猜瓜记录、更新瓜统计、更新用户积分、处理佐证、段位计算
  - 路由层仅保留参数校验和服务调用
  - 保持 API 接口完全兼容
- **Do NOT**:
  - 不改 API 返回格式
  - 不改数据模型（models.py）
  - 不新增业务功能（只做代码搬迁和组织）
  - 不改缓存调用方式
- **Acceptance Criteria Addressed**: AC-6, AC-8
- **Test Requirements**:
  - `programmatic` TR-6.1: 猜瓜接口功能完全正常（与重构前行为一致）
  - `programmatic` TR-6.2: 重复猜瓜返回 400 错误
  - `programmatic` TR-6.3: 猜对后积分正确增加
  - `human-judgement` TR-6.4: 路由层代码不直接操作数据库，仅调用服务层
  - `human-judgement` TR-6.5: GuessService 方法职责清晰，命名规范
- **Files**:
  - Create: `backend/services/guess_service.py`
  - Modify: `backend/api/melon_routes.py`
- **Notes**: 这是服务层重构的核心任务，工作量最大。先做此任务，UserService 和 MelonService 可并行

---

## [x] Task 7: 服务层重构 - UserService（用户业务）
- **Priority**: medium
- **Depends On**: Task 6
- **Module Boundary**: 业务服务层（services/user_service.py），与 GuessService 平级
- **Description**: 
  - 创建 services/user_service.py
  - 将 user_routes.py 中用户相关业务逻辑抽离到 UserService
  - 包括：用户注册、每日签到、积分记录查询、个人统计
  - 路由层仅保留参数校验和服务调用
  - 保持 API 接口完全兼容
- **Do NOT**:
  - 不改 API 返回格式
  - 不改数据模型（models.py）
  - 不新增业务功能
  - 不改认证逻辑（auth.py 保持独立）
- **Acceptance Criteria Addressed**: AC-6, AC-8
- **Test Requirements**:
  - `programmatic` TR-7.1: 注册、登录、签到功能正常
  - `programmatic` TR-7.2: 重复签到返回 400 错误
  - `programmatic` TR-7.3: 积分记录分页查询正常
  - `human-judgement` TR-7.4: 路由层代码不直接操作数据库
- **Files**:
  - Create: `backend/services/user_service.py`
  - Modify: `backend/api/user_routes.py`
- **Notes**: 参考 GuessService 的模式。可与 Task 8 并行执行

---

## [x] Task 8: 服务层重构 - MelonService（瓜田业务）
- **Priority**: medium
- **Depends On**: Task 6
- **Module Boundary**: 业务服务层（services/melon_service.py），与 GuessService 平级
- **Description**: 
  - 创建 services/melon_service.py
  - 将 melon_routes.py 中瓜的 CRUD、佐证、投票等逻辑抽离
  - 包括：创建瓜、瓜列表查询、详情查询、佐证投票、报告查询
  - 路由层仅保留参数校验和服务调用
  - 保持 API 接口完全兼容
- **Do NOT**:
  - 不改 API 返回格式
  - 不改数据模型（models.py）
  - 不新增业务功能
  - 不改 EvidenceService（已有服务保持独立）
- **Acceptance Criteria Addressed**: AC-6, AC-8
- **Test Requirements**:
  - `programmatic` TR-8.1: 瓜列表、详情、创建功能正常
  - `programmatic` TR-8.2: 佐证点赞/踩功能正常
  - `programmatic` TR-8.3: 报告查询功能正常
  - `human-judgement` TR-8.4: 路由层代码不直接操作数据库
- **Files**:
  - Create: `backend/services/melon_service.py`
  - Modify: `backend/api/melon_routes.py`
- **Notes**: Task 6 已先修改 melon_routes.py 抽离猜瓜逻辑，此任务继续抽离瓜的 CRUD 和佐证逻辑。可与 Task 7 并行

---

## [x] Task 9: Pipeline 长任务异步化
- **Priority**: high
- **Depends On**: Task 3, Task 6
- **Module Boundary**: API 路由层 + Pipeline 层，通过 PipelineRun 模型解耦，不侵入业务服务层
- **Description**: 
  - 修改 /verify 接口，提交任务后立即返回 pipeline_id 和 pending 状态
  - 使用 asyncio.create_task 后台执行 Pipeline
  - 通过 WebSocket 推送执行进度事件和最终结果
  - 确认 PipelineRun 数据模型字段完整性（已存在）
  - 新增查询任务状态的 GET /pipeline/{pipeline_id} 端点
  - 事件回调通过 ws_manager 广播
- **Do NOT**:
  - 不改 Pipeline 内部节点逻辑（moderation/collector/verifier/analyzer）
  - 不改 Commander 容错内核
  - 不引入 Celery 或分布式任务队列
  - 不改 WebSocket 协议
- **Acceptance Criteria Addressed**: AC-3, AC-8
- **Test Requirements**:
  - `programmatic` TR-9.1: POST /verify 立即返回，包含 pipeline_id 和 status=pending
  - `programmatic` TR-9.2: GET /pipeline/{id} 可查询任务状态
  - `programmatic` TR-9.3: Pipeline 执行完成后状态更新为 success/failed
  - `programmatic` TR-9.4: WebSocket 能收到 NODE_START/NODE_SUCCESS 等事件
  - `human-judgement` TR-9.5: 异步任务异常处理完善，不会导致服务崩溃
- **Files**:
  - Modify: `backend/api/routes.py`（verify 接口改造 + 新增查询端点）
  - Modify: `backend/pipeline/orchestrator.py`（支持异步执行）
  - Modify: `backend/pipeline/ws_manager.py`（确认广播逻辑）
  - Modify: `backend/models.py`（确认 PipelineRun 模型）
- **Notes**: PipelineRun 模型已存在，需确认字段是否满足需求。Pipeline 层与业务服务层保持独立

---

## [x] Task 10: 测试补齐 - 单元测试
- **Priority**: medium
- **Depends On**: Task 6, Task 7
- **Module Boundary**: 测试层，不修改业务代码
- **Description**: 
  - 创建 tests/unit/ 目录
  - test_rank_calc.py：段位计算单元测试（边界值、各种正确率组合）
  - test_points_calc.py：积分计算单元测试（各种积分规则）
  - test_evidence_credibility.py：证据可信度计算单元测试
  - 创建 tests/fixtures/ 目录和测试数据工厂
- **Do NOT**:
  - 不改业务代码（测试发现 bug 单独提）
  - 不写性能测试（放阶段2）
  - 不追求 100% 覆盖率，先覆盖核心路径
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `programmatic` TR-10.1: 段位计算边界测试通过（0次、1次、临界值）
  - `programmatic` TR-10.2: 积分计算正确（注册、签到、猜对、佐证、被点赞）
  - `programmatic` TR-10.3: 测试数据工厂可生成用户、瓜、猜瓜等测试数据
  - `human-judgement` TR-10.4: 测试用例命名清晰，覆盖主要场景和边界
- **Files**:
  - Create: `backend/tests/unit/test_rank_calc.py`
  - Create: `backend/tests/unit/test_points_calc.py`
  - Create: `backend/tests/unit/test_evidence_credibility.py`
  - Create: `backend/tests/fixtures/user_factory.py`
  - Create: `backend/tests/fixtures/melon_factory.py`
- **Notes**: 单元测试不依赖数据库，可独立运行。可与 Task 11 部分并行

---

## [x] Task 11: 测试补齐 - 集成测试
- **Priority**: high
- **Depends On**: Task 9, Task 10
- **Module Boundary**: 测试层，验证模块间协作正确性
- **Description**: 
  - 创建 tests/integration/ 目录
  - test_pipeline_flow.py：Pipeline 完整流程测试（最高优先级）
  - test_guess_flow.py：猜瓜完整流程测试（创建瓜→猜瓜→佐证→开奖）
  - test_user_flow.py：用户注册登录签到完整流程
  - 配置 pytest 使用测试数据库
- **Do NOT**:
  - 不改业务代码（测试发现 bug 单独提）
  - 不测前端集成（前端测试独立）
  - Pipeline 测试使用 Mock LLM，不产生真实费用
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-11.1: Pipeline 完整流程测试通过（moderation→collector→verifier→analyzer）
  - `programmatic` TR-11.2: 猜瓜完整流程测试通过（含积分、段位更新）
  - `programmatic` TR-11.3: 用户注册→登录→签到流程测试通过
  - `programmatic` TR-11.4: 边界场景：重复猜瓜、未登录猜瓜、不存在的瓜
  - `human-judgement` TR-11.5: 测试用例组织清晰，setup/teardown 规范
- **Files**:
  - Create: `backend/tests/integration/test_pipeline_flow.py`
  - Create: `backend/tests/integration/test_guess_flow.py`
  - Create: `backend/tests/integration/test_user_flow.py`
  - Create: `backend/tests/conftest.py`（测试配置）
- **Notes**: Pipeline 测试使用 Mock LLM 调用以避免产生真实费用。此任务为最终验收任务

---

## 任务优先级汇总

| 优先级 | 任务 | 预计工时 |
|--------|------|----------|
| P0 | Task 2: PostgreSQL 强制切换 | 0.5h |
| P0 | Task 3: Redis 强制启用 | 0.5h |
| P0 | Task 4: SECRET_KEY 加固 | 0.5h |
| P0 | Task 5: 登录限流 | 1h |
| P0 | Task 6: GuessService 重构 | 3h |
| P0 | Task 9: Pipeline 异步化 | 3h |
| P0 | Task 11: 集成测试 | 4h |
| P1 | Task 1: 依赖与环境变量 | 0.5h |
| P1 | Task 7: UserService 重构 | 2h |
| P1 | Task 8: MelonService 重构 | 2h |
| P1 | Task 10: 单元测试 | 2h |

**总预计工时：约 19 小时**
