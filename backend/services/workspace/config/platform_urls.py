# backend/services/workspace/config/platform_urls.py
"""6 平台发布页 URL — 与前端 platformTemplates.ts publishUrl 保持一致"""

PLATFORM_PUBLISH_URLS = {
    "guanwei": "/publish",  # 观微平台内部路由
    "zhihu": "https://zhuanlan.zhihu.com/write",
    "xiaohongshu": "https://creator.xiaohongshu.com/publish/publish",
    "weibo": "https://weibo.com",
    "douyin": "https://creator.douyin.com/creator-micro/content/upload",
    "bilibili": "https://member.bilibili.com/platform/upload/text/edit",
}
