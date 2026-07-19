# spec-11 LLM 多资源矩阵（多 key 轮询 + 熔断器 + 健康检查 + 热替换接力）

## 背景
当前 `backend/services/llm.py` 已支持 11 家 provider 和主备顺序降级，但存在四个生产级硬伤：

1. **不支持多 api-key 轮询**：一个 provider 只能配一个 key。用户有多个 rpm30 的 Groq key，当前用不上。
2. **没有熔断器**：故障 provider 每次调用都被尝试，浪费请求 + 拖慢响应。
3. **没有健康检查**：provider 挂了不会自动标记，下次调用仍然先撞墙。
4. **没有速率感知**：不感知 rpm/tpm 限制，容易触发 429，触发后又立即重试反而加重限流。

用户场景：500-1000 DAU，单 provider rpm30 不够用，需要把多个 rpm30 的 key 池化到 90/120 rpm。

## 任务范围

### 任务 1：多 api-key 池轮询
- 修改 `backend/.env.example`：所有 `*_API_KEY` 注释说明支持逗号分隔多 key
  - 示例：`GROQ_API_KEY=key1,key2,key3`
- 修改 `backend/services/llm.py`：
  - 新增 `KeyPool` 类（dataclass）：
    - 字段：`keys: list[str]`、`rpm_limit: int`（可选，默认 0 表示不限）、`last_used_idx: int`、`call_timestamps: deque[float]`（滑动窗口记录调用时间）
    - 方法：`next_key() -> str`（轮询 + 滑动窗口限流，若所有 key 都达 rpm 上限则阻塞等待最短时间）
  - `_get_client` 改造：
    - 一个 provider 不再只有一个 AsyncOpenAI，而是 `dict[str, AsyncOpenAI]`（按 key 缓存客户端）
    - 每次调用从 KeyPool 取下一个可用 key
  - 新增配置：`*_API_KEY_RPM` 环境变量（可选，如 `GROQ_API_KEY_RPM=30`，逗号分隔对应每个 key 的 rpm 限制；单个数字表示所有 key 共用）
  - `list_available_providers` 返回值增加：`key_count: int`、`total_rpm: int`

### 任务 2：熔断器（Circuit Breaker）
- 新增 `backend/services/circuit_breaker.py`：
  - `CircuitBreaker` 类（per provider per key 维度）
  - 状态：`CLOSED`（正常）/ `OPEN`（熔断，拒绝请求）/ `HALF_OPEN`（半开，允许探测）
  - 参数：
    - `failure_threshold: int = 3`（连续失败 3 次触发熔断）
    - `recovery_timeout: float = 60.0`（60s 后进入 HALF_OPEN）
    - `half_open_max_calls: int = 1`（半开状态最多探测 1 次）
  - 方法：
    - `can_call(key: str) -> bool`：CLOSED 直接放行；OPEN 检查是否到 recovery_timeout；HALF_OPEN 限制并发
    - `record_success(key: str)`：重置计数，HALF_OPEN 转 CLOSED
    - `record_failure(key: str)`：累加失败计数，达阈值转 OPEN
  - 线程安全：用 `asyncio.Lock` 保护状态变更
- `llm.py` 集成：
  - `_generate_with_provider` 内部调用前先 `cb.can_call(key)`，拒绝则跳过此 key
  - 成功后 `cb.record_success(key)`，失败后 `cb.record_failure(key)`
  - 失败包括：网络错误、5xx、429（429 特殊处理：直接熔断此 key，因为是 rpm 触顶）

### 任务 3：健康检查（后台探测）
- `LLMService` 新增 `start_health_check()` 方法：
  - 启动一个 asyncio 后台任务，每 5 分钟 ping 一次所有已配置 provider
  - ping 方式：发送一个极简请求（`max_tokens=1`，prompt="1"）
  - 结果更新到 `provider_health: dict[str, dict]`：
    - `status: "healthy" | "degraded" | "down"`
    - `last_check: float`（时间戳）
    - `latency_ms: int`
  - 失败的 provider 标记 `down`，熔断器直接走 OPEN 逻辑
- `main.py` startup 事件中调用 `llm_service.start_health_check()`
- 新增管理端点：`GET /api/v1/admin/llm/health` 返回所有 provider 健康状态（仅 admin）
- 健康检查失败不阻塞主流程，只记录日志

### 任务 4：热替换接力（调用层整合）
- `_generate_with_provider` 改造为按"provider × key"二维矩阵遍历：
  ```
  for provider in [primary] + fallback:
      pool = get_key_pool(provider)
      for key in pool.available_keys:  # 跳过熔断中的 key
          try:
              result = await call(provider, key, ...)
              cb.record_success(key)
              return result
          except 429:
              cb.record_failure(key)  # 触发熔断
              continue  # 换下一个 key
          except (NetworkError, 5xx):
              cb.record_failure(key)
              continue  # 换下一个 key
          except ValueError:
              break  # 配置错误，换 provider
  raise RuntimeError("所有 provider × key 均不可用")
  ```
- **对调用方完全透明**：`analyzer.py`、`verifier.py`、`moderator.py`、`commander.py`、`routes.py` 都不需要改
- 新增日志：每次切换 provider/key 时记录 INFO 级日志，便于排查

### 任务 5：配置与文档
- 更新 `backend/.env.example`：
  - 所有 `*_API_KEY` 注释加 `# 支持逗号分隔多 key，例如：key1,key2,key3`
  - 新增 `*_API_KEY_RPM` 配置项（每个 provider 对应一个）
  - 新增 `LLM_HEALTH_CHECK_INTERVAL=300`（健康检查间隔，秒）
  - 新增 `LLM_CIRCUIT_FAILURE_THRESHOLD=3`
  - 新增 `LLM_CIRCUIT_RECOVERY_TIMEOUT=60`
- 更新 `backend/requirements.txt`：无新增依赖（已有 redis 可作为熔断器分布式存储的可选项，但 MVP 用内存即可）

## 不做的事
- 不修改调用方代码（analyzer/verifier/moderator/commander/routes 的 `llm_service.generate()` 调用方式不变）
- 不引入 Celery 或外部任务队列
- 不做分布式熔断器（仅内存级，单实例够用；多实例部署时再上 Redis）
- 不做 token 计数和费用监控（阶段 2 预留）
- 不做流式响应（streaming）改造
- 不改 LLM_PROVIDER 主备配置方式（仍用环境变量）

## 验收
- **多 key 轮询**：配置 `GROQ_API_KEY=key1,key2,key3`，连续调用 3 次，3 个 key 各被使用 1 次（通过日志验证）
- **rpm 限流**：配置 `GROQ_API_KEY_RPM=30`，60 秒内连续调用 35 次，第 31-35 次自动等待（不报错）
- **熔断器**：手动让某个 key 返回 429，连续 3 次后此 key 被熔断 60 秒，期间调用直接跳过此 key
- **热替换**：主 provider 全部 key 熔断后，自动切到 fallback provider，调用方无感知
- **健康检查**：`GET /api/v1/admin/llm/health` 返回所有 provider 状态（healthy/degraded/down + latency）
- **向后兼容**：单 key 配置（`GROQ_API_KEY=single_key`）仍然正常工作
- **启动**：`cd backend && python main.py` 能正常启动（DEV_MODE=true），无报错
- **基础调用**：`llm_service.generate("hello")` 能正常返回（前提是至少一个 provider 配置了真实 key）
- `pytest backend/tests/` 现有测试全部通过

## 关键文件
- `backend/services/llm.py`（主要改造）
- `backend/services/circuit_breaker.py`（新建）
- `backend/.env.example`（配置文档）
- `backend/main.py`（启动健康检查）
- `backend/api/admin_routes.py`（新增 /admin/llm/health 端点）
