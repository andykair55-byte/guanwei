# spec-05 trae宝（小薇助手）完善

## 背景
TraeBot 主体功能已完整（聊天/总结/事实提取/情绪检测/限流/超时降级/会话管理），
但存在两个部署级问题导致在内容页不可用：

1. **IMMERSIVE_ROUTES 错误隐藏**：`src/layouts/WebLayout.tsx` 把 `/community/`、`/melon/`、`/hot/` 标记为沉浸式路由，导致 TraeBot 在这些内容页被隐藏。但策划案要求 trae宝 在内容页必须可见（陪伴用户阅读）。
2. **usePageContext 注入缺失**：`CommunityDetailPage` 和 `HotEventDetailPage` 未调用 `usePageContext`，导致小薇打开后没有页面上下文，总结/事实/情绪按钮只能走 DEMO 演示数据。

## 任务范围（仅这两项）

### 任务 1：修复 IMMERSIVE_ROUTES
- 文件：`src/layouts/WebLayout.tsx`
- 修改 `IMMERSIVE_ROUTES`，**移除** `/community/`、`/melon/`、`/hot/` 三项
- **保留** `/notifications`、`/messages`、`/agent-world`（这些页面确实不应显示 trae宝）
- 同时检查 `src/layouts/MobileLayout.tsx`（若存在）是否有相同逻辑，保持一致
- 不修改 `hideTraeBot` 计算逻辑本身，仅调整数组内容

### 任务 2：注入 usePageContext
- 文件：`src/pages/CommunityDetailPage.tsx`
  - 在组件顶部调用 `usePageContext({ type: 'community', title, content })`
  - `title` 取社区帖子标题
  - `content` 取帖子正文（若已有 content/post.body 字段直接用）
  - 参考 `src/pages/MelonDetailPage.tsx:306` 的用法
- 文件：`src/pages/HotEventDetailPage.tsx`
  - 同样调用 `usePageContext({ type: 'hot', title, content })`
  - `title` 取热点事件标题
  - `content` 取事件描述/时间线节点拼接文本

## 不做的事
- 不重构 TraeBot 本体（已完整）
- 不引入新的 store
- 不修改 xiaoWeiStore
- 不动限流/超时/降级逻辑

## 验收
- 在 `/community/:id`、`/melon/:id`、`/hot/:id` 页面右下角能看到 trae宝 入口按钮
- 打开 trae宝 后点击"总结"/"提取事实"按钮能基于当前页面内容生成（非演示数据，前提是 LLM 可用）
- `/notifications`、`/messages`、`/agent-world` 页面不显示 trae宝
- `npm run build` 通过，无新增 TS 错误
- `npm run lint` 无新增错误
