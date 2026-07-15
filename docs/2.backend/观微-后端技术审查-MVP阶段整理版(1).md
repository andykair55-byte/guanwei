# 观微后端技术审查报告（MVP阶段整理版）

## 0. 阶段说明

当前目标：**500-1000用户 MVP 测试**。

本文档按四个层级组织内容，避免"所有建议看起来一样重要"导致的焦虑和优先级混乱：

| 层级 | 含义 | 处理方式 |
|------|------|----------|
| **① 现在做** | MVP地基，直接影响500-1000用户能否稳定跑起来 | 立即处理 |
| **② 已决定维持现状** | 经过评估，当前阶段接受现状/风险 | 记录原因，避免以后误以为是"没做完" |
| **③ 阶段2预留** | 1000-5000用户规模才需要，现在只做认知储备 | 不写代码，不排期 |
| **④ 阶段3远期** | 5000-10000+用户的架构留白 | 仅记录设计思路，防止MVP阶段的技术选型堵死未来升级路径 |

---

## 1. 当前技术栈

| 层级 | 技术 | 评估 |
|------|------|------|
| Web框架 | FastAPI | ✅ 合适，异步支持好 |
| ORM | SQLAlchemy（同步） | ✅ 当前量级够用，见③ |
| 数据库 | SQLite(默认)/PostgreSQL(可切换) | ⚠️ 见①，需强制切换 |
| 缓存 | Redis（当前可选） | ⚠️ 见①，需强制启用 |
| 认证 | python-jose + bcrypt | ✅ bcrypt哈希是行业标准，安全 |
| LLM集成 | LangGraph + 多模型抽象层（11家，统一OpenAI兼容SDK） | ✅ 已完成 |
| 任务队列 | 无 | ⚠️ 见①，先用asyncio后台任务 |
| 测试 | pytest，4个测试文件 | ⚠️ 见①，覆盖不足 |

---

## 2. 后端功能清单

| 模块 | 功能 | 状态 | 备注 |
|------|------|------|------|
| 用户系统 | 注册/登录/个人信息/签到/积分 | ✅ 基本完成 | 缺密码强度校验、登录限流（见①） |
| 瓜田系统 | 瓜列表/详情/猜瓜/佐证/投票 | ✅ 基本完成 | 猜瓜逻辑耦合度高（见①服务层重构） |
| 认证系统 | JWT认证/密码哈希/权限检查 | ⚠️ 需调整 | SECRET_KEY需强制环境变量（见①） |
| 数据库 | SQLAlchemy ORM/连接池 | ⚠️ 需调整 | 见①：切PostgreSQL+调连接池 |
| 缓存系统 | Redis热点数据缓存 | ⚠️ 可选依赖 | 见①：强制启用 |
| LLM服务 | 多模型切换/自动降级 | ✅ 完成 | 调用计数/费用监控可放② |
| Agent体系 | Collector→Verifier→Analyzer→Moderator | ✅ 完成 | - |
| Pipeline | LangGraph编排/容错内核/Checkpoint/Agent池 | ✅ 完成 | 长任务需异步化（见①） |
| 证据链 | CRUD + 可信度计算 | ✅ 完成 | 证据去重可放② |
| WebSocket | 实时推送Pipeline进度 | ✅ 完成 | 断线重连可放② |
| Commander | 主备切换/故障恢复/检查点 | ✅ 完成 | - |
| 管理后台 | 管理端API | ✅ 完成 | 操作日志可放② |
| 监控指标 | 系统指标/业务统计 | ⚠️ 基础 | 见④ |
| 测试 | 4个测试文件（3单元+1集成） | ⚠️ 覆盖不足 | 见① |

---

## 3. ① 现在做（MVP地基，直接排期）

### 3.1 数据库：强制切换 PostgreSQL

SQLite不支持并发写入，500-1000用户并发场景下是硬伤，必须现在切。

```python
# database.py
engine_kwargs.update({
    "pool_size": 20,          # 基础连接数（原5，不足）
    "max_overflow": 30,       # 溢出连接数（原15，不足）
    "pool_pre_ping": True,
    "pool_recycle": 1800,     # 30分钟回收
})
```

### 3.2 Redis：从"可选依赖"改为强制启用

生产环境必须有缓存层，不能允许服务在没有Redis的情况下"降级运行"。

### 3.3 Pipeline长任务异步化（不上Celery，用asyncio足够）

AI求证Pipeline单次可能耗时30秒+，当前在API请求中同步执行会占满Worker，必须改成后台任务：

```python
import asyncio
from models import PipelineRun

@router.post("/verify")
async def submit_verify(request: VerifyRequest, db: Session = Depends(get_db)):
    task = PipelineRun(status="pending")
    db.add(task); db.flush()
    asyncio.create_task(run_pipeline_async(task.id, request.content))
    return {"pipeline_id": task.id, "status": "pending"}

async def run_pipeline_async(task_id: int, content: str):
    result = await orchestrator.run(content)
    await ws_manager.broadcast(task_id, result)
```

> 500-1000用户量级不需要Celery，asyncio后台任务+WebSocket推送足够，改造成本也远低于引入分布式任务队列。

### 3.4 SECRET_KEY 强制环境变量

```python
# 修改前（危险）：
SECRET_KEY = os.getenv("SECRET_KEY", "jianwei-secret-key-change-in-production")

# 修改后：
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be set in production!")
```

### 3.5 登录接口限流

```python
from fastapi_limiter.depends import RateLimiter

@router.post("/login", dependencies=[Depends(RateLimiter(times=5, seconds=60))])
def login(...):
    ...
```

### 3.6 服务层重构（业务逻辑从路由层抽离）

`melon_routes.py` 目前直接操作数据库和用户积分，耦合度高，现在改造成本低，越晚做越难迁移：

```python
# services/guess_service.py
class GuessService:
    def submit_guess(self, user_id: int, melon_id: int, choice: bool) -> GuessResult:
        guess = self._create_guess(user_id, melon_id, choice)
        self._update_user_points(user_id, amount=5)
        self._update_melon_stats(melon_id, choice)
        self._invalidate_cache(user_id, melon_id)
        return GuessResult(guess)

# melon_routes.py
@router.post("/{melon_id}/guess")
def submit_guess(..., service: GuessService = Depends(get_guess_service)):
    return service.submit_guess(current_user.id, melon_id, guess_data.choice)
```

### 3.7 测试补齐

当前只有4个测试文件（3单元+1集成），缺少核心业务路径覆盖：

```
tests/
├── unit/
│   ├── test_rank_calc.py
│   ├── test_points_calc.py
│   └── test_evidence_credibility.py
├── integration/
│   ├── test_user_flow.py
│   ├── test_guess_flow.py
│   └── test_pipeline_flow.py       # 当前完全缺失，优先级最高
├── performance/                     # MVP阶段可延后，先占位
│   ├── test_concurrent_guess.py
│   └── test_pipeline_load.py
└── fixtures/
    ├── user_factory.py
    └── melon_factory.py
```

优先级：Pipeline流程测试 > 猜瓜完整流程测试 > 边界测试（重复猜瓜、积分透支、并发提交）> 性能测试。

---

## 4. ② 已决定维持现状（决策记录，不是待办）

以下是经过评估后**主动决定暂不处理**的项，记录在这里是为了避免以后回看文档时误以为"还没做"：

| 项目 | 决定 | 原因 |
|------|------|------|
| JWT 有效期维持7天，暂不加Refresh Token | 维持现状 | 当前是测试阶段，7天对开发/测试体验更友好。**注意**：这是接受的已知风险，不是最佳实践，用户量真实上升或对外公开测试前需要重新评估，建议在那之前重新讨论一次 |
| 异步 SQLAlchemy 2.0 改造 | 暂不做 | 改造成本高（所有查询语法、依赖注入都要改），500-1000用户量级同步ORM+连接池完全够用，移到③ |
| Celery 分布式任务队列 | 暂不引入 | asyncio后台任务对当前量级足够，Celery会引入额外的部署复杂度（需要Broker），性价比低 |

---

## 5. ③ 阶段2预留（1000-5000用户，仅认知储备，不写代码）

这一层的意义不是"要做"，而是"提前知道下一步会长什么样"，避免MVP阶段的技术选型堵死未来路径。

```
异步 SQLAlchemy 2.0                  ← 用户量明显增长、同步ORM出现明显延迟时再改
Celery + Redis 分布式任务队列        ← Pipeline任务量大到asyncio后台任务处理不过来时再上
结构化日志（Loguru）                 ← 排查问题效率下降、需要跨实例检索日志时再上
```

---

## 6. ④ 阶段3远期（5000-10000+用户，架构留白）

保留这部分是合理的——这不是"现在要做的事"，而是**提前想清楚扩展路径，避免现在的技术选型和数据库schema设计把自己锁死**。写在这里，不代表现在要写代码，只是给未来的自己一个参考方向。

### 6.1 阶段性扩容路径

| 用户规模 | 策略 | 具体措施 |
|----------|------|----------|
| 1000-5000 | 垂直扩展 | 升级服务器配置、增加Worker数 |
| 5000-10000 | 水平扩展 | Nginx负载均衡 + 2-3个后端实例 |
| 10000+ | 微服务拆分 | 用户服务/瓜田服务/Pipeline服务独立部署 |

### 6.2 水平扩展（5000-10000用户参考）

```yaml
upstream backend {
  server backend1:8000;
  server backend2:8000;
  server backend3:8000;
}

# Celery分布式任务
celery -A jianwei worker --loglevel=info --concurrency=8
```

### 6.3 微服务拆分（10000+用户参考）

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   用户服务      │     │   瓜田服务      │     │   Pipeline服务  │
│   (认证/积分)   │     │   (猜瓜/佐证)   │     │   (AI求证)      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                        ┌────────▼────────┐
                        │   Redis 集群    │
                        │   PostgreSQL    │
                        └─────────────────┘
```

> **MVP阶段现在唯一需要考虑的事**：数据库schema和服务边界的设计不要和"未来要拆成三个服务"这件事冲突（比如用户数据和瓜田数据的耦合尽量通过服务层而不是直接跨表JOIN），除此之外不需要为这个阶段做任何额外投入。

---

## 7. 监控与可观测性（展示向加分项，非当前稳定性刚需）

诚实说明一下这块的定位：对于500-1000用户的MVP，日志+现有的`metrics.py`基础指标已经能覆盖稳定性需求，Prometheus+Grafana这类完整可观测性平台**不是这个阶段的必需品**。

但如果这个项目会有评审/演示场景，一个能实时展示的监控面板确实是很好的**加分项**——评委很难在几分钟的演示里看懂后端代码质量，但一个直观的Grafana面板（QPS、Pipeline成功率、LLM调用延迟）能快速建立"这是个工程化程度高的项目"的印象。

建议的取舍：不需要上完整的Prometheus生态做深度告警，可以用较轻量的方式达到类似效果——

- 用已有的`metrics.py`暴露一个`/metrics`端点（Prometheus格式）
- 本地/演示环境跑一个单机Grafana容器读取这个端点，做2-3个关键面板（Pipeline成功率、LLM调用耗时分布、在线用户数）
- 不需要告警规则、不需要多实例聚合，这些是5000+用户阶段才需要的东西

这样投入的工作量接近"做一个demo面板"，而不是"搭建一套生产级可观测性体系"，性价比更合适。

---

## 8. 关键决策记录（原始确认问答）

| 问题 | 决定 |
|------|------|
| 是否强制切换 PostgreSQL？ | ✅ 是 |
| Pipeline任务队列：asyncio还是Celery？ | ✅ 当前阶段用asyncio后台任务 |
| 是否做异步SQLAlchemy 2.0改造？ | ❌ 暂不做，标记为阶段2 |
| JWT有效期是否缩短为2小时+Refresh Token？ | ❌ 不同意，测试阶段维持7天 |
| 登录接口是否加速率限制？ | ✅ 是，必要的安全措施 |
| 是否将业务逻辑从路由层抽到服务层？ | ✅ 是 |

---

*本文档为观微项目MVP阶段（500-1000用户）技术审查整理版，按"现在做/已决定维持现状/阶段2预留/阶段3远期"分级组织。阶段3内容仅为架构参考，不纳入当前开发排期。*
