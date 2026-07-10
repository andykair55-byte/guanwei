# Commander 容错内核 — 技术 Wiki

> 本文档记录 Commander 的完整运行逻辑、函数调用链、数据流和已识别的设计问题。
> 用于审核和重设计参考，不涉及代码修改。
>
> 涉及文件：
> - `backend/pipeline/commander.py` — Commander 主体（251 行）
> - `backend/pipeline/orchestrator.py` — 编排器，Commander 的调用方（284 行）
> - `backend/pipeline/schemas.py` — 状态类型定义（60 行）
> - `backend/services/llm.py` — LLM 服务，provider 切换目标（355 行）

---

## 一、架构总览

Commander 是一个**装饰器驱动的节点级容错控制器**，设计目标是：当 Pipeline 中某个节点（Agent）执行失败时，自动完成"检测 → 保存检查点 → 切换备用 Agent → 回滚状态 → 重试"的完整恢复链。

```
用户请求
  │
  ▼
PipelineOrchestrator.run()
  │  构建初始 state（含 agent_pool / checkpoints / events）
  │
  ▼
LangGraph StateGraph.ainvoke()
  │
  ├──► moderation 节点 ──── commander.wrap_node() 包装
  │         │
  │         ▼ (conditional edge: proceed / block)
  │
  ├──► collector 节点  ──── commander.wrap_node() 包装
  │         │
  │         ▼ (edge)
  │
  ├──► verifier 节点   ──── commander.wrap_node() 包装
  │         │
  │         ▼ (edge)
  │
  └──► analyzer 节点   ──── commander.wrap_node() 包装
            │
            ▼
           END
```

每个节点函数在注册到 LangGraph 之前，都被 `commander.wrap_node()` 包装了一层容错逻辑。LangGraph 不知道 Commander 的存在，它只看到普通的 async 节点函数。

---

## 二、核心数据结构

### 2.1 PipelineState（schemas.py:42-59）

Pipeline 的全局状态容器，LangGraph 在各节点之间传递的共享对象。与 Commander 相关的字段：

| 字段 | 类型 | 用途 |
|------|------|------|
| `step` | `str` | 当前执行的节点名，Commander 用此作为 `node_name` |
| `agent_pool` | `AgentPoolState` | Agent 池状态，Commander 读写此字段 |
| `checkpoints` | `List[Checkpoint]` | 检查点历史，Commander 写入和回滚 |
| `events` | `List[PipelineEvent]` | 事件日志，Commander 持续写入 |
| `final_result` | `dict \| None` | 最终结果，Commander 用此判断成败 |
| `error` | `str \| None` | 错误信息，Commander 用此判断成败 |
| `demo_crash_trigger` | `Optional[str]` | 演示模式：指定崩溃节点 |
| `crash_probability` | `float` | 演示模式：崩溃概率 |

### 2.2 AgentPoolState（schemas.py:33-39）

```python
class AgentPoolState(TypedDict):
    primary: AgentConfig        # 主 Agent 配置
    backup: List[AgentConfig]   # 备用 Agent 列表（最多 3 个）
    current_provider: str       # 当前使用的 provider 名
    fail_count: int             # 累计失败次数
    last_switch_time: Optional[float]  # 上次切换时间戳
```

初始化时机：`orchestrator.run()` 每次执行时调用 `commander._init_agent_pool()` 创建一份新的 agent_pool 放入 initial_state。

### 2.3 Checkpoint（schemas.py:15-19）

```python
class Checkpoint(TypedDict):
    node_name: str    # 所属节点
    state: dict       # 状态快照（排除 events 和 checkpoints）
    timestamp: float  # 保存时间
    attempt: int      # 第几次尝试
```

### 2.4 PipelineEvent（schemas.py:23-30）

```python
class PipelineEvent(TypedDict):
    event_id: str           # UUID
    type: str               # 事件类型（见下方事件类型表）
    timestamp: float
    node_name: str
    message: str
    details: Optional[dict]
```

**事件类型一览：**

| type 值 | 触发时机 |
|---------|----------|
| `NODE_START` | 节点开始执行 |
| `NODE_SUCCESS` | 节点执行成功 |
| `NODE_FAILURE` | 节点执行失败（捕获到异常） |
| `RETRY` | 第 N 次重试开始 |
| `SWITCH_AGENT` | 切换到备用 Agent |
| `ROLLBACK` | 回滚到检查点 |
| `CRITICAL_FAILURE` | 所有重试和热替换均失败 |
| `DEMO_CRASH` | 演示模式主动触发崩溃 |
| `AGENT_RECOVERED` | 冷却后恢复到主 Agent（当前未使用） |

---

## 三、函数级调用链详解

### 3.1 入口：`commander.wrap_node(node_func)` → `wrapped_node(state)`

**位置**：commander.py:198-248

**触发时机**：orchestrator 在 `_build_graph()` 中注册节点时调用：

```python
# orchestrator.py:46-49
graph.add_node("moderation", commander.wrap_node(self._moderation_node))
graph.add_node("collector",  commander.wrap_node(self._collector_node))
graph.add_node("verifier",   commander.wrap_node(self._verifier_node))
graph.add_node("analyzer",   commander.wrap_node(self._analyzer_node))
```

**完整执行流程**（伪代码展开）：

```
wrapped_node(state) 被 LangGraph 调用
│
├─ 1. node_name = state["step"]        # 获取当前节点名
│
├─ 2. _trigger_demo_crash(state, node_name)   # 演示模式检查
│     └─ 若 demo_crash_trigger == node_name 且 random < crash_probability
│        └─ raise FaultHotSwappingError      # 模拟崩溃
│
├─ 3. _save_checkpoint(state, node_name, attempt=1)   # 保存初始检查点
│     └─ 将 state（排除 events/checkpoints）存入 checkpoints 列表
│
├─ 4. _emit_event("NODE_START", node_name, ...)   # 广播开始事件
│
├─ 5. for attempt in [1, 2, 3]:                  # 重试循环（最多 3 次）
│     │
│     ├─ 5a. attempt > 1 时 emit RETRY 事件
│     │
│     ├─ 5b. result_state = await node_func(state)  # 执行真正的节点函数
│     │
│     ├─ 5c. _detect_failure(                     # 语义失败检测
│     │         result_state.get("final_result"),
│     │         result_state.get("error")
│     │      )
│     │      └─ 若检测到失败 → raise FaultHotSwappingError
│     │
│     ├─ 5d. 若 5b 或 5c 未抛异常：
│     │      └─ emit NODE_SUCCESS → return result_state  # 成功退出
│     │
│     └─ 5e. except Exception:                    # 捕获到异常
│            │
│            ├─ emit NODE_FAILURE
│            │
│            ├─ if attempt >= 3: break            # 最后一次重试，放弃
│            │
│            ├─ _switch_to_backup(state)          # 尝试切换 provider
│            │   ├─ 遍历 backup 列表
│            │   ├─ 找到 != current_provider 的 backup
│            │   ├─ 更新 agent_pool["current_provider"]
│            │   ├─ llm_service.set_primary_provider()  ← 全局副作用
│            │   └─ emit SWITCH_AGENT → return True
│            │   或 遍历完没找到 → return False
│            │
│            ├─ 若 switch 成功：
│            │   ├─ _rollback_to_checkpoint(state, node_name)  # 回滚状态
│            │   └─ continue  # 进入下一次重试
│            │
│            └─ 若 switch 失败：break  # 没有可用的 backup 了
│
└─ 6. emit CRITICAL_FAILURE                       # 所有重试均失败
      └─ state["final_result"] = {success: False, error: "..."}
      └─ return state
```

### 3.2 `_detect_failure(output, exception)` — 失败检测

**位置**：commander.py:123-134

```python
def _detect_failure(self, output, exception=None):
    if exception:                  # 有异常对象 → 失败
        return True
    if isinstance(output, dict):
        if not output.get("success", True):   # success=False → 失败
            return True
        if output.get("error"):               # 有 error 字段 → 失败
            return True
    return False
```

**调用方传入的参数**：

```python
# wrap_node 第 217-219 行
self._detect_failure(
    result_state.get("final_result"),  # output 参数
    result_state.get("error")          # exception 参数（注意：这是字符串，不是 Exception）
)
```

**各节点的返回值情况**：

| 节点 | 成功时设置 | 失败时设置 | Commander 能否检测到 |
|------|-----------|-----------|-------------------|
| moderation | `moderation_result={passed:True}` | `moderation_result={passed:True, action:"通过"}`（即使异常也默认通过） | 不能（不设 final_result 也不设 error） |
| collector | `collected_sources=[...]` | `collected_sources=[]` + `error="搜集失败:..."` | **能**（error 字段为非空字符串） |
| verifier | `verified_sources=[...]` | `verified_sources=[]` + `error="验证失败:..."` | **能**（同上） |
| analyzer | `final_result={success:True, ...}` | `final_result={success:False, error:"..."}` | **能**（final_result.success=False） |

### 3.3 `_save_checkpoint(state, node_name, attempt)` — 保存检查点

**位置**：commander.py:100-108

```python
def _save_checkpoint(self, state, node_name, attempt=1):
    checkpoint = Checkpoint(
        node_name=node_name,
        state={k: v for k, v in state.items() if k not in ["events", "checkpoints"]},
        timestamp=time.time(),
        attempt=attempt,
    )
    state["checkpoints"].append(checkpoint)
```

**调用时机**：仅在 `wrap_node` 的第 207 行，节点执行前调用一次，`attempt=1` 固定值。重试循环中不会再次保存检查点。

**实际行为**：假设 Pipeline 正常执行到 collector，checkpoints 列表为：

```
[
  {node_name: "moderation", state: {...moderation完成后的状态...}, attempt: 1},
  {node_name: "collector",  state: {...collector执行前的状态...},  attempt: 1}
]
```

### 3.4 `_rollback_to_checkpoint(state, node_name)` — 状态回滚

**位置**：commander.py:110-121

```python
def _rollback_to_checkpoint(self, state, node_name):
    for i in range(len(state["checkpoints"]) - 1, -1, -1):   # 从后往前找
        cp = state["checkpoints"][i]
        if cp["node_name"] == node_name:                      # 找到最后一个匹配的
            prev_cp = state["checkpoints"][i - 1] if i > 0 else None
            if prev_cp:
                state.update(prev_cp["state"].copy())          # 浅拷贝回滚
                self._emit_event(state, "ROLLBACK", ...)
                return True
            break                                              # i==0 时没有前一个，放弃
    return False
```

**设计意图**：回滚到目标节点**执行之前**的干净状态。

**实际行为**：从 checkpoints 列表末尾向前搜索，找到第一个 `node_name` 匹配的 checkpoint，然后取 `i-1` 位置的 checkpoint 作为回滚目标。

### 3.5 `_switch_to_backup(state)` — 热替换

**位置**：commander.py:149-176

```python
def _switch_to_backup(self, state):
    agent_pool = state["agent_pool"]
    current = agent_pool["current_provider"]
    backups = agent_pool["backup"]              # 最多 3 个备用配置

    for backup in backups:
        if backup["provider"] != current:       # 找到不等于当前的
            agent_pool["current_provider"] = backup["provider"]
            agent_pool["fail_count"] += 1
            agent_pool["last_switch_time"] = time.time()
            llm_service.set_primary_provider(backup["provider"])   # ← 全局修改
            self._emit_event(state, "SWITCH_AGENT", ...)
            return True

    return False    # 所有 backup 都等于 current（不应该发生）
```

**backup 列表初始化来源**（commander.py:55-66）：

```python
backup_providers = llm_service.fallback_providers  # ["groq", "openai", "claude"]
backup_configs = []
for prov in backup_providers[:3]:
    try:
        backup_configs.append(AgentConfig(
            provider=prov,
            model=llm_service.get_model_name(prov),
            ...
        ))
    except Exception:
        continue     # API Key 未配置的跳过
```

### 3.6 `_reset_agent_pool(state)` — 冷却恢复（死代码）

**位置**：commander.py:178-196

**设计意图**：切换 backup 后经过 `RECOVERY_COOLDOWN`（60 秒）冷却期，自动恢复回主 provider。

**实际状态**：整个代码库中没有任何函数调用它。切换后永远不会自动恢复。

### 3.7 `_emit_event(state, event_type, node_name, message, details)` — 事件广播

**位置**：commander.py:80-98

```python
def _emit_event(self, state, event_type, node_name, message, details=None):
    event = PipelineEvent(...)
    state["events"].append(event)

    for callback in self._event_callbacks:     # 同步调用所有回调
        try:
            callback(event)
        except Exception as e:
            logger.error(...)

    logger.info(...)
```

回调注册：`orchestrator` 或 `ws_manager` 通过 `commander.register_event_callback(fn)` 注册。

---

## 四、完整运行时序图

### 4.1 正常执行（无失败）

```
orchestrator.run("某新能源车续航虚标40%")
│
├─ initial_state = {
│    agent_pool: commander._init_agent_pool(),
│    checkpoints: [],
│    events: [],
│    ...
│  }
│
├─ LangGraph.ainvoke(initial_state)
│   │
│   ├─ [moderation] commander.wrap_node(_moderation_node)(state)
│   │   ├─ state["step"] = "moderation"
│   │   ├─ _save_checkpoint("moderation")        → checkpoints = [moderation_cp]
│   │   ├─ _emit("NODE_START", "moderation")
│   │   ├─ result = await _moderation_node(state) → 内部 try/except，永远返回正常 state
│   │   ├─ _detect_failure(None, None)            → False（两个参数都是 None）
│   │   ├─ _emit("NODE_SUCCESS", "moderation")
│   │   └─ return result
│   │
│   ├─ _should_proceed(state) → "proceed"（审核通过）
│   │
│   ├─ [collector] commander.wrap_node(_collector_node)(state)
│   │   ├─ state["step"] = "collector"
│   │   ├─ _save_checkpoint("collector")          → checkpoints = [moderation_cp, collector_cp]
│   │   ├─ _emit("NODE_START", "collector")
│   │   ├─ result = await _collector_node(state)  → 成功搜集，collected_sources 非空
│   │   ├─ _detect_failure(None, None)            → False（collector 成功时不设 error）
│   │   ├─ _emit("NODE_SUCCESS", "collector")
│   │   └─ return result
│   │
│   ├─ [verifier] → 同上模式
│   ├─ [analyzer] → 同上模式，但设置 final_result
│   └─ END
│
└─ return final_result（含 events 列表和 agent_pool_state）
```

### 4.2 collector 失败场景（当前实际行为）

```
[collector] commander.wrap_node(_collector_node)(state)
│
├─ _save_checkpoint("collector")
├─ _emit("NODE_START", "collector")
│
├─ result = await _collector_node(state)
│   └─ 内部 try/except 捕获异常
│      └─ state["collected_sources"] = []
│      └─ state["error"] = "搜集异常: ..."
│      └─ return state                              ← 正常返回，不抛异常
│
├─ _detect_failure(
│      result.get("final_result"),  → None           # collector 不设 final_result
│      result.get("error")          → "搜集异常:..."  # 非空字符串
│   )
│   ├─ exception = "搜集异常:..."                    # 字符串，不是 Exception
│   ├─ if exception: return True                     # 字符串非空 → truthy → 检测到失败
│   └─ return True
│
├─ raise FaultHotSwappingError("语义崩溃检测: 搜集异常:...")
│
├─ except Exception as e:                            # 进入 except 分支
│   ├─ _emit("NODE_FAILURE", "collector", str(e))
│   ├─ attempt=1, 1 >= 3? No
│   ├─ _switch_to_backup(state)
│   │   ├─ 找到 backup（如 groq）
│   │   ├─ agent_pool["current_provider"] = "groq"
│   │   ├─ llm_service.set_primary_provider("groq")  ← 全局修改！
│   │   └─ return True
│   │
│   ├─ _rollback_to_checkpoint(state, "collector")
│   │   ├─ checkpoints = [moderation_cp, collector_cp]
│   │   ├─ 找到 collector_cp（i=1）
│   │   ├─ prev_cp = moderation_cp（i=0）
│   │   ├─ state.update(moderation_cp["state"].copy())  ← 浅拷贝
│   │   └─ return True
│   │
│   └─ continue  → attempt=2
│
├─ attempt=2:
│   ├─ _emit("RETRY", "collector", "第 2 次重试")
│   ├─ result = await _collector_node(state)          # 用新 provider 重试
│   │   └─ 如果 collector 的失败原因和 LLM provider 无关（网络问题/API 限制）
│   │       └─ 仍然失败，state["error"] = "搜集异常: ..."
│   │       └─ return state
│   │
│   ├─ _detect_failure(None, "搜集异常:...")  → True
│   ├─ raise FaultHotSwappingError
│   │
│   ├─ except:
│   │   ├─ attempt=2, 2 >= 3? No
│   │   ├─ _switch_to_backup(state)
│   │   │   ├─ current="groq"，找 backup 中 != "groq" 的
│   │   │   ├─ 找到 openai（如果配了 API Key）
│   │   │   ├─ llm_service.set_primary_provider("openai")
│   │   │   └─ return True
│   │   │
│   │   ├─ _rollback_to_checkpoint(state, "collector")
│   │   │   ├─ checkpoints 现在有 [moderation_cp, collector_cp]
│   │   │   │   （注意：重试循环中没有再次 save_checkpoint）
│   │   │   ├─ 找到 collector_cp（i=1）→ prev = moderation_cp
│   │   │   └─ state.update(...) 回滚
│   │   │
│   │   └─ continue → attempt=3
│   │
├─ attempt=3:
│   ├─ result = await _collector_node(state)          # 用 openai 重试
│   ├─ 如果还是失败：
│   │   ├─ _detect_failure → True
│   │   ├─ raise FaultHotSwappingError
│   │   ├─ except:
│   │   │   ├─ attempt=3, 3 >= 3? YES → break       # 不再 switch
│   │   │   └─ 退出循环
│   │
├─ _emit("CRITICAL_FAILURE", "collector", "所有重试和热替换均失败")
├─ state["final_result"] = {success: False, error: "..."}
└─ return state
```

**关键观察**：在这个场景中，Commander 确实执行了 switch + rollback + retry。但问题在于：

1. collector 失败通常和 LLM provider 无关（是 httpx 请求搜索引擎失败），切换 provider 不会修复问题
2. 重试 3 次 × 切换 2 次，总共调用了 collector_agent.run() 3 次，每次都失败，浪费时间
3. 最终 collector 返回空列表，Pipeline 继续走 verifier → analyzer，产出"无法判断"的结果

---

## 五、已识别问题清单

### BUG-1：节点内部 try/except 吞掉异常，架空 Commander

**文件**：orchestrator.py:80-216（四个节点全部存在）

**现象**：每个节点函数（`_moderation_node` / `_collector_node` / `_verifier_node` / `_analyzer_node`）都自带 try/except，所有异常被内部消化，节点永远正常 return。

**后果**：Commander 的 `wrap_node` 只能通过检查 `state["error"]` 和 `state["final_result"]` 来间接判断失败。但这两个字段的使用不统一（moderation 不设 error，collector/verifier 设 error 但不设 final_result，analyzer 设 final_result），导致检测逻辑不一致。

**更严重的后果**：如果 collector 失败设了 `state["error"]`，verifier 成功执行但没有清除 `state["error"]`，Commander 在 verifier 节点的 `_detect_failure` 中仍然能读到 collector 残留的 error → **误判 verifier 也失败了**。

### BUG-2：`_switch_to_backup` 修改全局 LLM 服务状态

**文件**：commander.py:161

**现象**：`llm_service.set_primary_provider(backup["provider"])` 修改的是模块级单例 `llm_service` 的 `primary_provider` 属性。

**后果**：
- 并发 Pipeline 互相干扰：用户 A 的 Pipeline 触发切换，用户 B 的 Pipeline 也被迫使用新 provider
- 影响范围超出 Pipeline：管理后台的 `/admin/llm/set-provider` 也读写同一个 `llm_service`，Commander 的自动切换可能覆盖管理员的手动设置
- 没有线程/协程锁保护

### BUG-3：`_rollback_to_checkpoint` 回滚目标选择逻辑错误

**文件**：commander.py:112-114

**现象**：从后往前搜索 `node_name` 匹配的 checkpoint，取 `i-1`。

**后果**：如果一个节点有多次重试（虽然当前代码没有在重试时保存 checkpoint），`i-1` 可能指向同一个节点的上一次尝试，而非上一个节点。当前代码恰好只在 wrap_node 开头保存一次 checkpoint，所以 `i-1` 恰好是上一个节点的 checkpoint，**碰巧正确但逻辑脆弱**。一旦将来在重试循环中也保存 checkpoint（这是合理的改进方向），这个逻辑就会出错。

### BUG-4：`_reset_agent_pool` 是死代码

**文件**：commander.py:178-196

**现象**：函数已定义但全局无调用。

**后果**：一旦 `_switch_to_backup` 切换了 provider，`llm_service.primary_provider` 被永久修改。后续所有新请求（包括新的 Pipeline 执行）都使用 backup provider，直到服务重启或管理员手动切回。

### BUG-5：Checkpoint 使用浅拷贝

**文件**：commander.py:104

**现象**：`{k: v for k, v in state.items() if k not in ["events", "checkpoints"]}` 只做了一层浅拷贝。

**后果**：`collected_sources`、`verified_sources` 等 list 类型字段在 checkpoint 和 state 中共享同一个对象引用。如果后续节点修改了这些 list（如 `state["collected_sources"].append(...)`），checkpoint 中的数据也被修改，回滚时拿到的是被污染过的数据。

### BUG-6：事件回调同步/异步失配

**文件**：commander.py:92-96

**现象**：`_emit_event` 在 async 函数 `wrap_node` 内部被同步调用，回调也是同步执行。

**后果**：
- 如果回调是 async 函数（如 WebSocket 广播），同步调用会返回 coroutine 对象而不执行
- 如果回调内部用 `asyncio.create_task()` 包装，异常不会被捕获
- 多个回调串行执行，阻塞事件循环

### BUG-7：`MAX_SWITCH_ATTEMPTS` 声明但未使用

**文件**：commander.py:35

**现象**：`MAX_SWITCH_ATTEMPTS = 2` 被声明为类常量，但整个 Commander 代码中没有任何地方引用它。

**后果**：实际的切换次数由 `backup` 列表长度和重试循环共同决定，不受这个常量控制。

### BUG-8：审核节点默认通过的安全策略问题

**文件**：orchestrator.py:88-105

**现象**：`_moderation_node` 在 moderator_agent 执行异常时设置 `passed=True, action="通过"`。

**后果**：审核服务崩溃 = 所有内容通过。安全场景应该 fail-closed（默认拦截），而非 fail-open。

### BUG-9：Checkpoint 回滚覆盖 agent_pool，导致 state 与全局状态脱节

**文件**：commander.py:100-121（`_save_checkpoint` + `_rollback_to_checkpoint`）

**现象**：`_save_checkpoint` 排除的字段只有 `["events", "checkpoints"]`，**没有排除 `agent_pool`**。这意味着 checkpoint 快照里保存了当时的 `agent_pool` 状态。当 `_rollback_to_checkpoint` 执行 `state.update(prev_cp["state"].copy())` 时，`agent_pool` 会被**整个覆盖**回旧快照。

**时序推演**（以 4.2 节 collector 失败场景为例）：

```
步骤 1: _save_checkpoint("collector", attempt=1)
  checkpoint 中保存的 agent_pool:
    {current_provider: "deepseek", fail_count: 0, last_switch_time: None}

步骤 2: _switch_to_backup(state)
  state["agent_pool"]["current_provider"] = "groq"     ← state 改了
  state["agent_pool"]["fail_count"] = 1                 ← state 改了
  llm_service.set_primary_provider("groq")              ← 全局也改了

步骤 3: _rollback_to_checkpoint(state, "collector")
  state.update(moderation_cp["state"].copy())
    → state["agent_pool"] 被覆盖回 moderation 阶段的快照:
      {current_provider: "deepseek", fail_count: 0, last_switch_time: None}

最终状态:
  全局 llm_service.primary_provider = "groq"            ← 实际生效的
  state["agent_pool"]["current_provider"] = "deepseek"  ← 显示的（假的）
  state["agent_pool"]["fail_count"] = 0                 ← 显示的（假的）
```

**后果**：

1. **fail_count 永远无法累积**：每次 switch 把 fail_count +1，紧接着 rollback 把它冲回 0。这个字段从诞生起就是摆设。
2. **BUG-7 的根因暴露**：`MAX_SWITCH_ATTEMPTS` 之所以声明未使用，不只是"忘了引用"——就算引用了，`fail_count >= MAX_SWITCH_ATTEMPTS` 的判断条件也永远为 False，因为 fail_count 永远到不了阈值。
3. **state 失去事实来源地位**：前端或日志系统如果读 `state["agent_pool"]` 来展示"当前用的是哪个 provider"，看到的永远是错的。真正的行为由全局 `llm_service` 决定，但 state 显示的是旧值。
4. **三个 BUG 的因果链**：BUG-3（回滚索引逻辑脆弱）+ BUG-5（浅拷贝）+ BUG-9（agent_pool 被冲掉）本质上是同一个根因的三个表现——**回滚机制是粗粒度的 `state.update()`，没有区分"业务数据"和"基础设施状态"**。

**发现者**：用户审核时发现（Wiki v1.0 未收录）。

---

## 5.1 因果链图谱

9 个 BUG 不是独立的，存在明确的因果关系：

```
根因 A: state 混合了业务数据和基础设施状态
  │
  ├── BUG-9: checkpoint 回滚覆盖 agent_pool
  │     ├── BUG-7: fail_count 永远为 0 → MAX_SWITCH_ATTEMPTS 失效
  │     └── BUG-3: 回滚索引逻辑脆弱（碰巧正确）
  │
  └── BUG-5: 浅拷贝导致 list 引用共享
        └── 回滚拿到的数据可能被后续节点污染

根因 B: provider 状态分裂在"全局单例"和"state 快照"两处
  │
  ├── BUG-2: _switch_to_backup 修改全局 llm_service
  │     └── BUG-9: state 里的 agent_pool 和全局不一致
  │
  └── 双层降级冲突: Commander 和 LLMService 各自降级，互不感知

根因 C: 节点和 Commander 对"失败"的定义不统一
  │
  ├── BUG-1: 节点 try/except 吞掉异常
  │     └── _detect_failure 只能通过字符串/字段间接判断
  │
  └── BUG-8: moderation 异常默认通过
        └── Commander 无法区分"审核通过"和"审核崩溃"

独立问题:
  ├── BUG-4: _reset_agent_pool 死代码（无人调用）
  └── BUG-6: 事件回调同步/异步失配
```

---

## 六、LLM 降级链：双层降级的冲突

当前系统中存在**两层独立的降级机制**，它们互不感知：

### 第一层：Commander 级降级

```
节点失败 → wrap_node 检测 → _switch_to_backup → 全局切换 provider → 回滚 → 重试整个节点
```

### 第二层：LLMService 级降级

```python
# llm.py:228-246
async def generate(self, prompt, ...):
    providers_to_try = [self.primary_provider] + self.fallback_providers
    for prov in providers_to_try:
        try:
            return await self._generate_with_provider(prov, ...)
        except:
            continue     # 静默跳过，尝试下一个
    raise RuntimeError("所有模型均调用失败")
```

### 冲突分析

当 Commander 触发 `_switch_to_backup` 切换 provider 后，重试节点时：
1. 节点内部的 Agent 调用 `llm_service.generate()`
2. `llm_service.generate()` 使用新的 `primary_provider`（Commander 刚切换的）
3. 如果新 provider 也失败，`generate()` 内部还会遍历自己的 `fallback_providers`
4. 这意味着一次节点执行可能尝试 4 个 provider（Commander 切的 1 个 + LLMService 自己的 fallback 3 个）
5. Commander 完全不知道 LLMService 内部已经做过降级

**结果**：两层降级链叠加，一次节点失败可能触发多达 3（Commander 重试）× 4（LLMService 内部降级）= **12 次 LLM API 调用**，耗时可能超过 2 分钟。

---

## 七、与开源方案的对比

| 维度 | Commander（当前） | CrewAI | AutoGen | LangGraph 原生 |
|------|-------------------|--------|---------|---------------|
| 节点级容错装饰器 | 有（设计完整，实现有 bug） | 无 | 无 | 无 |
| Agent 热替换 | 有（provider 级） | 无 | 无 | 无 |
| 状态检查点 | 有（浅拷贝，索引逻辑有隐患） | 无 | 无 | 有（MemorySaver，但只做持久化不做回滚） |
| 事件系统 | 有（同步回调） | 有限日志 | 有限日志 | 无 |
| 多层降级协调 | 无（两层互不感知） | 无 | 无 | 无 |
| 冷却恢复 | 有定义无调用 | 无 | 无 | 无 |

**结论**：架构概念层面确实领先开源方案。但当前实现中，由于节点吞异常（BUG-1）导致容错链几乎不被触发，所以这些设计在生产中等于不存在。

---

## 八、修复优先级建议

| 优先级 | 问题 | 修复方向 |
|--------|------|----------|
| **P0** | BUG-1 节点吞异常 | 节点只 catch 特定异常（如 httpx 超时），让其他异常冒泡到 wrap_node；或统一在节点返回中设置 `final_result.success` |
| **P0** | BUG-2 + BUG-9 绑定修复 | 见下方"绑定修复方案"。两者必须同时解决，单独修任何一个都是拆东墙补西墙 |
| **P0** | 双层降级冲突 | 明确分工：Commander 负责节点级重试，LLMService 不做降级（或反过来）。不要两层同时做 |
| **P1** | BUG-5 浅拷贝 | 用 `copy.deepcopy()` 或 `json.loads(json.dumps(...))` |
| **P1** | BUG-4 死代码 | 在 wrap_node 成功返回后调用 `_reset_agent_pool`，或在 Pipeline 结束时统一重置 |
| **P1** | BUG-8 审核 fail-open | moderation 异常时 `action="拦截"` 而非 `"通过"` |
| **P2** | BUG-3 回滚索引 | 搜索第一个（而非最后一个）匹配的 checkpoint，或在 `_save_checkpoint` 时只保存一次 |
| **P2** | BUG-6 同步回调 | `_emit_event` 改为 async，回调用 `await callback(event)` |
| **P2** | BUG-7 死常量 | BUG-9 修复后 fail_count 能正常累积，此条自动解决 |

---

## 九、BUG-2 + BUG-9 绑定修复方案：两条路径

### 为什么必须绑定

BUG-2（全局副作用）和 BUG-9（checkpoint 冲掉 agent_pool）是同一根问题的两面：**provider 状态同时存在于两个地方（全局 `llm_service` + `state["agent_pool"]`），且两者的生命周期不同**。

- 只修 BUG-2（去掉全局 `set_primary_provider`）→ provider 完全由 state 驱动 → 但 BUG-9 仍在，rollback 会把 state 里的 provider 冲掉 → 下一次重试用的是旧 provider → 切换等于没切
- 只修 BUG-9（排除 agent_pool 不参与回滚）→ 全局 `llm_service` 仍然被修改 → 并发 Pipeline 互相干扰 → BUG-2 仍在

### 路径 A：agent_pool 留在 state 内，做请求级隔离

```python
# _switch_to_backup: 删除全局调用，只改 state
llm_service.set_primary_provider(...)  # ← 删掉这行
agent_pool["current_provider"] = backup["provider"]

# _save_checkpoint: 排除 agent_pool
INFRA_KEYS = ["events", "checkpoints", "agent_pool"]
state={k: v for k, v in state.items() if k not in INFRA_KEYS}

# 各 Agent 从 state 读取 provider
provider = state["agent_pool"]["current_provider"]
await llm_service.generate(prompt, provider=provider)
```

**评估**：能解决 BUG-2（不再污染全局）和 BUG-9（agent_pool 不参与回滚）。但没有解决根因——**业务状态和容错元数据仍然挤在同一个 dict 里**，只是用排除规则绕开了回滚冲突。以后新增容错字段（断路器状态、速率计数器等）每次都要记得加进 `INFRA_KEYS`，漏一个就复现 BUG-9。

### 路径 B：容错元数据脱离 LangGraph state（推荐）

**核心思路**：agent_pool 不应该寄生在 LangGraph 的业务 state dict 里。Commander 内部维护一个按 `run_id` 索引的运行时上下文，`wrap_node` 通过闭包持有 run_id 来读写，完全不经过 LangGraph 的 state dict。

```python
class Commander:
    def __init__(self):
        self._event_callbacks = []
        self._run_contexts: dict[str, AgentPoolState] = {}  # ← 按 run_id 隔离

    def wrap_node(self, node_func: Callable, run_id: str) -> Callable:
        """包装节点函数，通过闭包持有 run_id"""
        @wraps(node_func)
        async def wrapped_node(state: PipelineState) -> PipelineState:
            # 从 Commander 内部字典读取容错上下文，不碰 state
            ctx = self._run_contexts[run_id]

            # switch 只修改 ctx，不碰 state，不碰全局
            ctx["current_provider"] = backup["provider"]
            ctx["fail_count"] += 1

            # Agent 通过 ctx 获取 provider
            provider = ctx["current_provider"]
            result = await node_func(state, provider=provider)
            ...

        return wrapped_node
```

**PipelineState 的变化**：

```python
# 修复前
class PipelineState(TypedDict):
    user_input: str
    collected_sources: list
    ...
    agent_pool: AgentPoolState    # ← 容错元数据混在业务状态里
    checkpoints: List[Checkpoint] # ← 同上
    events: List[PipelineEvent]   # ← 同上

# 修复后
class PipelineState(TypedDict):
    user_input: str
    collected_sources: list
    verified_sources: list
    analysis_result: dict | None
    moderation_result: dict
    final_result: dict | None
    error: str | None
    step: str
    # agent_pool / checkpoints / events 全部移出
    # 它们由 Commander._run_contexts[run_id] 管理
```

**run_id 的生命周期**：

```
orchestrator.run(user_input)
│
├─ run_id = str(uuid.uuid4())
├─ commander.init_run(run_id)        # 创建 _run_contexts[run_id]
│
├─ graph.ainvoke(initial_state, config={"thread_id": run_id})
│   │  每个节点被 wrap_node(node_func, run_id=run_id) 包装
│   │  wrap_node 通过闭包持有 run_id，读写 commander._run_contexts[run_id]
│   │  LangGraph 的 state dict 里只有纯业务数据
│   │  checkpoint/rollback 只操作业务数据，永远不会碰到容错元数据
│   │
│   └─ END
│
├─ result = commander.get_run_result(run_id)  # 读取事件日志、agent_pool 最终状态
├─ commander.cleanup_run(run_id)              # 清理 _run_contexts[run_id]
└─ return result
```

**评估**：

| 维度 | 路径 A | 路径 B |
|------|--------|--------|
| 解决 BUG-2 | 是 | 是 |
| 解决 BUG-9 | 是（通过排除规则） | 是（从根上不存在） |
| 解决 BUG-5（浅拷贝） | 部分（需要额外 deepcopy） | 自动解决（业务数据无嵌套引用问题） |
| 解决 BUG-7（死常量） | 需要额外修 | 自动解决（fail_count 在 ctx 里正常累积） |
| 未来扩展性 | 每次新增字段要记得加 INFRA_KEYS | 容错元数据天然隔离，新增字段无风险 |
| 为独立编排层铺路 | 无 | 是（run_context 模式可平滑迁移） |
| 改动量 | 中 | 中（多一个 run_id 参数传递） |
| LangGraph 兼容 | 完全兼容 | 完全兼容（只是不再往 state 里塞容错数据） |

**推荐路径 B**。成本与 A 差不多，但从根上消除了"业务状态和容错元数据互相污染"的可能性，并且是未来 Commander 进化为独立编排层的第一步。

### 改动清单（路径 B）

**改动 1：Commander 新增 run context 管理**

```python
class Commander:
    def __init__(self):
        self._run_contexts: dict[str, dict] = {}

    def init_run(self, run_id: str, primary_provider: str, backup_providers: list):
        self._run_contexts[run_id] = {
            "agent_pool": { ... },
            "events": [],
            "checkpoints": {},
        }

    def get_context(self, run_id: str) -> dict:
        return self._run_contexts[run_id]

    def cleanup_run(self, run_id: str):
        del self._run_contexts[run_id]
```

**改动 2：`wrap_node` 接受 run_id 参数**

```python
def wrap_node(self, node_func: Callable, run_id: str) -> Callable:
    async def wrapped_node(state):
        ctx = self._run_contexts[run_id]
        # 所有容错操作都在 ctx 上进行，不碰 state
        ...
    return wrapped_node
```

**改动 3：orchestrator 在 run() 时初始化 context**

```python
async def run(self, user_input, ...):
    run_id = str(uuid.uuid4())
    commander.init_run(run_id, primary_provider, backup_providers)

    # 构建图时传入 run_id
    graph = self._build_graph(run_id)

    initial_state = {
        "user_input": user_input,
        # 纯业务数据，不再包含 agent_pool/checkpoints/events
        ...
    }

    result = await graph.ainvoke(initial_state, config={"thread_id": run_id})
    ctx = commander.get_context(run_id)
    # 将事件日志和 agent_pool 状态附加到结果中
    ...
    commander.cleanup_run(run_id)
```

**改动 4：`_switch_to_backup` 去掉全局调用**

```python
def _switch_to_backup(self, ctx: dict):
    agent_pool = ctx["agent_pool"]
    # 不再调用 llm_service.set_primary_provider()
    # 只修改 ctx 中的 provider
    agent_pool["current_provider"] = backup["provider"]
    agent_pool["fail_count"] += 1
```

### 副作用检查

| 影响 | 评估 |
|------|------|
| LLMService.generate() | 已有 `provider` 参数，无需改动 |
| Agent 的 run() 方法 | 需要新增 `provider` 参数，改动中等 |
| `_build_graph` | 需要接受 `run_id` 参数，改为每次 run() 构建（不再缓存 graph） |
| 管理后台 set-provider | 仍走 `llm_service.set_primary_provider()`，不受影响 |
| 并发隔离 | 每个 run_id 有独立 context，天然隔离 |
| LangGraph checkpointer | 不再冲突——LangGraph 持久化的是纯业务 state，Commander 管理的是运行时 context |

---

## 十、LangGraph 双 Checkpointer 约束与长期演进

### 当前不冲突但未来会打架的两套机制

| 机制 | LangGraph 原生 checkpointer | Commander 自建 checkpoint |
|------|---------------------------|--------------------------|
| 目的 | 图执行位置持久化（断点续传） | 业务级状态回滚（容错） |
| 粒度 | 整个 state dict 的快照 | 按节点保存业务数据子集 |
| 存储 | MemorySaver / SQLite / Postgres | state["checkpoints"] 列表（内存） |
| 索引 | thread_id | node_name |
| 触发 | LangGraph 自动 | Commander 手动 |

当前两套都在内存里跑，冲突不明显。但一旦接入 LangGraph 的持久化 checkpointer（如 PostgresSaver）做跨请求恢复：

1. LangGraph 会尝试持久化整个 state dict——如果 state 里还有 Commander 的 `events`/`checkpoints`/`agent_pool`，这些容错元数据也会被持久化，导致存储膨胀和语义混乱
2. 恢复时 LangGraph 会把持久化的 state 整体灌回来——Commander 的 checkpoint 列表和 agent_pool 会被恢复到旧值，和当前运行的容错上下文产生矛盾
3. 两套 checkpoint 的"事实来源"地位会打架：LangGraph 说"state 应该恢复到 thread_id=X 时的快照"，Commander 说"state 应该回滚到 node_name=Y 之前的检查点"——谁优先？

**路径 B 天然解决了这个冲突**：容错元数据不在 LangGraph state 里，LangGraph 的 checkpointer 只持久化纯业务数据，两套机制各管各的，永远不会打架。

### Commander 的长期演进路线

```
当前阶段（LangGraph 装饰器）
│  Commander 通过 wrap_node 装饰器注入容错逻辑
│  容错元数据通过 run_contexts 独立管理（路径 B）
│  LangGraph 负责 DAG 编排和 state 传递
│
├─ 短期：修 P0（路径 B 改造），不改 LangGraph 依赖
│
├─ 中期：Commander 接管更多编排职责
│  ├─ 自定义条件边（替代 LangGraph 的 add_conditional_edges）
│  ├─ 超时控制（节点级 timeout 而非全局）
│  ├─ 并行节点（Collector + Verifier 可并行执行的子图）
│  └─ 持久化 checkpoint（Commander._run_contexts 接入 Redis/Postgres）
│
└─ 长期：独立编排层
   ├─ 脱离 LangGraph 的 StateGraph
   ├─ Commander 自己定义 DAG、调度节点、管理 state
   ├─ run_contexts 进化为完整的 Execution Context
   └─ LangGraph 降级为可选的 LLM 调用辅助（而非编排框架）
```

路径 B 是当前成本最低、且为这条演进路线留了余地的选择。

---

> 文档版本：v1.2 | 基于 commit 853cdb9 | 2026-07-07 | v1.2 重写修复方案为路径 A/B 对比 + LangGraph 双 checkpointer 约束分析 + 长期演进路线

