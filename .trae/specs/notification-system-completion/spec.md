# spec-08 通知系统完善

## 背景
`src/pages/NotificationPage.tsx` 已实现完整 UI（4 个 Tab：全部/赞和收藏/评论/新增关注 + markAllRead + 8 条 mock 数据），
但使用本地 `useState` 管理通知，存在以下问题：
- 跨组件无法访问通知状态（如顶栏未读数 badge、TraeBot 提醒）
- 刷新页面后已读状态丢失
- 无未来扩展点（如 WebSocket 推送、API 对接）

## 任务范围

### 任务 1：创建 `src/stores/notificationStore.ts`
- 使用 zustand + persist 中间件
- 存储 key：`guanwei-notifications`
- State 结构：
  ```ts
  interface NotificationStore {
    notifications: Notification[]
    activeTab: 'all' | 'like' | 'comment' | 'follow'
    // Actions
    setActiveTab: (tab: Notification['type'] | 'all') => void
    markAllRead: () => void
    markRead: (id: string) => void
    markUnread: (id: string) => void
    deleteNotification: (id: string) => void
    addNotification: (n: Notification) => void
    clearAll: () => void
    unreadCount: () => number
  }
  ```
- 将现有 `MOCK_NOTIFICATIONS` 8 条数据作为初始 state（仅首次加载时注入，后续以持久化数据为准）
- `Notification` 类型从 `NotificationPage.tsx` 提取并 export，避免重复定义
- `persist` 的 `partialize` 仅持久化 `notifications`（activeTab 不持久化）

### 任务 2：重构 `src/pages/NotificationPage.tsx`
- 用 store 替换本地 `useState`
- `activeTab`、`notifications` 改为从 store 读取
- `markAllRead` 改为调用 store action
- 保留所有现有 UI、样式、交互逻辑不变
- 不引入新的功能（如删除按钮），保持视觉一致

### 任务 3：在 WebLayout 暴露未读数（可选，仅当 WebLayout 已有 badge 容器时）
- 检查 `src/layouts/WebLayout.tsx` 顶栏是否有通知 icon
- 若有，连接 `useNotificationStore(s => s.unreadCount())` 显示未读 badge
- 若无现成容器，**不要新增**（避免改动过大）

## 不做的事
- 不引入 API 调用层（保持 mock）
- 不引入 WebSocket 推送
- 不重构 NotificationPage 的 UI/样式
- 不引入新的通知类型（保留现有 5 类：like/comment/follow/mention/system）

## 验收
- `npm run build` 通过
- `npm run lint` 无新增错误
- NotificationPage 视觉与交互完全保持原状
- 刷新页面后已读状态保留
- 调用 `useNotificationStore(s => s.unreadCount())` 可在任意组件获取未读数
