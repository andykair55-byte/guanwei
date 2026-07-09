# 观微后端 MVP 加固工程 - Verification Checklist

## 架构原则验证（全局）

- [x] **模块解耦**: API 路由层 / 业务服务层 / 数据模型层 / 管道管理层 / 缓存服务层边界清晰，无跨层直接依赖内部实现
- [x] **单一职责**: 每个服务/模块只负责一个业务领域，跨领域交互通过接口调用
- [x] **向后兼容**: 所有现有 API 接口契约保持不变，前端零修改即可运行
- [x] **最小侵入**: 改造只触及必要代码，无顺手优化或无关重构
- [x] **可验证**: 每一项改造都有对应的测试用例或验证方法

---

## Task 1: 依赖与环境变量基础配置

- [x] requirements.txt 包含 redis 和 fastapi-limiter 依赖
- [x] .env.example 包含 DEV_MODE 配置项及说明
- [x] .env.example 包含完整的数据库配置项（DATABASE_URL）
- [x] .env.example 包含完整的 Redis 配置项（REDIS_URL）
- [x] .env.example 包含 SECRET_KEY 配置项及安全提示
- [x] 环境变量命名一致，有明确注释说明

---

## Task 2: PostgreSQL 强制切换与连接池调优

- [x] 非 DEV_MODE 下配置 SQLite URL 启动失败并抛出明确错误
- [x] 错误信息包含配置 PostgreSQL 的指引
- [x] 连接池参数正确：pool_size=20, max_overflow=30, pool_recycle=1800, pool_pre_ping=True
- [x] DEV_MODE=true 时 SQLite 可正常使用
- [x] 启动时日志记录当前使用的数据库类型
- [x] SQLAlchemy 仍为同步模式（未做异步改造）
- [x] 数据模型（models.py）未被修改

---

## Task 3: Redis 缓存强制启用

- [x] 非 DEV_MODE 下 Redis 不可用时启动失败
- [x] 错误信息包含 Redis 配置指引
- [x] DEV_MODE=true 时 Redis 不可用输出警告但不崩溃
- [x] 缓存 set/get/delete 基本操作正常
- [x] 现有缓存键（瓜列表、用户积分、用户信息、段位配置）均可正常工作
- [x] 缓存键命名规范，有统一前缀（jianwei: 或类似）
- [x] 业务代码中的缓存调用方式未改变

---

## Task 4: SECRET_KEY 安全加固

- [x] 非 DEV_MODE 下未配置 SECRET_KEY 启动失败并抛出 RuntimeError
- [x] 错误信息包含 SECRET_KEY 配置指引
- [x] DEV_MODE=true 时未配置 SECRET_KEY 使用默认值并输出警告
- [x] JWT Token 生成功能正常
- [x] JWT Token 验证功能正常
- [x] JWT 有效期仍为 7 天（未缩短）
- [x] 未引入 Refresh Token 机制
- [x] 密码哈希算法仍为 bcrypt

---

## Task 5: 登录接口速率限制

- [x] fastapi-limiter 已集成并使用 Redis 作为存储后端
- [x] 登录接口 60 秒内最多 5 次尝试
- [x] 第 6 次调用返回 429 Too Many Requests
- [x] 限流错误提示清晰友好
- [x] 60 秒后限流重置，可再次调用
- [x] 不同 IP 地址独立计数
- [x] 仅登录接口有限流，其他接口未加
- [x] 登录业务逻辑未被修改

---

## Task 6: 服务层重构 - GuessService（猜瓜业务）

- [x] services/guess_service.py 文件已创建
- [x] GuessService 类封装了猜瓜完整业务流程
- [x] 路由层（melon_routes.py）不直接操作数据库，仅调用服务层
- [x] 路由层仅保留参数校验和服务调用
- [x] 猜瓜接口功能与重构前行为完全一致
- [x] 重复猜瓜返回 400 错误
- [x] 猜对后积分正确增加
- [x] 段位计算逻辑正确
- [x] API 返回格式未改变
- [x] 数据模型（models.py）未被修改
- [x] 缓存调用方式未改变

---

## Task 7: 服务层重构 - UserService（用户业务）

- [x] services/user_service.py 文件已创建
- [x] UserService 类封装了用户相关业务逻辑
- [x] 路由层（user_routes.py）不直接操作数据库，仅调用服务层
- [x] 用户注册功能正常
- [x] 用户登录功能正常
- [x] 每日签到功能正常
- [x] 重复签到返回 400 错误
- [x] 积分记录分页查询正常
- [x] 个人统计功能正常
- [x] API 返回格式未改变
- [x] 认证逻辑（auth.py）保持独立未被修改

---

## Task 8: 服务层重构 - MelonService（瓜田业务）

- [x] services/melon_service.py 文件已创建
- [x] MelonService 类封装了瓜的 CRUD、佐证、投票等逻辑
- [x] 路由层（melon_routes.py）不直接操作数据库，仅调用服务层
- [x] 瓜列表查询功能正常
- [x] 瓜详情查询功能正常
- [x] 创建瓜功能正常
- [x] 佐证点赞/踩功能正常
- [x] 报告查询功能正常
- [x] API 返回格式未改变
- [x] EvidenceService 保持独立未被修改

---

## Task 9: Pipeline 长任务异步化

- [x] POST /verify 立即返回，包含 pipeline_id 和 status=pending
- [x] Pipeline 在后台通过 asyncio.create_task 异步执行
- [x] GET /pipeline/{pipeline_id} 可查询任务状态
- [x] Pipeline 执行完成后状态更新为 success 或 failed
- [x] PipelineRun 表记录完整的执行信息
- [x] WebSocket 能收到 NODE_START / NODE_SUCCESS / NODE_FAILURE 等事件
- [x] WebSocket 能收到最终结果事件
- [x] 异步任务异常处理完善，不会导致服务崩溃
- [x] Pipeline 内部节点逻辑（moderation/collector/verifier/analyzer）未被修改
- [x] Commander 容错内核未被修改
- [x] 未引入 Celery 或分布式任务队列

---

## Task 10: 测试补齐 - 单元测试

- [x] tests/unit/ 目录已创建
- [x] test_rank_calc.py：段位计算单元测试覆盖边界值
- [x] test_points_calc.py：积分计算单元测试覆盖主要规则
- [x] test_evidence_credibility.py：证据可信度计算单元测试
- [x] tests/fixtures/ 目录已创建
- [x] user_factory.py：可生成用户测试数据
- [x] melon_factory.py：可生成瓜、猜瓜等测试数据
- [x] 单元测试不依赖数据库，可独立运行
- [x] 测试用例命名清晰，覆盖主要场景和边界
- [x] 单元测试全部通过

---

## Task 11: 测试补齐 - 集成测试

- [x] tests/integration/ 目录已创建
- [x] test_pipeline_flow.py：Pipeline 完整流程测试通过
- [x] test_guess_flow.py：猜瓜完整流程测试通过（含积分、段位更新）
- [x] test_user_flow.py：用户注册→登录→签到流程测试通过
- [x] 边界场景测试：重复猜瓜、未登录猜瓜、不存在的瓜
- [x] tests/conftest.py：测试配置正确
- [x] Pipeline 测试使用 Mock LLM，不产生真实费用
- [x] 测试使用独立测试数据库，不影响开发数据
- [x] 所有集成测试全部通过
- [x] pytest 整体通过率 100%

---

## 最终验收（整体）

- [x] `pytest backend/tests/` 全部通过
- [x] `uvicorn main:app` 可正常启动（DEV_MODE=true + SQLite）
- [x] `uvicorn main:app` 可正常启动（PostgreSQL + Redis）
- [x] 所有 API 接口返回格式与改造前一致（除 /verify 异步改造需单独确认）
- [x] 服务层与路由层边界清晰，代码结构干净
- [x] Pipeline 层与业务服务层解耦，独立可演进
- [x] 缓存服务通过统一接口调用，无直接 Redis 操作散落在业务代码中
- [x] 认证模块独立，未与业务逻辑耦合
