# 辩论场双模式 Demo 实现计划

> **目标**：完成模式1（娱乐辩论·6人独立麦位）和模式2（专业国赛辩论）的 Demo，能看到交互即可
> **架构**：模式1新建独立类型+服务+页面；模式2修复已有代码
> **技术栈**：React 19 + TypeScript + TailwindCSS v4 + Zustand

---

## 文件结构

### 新建文件

| 文件 | 职责 |
|------|------|
| `src/types/entertainmentDebate.ts` | 娱乐辩论类型：6独立麦位、排队队列、认可度积分 |
| `src/services/entertainmentDebateService.ts` | 娱乐辩论 Mock 服务：房间创建、AI发言、AI评分、排队 |
| `src/pages/EntertainmentRoomPage.tsx` | 娱乐辩论房间页：6麦位舞台+排队区+发言计时+高光榜 |
| `src/components/debate/EntertainmentStage.tsx` | 6麦位舞台组件 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `src/pages/DebateLobby.tsx` | 文案从"1v5"改为"6人独立麦位"，玩法说明更新 |
| `src/router/routes.ts` | `/entertainment/debate/room/:roomId` 指向 EntertainmentRoomPage |
| `src/entry/WebApp.tsx` | 导入 EntertainmentRoomPage 替换 DebateRoomPage |
| `src/entry/MobileApp.tsx` | 同上 |
| `src/services/nationalDebateService.ts` | 修复 DebateSide 类型导入缺失 |

---

## Task 1: 修复 nationalDebateService.ts 类型导入

**文件：** `src/services/nationalDebateService.ts:5-11`

- 在 import 列表中添加 `type DebateSide`

---

## Task 2: 创建娱乐辩论类型 `entertainmentDebate.ts`

**文件：** `src/types/entertainmentDebate.ts`

定义 6 人独立麦位的核心类型：

```typescript
/** 麦位状态 */
export type MicStatus = 'empty' | 'speaking' | 'idle'

/** 麦位（6个，无阵营） */
export interface MicSeat {
  index: number  // 0-5
  status: MicStatus
  userId?: string
  nickname?: string
  avatar?: string
  isAI: boolean
  score: number       // 认可度积分
  totalLikes: number  // 累计获赞
}

/** 排队队列条目 */
export interface QueueEntry {
  id: string
  userId: string
  nickname: string
  avatar: string
  opinion: string     // 提交的观点
  queuedAt: string
  isAI: boolean
}

/** 单条发言 */
export interface EntSpeech {
  id: string
  seatIndex: number
  nickname: string
  avatar: string
  content: string
  duration: number    // 发言时长(秒)
  aiScore: { seriousness: number; information: number }  // 认真度/信息量 0-10
  likes: number
  isAI: boolean
  isHighlight: boolean
  createdAt: string
}

/** 娱乐辩论房间 */
export interface EntRoom {
  id: string
  topic: string
  seats: MicSeat[6]
  speeches: EntSpeech[]
  queue: QueueEntry[]
  spectators: number
  currentSpeakerIndex: number | null
  speakTimer: number       // 当前发言剩余秒数
  status: 'waiting' | 'live' | 'ended'
  highlights: EntSpeech[]
  createdAt: string
}

/** Demo 辩题 */
export const ENT_TOPICS = [
  '短视频让年轻人更聪明还是更笨？',
  '如果有一个按钮能知道对象所有过往，你按不按？',
  '大学生该不该在朋友圈屏蔽父母？',
  'AI对象算不算精神出轨？',
  '年轻人"躺平"是清醒还是懦弱？',
  '朋友圈三天可见是自我保护还是冷漠？',
]

/** AI 昵称池 */
export const AI_NICKNAMES = [
  '逻辑怪', '吃瓜达人', '理性派', '侦探小白', '硬核玩家', '围观群众',
]

/** AI 观点模板 */
export const AI_OPINIONS = [
  '我觉得这个问题不能一概而论，需要分情况讨论。',
  '从心理学角度看，这反映了当代年轻人的焦虑感。',
  '数据不会说谎，但数据的解读可以骗人。',
  '我反对主流观点，这里面有一个被忽略的维度。',
  '这不是对错的问题，而是价值观优先级的问题。',
]

/** AI 发言模板 */
export const AI_SPEECHES = [
  '刚才那位朋友说得有道理，但我想补充一个不同角度。很多人只看到了表面现象，却忽略了背后的结构性原因。我们不能用个例代替整体，也不能用情绪代替论证。真正的问题在于，我们如何在这个信息爆炸的时代保持独立思考的能力。',
  '我不同意"一刀切"的做法。首先，每个人的情况不同，用同一标准衡量所有人本身就是不公平的。其次，历史经验告诉我们，任何极端化的立场最终都会走向反面。我们需要的是平衡，是理性讨论的空间，而不是非黑即白的站队。',
  '让我说一个真实经历。我室友就遇到过类似情况，当时他也觉得无所谓，但半年后发现影响远比想象的大。这让我意识到，很多事情短期看是小事，长期看却是大事。所以我的建议是：做决定之前，先想想三年后的自己会不会后悔。',
  '我觉得大家忽略了一个关键点：这不是个人选择的问题，而是环境压力的问题。当所有人都在内卷的时候，你"躺平"就会被淘汰；当所有人都在焦虑的时候，你"佛系"就会被边缘化。所以与其讨论该不该，不如讨论怎么改变这个环境。',
]
```

---

## Task 3: 创建娱乐辩论 Mock 服务 `entertainmentDebateService.ts`

**文件：** `src/services/entertainmentDebateService.ts`

核心函数：
- `createEntRoom(topic)` — 创建6麦位房间，3个AI占位+3个空位
- `generateAISpeech(topic, seatIndex)` — 返回 AI 发言（从模板池取，模拟延迟）
- `scoreSpeech(content)` — AI评分（mock: 根据长度和关键词给分）
- `getAIQueueEntry()` — 生成AI排队条目
- `getDemoDuration(original)` — Demo加速 (45s→8s)

---

## Task 4: 创建娱乐辩论舞台组件 `EntertainmentStage.tsx`

**文件：** `src/components/debate/EntertainmentStage.tsx`

6个麦位环形/网格布局，每个麦位显示：
- 头像 + 昵称
- 状态标识（发言中=脉冲动画 / 空位=虚线框 / 等待=灰色）
- 认可度积分
- 当前发言时显示计时进度环

---

## Task 5: 创建娱乐辩论房间页 `EntertainmentRoomPage.tsx`

**文件：** `src/pages/EntertainmentRoomPage.tsx`

Demo 交互流程：
1. 进入页面 → 自动创建房间，3个AI已在麦上，3个空位
2. AI 轮流发言（8秒计时，到时自动切换）
3. 用户点击"我要上麦"→ 输入观点 → AI审核(mock 800ms通过) → 进入排队
4. 轮到用户时 → 输入框解锁 → 8秒计时 → 提交发言
5. AI评分 → 高分(>7)续麦，普通分回队列
6. 观众可点"送花"给发言点赞
7. 右侧/底部显示高光发言榜

---

## Task 6: 修改路由和入口

- `routes.ts`：`/entertainment/debate/room/:roomId` 指向 EntertainmentRoomPage
- `WebApp.tsx` / `MobileApp.tsx`：替换导入
- `DebateLobby.tsx`：更新文案

---

## Task 7: 构建验证

运行 `npx tsc --noEmit` 和 `npx vite build` 确保无错误。
