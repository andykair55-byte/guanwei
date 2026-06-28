"""搜集 Agent - 搜集相关信息来源"""
import asyncio
import logging
from urllib.parse import quote

import httpx

from agents.base import BaseAgent, AgentInput, AgentOutput
from agents.models import CollectorInput, CollectorOutput, SourceItem
from services.web_search import web_search_service

logger = logging.getLogger(__name__)


class CollectorAgent(BaseAgent):
    """搜集 Agent，负责从网络搜集相关信息来源"""

    name = "collector"

    # 常用搜索引擎和百科站点
    SEARCH_URLS = [
        "https://www.google.com/search?q={query}",
        "https://www.bing.com/search?q={query}",
        "https://baike.baidu.com/search?word={query}",
        "https://zh.wikipedia.org/w/index.php?search={query}",
    ]

    async def run(self, input_data: CollectorInput) -> AgentOutput:
        """搜集相关信息来源

        Args:
            input_data: 包含查询词和最大来源数量的输入

        Returns:
            搜集到的来源列表
        """
        try:
            sources = await self._collect_sources(
                input_data.query, input_data.max_sources
            )
            return AgentOutput(success=True, data={"sources": [s.model_dump() for s in sources]})
        except Exception as e:
            logger.error(f"Collector error: {e}")
            return AgentOutput(success=False, error=str(e))

    async def _collect_sources(self, query: str, max_sources: int) -> list[SourceItem]:
        """实际执行搜集逻辑"""
        sources = []
        tasks = []

        # 生成搜索 URL
        search_urls = [url.format(query=quote(query)) for url in self.SEARCH_URLS[:5]]

        # 使用 DuckDuckGo HTML 搜索（无需 API key）
        ddg_url = f"https://html.duckduckgo.com/html/?q={quote(query)}"
        search_urls.append(ddg_url)

        for search_url in search_urls:
            if len(sources) >= max_sources:
                break
            tasks.append(self._search_and_fetch(search_url, query, sources, max_sources))

        await asyncio.gather(*tasks, return_exceptions=True)

        # 去重
        seen_urls = set()
        unique_sources = []
        for s in sources:
            if s.url not in seen_urls and len(s.content) > 50:
                seen_urls.add(s.url)
                unique_sources.append(s)

        return unique_sources[:max_sources]

    async def _search_and_fetch(
        self, search_url: str, query: str, sources: list, max_sources: int
    ):
        """搜索并获取结果"""
        try:
            client = httpx.AsyncClient(timeout=15.0)
            response = await client.get(
                search_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
            )

            # 从搜索结果页面提取链接
            urls = self._extract_search_results(response.text)

            # 获取每个链接的内容
            fetch_tasks = []
            for url in urls[:5]:
                if len(sources) >= max_sources:
                    break
                fetch_tasks.append(self._fetch_single(url))

            results = await asyncio.gather(*fetch_tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, SourceItem) and result.content:
                    sources.append(result)

            await client.aclose()
        except Exception as e:
            logger.warning(f"Search failed for {search_url}: {e}")

    async def _fetch_single(self, url: str) -> SourceItem:
        """获取单个页面"""
        result = await web_search_service.fetch_page(url)
        return SourceItem(
            url=url,
            title=result.get("title", ""),
            content=result.get("content", ""),
            fetched=True,
        )

    def _extract_search_results(self, html: str) -> list[str]:
        """从搜索结果页面提取链接"""
        import re

        urls = []
        # 匹配常见搜索结果链接模式
        patterns = [
            r'href="(https?://[^"]+)"[^>]*><cite>',  # Google/Bing cite
            r'<a[^>]+href="(https?://[^"]+)"[^>]*class="result"',  # DuckDuckGo
            r'href="(https?://[^"]+)"[^>]*class="[^"]*raw[^"]*"',  # 原始链接
        ]

        for pattern in patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            urls.extend(matches)

        # 过滤无效 URL
        valid_urls = []
        for url in urls:
            if any(
                blocked not in url.lower()
                for blocked in ["google.com/search", "bing.com/acord", "duckduckgo.com/?", "accounts.", "support."]
            ):
                continue
            if url.startswith("http"):
                valid_urls.append(url)

        return valid_urls[:10]


collector_agent = CollectorAgent()
