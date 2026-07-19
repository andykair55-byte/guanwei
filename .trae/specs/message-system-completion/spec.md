# spec-09 私信系统完善

## 背景
`src/pages/MessagePage.tsx` 已实现完整 UI（两栏布局：会话列表 + 聊天窗口 + 搜索 + 模拟回复 800-1800ms 延迟 + 6 个 mock 会话），
但使用本地 `useState` 管理会话，存在以下问题：
- 跨组件无法访问会话状态（如顶栏未读数 badge）
- 刷新页面后聊天记录丢失
- 私信作为关键功能，状态应独立于组件生命周期

## 任务范围

### 任务 1：创建 `src/stores/messageStore.ts`
- 使用 zustand + persist 中间件
- 存储 key：`guanwei-messages`
- State 结构：
  ```ts
  interface MessageStore {
    conversations: Conversation[]
    selectedId: string | null
    searchQuery: string
    inputValue: string
    // Actions
    setSelectedId: (id: string | null) => void
    setSearchQuery: (q: string) => void
    setInputValue: (v: string) => void
    sendMessage: (convId: string, content: string) => void
    receiveMessage: (convId: string, content: string) => void
    markConversationRead: (id: string) => void
    deleteConversation: (id: string) => void
    totalUnread: () => number
    // 模拟回复定时器（在 store 内不持久化）
    _replyTimers: Record<string, ReturnType<typeof setTimeout>>
  }
  ```
- `Message` 和 `Conversation` 类型从 `MessagePage.tsx` 提取并 export
- 将现有 `INITIAL_CONVERSATIONS` 6 条数据作为初始 state
- `persist` 的 `partialize` 仅持久化 `conversations`（selectedId/searchQuery/inputValue 不持久化）
- `sendMessage` 内部触发模拟回复：800-1800ms 后随机从 `['收到！', '好的我看看', '这个想法不错', '有道理', '让我想想...']` 选一条调用 `receiveMessage`
- 保留原 `_replyTimers` 防止重复回复（仅在内存，不持久化）

### 任务 2：重构 `src/pages/MessagePage.tsx`
- 用 store 替换本地 `useState`
- `conversations`、`selectedId`、`searchQuery`、`inputValue` 改为从 store 读取
- `handleSend` 改为调用 `store.sendMessage(selectedConv.id, inputValue)`
- 自动滚动 useEffect 保留
- 进入会话时调用 `markConversationRead(id)` 清未读（保留原 useEffect）
- 保留所有现有 UI、样式、交互逻辑不变

### 任务 3：在 WebLayout 暴露未读数（可选，仅当 WebLayout 已有 badge 容器时）
- 检查 `src/layouts/WebLayout.tsx` 顶栏是否有私信 icon
- 若有，连接 `useMessageStore(s => s.totalUnread())` 显示未读 badge
- 若无现成容器，**不要新增**

## 不做的事
- 不引入 API 调用层（保持 mock）
- 不引入 WebSocket
- 不重构 MessagePage 的 UI/样式
- 不引入新的会话/消息字段
- 不修改模拟回复话术库

## 验收
- `npm run build` 通过
- `npm run lint` 无新增错误
- MessagePage 视觉与交互完全保持原状
- 刷新页面后会话记录保留
- 调用 `useMessageStore(s => s.totalUnread())` 可在任意组件获取总未读数
- 发送消息后 800-1800ms 内能收到模拟回复
