# LLM 模块路由改造设计

**日期**: 2026-07-17
**状态**: 待执行
**优先级**: 高（阻塞工作间 plan Task 9）

---

## 1. 问题

### 1.1 现状

[services/llm.py](file:///d:/code/code/program/4-观微/backend/services/llm.py) 已有完善的多 provider 基础设施（11 家 + 多 key 池轮询 + 熔断器 + 健康检查），但路由层缺失：

- `llm_service` 是全局单例，`primary_provider` 一个值服务所有模块
- 调用方（[analyzer.py](file:///d:/code/code/program/4-观微/backend/agents/analyzer.py)、[moderator.py](file:///d:/code/code/program/4-观微/backend/agents/moderator.py)、[verifier.py](file:///d:/code/code/program/4-观微/backend/agents/verifier.py)）不传 `provider` 参数，全走 primary + fallback
- 工作间 5 agent × 6 平台 + 小薇对话 + 求证 pipeline + 娱乐事件，全挤一个 provider

### 1.2 commander 全局污染 Bug

[commander._switch_to_backup()](file:///d:/code/code/program/4-观微/backend/pipeline/commander.py#L149-L176) 调用 `llm_service.set_primary_provider(backup["provider"])`——求证 pipeline 一旦降级切 provider，**会污染小薇和工作间的 primary**。这是跨模块状态污染 bug，不只是性能问题。

### 1.3 provider 缺失

书生 InternLM（上海 AI 实验室）未在 PROVIDERS 中配置，但有 9000w token 额度，是重要的负载分担 provider。

---

## 2. 目标

1. **per-module provider 路由**：每个模块/agent 角色有自己的 provider 优先级链
2. **即时调度**：调用时按优先级链遍历，第一个可用的 provider 就用（复用现有 fallback 逻辑）
3. **commander 局部切换**：求证 pipeline 降级只影响自己，不污染全局
4. **加书生 provider**：OpenAI 兼容接口

---

## 3. 路由表

基于"全部默认 glm"策略（glm 1500w token 主力，书生 9000w token 兜底）：

| module | primary | fallbacks | 场景 |
|---|---|---|---|
| `workspace.search` | glm | internlm, deepseek | 工作间搜集 |
| `workspace.research` | glm | internlm, deepseek | 工作间研究 |
| `workspace.verify` | glm | internlm, deepseek | 工作间核查 |
| `workspace.writing` | glm | internlm, deepseek | 工作间写作 |
| `workspace.platform` | glm | internlm, deepseek | 工作间平台适配 |
| `xiaowei.chat` | glm | internlm, deepseek | 小薇对话 |
| `verify.pipeline` | glm | internlm, deepseek | 求证 pipeline |
| `entertainment.event` | glm | internlm, deepseek | 娱乐事件 |
| `default` | glm | internlm, deepseek | 兜底 |

**设计要点**：
- 所有模块 primary 都是 glm（模型能力强）
- fallback 链一致 `[internlm, deepseek]`（书生 token 多，deepseek 稳定）
- "即时调度" = 现有 fallback 逻辑：glm 限流/熔断时自动切书生，书生不可用切 deepseek
- 不做动态负载均衡（YAGNI），靠 fallback 链 + 熔断器自然分流

---

## 4. 改造点

### 4.1 services/llm.py — 加书生 + module 路由

**加书生 provider**：

```python
"internlm": ProviderConfig(
    name="internlm",
    display_name="书生 InternLM",
    base_url="https://internlm-chat.intern-ai.org.cn/puyu/api/v1",
    default_model="internlm2.5-latest",
    api_key_env="INTERNLM_API_KEY",
),
```

**加 module 路由配置**：

```python
MODULE_ROUTES: dict[str, list[str]] = {
    "workspace.search":    ["glm", "internlm", "deepseek"],
    "workspace.research":  ["glm", "internlm", "deepseek"],
    "workspace.verify":    ["glm", "internlm", "deepseek"],
    "workspace.writing":   ["glm", "internlm", "deepseek"],
    "workspace.platform":  ["glm", "internlm", "deepseek"],
    "xiaowei.chat":        ["glm", "internlm", "deepseek"],
    "verify.pipeline":     ["glm", "internlm", "deepseek"],
    "entertainment.event": ["glm", "internlm", "deepseek"],
    "default":             ["glm", "internlm", "deepseek"],
}

def get_module_route(module: str | None) -> list[str]:
    """获取模块的 provider 优先级链。None/未知 → default。"""
    if not module:
        return MODULE_ROUTES["default"]
    return MODULE_ROUTES.get(module, MODULE_ROUTES["default"])
```

**generate / generate_json 加 module 参数**：

```python
async def generate(
    self,
    prompt: str,
    system_prompt: str = "",
    provider: Optional[str] = None,
    module: Optional[str] = None,  # 新增
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    if provider:
        # 显式指定优先级最高
        return await self._generate_with_provider(...)

    # 按 module 路由链遍历（替代原来的 primary+fallback）
    providers_to_try = get_module_route(module)
    last_error = None
    for prov in providers_to_try:
        try:
            return await self._generate_with_provider(prov, ...)
        except ValueError as e:
            logger.debug(f"Skipping {prov}: {e}")
            last_error = e
            continue
        except Exception as e:
            logger.warning(f"{prov} 调用失败，尝试下一个: {e}")
            last_error = e
            continue
    raise RuntimeError(f"模块 {module} 的所有 provider × key 均不可用: {last_error}")
```

**向后兼容**：不传 module 时走 `default` 路由，行为与现在一致（primary + fallback）。

### 4.2 pipeline/commander.py — 局部切换

**删掉**两处全局污染调用：
- [commander.py:161](file:///d:/code/code/program/4-观微/backend/pipeline/commander.py#L161) `llm_service.set_primary_provider(backup["provider"])`
- [commander.py:189](file:///d:/code/code/program/4-观微/backend/pipeline/commander.py#L189) `llm_service.set_primary_provider(primary_provider)`

**改为局部状态**：provider 切换只在 `state["agent_pool"]["current_provider"]` 里记。调用 LLM 时，agent 从 state 读 current_provider，显式传给 `generate(provider=...)`。

```python
def _switch_to_backup(self, state: PipelineState) -> bool:
    agent_pool = state["agent_pool"]
    current_provider = agent_pool["current_provider"]
    backups = agent_pool["backup"]
    for backup in backups:
        if backup["provider"] != current_provider:
            agent_pool["current_provider"] = backup["provider"]
            agent_pool["fail_count"] += 1
            agent_pool["last_switch_time"] = time.time()
            # 不再调 llm_service.set_primary_provider() — 全局污染
            self._emit_event(state, "SWITCH_AGENT", "commander",
                f"切换到备用 Agent: {backup['provider']}",
                {"from_provider": current_provider, "to_provider": backup["provider"]})
            return True
    return False
```

**agent 侧改造**：analyzer/moderator/verifier 调用 LLM 时，从 state 读 current_provider：

```python
# agents/analyzer.py
provider = state.get("agent_pool", {}).get("current_provider")
result = await llm_service.generate_json(
    prompt, system_prompt,
    provider=provider,  # 显式传，局部生效
    module="verify.pipeline",
)
```

### 4.3 求证 pipeline agent — 传 module

3 个 agent 加 `module="verify.pipeline"`：
- [analyzer.py:90](file:///d:/code/code/program/4-观微/backend/agents/analyzer.py#L90)
- [moderator.py:129](file:///d:/code/code/program/4-观微/backend/agents/moderator.py#L129)
- [verifier.py:112](file:///d:/code/code/program/4-观微/backend/agents/verifier.py#L112)

### 4.4 保留的 API

- [admin_routes.py:703](file:///d:/code/code/program/4-观微/backend/api/admin_routes.py#L703) 管理员手动切换 — 保留（合理）
- [routes.py:303](file:///d:/code/code/program/4-观微/backend/api/routes.py#L303) `/models/set-provider` — 保留，语义改为"设置 default 路由的 primary"

### 4.5 daily token budget 熔断（生产加固补丁）

**背景**：experience.md §2.8 Token 经济学教训——单 provider 日 token 耗尽会导致后续业务全停。用户 glm 有 1500w token、书生 9000w token，需要预算保护避免单日耗尽后无 fallback 可用。

**方案**：

1. `LLMService` 加 `daily_token_usage: dict[str, list[tuple[float, int]]]`——provider → [(timestamp, total_tokens), ...] 滑动 24h 窗口
2. `_call_with_matrix` 成功后从 `response.usage.total_tokens` 提取并 append
3. `generate` 路由遍历前调 `_is_budget_exceeded(provider)` 过滤超限 provider
4. 预算来自 `DAILY_TOKEN_BUDGET_{PROVIDER}` 环境变量，未配置 = 不限制
5. 滑动 24h 窗口自动清理过期记录，无需 cron；进程重启清空（生产可接受，因为预算是"保护性"而非"精确计费"）

**关键决策**：
- **不做**：持久化 token 计数到 DB（YAGNI，重启丢失可接受）
- **不做**：精确按 input/output 分开计费（YAGNI，total_tokens 足够做保护）
- **不做**：跨进程共享预算（YAGNI，单进程部署足够；多进程需 Redis，二期再说）

**配置示例**：

```bash
DAILY_TOKEN_BUDGET_GLM=14000000        # glm 1400w（实际 1500w，留 100w 余量）
DAILY_TOKEN_BUDGET_INTERNLM=85000000   # 书生 8500w（实际 9000w，留 500w 余量）
DAILY_TOKEN_BUDGET_DEEPSEEK=5000000    # deepseek 按需
```

---

## 5. MVP 范围

- [x] 加书生 provider 到 PROVIDERS
- [x] 加 MODULE_ROUTES 配置 + get_module_route 函数
- [x] generate/generate_json 加 module 参数
- [x] commander 删 set_primary_provider 全局调用
- [x] analyzer/moderator/verifier 传 module + provider
- [x] 单测覆盖 module 路由 + commander 局部切换
- [x] daily token budget 熔断（生产加固，spec §4.5）

## 6. 不做的事（YAGNI）

- **不做动态负载均衡**：不实时感知各 provider 负载分配请求，靠 fallback 链 + 熔断器自然分流
- **不做多 LLMService 实例**：复用单例的 key 池/熔断器/健康检查，只加路由层
- **不做 per-module key 池隔离**：所有模块共享同一 provider 的 key 池（书生的 9000w token 够分）
- **不做路由配置热加载**：MODULE_ROUTES 写死在代码里，需要改时改代码（YAGNI）
- **不改 admin_routes 的 set_provider**：管理员手动切换语义保留，影响 default 路由

---

## 7. 验收标准

1. `INTERNLM_API_KEY` 配置后，书生 provider 出现在 `list_available_providers()`
2. 工作间 agent 传 `module="workspace.writing"` 时，优先用 glm，glm 限流时自动切书生
3. 求证 pipeline 降级切 provider 后，`llm_service.primary_provider` **不变**（无全局污染）
4. 现有所有测试通过（test_llm_matrix.py 等）
5. 新增测试：module 路由测试 + commander 局部切换测试
