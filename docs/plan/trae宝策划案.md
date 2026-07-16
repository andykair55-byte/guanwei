# 观微「小微（trae宝）」策划案

> 版本：v1.1 | 更新日期：2026-07-16 | 状态：命名与代码现状对齐
>
> **v1.1 修订说明**：
> v1.0 命名与代码不一致（策划用 `trae宝`/`TraeBotWidget`/`traeBotStore`，代码用 `小微`/`XiaoWei`/`xiaoWeiStore`）；
> v1.0 描述 6 组件拆分，实际为单一 `TraeBot.tsx`；
> v1.0 说 `/tools/emotion` 路由应移除，实际仍存在。
> 本次修订：全文统一命名为"小微（trae宝）"，store 名 `xiaoWeiStore`，组件名 `TraeBot`；
> 组件拆分描述更正为单一组件；`/tools/emotion` 描述更正为"保留，与小微情绪检测重叠，待整合"。

---

## 一、模块定位

**小微（trae宝）是观微的右下角全局聊天agent——以陪伴为主，在内容消费页面提供轻量AI能力。用户在瓜田、社区、热点详情页浏览时，小微随时待命：聊天、总结当前文章、提取关键事实、情绪检测。分析结果纯展示，深度佐证引导到工作间完成。**

解决的问题：
1. **消费侧无AI陪伴**——用户读长文累、抓不住重点，小微一键总结3-5句话摘要
2. **关键事实埋没**——文章信息密度高但关键事实难提取，小微提取事实列表
3. **情绪判断缺失**——用户看不出文本的情绪倾向，小微选中文本即分析
4. **工具入口分散**——情绪检测原是独立工具页，小微内亦含此能力，二者待整合

给谁用：所有在内容消费页面浏览的用户。

**定位与工作间的分工**：
- 小微（trae宝）：消费侧，轻量陪伴，分析结果纯展示
- 工作间：生产侧，深度创作，LLM求证嵌入
- 小微分析结果→用户想深入→"去工作间佐证"按钮→navigate('/agent-world')

---

## 二、MVP 范围定义

### 2.1 出现与隐藏规则

| 页面 | 是否显示小微（trae宝） | 说明 |
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

| 能力 | 图标 | 状态 | 说明 |
|------|------|------|------|
| 聊天 | `MessageCircle` | **MVP（已实现）** | 调用 callLLM，12秒超时降级 |
| 总结当前文章 | `FileText` | **MVP（已实现）** | 获取页面上下文→callLLM→3-5句话摘要 |
| 提取关键事实 | `ListChecks` | **MVP（已实现）** | 获取页面上下文→callLLM→事实列表 |
| 情绪检测 | `Brain` | **MVP（已实现）** | 选中文本→分析→展示结果（与独立工具页 `/tools/emotion` 重叠） |
| 翻译 | — | **Phase 2延后** | 多语言翻译，MVP不做 |
| 会话跨页面保留 | — | **MVP（已实现）** | `xiaoWeiStore` + persist 中间件 + localStorage |
| 历史会话切换 | `History` | **MVP（已实现）** | 多会话列表，新建/切换/删除 |
| 限流 | — | **MVP（已实现）** | 每用户每分钟3条消息上限 |
| 页面上下文注入 | — | **MVP（已实现）** | `pageContext` 字段，由各详情页写入 |

### 2.3 不做清单

| 不做项 | 原因 |
|--------|------|
| 多模态对话 | MVP只做文字 |
| 主动推送 | 不打扰用户，被动响应 |
| 多agent协作 | 单agent足够，复杂任务引导到工作间 |
| 深度佐证 | 纯展示，佐证在工作间完成 |
| 语音输入 | MVP只做文字输入 |
| 自定义人格 | 固定一种陪伴型人格（"小薇"） |

---

## 三、技术架构

### 3.1 前端文件结构（v1.1 更正为单一组件）

```
src/
  components/
    TraeBot.tsx                   # 单一组件，内含 Widget/Panel/MessageList/Input/QuickActions/ContextBanner 等逻辑分区
                                  # （v1.0 曾描述 6 组件拆分，实际未拆，统一在此文件内）
  stores/
    xiaoWeiStore.ts               # 小微状态（会话数组+上下文+限流），zustand + persist 中间件
  services/
    emotionAnalysis.ts            # 情绪分析 service（与 EmotionDetector.tsx 共用）
  stores/
    llmStore.ts                   # callLLM 统一入口（小微调用）
```

> 注：v1.0 描述的 `trae-bot/` 目录（TraeBotWidget/TraeBotPanel/TraeBotMessageList/TraeBotInput/TraeBotQuickActions/TraeBotContextBanner 6 个文件）**实际未拆分**，所有逻辑合并于单一 `TraeBot.tsx`。后续若组件膨胀可再拆分。

### 3.2 页面上下文注入接口

```typescript
// stores/xiaoWeiStore.ts 内定义
export interface PageContext {
  type: 'melon' | 'community' | 'hot' | null
  title: string
  content: string        // 正文文本（已清洗，去除HTML标签）
  url: string
}

// 使用方（TraeBot.tsx）：
const pageContext = useXiaoWeiStore(s => s.pageContext)
if (pageContext) {
  // 注入到LLM调用上下文
  const systemPrompt = `你是小薇，一个陪伴用户看文章的AI助手。用户正在阅读：《${pageContext.title}》\n\n文章内容：\n${pageContext.content}`
}
```

**各详情页通过 `setPageContext` 写入上下文**：

```typescript
// MelonDetailPage 等
useXiaoWeiStore.getState().setPageContext({
  type: 'melon',
  title: melon.title,
  content: melon.description + evidences.map(e => e.content).join('\n'),
  url: `/melon/${melon.id}`
})
```

### 3.3 xiaoWeiStore 设计

```typescript
// stores/xiaoWeiStore.ts

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface Conversation {
  id: string
  title: string                  // 用第一条用户消息前 20 字作为标题
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

interface XiaoWeiStore {
  conversations: Conversation[]  // 多会话数组（v1.0 单 messages 数组已更正）
  activeId: string | null
  isOpen: boolean
  showHistory: boolean
  pageContext: PageContext | null
  isTyping: boolean
  lastMessageTime: number
  messageCount: number           // 当前分钟内已发消息数
  minuteStart: number            // 当前分钟起点
  // Actions
  toggleOpen / setOpen / toggleHistory
  addMessage / setTyping / setPageContext
  canSendMessage / resetMessageCount
  newConversation / switchConversation / deleteConversation / getActive
}

// 持久化：
// - 通过 zustand persist 中间件自动写入 localStorage
// - 会话数组（conversations）跨页面/刷新保留
// - 限流计数（messageCount + minuteStart）同样持久化，按时间窗口计算
// - 小微首次介绍标记：localStorage key 'guanwei-xiaowei-introduced'（在 TraeBot.tsx 内手动管理）

// 限流逻辑（canSendMessage）：
const RATE_LIMIT_PER_MINUTE = 3
// now - minuteStart > 60000 → 重置 messageCount=0、minuteStart=now，放行
// 否则 messageCount < 3 → 放行
// 否则 → 拒绝（TraeBot.tsx 内提示"小薇需要休息一下，稍后再试"）
```

### 3.4 出现/隐藏控制

```typescript
// TraeBot.tsx
// 实际由各页面是否调用 setPageContext 决定，配合路由判断
// 显示小微的页面路径前缀
const VISIBLE_PATHS = [
  '/melon',      // 瓜田列表+详情
  '/community',  // 社区列表+详情
  '/hot',        // 热点列表+详情
]

const shouldShow = VISIBLE_PATHS.some(p => location.pathname.startsWith(p))
if (!shouldShow) return null
```

### 3.5 LLM 调用与超时降级

```typescript
// TraeBot.tsx 内的 withTimeout 工具函数
function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>
}

// 调用：
const response = await withTimeout(
  callLLM([
    { role: 'system', content: systemPrompt },
    ...recentMessages.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: text },
  ])
)
// 超时或失败 → 使用 DEMO_* 常量降级（DEMO_SUMMARY / DEMO_FACTS / DEMO_EMOTION_RESULT）
```

---

## 四、核心功能详细设计

### 4.1 聊天（MessageCircle）

**调用方式**：
```
TraeBot.tsx → callLLM([{system: 小薇prompt}, ...recentMessages, {user: text}]) + withTimeout(12s)
```

**System Prompt 构造**：
```
有页面上下文时：
你是小薇，一个陪伴用户看文章的AI助手。用户正在阅读：《{pageContext.title}》

文章内容：
{pageContext.content}

无页面上下文时：
你是小薇，一个陪伴用户看文章的AI助手。回答简洁友好，用中文。
```

**消息窗口**：取最近 20 条消息（`messages.slice(-20)`）作为上下文，避免 token 超限。

**超时降级**：
```
callLLM(...) + withTimeout(12000)
  ├─ 成功 → 返回回复
  ├─ 12秒超时 → 抛 Error('timeout')，进入降级分支
  └─ LLM不可用 → 抛异常，进入降级分支
降级分支：使用 DEMO_SUMMARY / DEMO_FACTS / DEMO_EMOTION_RESULT 等 mock 文本回应用户
```

### 4.2 总结当前文章（FileText）

**流程**：
```
用户点击 FileText 快捷按钮
  ↓
获取 pageContext.content
  ↓
callLLM(summaryPrompt, { content: pageContext.content }) + withTimeout
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
- LLM超时 → 使用 `DEMO_SUMMARY` mock 文本兜底

### 4.3 提取关键事实（ListChecks）

**流程**：
```
用户点击 ListChecks 快捷按钮
  ↓
获取 pageContext.content
  ↓
callLLM(factsPrompt, { content: pageContext.content }) + withTimeout
  ↓
返回事实列表
  ↓
在聊天面板展示事实列表
```

**降级**：LLM 超时或无上下文 → 使用 `DEMO_FACTS` mock 文本兜底。

### 4.4 情绪检测（Brain）

**流程**：
```
用户在页面选中文本（window.getSelection）
  ↓
TraeBot 检测到选中文本，弹出"检测情绪"按钮
  ↓
用户点击 → analyzeEmotion(selectedText)（来自 services/emotionAnalysis.ts）
  ↓
返回情绪分析结果
  ↓
在聊天面板展示结果
```

**关键说明**：
- 小微内的情绪检测调用 `services/emotionAnalysis.ts` 的 `analyzeEmotion`
- 独立工具页 `src/pages/EmotionDetector.tsx`（路由 `/tools/emotion`）**同样调用此 service**
- v1.0 说"路由 `/tools/emotion` 移除"，实际**仍保留**——两处能力重叠，待后续整合
- 整合方向待定：可保留独立页做深度分析、小微内做轻量即时分析；或二选一

### 4.5 分析结果纯展示

```
小微的所有分析结果（总结/事实/情绪）仅展示在聊天面板中。
不提供"提交为佐证"等深度操作按钮。

用户想深入：
  ↓
小微回复末尾附带"去工作间深入佐证"按钮
  ↓
navigate('/agent-world')
  ↓
工作间打开，用户手动创作

这样设计的原因：
- 小微是轻量陪伴，不承担生产职责
- 深度佐证需要结构化编辑器+LLM求证，只有工作间具备
- 职责分离，避免小微变重
```

---

## 五、会话跨页面保留

### 5.1 持久化设计

```
xiaoWeiStore（zustand + persist 中间件）：
  - conversations 数组 → 自动写入 localStorage
  - 每次新增消息后由 persist 自动同步
  - 多会话结构：每个 Conversation 含 id/title/messages/createdAt/updatedAt
  - 首条用户消息前 20 字作为会话标题

恢复逻辑：
  - TraeBot 组件挂载时 → persist 自动从 localStorage 恢复 conversations
  - 有历史会话 → 展示在历史列表（showHistory 控制）
  - 切换会话 → switchConversation(id) 设置 activeId
  - 新建会话 → newConversation()
  - 删除会话 → deleteConversation(id)
```

### 5.2 跨页面场景

```
场景1：用户在瓜详情页与小微聊天 → 跳转到社区帖子页
  - 会话保留（conversations 持久化）
  - pageContext 更新为社区帖子内容（由详情页 setPageContext 写入）
  - 新消息使用新的 pageContext

场景2：用户在瓜田列表页 → 进入工作间
  - 小微隐藏（工作间不在 VISIBLE_PATHS）
  - 会话仍保留在 localStorage
  - 返回瓜田列表 → 小微恢复，展示历史会话

场景3：用户关闭浏览器再打开
  - 会话从 localStorage 恢复（persist 中间件）
  - 限流计数器按时间窗口重新计算（minuteStart 字段持久化）
```

### 5.3 首次介绍引导

```
TraeBot 组件挂载时检查 localStorage：
  - key: 'guanwei-xiaowei-introduced'
  - 不存在 → 展示 showIntro 引导层 3 秒 → 写入 '1' 标记
  - 存在 → 跳过引导
```

---

## 六、限流设计

### 6.1 限流规则

```
每用户每分钟3条消息上限

实现（xiaoWeiStore.canSendMessage）：
- 字段：messageCount（已发数）、minuteStart（当前分钟起点）
- 每次发送前检查：now - minuteStart > 60000 → 重置 messageCount=0、minuteStart=now，放行
- 否则 messageCount < 3 → 放行，messageCount++
- 否则 → 拒绝

限制范围：
- 聊天消息计入限流
- 总结/提取事实/情绪检测 不计入聊天限流，但有独立冷却（每个能力10秒冷却）
```

### 6.2 用户体验

```
达到限流时（TraeBot.tsx 内）：
  - addMessage({ role: 'assistant', content: '小薇需要休息一下（每分钟限3条消息），稍后再试~' })
  - 不阻塞输入框，但后续发送继续被拒直至窗口重置

快捷操作冷却：
  - 点击快捷按钮后短时间内置灰
  - 防止快速重复调用
```

---

## 七、异常场景应对

### 7.1 LLM不可用

| 场景 | 处理 |
|------|------|
| callLLM超时（12秒） | `withTimeout` 抛 Error('timeout')，进入降级分支，使用 DEMO_* mock 文本回应 |
| LLM provider未配置 | 同上降级，提示用户配置 LLM |
| 返回格式错误 | catch 异常，降级为 DEMO 文本 |

### 7.2 页面上下文为空

```
场景：用户在瓜田列表页（无具体文章内容）
处理：
  - pageContext.type = 'melon' 或 null
  - pageContext.content = '' 或列表摘要
  - "总结"和"提取事实"按钮降级为 DEMO 文本
  - 聊天功能仍可用，systemPrompt 使用无上下文版本
```

### 7.3 localStorage 写入失败

```
场景：隐私模式或 localStorage 已满
处理：
  - persist 中间件自动 catch 写入异常
  - 会话仅在内存中保留，刷新后丢失
  - 不阻塞聊天功能
```

### 7.4 消息历史过多

```
场景：单会话消息超过一定数量
处理：
  - 当前实现未做硬上限，依赖 messages.slice(-20) 控制上下文窗口
  - localStorage 超限由浏览器自动报错，persist 中间件 catch
  - 用户可手动 deleteConversation 清理
```

---

## 八、与其他模块的联动

```
小微（trae宝） → LLM配置
  通过 llmStore.callLLM() 统一入口，跟随用户配置的provider

小微（trae宝） → 工作间
  分析结果纯展示 → "去工作间深入佐证"按钮 → navigate('/agent-world')
  工作间不显示小微

小微（trae宝） → 瓜田/社区/热点
  各详情页通过 setPageContext() 写入页面内容
  小微读取 pageContext 注入 systemPrompt

小微（trae宝） → 情绪检测工具页（/tools/emotion）
  两者共用 services/emotionAnalysis.ts
  能力重叠，待整合

小微（trae宝） → 用户体系（限流）
  MVP 阶段用 localStorage 计数（messageCount + minuteStart）
  v2 迁移到后端
```

---

## 九、代码现状（v1.1 新增）

> 列出实际代码文件与关键实现，供后续维护对照。

### 9.1 文件清单

| 文件 | 作用 | 关键导出 |
|------|------|----------|
| `src/components/TraeBot.tsx` | 单一组件，含 Widget/Panel/MessageList/Input/QuickActions 等逻辑分区 | `default TraeBot` |
| `src/stores/xiaoWeiStore.ts` | 状态管理，zustand + persist | `useXiaoWeiStore`、`ChatMessage`、`Conversation`、`PageContext` |
| `src/stores/llmStore.ts` | LLM 统一调用入口 | `callLLM` |
| `src/services/emotionAnalysis.ts` | 情绪分析 service（与 EmotionDetector 共用） | `analyzeEmotion`、`EmotionAnalysisResult`、`RiskLevel` |

### 9.2 关键实现要点

| 要点 | 实现位置 | 说明 |
|------|----------|------|
| 命名 | 全局 | 组件 `TraeBot`、store hook `useXiaoWeiStore`、助手人格名"小薇"、产品名"小微（trae宝）" |
| 4 大能力 | `TraeBot.tsx` imports | `MessageCircle`（聊天）、`FileText`（总结）、`ListChecks`（提取事实）、`Brain`（情绪检测） |
| 12 秒超时降级 | `TraeBot.tsx` `withTimeout()` | `Promise.race` + `setTimeout(12000)`，超时进入 DEMO 降级 |
| 多会话结构 | `xiaoWeiStore.ts` `Conversation[]` | 支持 `newConversation`/`switchConversation`/`deleteConversation`/`getActive` |
| 持久化 | `xiaoWeiStore.ts` `persist` 中间件 | 自动同步 conversations + 限流计数到 localStorage |
| 首次介绍 | `TraeBot.tsx` | localStorage key `guanwei-xiaowei-introduced`，3 秒引导层 |
| 限流 | `xiaoWeiStore.ts` `canSendMessage` | `messageCount` + `minuteStart`，每分钟 3 条 |
| 页面上下文 | `xiaoWeiStore.ts` `pageContext` | type `'melon' \| 'community' \| 'hot' \| null`，由各详情页 `setPageContext` 写入 |
| 消息窗口 | `TraeBot.tsx` `messages.slice(-20)` | 仅取最近 20 条作为 LLM 上下文 |
| 情绪检测共用 | `services/emotionAnalysis.ts` | `TraeBot.tsx` 与 `EmotionDetector.tsx` 均调用 `analyzeEmotion` |

### 9.3 与 v1.0 策划的差异点

| v1.0 描述 | 实际代码 | v1.1 处理 |
|----------|----------|-----------|
| 6 组件拆分（`trae-bot/` 目录） | 单一 `TraeBot.tsx` | 更正为单一组件，逻辑分区内含 |
| `traeBotStore` | `xiaoWeiStore`（`useXiaoWeiStore`） | 全文统一为 `xiaoWeiStore` |
| `TraeBotWidget` 等组件名 | `TraeBot` | 全文统一为 `TraeBot` |
| `traeBotService.ts` | 无独立 service，直接在组件内调 `callLLM` | 更正描述 |
| localStorage key `jw_traebot_messages` | 由 persist 中间件管理 + `guanwei-xiaowei-introduced` | 更正描述 |
| 单 `messages` 数组 | `conversations: Conversation[]` 多会话结构 | 更正描述 |
| `/tools/emotion` 路由移除 | 路由保留，与小微情绪检测重叠 | 更正为"保留，待整合" |

---

## 十、实现路径

### Phase 1：基础聊天 + 页面上下文注入

| 任务 | 交付物 | 验证方式 |
|------|--------|---------|
| 实现 TraeBot.tsx 右下角悬浮入口 | 悬浮按钮可见 | 瓜田/社区/热点页显示，工作间/娱乐大厅不显示 |
| 实现 TraeBot.tsx 聊天面板 | 面板可展开收起 | 点击展开，可输入消息 |
| 实现 setPageContext 上下文注入 | 上下文写入接口 | 瓜详情/社区帖子/热点详情页注入成功 |
| 调用 callLLM + withTimeout | 聊天可用 | 发送消息收到回复，超时降级 |
| 实现 xiaoWeiStore + persist | 会话持久化 | 切页面不丢失，刷新不丢失 |

### Phase 2：总结 + 提取事实 + 情绪检测 + 限流 + 历史会话

| 任务 | 交付物 | 验证方式 |
|------|--------|---------|
| 实现 FileText/ListChecks/Brain 快捷按钮 | 快捷按钮可用 | 总结/提取事实/情绪检测按钮可点击 |
| 总结当前文章 | 3-5句话摘要 | 点击总结→返回摘要 |
| 提取关键事实 | 事实列表 | 点击提取→返回事实列表 |
| 情绪检测 | 选中文本→分析 | 选中文本→点击检测→返回情绪结果 |
| 限流实现 | 每分钟3条上限 | 第4条被拒绝，提示"小薇需要休息一下" |
| 历史会话 | 多会话切换 | 新建/切换/删除会话正常 |
| 首次介绍引导 | 3秒引导层 | 首次访问展示，后续不再展示 |
| "去工作间深入佐证"按钮 | 跳转入口 | 点击→navigate('/agent-world') |

---

> 小微（trae宝）是观微消费侧的AI伴侣——右下角悬浮，随时待命。
> 轻量陪伴，分析纯展示，深度佐证引导到工作间。
> 会话跨页面保留，限流防滥用，LLM超时优雅降级。
