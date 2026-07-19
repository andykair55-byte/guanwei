# Verify Pipeline 生产加固 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 /verify 加幂等键 + 409 防重入、Semaphore 限流 + 429、僵尸 running 懒检查 reaper

**Architecture:** PipelineRun 加 idempotency_key + updated_at 字段；routes.py /verify 用 content hash + user_id 作幂等键查重；模块级 asyncio.Semaphore(10) 限并发；GET /pipeline/{id} 懒检查 running>5min→failed

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy, pytest, unittest.mock

**Spec:** [docs/superpowers/specs/2026-07-18-verify-pipeline-hardening.md](file:///d:/code/code/program/4-观微/docs/superpowers/specs/2026-07-18-verify-pipeline-hardening.md)

---

## File Structure

| 文件 | 职责 | 改动类型 |
|---|---|---|
| `backend/models.py` | PipelineRun 加 idempotency_key + updated_at | Modify |
| `backend/api/routes.py` | /verify 幂等键 + Semaphore + reaper | Modify |
| `backend/tests/unit/test_verify_hardening.py` | 3 项加固单测 | Create |

---

## Task 1: PipelineRun 加字段 + 幂等键 409 防重入

**Files:**
- Modify: `backend/models.py`（PipelineRun 加 idempotency_key + updated_at）
- Modify: `backend/api/routes.py`（/verify 加幂等检查）
- Test: `backend/tests/unit/test_verify_hardening.py`

- [ ] **Step 1: 写失败测试 — 幂等键 409**

```python
# backend/tests/unit/test_verify_hardening.py
"""verify pipeline 生产加固单测（spec: 2026-07-18-verify-pipeline-hardening）"""
import pytest
from datetime import datetime, timedelta
from models import PipelineRun


def test_verify_returns_409_for_duplicate_content(client, db_session):
    """相同 content 在 5 分钟内重复提交 → 409 + existing_pipeline_id"""
    # 第一次提交
    resp1 = client.post("/api/v1/verify", json={"content": "测试重复提交的内容"})
    assert resp1.status_code == 200
    pipeline_id_1 = resp1.json()["pipeline_id"]

    # 第二次提交相同 content
    resp2 = client.post("/api/v1/verify", json={"content": "测试重复提交的内容"})
    assert resp2.status_code == 409
    detail = resp2.json()["detail"]
    assert detail["error"] == "DUPLICATE_SUBMIT"
    assert detail["existing_pipeline_id"] == pipeline_id_1


def test_verify_allows_different_content(client, db_session):
    """不同 content 正常提交，不触发 409"""
    resp1 = client.post("/api/v1/verify", json={"content": "内容 A"})
    resp2 = client.post("/api/v1/verify", json={"content": "内容 B"})
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.json()["pipeline_id"] != resp2.json()["pipeline_id"]


def test_verify_allows_after_previous_completed(client, db_session):
    """前一个任务已终态（success/failed），相同 content 可再次提交"""
    # 第一次提交
    resp1 = client.post("/api/v1/verify", json={"content": "已完成的内容"})
    pipeline_id_1 = resp1.json()["pipeline_id"]

    # 手动把第一个标成 success
    run = db_session.query(PipelineRun).filter_by(pipeline_id=pipeline_id_1).first()
    run.status = "success"
    db_session.commit()

    # 相同 content 再次提交
    resp2 = client.post("/api/v1/verify", json={"content": "已完成的内容"})
    assert resp2.status_code == 200
    assert resp2.json()["pipeline_id"] != pipeline_id_1
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend; pytest tests/unit/test_verify_hardening.py -v -k "409 or different or completed"`
Expected: FAIL with `assert 200 == 409`（当前无幂等检查，第二次也返回 200）

- [ ] **Step 3: PipelineRun 加 idempotency_key + updated_at 字段**

在 `backend/models.py` 的 `PipelineRun` 类中，`created_at` 之后加：

```python
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    idempotency_key = Column(String(64), index=True)  # 幂等键：user_id-content_hash
```

- [ ] **Step 4: /verify 加幂等检查**

在 `backend/api/routes.py` 顶部 import 区加：

```python
import hashlib
from datetime import timedelta
```

修改 `/verify` 端点（约 line 169-210），在 `pipeline_id = str(uuid.uuid4())` **之前**插入幂等检查：

```python
@router.post("/verify", response_model=VerifyResponse)
async def verify(
    request: VerifyRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """一键求证接口（异步模式）"""
    # 幂等检查：content hash + user_id（spec §4.1）
    content_hash = hashlib.sha256(request.content.encode()).hexdigest()[:16]
    user_part = str(current_user.id) if current_user else "anon"
    idempotency_key = f"{user_part}-{content_hash}"

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

    pipeline_id = str(uuid.uuid4())
    logger.info(f"Verify request [{pipeline_id}]: {request.content[:100]}")

    run = PipelineRun(
        pipeline_id=pipeline_id,
        input_content=request.content[:2000],
        status="pending",
        user_id=current_user.id if current_user else None,
        idempotency_key=idempotency_key,
    )
    db.add(run)
    db.commit()

    asyncio.create_task(run_pipeline_background(
        pipeline_id=pipeline_id,
        content=request.content,
        demo_crash_trigger=request.demo_crash_trigger,
        crash_probability=request.crash_probability,
    ))

    return VerifyResponse(
        success=True,
        result=None,
        error=None,
        pipeline_id=pipeline_id,
        status="pending",
    )
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd backend; pytest tests/unit/test_verify_hardening.py -v -k "409 or different or completed"`
Expected: 3 passed

- [ ] **Step 6: 提交**

```bash
git add backend/models.py backend/api/routes.py backend/tests/unit/test_verify_hardening.py
git commit -m "feat(verify): add idempotency key and 409 duplicate submit guard"
```

---

## Task 2: Semaphore 限流 + 429

**Files:**
- Modify: `backend/api/routes.py`（模块级 Semaphore + /verify 加限流）
- Test: `backend/tests/unit/test_verify_hardening.py`（追加测试）

- [ ] **Step 1: 追加失败测试 — Semaphore 限流 429**

在 `backend/tests/unit/test_verify_hardening.py` 末尾追加：

```python
import asyncio
from unittest.mock import patch, AsyncMock


def test_verify_returns_429_when_semaphore_exhausted(client, db_session):
    """Semaphore 耗尽时返回 429 + retry_after_seconds"""
    # 模拟 Semaphore 已满（_value=0）
    from api import routes as routes_module
    with patch.object(routes_module._verify_semaphore, "_value", 0):
        with patch.object(routes_module._verify_semaphore, "locked", return_value=True):
            resp = client.post("/api/v1/verify", json={"content": "限流测试"})
            assert resp.status_code == 429
            detail = resp.json()["detail"]
            assert detail["error"] == "RATE_LIMITED"
            assert "retry_after_seconds" in detail


def test_verify_semaphore_releases_after_completion(client, db_session):
    """正常完成后 Semaphore 释放"""
    from api import routes as routes_module
    initial_value = routes_module._verify_semaphore._value

    resp = client.post("/api/v1/verify", json={"content": "正常请求"})
    assert resp.status_code == 200

    # Semaphore 应该恢复初始值（因为是同步测试，请求已完成）
    assert routes_module._verify_semaphore._value == initial_value
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend; pytest tests/unit/test_verify_hardening.py -v -k "429 or releases"`
Expected: FAIL with `AttributeError: module 'api.routes' has no attribute '_verify_semaphore'`

- [ ] **Step 3: 加模块级 Semaphore + /verify 限流**

在 `backend/api/routes.py` 模块级（router 定义之后、路由函数之前）加：

```python
# ================================================================
#  并发限流（spec: 2026-07-18-verify-pipeline-hardening §4.2）
# ================================================================
_verify_semaphore = asyncio.Semaphore(10)  # 最多 10 个并发 verify
```

修改 `/verify` 端点，在幂等检查**之后**、`pipeline_id = ...` **之前**加限流检查：

```python
    # 并发限流（spec §4.2）
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
        pipeline_id = str(uuid.uuid4())
        # ... 原有逻辑（run 创建 + create_task + return）放在 async with 内
```

注意：`async with _verify_semaphore:` 包裹整个剩余逻辑，确保无论成功失败都释放信号量。完整结构：

```python
    # 并发限流
    if _verify_semaphore.locked() and _verify_semaphore._value == 0:
        raise HTTPException(status_code=429, detail={...})

    async with _verify_semaphore:
        pipeline_id = str(uuid.uuid4())
        logger.info(...)
        run = PipelineRun(...)
        db.add(run)
        db.commit()
        asyncio.create_task(run_pipeline_background(...))
        return VerifyResponse(...)
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd backend; pytest tests/unit/test_verify_hardening.py -v -k "429 or releases"`
Expected: 2 passed

- [ ] **Step 5: 运行 Task 1+2 全部测试确认无回归**

Run: `cd backend; pytest tests/unit/test_verify_hardening.py -v`
Expected: 5 passed（Task 1 的 3 + Task 2 的 2）

- [ ] **Step 6: 提交**

```bash
git add backend/api/routes.py backend/tests/unit/test_verify_hardening.py
git commit -m "feat(verify): add semaphore concurrency limit with 429 rate limit"
```

---

## Task 3: 僵尸 running 懒检查 reaper

**Files:**
- Modify: `backend/api/routes.py`（GET /pipeline/{id} 加 reaper）
- Test: `backend/tests/unit/test_verify_hardening.py`（追加测试）

- [ ] **Step 1: 追加失败测试 — reaper 标记僵尸 running**

在 `backend/tests/unit/test_verify_hardening.py` 末尾追加：

```python
def test_get_pipeline_reaper_marks_zombie_as_failed(client, db_session):
    """running 超过 5 分钟无更新 → GET 时标 failed"""
    # 造一个 6 分钟前的 running 任务
    run = PipelineRun(
        pipeline_id="zombie-test-id",
        input_content="僵尸测试",
        status="running",
        created_at=datetime.utcnow() - timedelta(minutes=6),
        updated_at=datetime.utcnow() - timedelta(minutes=6),
    )
    db_session.add(run)
    db_session.commit()

    # GET 触发 reaper
    resp = client.get("/api/v1/pipeline/zombie-test-id")
    assert resp.status_code == 200
    assert resp.json()["status"] == "failed"
    assert "超时" in resp.json().get("error_message", "") or "reaper" in resp.json().get("error_message", "")


def test_get_pipeline_reaper_skips_recent_running(client, db_session):
    """刚更新的 running 不被 reaper 标记"""
    run = PipelineRun(
        pipeline_id="fresh-test-id",
        input_content="新鲜测试",
        status="running",
        created_at=datetime.utcnow() - timedelta(seconds=30),
        updated_at=datetime.utcnow() - timedelta(seconds=30),
    )
    db_session.add(run)
    db_session.commit()

    resp = client.get("/api/v1/pipeline/fresh-test-id")
    assert resp.status_code == 200
    assert resp.json()["status"] == "running"


def test_get_pipeline_reaper_skips_non_running(client, db_session):
    """非 running 状态不触发 reaper"""
    run = PipelineRun(
        pipeline_id="success-test-id",
        input_content="成功测试",
        status="success",
        created_at=datetime.utcnow() - timedelta(minutes=10),
        updated_at=datetime.utcnow() - timedelta(minutes=10),
    )
    db_session.add(run)
    db_session.commit()

    resp = client.get("/api/v1/pipeline/success-test-id")
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend; pytest tests/unit/test_verify_hardening.py -v -k "reaper"`
Expected: FAIL with `assert 'running' == 'failed'`（当前无 reaper，僵尸 running 保持 running）

- [ ] **Step 3: GET /pipeline/{id} 加 reaper 逻辑**

找到 `backend/api/routes.py` 的 `get_pipeline_status` 函数（约 line 213），在 `if not run: raise 404` **之后**、`node_results = {}` **之前**加：

```python
@router.get("/pipeline/{pipeline_id}")
def get_pipeline_status(pipeline_id: str, db: Session = Depends(get_db)):
    """查询 Pipeline 运行状态"""
    run = db.query(PipelineRun).filter(PipelineRun.pipeline_id == pipeline_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    # 僵尸 running 懒检查 reaper（spec §4.3）
    if run.status == "running":
        idle_threshold = datetime.utcnow() - timedelta(minutes=5)
        if run.updated_at < idle_threshold:
            run.status = "failed"
            run.error_message = "执行超时（reaper 标记）"
            db.commit()
            db.refresh(run)

    node_results = {}
    # ... 原有逻辑不变
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd backend; pytest tests/unit/test_verify_hardening.py -v -k "reaper"`
Expected: 3 passed

- [ ] **Step 5: 运行全部加固测试确认无回归**

Run: `cd backend; pytest tests/unit/test_verify_hardening.py -v`
Expected: 8 passed（Task 1 的 3 + Task 2 的 2 + Task 3 的 3）

- [ ] **Step 6: 运行全量单测确认无回归**

Run: `cd backend; pytest tests/ --tb=short -q`
Expected: 仅 pre-existing 失败（test_llm_matrix::test_matrix_failover / test_security::test_login_rate_limiter），无新增回归

- [ ] **Step 7: 提交**

```bash
git add backend/api/routes.py backend/tests/unit/test_verify_hardening.py
git commit -m "feat(verify): add lazy reaper for zombie running state"
```

---

## Self-Review

### Spec 覆盖

| Spec 章节 | 覆盖 Task | 状态 |
|---|---|---|
| §1 背景 | （说明性，无需实现） | ✅ |
| §2 目标 3 项加固 | Task 1+2+3 | ✅ |
| §3 不做 YAGNI | 遵守（不碰 checkpointer/Celery/collector） | ✅ |
| §4.1 幂等键 | Task 1 | ✅ |
| §4.2 Semaphore | Task 2 | ✅ |
| §4.3 reaper | Task 3 | ✅ |
| §5 验收标准 | Task 3 Step 6 全量验证 | ✅ |

### Placeholder 扫描

✅ 所有 Step 有具体代码或命令
✅ 无 TODO/TBD/placeholder
✅ 测试代码可运行（含完整 import）

### 类型一致性

- `idempotency_key: str` 在 Task 1 Step 3 定义（models.py），Step 4 使用（routes.py），Step 1 测试断言 ✅
- `updated_at: DateTime` 在 Task 1 Step 3 定义，Task 3 Step 3 使用（reaper 比较）✅
- `_verify_semaphore: asyncio.Semaphore` 在 Task 2 Step 3 定义，Step 1 测试 mock ✅
- `timedelta` 在 Task 1 Step 4 import，Task 3 Step 3 使用 ✅
