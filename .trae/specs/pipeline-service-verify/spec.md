# spec-13 Pipeline 异步化与服务层解耦（验证 + 补全）

## 背景
项目后端已大幅完成 Pipeline 异步化和服务层解耦：
- ✅ `/verify` 已用 `asyncio.create_task` 后台执行（`api/routes.py:189`）
- ✅ WebSocket 推送进度（`pipeline/ws_manager.py` + `routes.py:80`）
- ✅ PipelineRun 数据模型持久化任务状态（`models.py`）
- ✅ `GET /pipeline/{id}` 查询状态端点（需确认）
- ✅ 服务层已抽离：`UserService`、`GuessService`、`MelonService`、`EvidenceService`
- ✅ `user_routes.py` 和 `melon_routes.py` 已全部通过 `Depends(get_xxx_service)` 调用
- ✅ 路由层零业务逻辑（仅参数校验 + 调用服务层）

本 spec 不重做已完成的工作，仅**验证现状 + 补全遗漏**。

## 任务范围

### 任务 1：验证 Pipeline 异步化完整性
- 确认 `/verify` 接口返回 `pipeline_id` + `pending` 状态（已实现）
- 确认 `GET /pipeline/{pipeline_id}` 端点存在且返回正确状态（若缺失则补）
- 确认 WebSocket 端点 `/ws/pipeline/{pipeline_id}` 存在且推送事件（已实现）
- 确认超时处理（120s）和失败处理正确（已实现）
- 确认 PipelineRun 模型字段完整：pipeline_id、status、input_content、error_message、duration_ms、event_log、node_results、created_at

### 任务 2：补全 routes.py 中遗漏的服务层抽离
- 检查 `api/routes.py` 中 `/verify`、`/moderate`、`/models/*` 端点
- `/moderate` 端点：若直接调用 `moderator_agent`，考虑是否需要 ModeratorService（若逻辑简单可保持现状）
- `/models/providers` 和 `/models/set-provider`：若直接操作 `llm_service`，保持现状（这是 LLM 配置，不是业务逻辑）
- `/comments/*` 端点（若有）：确认是否已抽离到 CommentService
- **原则**：只有当路由函数包含 > 5 行业务逻辑（数据库操作、积分计算、状态变更）时才需要抽离。简单的代理调用（如 `llm_service.list_available_providers()`）不算业务逻辑。

### 任务 3：确认服务层完整性
- 读取 `services/guess_service.py`、`services/melon_service.py`、`services/user_service.py`
- 确认每个 service：
  - 通过构造函数接收 `db: Session`（不自己创建 Session）
  - 方法返回 Pydantic 模型或 dict，不返回 SQLAlchemy ORM 对象（避免序列化问题）
  - 不包含路由层关注点（HTTP 状态码、异常处理）
- 若发现 service 直接抛 HTTPException，改为抛业务异常（ValueError 或自定义异常），由路由层捕获转换

### 任务 4：补全 PipelineRun 关联用户
- 检查 PipelineRun 模型是否有 `user_id` 字段
- 若无，新增 `user_id: Optional[int]` 字段（关联提交者，便于后台统计）
- `/verify` 接口改为可选认证：已登录用户记录 user_id，未登录用户 user_id=None
- 新增 `GET /admin/pipeline/list` 端点（管理员查看所有 Pipeline 运行记录，分页）

## 不做的事
- 不重写已完成的异步化逻辑
- 不引入 Celery（用户已决策用 asyncio）
- 不改 WebSocket 协议
- 不改服务层已正确的方法签名
- 不做异步 SQLAlchemy 改造（阶段 2 预留）

## 验收
- `GET /pipeline/{id}` 返回正确的任务状态和结果
- WebSocket 连接能收到 PIPELINE_COMPLETE / PIPELINE_FAILED 事件
- 服务层方法不抛 HTTPException
- PipelineRun 有 user_id 字段（可选）
- `python -m py_compile` 通过
- 现有 pytest 测试全部通过
