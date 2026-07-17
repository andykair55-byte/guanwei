"""求证 pipeline agent 传 module="verify.pipeline" 单测（spec: 2026-07-17-llm-module-routing §4.3）"""
import pytest
from unittest.mock import AsyncMock, patch

from agents.analyzer import AnalyzerAgent
from agents.moderator import ModeratorAgent
from agents.verifier import VerifierAgent
from agents.models import AnalyzerInput, VerifiedSource, ModeratorInput


@pytest.mark.asyncio
async def test_analyzer_passes_module_to_llm():
    """analyzer 调 LLM 时传 module='verify.pipeline'"""
    agent = AnalyzerAgent()

    with patch("agents.analyzer.llm_service.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {
            "timeline": [],
            "evidence_chain": [],
            "key_doubts": [],
            "tendency": "无法判断",
            "tendency_direction": False,
        }
        # 触发 analyzer 的 LLM 调用（需要构造合法 input）
        input_data = AnalyzerInput(
            original_query="test",
            verified_sources=[VerifiedSource(title="t", url="http://t.com", content="c", credibility=3, status="verified")],
        )
        await agent.run(input_data)

        mock_gen.assert_called_once()
        # 检查 module 参数
        call_kwargs = mock_gen.call_args
        assert call_kwargs.kwargs.get("module") == "verify.pipeline"


@pytest.mark.asyncio
async def test_moderator_passes_module_to_llm():
    """moderator 调 LLM 时传 module='verify.pipeline'"""
    agent = ModeratorAgent()

    with patch("agents.moderator.llm_service.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {"flagged": False, "categories": [], "reasons": []}
        await agent.run(ModeratorInput(text="测试内容"))

        mock_gen.assert_called_once()
        call_kwargs = mock_gen.call_args
        assert call_kwargs.kwargs.get("module") == "verify.pipeline"


@pytest.mark.asyncio
async def test_verifier_passes_module_to_llm():
    """verifier 调 LLM 时传 module='verify.pipeline'"""
    agent = VerifierAgent()

    with patch("agents.verifier.llm_service.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = "3"
        # _analyze_content 是 verifier 中唯一调用 llm_service.generate 的方法
        await agent._analyze_content("测试内容")

        mock_gen.assert_called_once()
        call_kwargs = mock_gen.call_args
        assert call_kwargs.kwargs.get("module") == "verify.pipeline"
