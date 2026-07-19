# Verify Pipeline 生产加固设计文档

**日期**: 2026-07-18

---

## 1. 背景

### 1.1 来源

第三方架构审查报告指出：当前 verify pipeline 在 500 用户并发下无法稳定运行，核心问题包括 MemorySaver 内存存储、asyncio.create_task 无队列、/verify 无幂等键、collector DuckDuckGo 不稳定。

### 1.2 核查结果（全部属实）

| 问题 | 位置 | 严重度 |
|---|---|---|
| MemorySaver 内存存储 | [orchestrator.py:39](file:///d:/code/code/program/4-观微/backend/pipeline/orchestrator.py#L39) | 🟡 中（见 §1.3） |
| asyncio.create_task 无限流 | [routes.py:197](file:///d:/code/code/program/4-观微/backend/api/routes.py#L197) | 🔴 高 |
| /verify 无幂等键 | routes.py:169-210 | 🔴 高 |
| 僵尸 running 无兜底 | PipelineRun.status 卡 running | 🔴 高 |
| collector DuckDuckGo 不稳 | [collector.py:54-56](file:///d:/code/code/program/4-观微/backend/agents/collector.py#L54) | 🟡 中 |

### 1.3 MemorySaver 风险降级

经代码核查，`MemorySaver` 仅用于满足 `graph.compile(checkpointer=...)` 的签名要求，实际运行中：

- `thread_id = str(uuid.uuid4())`（[orchestrator.py:234](file:///d:/code/code/program/4-观微/backend/pipeline/orchestrator.py#L234)）每次新建，从未复用
- 无 `graph.get_state()` / `graph.update_state()` 调用，**从未真正用于中断恢复**
- PipelineRun 表已持久化状态，是真正的状态源

结论：**MemorySaver → PG 不是必须**。真正的风险是 PipelineRun.status 状态机，用 reaper 解决。checkpointer 迁移列为二期。

---

## 2. 目标（3 项硬加固）

| 序号 | 加固项 | 依据 |
|---|---|---|
| 1 | /verify 加幂等键 + 409 防重入 | experience.md §4.5 重复提交 |
| 2 | asyncio.Semaphore 限流 + 429 | experience.md §2.9 并发控制 |
| 3 | GET /pipeline/{id} 懒检查 reaper | experience.md §4.5 僵尸状态 |

---

## 3. 不做（YAGNI）

- ❌ MemorySaver → PG（未真正用于中断恢复，见 §1.3）
- ❌ Celery/RQ 任务队列（YAGNI，Semaphore 够用）
- ❌ collector confidence + Tavily 降级（二期，不阻塞 demo）
- ❌ WebSocket Redis pub/sub（二期，单实例够 demo）
- ❌ per-user rate limit（二期，Semaphore 全局限流够 demo）

---

## 4. 方案

### 4.1 幂等键 + 409 防重入

**幂等策略**：content hash + user_id 作为天然幂等键（不新增字段）。

```python
# routes.py /verify
import hashlib

content_hash = hashlib.sha256(request.content.encode()).hexdigest()[:16]
idempotency_key = f"{current_user.id if current_user else 'anon'}-{content_hash}"

# 查询 N 分钟内相同 key 的 pending/running 任务
existing = db.query(PipelineRun).filter(
    PipelineRun.idempotency_key == idempotency_key,
    PipelineRun.status.in_(["pending", "running"]),
    PipelineRun.created_at > datetime.utcnow() - timedelta(minutes=5),
).first()

if existing:
    raise HTTPException(
        status_code=409,
        detail={
            "error": "DUPLICATE_SUBMIT",
            "message": "相同内容正在处理中，请勿重复提交",
            "existing_pipeline_id": existing.pipeline_id,
        }
    )
```

**PipelineRun 加字段**：
```python
idempotency_key = Column(String(64), index=True)  # 幂等键
```

### 4.2 Semaphore 限流 + 429

**全局信号量**：限制并发 verify 数量，超过返回 429。

```python
# routes.py 模块级
_verify_semaphore = asyncio.Semaphore(10)  # 最多 10 个并发 verify

@router.post("/verify")
async def verify(...):
    if _verify_semaphore.locked() and _verify_semaphore._value == 0:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "RATE_LIMITED",
                "message": "当前并发请求过多，请稍后重试",
                "retry_after_seconds": 30,
            }
        )
    async with _verify_semaphore:
        # ... 原有逻辑
```

### 4.3 僵尸 running reaper（懒检查）

**策略**：GET /pipeline/{id} 时懒检查，running 超过 5 分钟无新事件 → 标 failed。

```python
@router.get("/pipeline/{pipeline_id}")
def get_pipeline_status(pipeline_id: str, db: Session = Depends(get_db)):
    run = db.query(PipelineRun).filter(...).first()
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    # 评审 #2：懒检查僵尸状态
    if run.status == "running":
        idle_threshold = datetime.utcnow() - timedelta(minutes=5)
        if run.updated_at < idle_threshold:
            run.status = "failed"
            run.error_message = "执行超时（reaper 标记）"
            db.commit()
            db.refresh(run)

    return {...}
```

---

## 5. 验收标准

1. 相同 content 在 5 分钟内重复提交 → 409 + existing_pipeline_id
2. 并发超过 10 个 verify → 429 + retry_after_seconds
3. running 超过 5 分钟的 PipelineRun，GET 时被标 failed
4. 现有 verify 功能无回归（单测全过）

---

## 6. 与工作间 plan 的关系

3 项加固的"幂等+状态机+reaper"模式，与工作间 plan Task 12 完全一致。工作间 Task 12 执行时可复用本 spec 的实现模式。

---

## 7. 阶段 2 演进预留（500-1000 日活）

本 spec 的 3 项加固是阶段 1（50-100 日活）方案。到阶段 2 时，这些组件如何演进：

| 阶段 1 组件 | 阶段 2 演进 | 改动范围 |
|---|---|---|
| `asyncio.Semaphore(10)` | → Arq + Redis 任务队列（per-worker 并发 + 全局队列） | routes.py /verify 改为 enqueue Arq task |
| 幂等键 DB 查询 | → Redis 幂等键缓存（5 分钟 TTL） | 加 redis 层，DB 查询降级为兜底 |
| 懒检查 reaper | → Arq 定时任务扫描（主动 reaper） | 加 arq cron job |
| `MemorySaver` | → `PostgresSaver`（langgraph-checkpoint-postgres） | orchestrator.py:39 换 checkpointer |
| `asyncio.create_task` | → `arq.enqueue_task(...)` | run_pipeline_background 改为 Arq worker |
| WS 内存字典 | → Redis pub/sub 广播 | ws_manager.py 加 redis 后端 |

**关键预留**：阶段 1 的 `idempotency_key` 字段、`PipelineRun.status` 状态机、reaper 逻辑，在阶段 2 全部保留不变。只替换"执行后端"（Semaphore→Arq、DB→Redis 缓存），业务逻辑零改动。

**成本拐点**：日活 >200 或并发 verify >20 时，启动阶段 2 升级。
