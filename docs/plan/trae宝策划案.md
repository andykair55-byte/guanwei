# 观微「trae宝」策划案

> 版本：v1.0
> 状态：产品策划 + 技术规格
> 优先级：P0（全程陪伴agent）
> 最后更新：2026-07
> 架构审查后新增：全局聊天agent，整合原情绪检测能力

---

## 一、模块定位

**trae宝是观微的右下角全局聊天agent——以陪伴为主，在内容消费页面提供轻量AI能力。用户在瓜田、社区、热点详情页浏览时，trae宝随时待命：聊天、总结当前文章、提取关键事实、情绪检测。分析结果纯展示，深度佐证引导到工作间完成。**

解决的问题：
1. **消费侧无AI陪伴**——用户读长文累、抓不住重点，trae宝一键总结3-5句话摘要
2. **关键事实埋没**——文章信息密度高但关键事实难提取，trae宝提取事实列表
3. **情绪判断缺失**——用户看不出文本的情绪倾向，trae宝选中文本即分析
4. **工具入口分散**——情绪检测原是独立工具页，现归入trae宝，随时可用

给谁用：所有在内容消费页面浏览的用户。

**定位与工作间的分工**：
- trae宝：消费侧，轻量陪伴，分析结果纯展示
- 工作间：生产侧，深度创作，LLM求证嵌入
- trae宝分析结果→用户想深入→"去工作间佐证"按钮→navigate('/agent-world')

---

## 二、MVP 范围定义

### 2.1 出现与隐藏规则

| 页面 | 是否显示trae宝 | 说明 |
|------|---------------|------|
| 瓜田列表 `/melon-field` | ✅ 显示 | 浏览瓜列表时陪伴 |
| 瓜详情 `/melon/:id` | ✅ 显示 | 注入瓜详情+佐证上下文 |
| 社区 `/community` | ✅ 显示 | 浏览社区时陪伴 |
| 社区帖子详情 `/community/:id` | ✅ 显示 | 注入帖子内容+评论 |
| 热点 `/hot` | ✅ 显示 | 浏览热点时陪伴 |
| 热点详情 `/hot/:id` | ✅ 显示 | 注入热点事件+时间线 |
| **工作间** `/agent-world` | ❌ 不显示 | 工作间是生产侧，不需要陪伴 |
| **娱乐大厅** `/entertainment` | ❌ 不显示 | 娱乐模式不需要陪伴 |
| 其他页面（设置/管理/个人主页等） | ❌ 不显示 | 非内容消费场景 |

### 2.2 能力清单

| 能力 | 状态 | 说明 |
|------|------|------|
| 聊天 | **MVP** | 调用callLLM，12秒超时降级 |
| 总结当前文章 | **MVP** | 获取页面上下文→callLLM→3-5句话摘要 |
| 提取关键事实 | **MVP** | 获取页面上下文→callLLM→事实列表 |
| 情绪检测 | **MVP** | 选中文本→分析→展示结果（原独立工具，现归入trae宝） |
| 翻译 | **Phase 2延后** | 多语言翻译，MVP不做 |
| 会话跨页面保留 | **MVP** | traeBotStore + localStorage |
| 限流 | **MVP** | 每用户每分钟3条消息上限 |
| 页面上下文注入 | **MVP** | usePageContext() hook |

### 2.3 不做清单

| 不做项 | 原因 |
|--------|------|
| 多模态对话 | MVP只做文字 |
| 主动推送 | 不打扰用户，被动响应 |
| 多agent协作 | 单agent足够，复杂任务引导到工作间 |
| 深度佐证 | 纯展示，佐证在工作间完成 |
| 语音输入 | MVP只做文字输入 |
| 自定义人格 | 固定一种陪伴型人格 |

---

## 三、技术架构

### 3.1 前端文件结构

```
src/
  components/
    trae-bot/
      TraeBotWidget.tsx          -- 右下角悬浮入口（聊天气泡图标）
      TraeBotPanel.tsx           -- 展开后的聊天面板
      TraeBotMessageList.tsx     -- 消息列表
      TraeBotInput.tsx           -- 输入框+发送按钮
      TraeBotQuickActions.tsx    -- 快捷操作（总结/提取事实/情绪检测）
      TraeBotContextBanner.tsx   -- 顶部显示当前页面上下文来源
  hooks/
    usePageContext.ts            -- 页面上下文注入接口
  services/
    traeBotService.ts            -- trae宝AI服务（调用callLLM）
  stores/
    traeBotStore.ts              -- trae宝状态（会话+上下文+限流）
```

### 3.2 页面上下文注入接口

```typescript
// hooks/usePageContext.ts

interface PageContext {
  type: 'melon-detail' | 'community-post' | 'hot-event' | 'melon-list' | 'community-list' | 'hot-list'
  title: string
  content: string        // 正文文本（已清洗，去除HTML标签）
  metadata?: {
    melonId?: string
    communityId?: string
    hotEventId?: string
  }
}

const PageContextContext = createContext<PageContext | null>(null)

export function usePageContext(): PageContext | null {
  return useContext(PageContextContext)
}

// 使用方（trae宝）：
const pageContext = usePageContext()
if (pageContext) {
  // 注入到LLM调用上下文
  traeBotService.chat(message, pageContext)
}
```

**各页面实现注入**：

```typescript
// MelonDetailPage.tsx
<PageContextProvider value={{
  type: 'melon-detail',
  title: melon.title,
  content: melon.description + evidences.map(e => e.content).join('\n'),
  metadata: { melonId: melon.id }
}}>
  <MelonDetail />
  <TraeBotWidget />
</PageContextProvider>

// CommunityDetailPage.tsx
<PageContextProvider value={{
  type: 'community-post',
  title: post.title,
  content: post.content + comments.map(c => c.content).join('\n'),
  metadata: { communityId: post.communityId }
}}>
  <CommunityPost />
  <TraeBotWidget />
</PageContextProvider>

// HotEventDetailPage.tsx
<PageContextProvider value={{
  type: 'hot-event',
  title: event.title,
  content: event.description + timeline.join('\n'),
  metadata: { hotEventId: event.id }
}}>
  <HotEventDetail />
  <TraeBotWidget />
</PageContextProvider>
```

### 3.3 traeBotStore 设计

```typescript
// stores/traeBotStore.ts

interface TraeBotState {
  messages: TraeBotMessage[]        // 会话消息
  isOpen: boolean                   // 面板是否展开
  pageContext: PageContext | null   // 当前页面上下文
  rateLimitCounter: number          // 当前分钟内已发消息数
  rateLimitResetAt: timestamp        // 限流重置时间
}

interface TraeBotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  contextSnapshot?: {                // 发送时的页面上下文快照
    type: PageContext['type']
    title: string
  }
}

// 持久化：
// - messages 数组存入 localStorage，key: 'jw_traebot_messages'
// - 切页面不丢失上下文
// - 最多保留最近50条消息（防止localStorage溢出）

// 限流逻辑：
const RATE_LIMIT_PER_MINUTE = 3

function canSendMessage(state): { allowed: boolean; reason?: string } {
  const now = Date.now()
  // 重置计数
  if (now >= state.rateLimitResetAt) {
    state.rateLimitCounter = 0
    state.rateLimitResetAt = now + 60000
  }
  if (state.rateLimitCounter >= RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, reason: '每分钟最多3条消息，请稍后再试' }
  }
  return { allowed: true }
}
```

### 3.4 出现/隐藏控制

```typescript
// TraeBotWidget.tsx
const location = useLocation()

// 显示trae宝的页面路径前缀
const VISIBLE_PATHS = [
  '/melon',      // 瓜田列表+详情
  '/community',  // 社区列表+详情
  '/hot',        // 热点列表+详情
]

const shouldShow = VISIBLE_PATHS.some(p => location.pathname.startsWith(p))

if (!shouldShow) return null
```

---

## 四、核心功能详细设计

### 4.1 聊天

**调用方式**：
```
traeBotService.ts → llmStore.callLLM(chatPrompt, { messages, pageContext })
```

**Prompt构造**：
```
你是trae宝，观微的AI陪伴助手。用户正在浏览内容，你可以：
1. 回答用户问题
2. 基于当前页面内容对话

当前页面上下文：
类型：{pageContext.type}
标题：{pageContext.title}
内容：{pageContext.content}

对话历史：
{messages}

请友好、简洁地回复。
```

**超时降级**：
```
callLLM(chatPrompt, { signal: AbortSignal.timeout(12000) })
  ├─ 成功 → 返回回复
  ├─ 12秒超时 → 返回"AI暂时走神了，请稍后再试"
  └─ LLM不可用 → 返回"AI助手暂时不可用，请稍后再试"
```

### 4.2 总结当前文章

**流程**：
```
用户点击"总结"快捷按钮
  ↓
获取 usePageContext() → pageContext.content
  ↓
traeBotService.ts → callLLM(summaryPrompt, { content: pageContext.content })
  ↓
返回3-5句话摘要
  ↓
在聊天面板展示摘要，附带来源"基于当前文章：{pageContext.title}"
```

**Prompt**：
```
请用3-5句话总结以下内容，突出核心信息和关键结论：

{content}
```

**降级**：
- 页面上下文为空 → 提示"当前页面没有可总结的内容"
- LLM超时 → "总结生成超时，请稍后再试"

### 4.3 提取关键事实

**流程**：
```
用户点击"提取事实"快捷按钮
  ↓
获取 usePageContext() → pageContext.content
  ↓
traeBotService.ts → callLLM(factsPrompt, { content: pageContext.content })
  ↓
返回事实列表（JSON格式）
  ↓
在聊天面板展示事实列表，每条标注是否需要核查
```

**Prompt**：
```
从以下内容中提取关键事实，返回JSON格式：
{
  "facts": [
    { "statement": "事实陈述", "verifiable": true/false, "confidence": "high/medium/low" }
  ]
}

内容：
{content}
```

### 4.4 情绪检测

**流程**：
```
用户在页面选中文本（window.getSelection）
  ↓
trae宝检测到选中文本，弹出"检测情绪"按钮
  ↓
用户点击 → traeBotService.ts → callLLM(emotionPrompt, { selectedText })
  ↓
返回情绪分析结果
  ↓
在聊天面板展示结果
```

**Prompt**：
```
分析以下文本的情绪倾向和客观性程度，返回JSON：
{
  "emotion": "positive/negative/neutral",
  "intensity": "high/medium/low",
  "objectivity": "high/medium/low",
  "analysis": "50字以内的分析说明"
}

文本：
{selectedText}
```

**说明**：情绪检测原是求证工具集的独立工具页 `/tools/emotion`，现已归入trae宝，路由移除。

### 4.5 分析结果纯展示

```
trae宝的所有分析结果（总结/事实/情绪）仅展示在聊天面板中。
不提供"提交为佐证"等深度操作按钮。

用户想深入：
  ↓
trae宝回复末尾附带"去工作间深入佐证"按钮
  ↓
navigate('/agent-world')
  ↓
工作间打开，用户手动创作

这样设计的原因：
- trae宝是轻量陪伴，不承担生产职责
- 深度佐证需要结构化编辑器+LLM求证，只有工作间具备
- 职责分离，避免trae宝变重
```

---

## 五、会话跨页面保留

### 5.1 持久化设计

```
traeBotStore:
  - messages 数组 → localStorage 'jw_traebot_messages'
  - 每次新增消息后立即写入
  - 最多保留最近50条（FIFO，超出删最早的）
  - 每条消息附带 contextSnapshot 记录发送时的页面上下文

恢复逻辑：
  - trae宝组件挂载时 → localStorage.getItem('jw_traebot_messages')
  - 有历史消息 → 展示在列表中
  - 顶部显示"会话已从上次保留"
```

### 5.2 跨页面场景

```
场景1：用户在瓜详情页与trae宝聊天 → 跳转到社区帖子页
  - 会话保留，消息列表不丢失
  - pageContext 更新为社区帖子内容
  - 新消息使用新的pageContext

场景2：用户在瓜田列表页 → 进入工作间
  - trae宝隐藏（工作间不显示）
  - 会话仍保留在localStorage
  - 返回瓜田列表 → trae宝恢复，展示历史会话

场景3：用户关闭浏览器再打开
  - 会话从localStorage恢复
  - 限流计数器重置（按时间窗口计算）
```

---

## 六、限流设计

### 6.1 限流规则

```
每用户每分钟3条消息上限

计数方式：
- 基于localStorage存储 rateLimitCounter 和 rateLimitResetAt
- 第一次发送消息时，rateLimitResetAt = now + 60000，counter = 1
- 每次发送前检查：now < rateLimitResetAt 且 counter >= 3 → 拒绝
- now >= rateLimitResetAt → 重置 counter = 0，rateLimitResetAt = now + 60000

限制范围：
- 聊天消息计入限流
- 总结/提取事实/情绪检测 不计入聊天限流，但有独立冷却（每个能力10秒冷却）
```

### 6.2 用户体验

```
达到限流时：
  - 输入框置灰
  - 提示"每分钟最多3条消息，{剩余秒数}秒后可继续"
  - 倒计时显示

快捷操作冷却：
  - 点击"总结"后10秒内该按钮置灰
  - 防止快速重复调用
```

---

## 七、异常场景应对

### 7.1 LLM不可用

| 场景 | 处理 |
|------|------|
| callLLM超时（12秒） | 返回"AI暂时走神了，请稍后再试" |
| LLM provider未配置 | 返回"AI助手未配置，请在设置页配置LLM" |
| 返回格式错误 | 重试1次，仍失败返回"AI回复异常，请重试" |

### 7.2 页面上下文为空

```
场景：用户在瓜田列表页（无具体文章内容）
处理：
  - pageContext.type = 'melon-list'
  - pageContext.content = '' 或列表摘要
  - "总结"和"提取事实"按钮置灰，提示"请进入具体内容页面使用此功能"
  - 聊天功能仍可用，但不注入文章上下文
```

### 7.3 localStorage 写入失败

```
场景：隐私模式或localStorage已满
处理：
  - 会话仅在内存中保留
  - 提示"会话可能不会跨页面保留"
  - 不阻塞聊天功能
```

### 7.4 消息历史过多

```
场景：消息超过50条
处理：
  - 删除最早的未标记消息
  - 用户手动"收藏"的消息不删除
  - 提示"已清理较早的会话记录"
```

---

## 八、与其他模块的联动

```
trae宝 → LLM配置
  通过 llmStore.callLLM() 统一入口，跟随用户配置的provider

trae宝 → 工作间
  分析结果纯展示 → "去工作间深入佐证"按钮 → navigate('/agent-world')
  工作间不显示trae宝

trae宝 → 瓜田/社区/热点
  通过 usePageContext() 获取页面内容
  页面需实现 PageContextProvider 注入

trae宝 → 用户体系（限流）
  基于用户ID或设备指纹限流
  MVP阶段用localStorage计数，v2迁移到后端
```

---

## 九、实现路径

### Phase 1：基础聊天 + 页面上下文注入（2天）

| 任务 | 交付物 | 验证方式 |
|------|--------|---------|
| 实现 TraeBotWidget.tsx 右下角悬浮入口 | 悬浮按钮可见 | 瓜田/社区/热点页显示，工作间/娱乐大厅不显示 |
| 实现 TraeBotPanel.tsx 聊天面板 | 面板可展开收起 | 点击展开，可输入消息 |
| 实现 usePageContext() hook | 上下文注入接口 | 瓜详情/社区帖子/热点详情页注入成功 |
| 实现 traeBotService.ts → callLLM() | 聊天可用 | 发送消息收到回复 |
| 实现 traeBotStore.ts + localStorage | 会话持久化 | 切页面不丢失，刷新不丢失 |

### Phase 2：总结 + 提取事实 + 情绪检测 + 限流（2天）

| 任务 | 交付物 | 验证方式 |
|------|--------|---------|
| 实现 TraeBotQuickActions.tsx | 快捷按钮可用 | 总结/提取事实/情绪检测按钮可点击 |
| 总结当前文章 | 3-5句话摘要 | 点击总结→返回摘要 |
| 提取关键事实 | 事实列表 | 点击提取→返回事实列表 |
| 情绪检测 | 选中文本→分析 | 选中文本→点击检测→返回情绪结果 |
| 限流实现 | 每分钟3条上限 | 第4条被拒绝，提示倒计时 |
| "去工作间深入佐证"按钮 | 跳转入口 | 点击→navigate('/agent-world') |

**总计：4个工作日**

---

> trae宝是观微消费侧的AI伴侣——右下角悬浮，随时待命。
> 轻量陪伴，分析纯展示，深度佐证引导到工作间。
> 会话跨页面保留，限流防滥用，LLM超时优雅降级。
