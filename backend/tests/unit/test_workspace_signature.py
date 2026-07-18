# backend/tests/unit/test_workspace_signature.py
"""任务签名 + 主题分类测试"""
import pytest
from unittest.mock import AsyncMock, patch
from services.workspace.signature import (
    classify_topic, compute_task_signature, CATEGORIES, _category_cache
)


def test_compute_task_signature_sorted():
    """签名对平台顺序无关"""
    sig1 = compute_task_signature("科技", ["zhihu", "guanwei"])
    sig2 = compute_task_signature("科技", ["guanwei", "zhihu"])
    assert sig1 == sig2
    assert sig1 == "科技_guanwei+zhihu"


def test_compute_task_signature_single_platform():
    sig = compute_task_signature("社会", ["weibo"])
    assert sig == "社会_weibo"


def test_compute_task_signature_empty_platforms():
    sig = compute_task_signature("其他", [])
    assert sig == "其他_"


@pytest.mark.asyncio
async def test_classify_topic_cache_hit():
    """缓存命中 → 不调 LLM"""
    _category_cache.clear()
    _category_cache["abc123"] = "科技"

    with patch("services.workspace.signature.hashlib") as md5_mock:
        md5_mock.md5.return_value.hexdigest.return_value = "abc123"
        result = await classify_topic("AI技术")

    assert result == "科技"


@pytest.mark.asyncio
async def test_classify_topic_fallback_on_error():
    """LLM 调用失败 → 默认'其他'"""
    _category_cache.clear()

    with patch("services.workspace.signature.commander") as cmd_mock:
        cmd_mock.execute = AsyncMock(side_effect=Exception("LLM 不可用"))
        result = await classify_topic("任意主题")

    assert result == "其他"


@pytest.mark.asyncio
async def test_classify_topic_normalizes_response():
    """LLM 返回'科技类' → 归一化为'科技'"""
    _category_cache.clear()

    with patch("services.workspace.signature.commander") as cmd_mock:
        cmd_mock.execute = AsyncMock(return_value=type("R", (), {"text": "科技类"})())
        result = await classify_topic("AI技术")

    assert result == "科技"
