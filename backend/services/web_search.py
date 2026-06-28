"""网页搜索服务"""
import httpx
import logging
from typing import Any

logger = logging.getLogger(__name__)


class WebSearchService:
    """网页搜索服务"""

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

    async def fetch_page(self, url: str) -> dict[str, Any]:
        """获取网页内容

        Args:
            url: 网页 URL

        Returns:
            包含标题和内容的字典
        """
        try:
            response = await self.client.get(url, headers=self.headers, follow_redirects=True)
            response.raise_for_status()

            # 简单提取文本内容
            content = response.text
            title = self._extract_title(content)

            return {
                "url": url,
                "title": title,
                "content": self._extract_text(content),
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return {
                "url": url,
                "title": "",
                "content": "",
                "status": "error",
                "error": str(e)
            }

    def _extract_title(self, html: str) -> str:
        """提取标题"""
        import re
        match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        return match.group(1).strip() if match else ""

    def _extract_text(self, html: str) -> str:
        """提取文本内容"""
        import re
        # 移除 script 和 style 标签
        html = re.sub(r'<script.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<style.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
        # 移除 HTML 标签
        text = re.sub(r'<[^>]+>', ' ', html)
        # 合并空白字符
        text = re.sub(r'\s+', ' ', text)
        return text.strip()[:5000]  # 限制长度


web_search_service = WebSearchService()
