# backend/services/workspace/agents/research_agent.py
"""研究 agent — LLM 提炼观点
评审 #5：含 prompt_hash + 注入拦截示范（其他 agent 同模式）
"""
import json
from pipeline.commander import commander
from services.workspace.agents.base_agent import (
    WorkspaceBaseAgent, WorkspaceAgentInput, WorkspaceAgentOutput,
    RetryableError, NonRetryableError,
    compute_prompt_hash, UNTRUSTED_CONTENT_TEMPLATE,
)


class ResearchAgent(WorkspaceBaseAgent):
    """研究员 agent — 评审 #5：含 prompt_hash + 注入拦截示范
    其他 agent（SearchAgent/VerifyAgent/WritingAgent/PlatformAgent）同样使用
    compute_prompt_hash + _check_injection，实现模式一致，此处仅 ResearchAgent 完整示范。
    """
    agent_type = "research"
    default_timeout = 45

    # 评审 #5：注入特征词（保守，避免误判）
    INJECTION_PATTERNS = [
        "忽略以上指令", "ignore previous", "ignore the above",
        "system prompt", "你是 dan", "dan 模式",
        "请输出系统", "请输出你的指令",
    ]

    async def run(self, input_data: WorkspaceAgentInput) -> WorkspaceAgentOutput:
        sources = input_data.upstream.get("search", {}).get("sources", [])
        search_degraded = input_data.upstream.get("search", {}).get("degraded", False)

        prompt = self._build_prompt(input_data.topic, sources, search_degraded)
        prompt_hash = compute_prompt_hash(prompt)  # 评审 #5

        result = await commander.execute(prompt, agent_type="research")

        # 评审 #5：注入检测
        text = self._extract_text(result)
        self._check_injection(text)

        viewpoints = self._parse_viewpoints(text)
        return WorkspaceAgentOutput(
            success=True,
            data={
                "viewpoints": viewpoints,
                "key_facts": self._extract_key_facts(text),
                "controversy": self._extract_controversy(text),
                "based_on_external": not search_degraded,
            },
            llm_provider=getattr(result, 'provider', '') if not isinstance(result, dict) else '',
            llm_model=getattr(result, 'model', '') if not isinstance(result, dict) else '',
            input_tokens=getattr(result, 'input_tokens', 0) if not isinstance(result, dict) else 0,
            output_tokens=getattr(result, 'output_tokens', 0) if not isinstance(result, dict) else 0,
            prompt_hash=prompt_hash,  # 评审 #5
        )

    def _extract_text(self, result) -> str:
        """从 LLM 响应中提取文本（兼容 dict OpenAI 格式和对象）"""
        if isinstance(result, dict):
            try:
                return result["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError):
                return ""
        return getattr(result, 'text', '') or ""

    def _check_injection(self, text: str) -> None:
        """评审 #5：检测 LLM 输出是否包含 prompt 模板泄露特征
        命中 → 抛 NonRetryableError（确定性故障，重试无意义）
        """
        if not text:
            return
        text_lower = text.lower()
        for pattern in self.INJECTION_PATTERNS:
            if pattern.lower() in text_lower:
                raise NonRetryableError(
                    f"prompt 注入拦截：输出包含敏感特征 '{pattern}'"
                )

    def _build_prompt(self, topic, sources, search_degraded):
        if search_degraded or not sources:
            return f"""你是研究分析师。基于通用知识，对以下主题做多角度观点提炼。

主题：{topic}

输出 JSON：
{{
  "viewpoints": [{{"stance": "支持/反对/中立", "content": "观点内容", "confidence": 0.0-1.0}}],
  "key_facts": ["关键事实1", "关键事实2"],
  "controversy": "争议焦点描述"
}}"""
        # 评审 #5：外部内容用 UNTRUSTED_CONTENT_TEMPLATE 包裹
        sources_text = "\n".join([f"- {s.get('title','')}: {s.get('snippet','')}" for s in sources[:5]])
        untrusted_block = UNTRUSTED_CONTENT_TEMPLATE.format(content=sources_text)
        return f"""你是研究分析师。基于以下资料，对主题做多角度观点提炼。

主题：{topic}

{untrusted_block}

输出 JSON：
{{
  "viewpoints": [{{"stance": "支持/反对/中立", "content": "观点内容", "confidence": 0.0-1.0}}],
  "key_facts": ["关键事实1", "关键事实2"],
  "controversy": "争议焦点描述"
}}"""

    def _parse_viewpoints(self, text):
        try:
            data = json.loads(text)
            return data.get("viewpoints", [])
        except Exception:
            return [{"stance": "neutral", "content": text[:200], "confidence": 0.5}]

    def _extract_key_facts(self, text):
        try:
            data = json.loads(text)
            return data.get("key_facts", [])
        except Exception:
            return []

    def _extract_controversy(self, text):
        try:
            data = json.loads(text)
            return data.get("controversy", "")
        except Exception:
            return ""

    async def fallback(self, input_data, error) -> WorkspaceAgentOutput:
        # 评审 #5：注入拦截时标记 prompt_injection_blocked
        is_injection = "注入" in str(error) or "injection" in str(error).lower()
        return WorkspaceAgentOutput(
            success=True,
            degraded=True,
            degraded_reason=f"研究失败: {str(error)[:100]}",
            data={
                "viewpoints": [
                    {"stance": "neutral", "content": "由于研究受限，仅提供基础框架", "confidence": 0.3}
                ],
                "key_facts": [],
                "controversy": "",
                "based_on_external": False,
            },
            prompt_injection_blocked=is_injection,
        )
