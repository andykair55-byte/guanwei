# 见微「AI竞技场」策划案

> 版本：v3.0（可落地版）
> 状态：产品策划 + 技术规格
> 最后更新：2025-07

---

## 一、模块定位

**AI竞技场（斗蛐蛐）是观微的病毒传播引擎——用户自定义或选择AI蛐蛐，在擂台上自动辩论，其他用户围观、发弹幕、下注积分。裁判由骰子随机决定，5种风格带来不同的观赛体验。**

解决的问题：
1. 提供"不依赖内容供给"的娱乐体验——AI自动生成内容，永远有得看
2. 制造社交货币——精彩的辩论片段、有趣的裁判点评可分享传播
3. 消耗用户积分——与用户体系联动，形成积分经济闭环

给谁用：所有观微用户，尤其是被瓜田吸引来但想"看热闹"的轻度用户。

---

## 二、MVP范围定义

### 2.1 做什么

| 功能 | 状态 | 说明 |
|------|------|------|
| 6个预设AI角色 | 已实现 | `characters.ts`，有完整prompt |
| 辩题列表 | 已实现 | `debateArenaService.ts`中TOPICS |
| 自动辩论流程 | 已实现 | `runDebate()` + `getMockMatch()` |
| 5种裁判风格 | 已实现 | `refereeService.ts`，有完整prompt |
| 骰子选裁判 | 已实现 | `RefereeDice.tsx` + `pickRandomReferee()` |
| 蛐蛐锻造工坊 | 已实现 | `CricketForge.tsx`，6个预设+自定义+AI润色 |
| 弹幕系统 | **新增** | 观战时发弹幕，带防刷 |
| 下注/竞猜 | **新增** | 用积分押注胜负，与用户体系联动 |
| 完整对战状态机 | **新增** | 匹配→准备→辩论中→裁判评分→结算→展示 |
| 观战页面 | 已实现 | `AIArena.tsx` + `AIBattle.tsx`，需增强 |

### 2.2 砍掉清单

| 砍掉项 | 原因 |
|--------|------|
| 实时PvP对战 | hackathon不需要，AI自动对战已足够 |
| 角色养成/升级 | 过度设计，MVP角色无成长系统 |
| 锦标赛/赛季 | 无用户基础，MVP只做单场 |
| 角色皮肤/装扮 | 锦上添花，MVP用渐变色区分 |
| 回放/录像系统 | 辩论结果实时展示，不需要回放 |
| 观众投票影响结果 | 裁判独立评判，观众下注只是积分游戏 |

---

## 三、技术架构

### 3.1 前端文件结构

```
src/
  pages/
    AIArena.tsx                  -- 竞技场大厅（已存在，需增强）
    AIBattle.tsx                 -- 对战观战页（已存在，需增强）
    CricketForge.tsx             -- 蛐蛐锻造工坊（已存在，需增强）
    DebateLobby.tsx              -- 辩论大厅（已存在）
    DebateRoomPage.tsx           -- 辩论房间（已存在）
  components/
    DanmakuOverlay.tsx           -- 弹幕层（已存在，需增加防刷）
    RefereeDice.tsx              -- 裁判骰子（已存在，需增强交互）
    CharacterIcon.tsx            -- 角色图标（已存在）
    debate/
      BattleArena.tsx            -- 【新增】对战主容器组件
      DebateSpeechBubble.tsx     -- 【新增】发言气泡组件
      ScoreBoard.tsx             -- 【新增】实时记分板
      BetPanel.tsx               -- 【新增】下注面板
      DanmakuInput.tsx           -- 【新增】弹幕输入组件（带防刷）
      RefereeReveal.tsx          -- 【新增】裁判揭晓动画组件
      BattleResultCard.tsx       -- 【新增】对战结果卡片
  services/
    debateArenaService.ts        -- 已存在，需重构状态机
    characters.ts                -- 已存在，6个角色
    refereeService.ts            -- 已存在，5种裁判
    danmakuService.ts            -- 已存在，需增加防刷逻辑
    battleEngine.ts              -- 【新增】对战引擎（状态机核心）
    betService.ts                -- 【新增】下注服务
  stores/
    debateStore.ts               -- 已存在，需扩展
    battleStore.ts               -- 【新增】对战状态store
  config/
    topics.ts                    -- 【新增】辩题配置（从service中分离）
    presets.ts                   -- 【新增】蛐蛐预设配置（从CricketForge中分离）
```

### 3.2 后端API路径（如果需要持久化）

```
backend/
  api/
    battles.py                   -- 【新增】对战记录API
    bets.py                      -- 【新增】下注API
    danmaku.py                   -- 【新增】弹幕API（可选，MVP可纯前端）
```

### 3.3 新增Store设计

```typescript
// stores/battleStore.ts
type BattlePhase =
  | 'idle'           // 未开始
  | 'matching'       // 匹配中（选角色+辩题）
  | 'preparing'      // 准备阶段（展示角色+辩题，倒计时）
  | 'dice_rolling'   // 骰子滚动中（选裁判）
  | 'dice_revealed'  // 裁判揭晓
  | 'debating'       // 辩论进行中
  | 'round_scoring'  // 单回合评分展示
  | 'final_scoring'  // 最终评分
  | 'settling'       // 结算中（积分发放）
  | 'finished'       // 结束（展示结果卡片）

interface BattleStore {
  phase: BattlePhase
  battleId: string
  topic: DebateTopic
  affirmChar: AICharacter
  negateChar: AICharacter
  referee: Referee | null
  currentRound: number
  totalRounds: number
  rounds: DebateRound[]
  finalResult: FinalResult | null

  // 下注相关
  userBet: { side: Side; amount: number } | null
  betOdds: { affirm: number; negate: number }

  // 弹幕
  danmakuList: Danmaku[]

  // actions
  startBattle: (topicId: string, affirmCharId?: string, negateCharId?: string) => void
  placeBet: (side: Side, amount: number) => void
  sendDanmaku: (content: string) => void
  nextPhase: () => void
  reset: () => void
}
```

---

## 四、AI角色详细设计

### 4.1 六个预设角色

已有角色在 `src/services/characters.ts` 中定义。以下是每个角色的核心设计方向：

| 角色 | 性格关键词 | 辩论风格 | 弱点 | temperature |
|------|-----------|---------|------|-------------|
| **白泽** | 博学温和、数据派 | 用数据和事实碾压，不急躁 | 面对情感论证时缺乏感染力 | 0.55 |
| **獬豸** | 刚正不阿、逻辑派 | 严密的逻辑链，直击要害 | 不够灵活，容易被诡辩带偏 | 0.45 |
| **鲲鹏** | 豪迈大气、格局派 | 从宏观视角切入，善于类比 | 细节论证不够扎实 | 0.6 |
| **青鸟** | 灵动敏锐、共情派 | 从人的角度论证，感染力强 | 数据支撑薄弱 | 0.7 |
| **玄武** | 沉稳老练、防守派 | 善于找对方漏洞并防守反击 | 主动进攻能力弱 | 0.4 |
| **朱雀** | 热烈激进、进攻派 | 连续追问，不给对方喘息 | 容易过度延伸论证 | 0.75 |

### 4.2 角色Prompt设计原则

每个角色的systemPrompt必须包含以下模块：

```
1. 【身份定义】— 你是谁，一句话人设
2. 【核心风格】— 3-5条辩论行为准则
3. 【语言特征】— 常用句式、口头禅、嘲讽方式
4. 【辩论节奏】— 开场/中场/白热化各阶段策略
5. 【底线规则】— 不人身攻击、尊重对手、不重复论点
6. 【输出格式】— 纯文本，80-150字，不用markdown
```

### 4.3 自定义蛐蛐（CricketForge增强）

已有基础在 `src/pages/CricketForge.tsx`。增强方向：

```
当前流程：选预设 → 自定义prompt → 预览 → 上擂台

增强内容：
1. 预设模板扩充到10个（新增：杠精大爷、考研学霸、社恐程序员、追星少女）
2. AI润色功能增强：
   - 输入一句话描述 → 自动生成完整辩论prompt
   - 调用Groq的llama-3.3-70b，prompt模板如下
3. 自定义蛐蛐的prompt长度限制：100-500字
4. 安全过滤：调用contentFilter.ts检查prompt是否包含违规内容
5. 自定义蛐蛐保存到localStorage（MVP不做服务端持久化）
```

AI润色的system prompt：

```
你是一个辩论选手人设优化师。用户会给你一段蛐蛐的人设描述，你需要把它扩展成完整的辩论system prompt。

要求：
- 保留核心人格和说话风格
- 补充辩论策略（开场/中场/白热化各阶段风格）
- 补充语言特征（常用句式、嘲讽方式）
- 添加底线规则（不人身攻击、尊重对手）
- 添加辩论节奏规则（每轮必须回应对手上一轮论点）
- 总长度200-400字
- 直接输出prompt，不加前缀说明
```

---

## 五、对战状态机（核心新增）

### 5.1 完整状态流转

```
                    ┌──────────┐
                    │   idle   │  用户在竞技场大厅
                    └────┬─────┘
                         │ 点击"开始对战"
                         v
                 ┌───────────────┐
                 │   matching    │  选择辩题+角色
                 │  (用户操作)    │  或随机匹配
                 └───────┬───────┘
                         │ 确认选择
                         v
                 ┌───────────────┐
                 │   preparing   │  展示对阵信息
                 │  (3秒倒计时)   │  "白泽 vs 獬豸"
                 └───────┬───────┘    辩题展示
                         │ 倒计时结束
                         v
                 ┌───────────────┐
                 │ dice_rolling  │  骰子动画
                 │  (2秒动画)    │  5面骰子快速滚动
                 └───────┬───────┘
                         │ 骰子停止
                         v
                 ┌───────────────┐
                 │ dice_revealed │  裁判亮相
                 │  (2秒展示)    │  展示裁判名+入场白
                 └───────┬───────┘
                         │ 自动进入
                         v
            ┌────────────────────────┐
            │       debating         │  辩论进行中
            │  ┌─────────────────┐   │
            │  │ Round 1         │   │
            │  │ 正方发言 → 展示 │   │
            │  │ 反方发言 → 展示 │   │
            │  │ 裁判评分 → 展示 │   │
            │  ├─────────────────┤   │
            │  │ Round 2 ...     │   │
            │  │ ...             │   │
            │  └─────────────────┘   │
            │  每回合约15-25秒       │
            └───────────┬────────────┘
                        │ 最后一回合结束
                        v
                 ┌───────────────┐
                 │ final_scoring │  最终评分
                 │  (3秒展示)    │  总分+胜者+裁判总结
                 └───────┬───────┘
                         │
                         v
                 ┌───────────────┐
                 │   settling    │  积分结算
                 │  (1秒)        │  下注结果+积分变动
                 └───────┬───────┘
                         │
                         v
                 ┌───────────────┐
                 │   finished    │  结果卡片
                 │  (用户操作)    │  可分享/再来一场
                 └───────────────┘
```

### 5.2 各阶段时间控制

| 阶段 | 时长 | 说明 |
|------|------|------|
| matching | 用户操作 | 选辩题+角色，无上限 |
| preparing | 3秒 | 对阵展示+倒计时 |
| dice_rolling | 2秒 | 骰子滚动动画 |
| dice_revealed | 2秒 | 裁判亮相+入场白 |
| 每轮-正方发言 | 3-5秒 | LLM生成或mock加载 |
| 每轮-反方发言 | 3-5秒 | 与正方并行生成 |
| 每轮-裁判评分 | 2-3秒 | LLM打分 |
| 每轮-展示间隔 | 1.5秒 | 让观众消化 |
| final_scoring | 3秒 | 最终结果展示 |
| settling | 1秒 | 积分结算动画 |
| **单场总时长** | **约2-4分钟** | 6回合制 |

### 5.3 状态机实现

```typescript
// services/battleEngine.ts

class BattleEngine {
  private store: BattleStore

  async startBattle(topicId: string, affirmCharId?: string, negateCharId?: string) {
    // 1. matching: 选择角色和辩题
    this.setPhase('matching')
    const topic = getTopic(topicId)
    const affirmChar = getCharacter(affirmCharId || pickRandom(ALL_CHARACTERS).id)
    const negateChar = getCharacter(negateCharId || pickRandom(ALL_CHARACTERS).id)

    // 2. preparing: 展示对阵
    this.setPhase('preparing')
    await delay(3000)

    // 3. dice_rolling: 骰子动画
    this.setPhase('dice_rolling')
    await delay(2000)

    // 4. dice_revealed: 裁判揭晓
    const referee = pickRandomReferee()
    this.store.referee = referee
    this.setPhase('dice_revealed')
    await delay(2000)

    // 5. debating: 逐回合进行
    this.setPhase('debating')
    for (let round = 1; round <= this.store.totalRounds; round++) {
      this.store.currentRound = round

      // 双方发言（并行生成）
      const [affirmSpeech, negateSpeech] = await Promise.all([
        generateSpeech(affirmChar, topic, round, history),
        generateSpeech(negateChar, topic, round, history),
      ])

      // 裁判评分
      const score = await judgeRound(referee, topic, affirmSpeech, negateSpeech)

      // 构建回合数据
      const roundData = buildRound(round, affirmSpeech, negateSpeech, score)
      this.store.rounds.push(roundData)

      // 回合间延迟
      if (round < this.store.totalRounds) await delay(1500)
    }

    // 6. final_scoring
    this.setPhase('final_scoring')
    await delay(3000)

    // 7. settling: 积分结算
    this.setPhase('settling')
    await this.settleBets()
    await delay(1000)

    // 8. finished
    this.setPhase('finished')
  }
}
```

---

## 六、裁判系统详细设计

### 6.1 五种裁判风格

已在 `src/services/refereeService.ts` 中完整实现。核心设计：

| 裁判 | 风格 | 点评长度 | 视觉主题 | 入场白 |
|------|------|---------|---------|--------|
| **铁面判官** | 冷静精准，一句话定生死 | ≤15字 | 深灰/暗色 | "开始。" |
| **金牌解说** | 体育赛事解说，激情四射 | ≤20字 | 橙红/热烈 | "各位观众，今晚的大戏开锣了！" |
| **老学究** | 学术腔，引经据典 | ≤20字 | 琥珀/复古 | "让我们从逻辑的起点，审视这场辩论。" |
| **吃瓜裁判** | 网络语言，接地气 | ≤20字 | 绿色/轻松 | "来了来了，让我看看今天谁被锤。" |
| **诗人裁判** | 比喻诗意，字字珠玑 | ≤20字 | 紫罗兰/优雅 | "言语如剑，思想如光。请开始。" |

### 6.2 打分原则（所有裁判一致）

```
打分维度：
- 逻辑性（35%）：论证结构、因果链完整性
- 事实依据（30%）：引用数据、来源可信度
- 说服力（20%）：语言表达、感染力
- 应变能力（15%）：反驳对方论点的有效性

分数范围：0-10整数
- 0-3: 严重失误（逻辑断裂/无证据/跑题）
- 4-5: 平庸（有论点但不够扎实）
- 6-7: 良好（论证完整，有一定说服力）
- 8-9: 优秀（论证有力，反驳精彩）
- 10: 完美（极罕见，需要无懈可击的表现）
```

### 6.3 骰子选裁判交互设计

```
交互流程：
1. 辩论准备阶段结束后，屏幕中央出现一个3D骰子
2. 骰子5面（实际是正方体，第6面是"?"彩蛋面，选中时随机再选一次）
3. 每面显示裁判的icon和颜色渐变
4. 骰子滚动2秒（CSS 3D animation）
5. 骰子停止，顶面朝上 = 选中的裁判
6. 裁判从骰子方向"飞出"，带入场白气泡
7. 背景色渐变为裁判主题色

视觉效果：
- 骰子滚动时屏幕轻微震动（CSS animation: shake）
- 定格时闪光效果（box-shadow pulse）
- 裁判入场白逐字打出（typewriter effect）

技术实现：
- RefereeDice.tsx 已存在
- 增加 CSS 3D transform 动画
- 入场白用 setInterval 逐字显示
```

### 6.4 裁判点评触发时机

| 时机 | 触发条件 | 使用的commentStyles |
|------|---------|-------------------|
| 单回合结束 | 分差≥3 | `blowout` |
| 单回合结束 | 分差≤1 | `close` |
| 单回合结束 | 检测到highlight | `highlight` |
| 最终结果 | 胜方 | `finalWin` |
| 最终结果 | 败方 | `finalLose` |

---

## 七、弹幕系统

### 7.1 功能设计

```
弹幕输入框位于观战页面底部：
- 输入框 + 发送按钮
- 弹幕从右向左飘过屏幕
- 弹幕显示：用户昵称（段位颜色）+ 内容
- 弹幕列表最多同时显示30条，超出自动清理

预设快捷弹幕（点击发送）：
- "666" / "太强了" / "笑死" / "这也能赢？"
- "正方加油" / "反方加油"
- "裁判公正" / "裁判眼瞎"
- "名场面！" / "下注下注"
```

### 7.2 防刷设计

```typescript
// 弹幕防刷规则
const DANMAKU_RATE_LIMIT = {
  // 单用户发送频率限制
  maxPerMinute: 5,          // 每分钟最多5条
  minInterval: 3000,        // 两条之间至少间隔3秒

  // 内容限制
  maxLength: 30,            // 单条弹幕最多30字
  minLength: 1,             // 最少1字

  // 重复检测
  duplicateWindow: 60000,   // 60秒内不允许发送相同内容
  duplicateThreshold: 3,    // 全站相同内容超过3条/分钟后触发限流

  // 全局限流
  globalMaxPerSecond: 10,   // 全站每秒最多10条弹幕
}

// 实现方式（纯前端，MVP不做服务端弹幕）
function canSendDanmaku(userId: string, content: string): boolean {
  // 1. 检查单用户频率
  const userRecent = danmakuHistory.filter(d =>
    d.userId === userId && Date.now() - d.timestamp < 60000
  )
  if (userRecent.length >= DANMAKU_RATE_LIMIT.maxPerMinute) return false

  // 2. 检查最小间隔
  const lastDanmaku = userRecent[0]
  if (lastDanmaku && Date.now() - lastDanmaku.timestamp < DANMAKU_RATE_LIMIT.minInterval) return false

  // 3. 检查重复
  const recentDuplicates = danmakuHistory.filter(d =>
    d.content === content && Date.now() - d.timestamp < DANMAKU_RATE_LIMIT.duplicateWindow
  )
  if (recentDuplicates.length >= DANMAKU_RATE_LIMIT.duplicateThreshold) return false

  // 4. 内容长度
  if (content.length > DANMAKU_RATE_LIMIT.maxLength) return false

  return true
}
```

### 7.3 MVP弹幕方案（纯前端模拟）

```
MVP阶段弹幕不做服务端持久化，采用"本地生成+模拟展示"：
1. 用户发的弹幕只在自己屏幕上显示
2. 同时用LLM/预设模板生成"虚拟观众弹幕"混入
3. 虚拟弹幕频率：每5-10秒一条
4. 虚拟弹幕内容池：50条预设+LLM动态生成

为什么这样做：
- hackathon没有WebSocket基础设施
- 纯前端方案零后端成本
- 用户体验上"看起来热闹"即可
- v2再接入真实多人弹幕
```

虚拟弹幕生成：

```typescript
const FAKE_DANMAKU_POOL = [
  "这局有意思了", "白泽稳了", "獬豸冲啊", "裁判公正一点！",
  "这评分不合理吧", "666666", "笑死我了", "反方这波太强了",
  "正方在说什么...", "名场面！", "下注下注", "我押正方",
  "这个类比绝了", "数据说话！", "别急别急", "精彩精彩",
  // ... 共50条
]

function generateFakeDanmaku(): string {
  // 70%概率从预设池选，30%概率LLM生成
  if (Math.random() < 0.7) {
    return FAKE_DANMAKU_POOL[Math.floor(Math.random() * FAKE_DANMAKU_POOL.length)]
  }
  // LLM生成（调用Groq，低优先级，失败时fallback到预设池）
  // ...
}
```

---

## 八、下注/竞猜系统

### 8.1 基本规则

```
下注流程：
1. 在"preparing"阶段（辩论开始前），展示下注面板
2. 用户选择押注方：正方 or 反方
3. 用户输入下注积分：10/20/50/100/自定义
4. 确认下注 → 积分冻结（从可用积分中扣除）
5. 辩论结束后结算：
   - 猜对：获得 下注金额 × 赔率 的积分
   - 猜错：扣除下注金额

赔率计算：
- 初始赔率基于双方角色的历史胜率
- 如果没有历史数据，默认赔率1.8:1.8（平台抽水10%）
- MVP阶段赔率固定，不做动态调整

积分上限：
- 单场下注上限：用户可用积分的50%
- 单场下注下限：10积分
- 每日下注总上限：200积分（防沉迷）
```

### 8.2 下注面板UI（BetPanel.tsx）

```
┌──────────────────────────────┐
│  🎲 下注                      │
│                                │
│  ┌──────────┐  ┌──────────┐  │
│  │ 🔴 白泽   │  │ 🟢 獬豸   │  │
│  │ 赔率 1.8  │  │ 赔率 1.8  │  │
│  │           │  │           │  │
│  │ 已选 ✓    │  │           │  │
│  └──────────┘  └──────────┘  │
│                                │
│  下注金额：                     │
│  [10] [20] [50] [100] [自定义] │
│                                │
│  当前积分：2850                 │
│  预计赢得：+36                  │
│                                │
│  [确认下注]                     │
└──────────────────────────────┘
```

### 8.3 积分经济联动

```
下注的积分流向：
- 赢家获得的积分 = 输家的下注总额 × (1 - 平台抽水位)
- 平台抽水位：MVP阶段10%
- 如果没人下注或只有一方下注：系统做庄赔付

简化方案（MVP）：
- 不做P2P对赌，系统做庄
- 赔率固定1.8（即押100赢180，净赚80）
- 这样不需要匹配对手，实现简单
```

### 8.4 防刷分

```
下注防刷规则：
1. 每日下注上限200积分
2. 同一场只能下注一次，不可追加
3. 下注后不可撤销
4. 段位低于"瓜田新手"(L2)不可下注（防止新号刷分）
5. 单IP/设备每日下注次数上限10次
```

---

## 九、辩题管理

### 9.1 辩题池

已有辩题在 `debateArenaService.ts` 的 `TOPICS` 数组中。扩充方案：

```
MVP辩题数量：10-15个
分类：
- 社会类（4个）：上大学有用吗、AI取代白领、短视频毁思考、远程办公
- 校园类（3个）：考研还是就业、大学该不该禁手机、绩点制合理吗
- 科技类（3个）：开源vs闭源、隐私vs安全、算法推荐好坏
- 生活类（3个）：外卖健康吗、熬夜可逆吗、社交恐惧是病吗

辩题格式：
{
  id: string,
  title: string,              // "现在上大学还有没有用？"
  category: string,           // "社会"
  affirmLabel: string,        // "有用"
  negateLabel: string,        // "没用"
  heat: number,               // 热度值（初始随机1000-15000）
  status: 'live' | 'upcoming' | 'ended',
  betEnabled: boolean,        // 是否开启下注
}
```

### 9.2 辩题热度更新

```typescript
// 每场对战结束后，辩题热度+参与人数
function updateTopicHeat(topicId: string, viewerCount: number) {
  const topic = TOPICS.find(t => t.id === topicId)
  if (!topic) return
  topic.heat += viewerCount * 2 + 10  // 观众贡献热度，对战本身+10
}
```

---

## 十、异常场景应对

### 10.1 LLM超时

```
场景：调用Groq生成发言或裁判评分时超时（>12秒）
处理：
1. 超时控制：发言生成12秒超时，裁判评分8秒超时
2. 单次重试：超时后立即重试一次（换temperature ±0.1）
3. 降级到mock：
   - 发言降级：从MOCK_ROUNDS中取对应辩题的预设发言
   - 评分降级：使用generateMockScore()随机生成合理分数
   - 裁判点评降级：从commentStyles模板中随机选取
4. 用户无感知：降级过程展示"思考中..."加载动画，不报错
5. 监控记录：console.warn记录降级事件，便于排查
```

### 10.2 LLM返回格式错误

```
场景：裁判评分要求返回JSON，但LLM返回了非JSON内容
处理：
1. JSON提取：用正则 /\{[\s\S]*\}/ 从返回中提取JSON片段
2. 解析失败：重试一次，temperature降到0.2（更确定性）
3. 仍然失败：使用mock评分（随机5-8分+通用点评）
4. 分数校验：
   - 分数必须在0-10范围内，超出则clamp
   - 分数必须是数字，NaN则默认5分
   - reason字段为空则使用通用点评
```

### 10.3 内容触发安全策略

```
场景：LLM生成的发言包含敏感内容（被Groq内容策略拦截）
处理：
1. Groq返回400错误（content_filter）时：
   - 重试一次，prompt中追加"请避免敏感内容"
   - 仍然失败：使用预设mock发言
2. 前端内容过滤：
   - 调用 contentFilter.ts 检查生成的发言
   - 命中敏感词时替换为"***"
3. 自定义蛐蛐的安全过滤：
   - 用户输入的prompt在发送前检查
   - 包含攻击性内容时拒绝创建，提示修改
```

### 10.4 并发下注冲突

```
场景：用户在结算瞬间再次下注
处理：
1. 下注面板在"debating"阶段开始后禁用
2. 结算期间所有UI操作冻结（显示"结算中..."遮罩）
3. 积分操作使用乐观锁：
   - 下注时记录当前积分快照
   - 结算时检查积分是否变化
   - 如果变化（其他操作导致），重新计算
```

### 10.5 页面刷新/中断恢复

```
场景：用户在对战进行中刷新页面
处理：
1. MVP方案：对战中断，重新开始
   - 不持久化进行中的对战状态
   - 刷新后回到竞技场大厅
   - 已下注的积分退还（因为对战未完成）
2. 增强方案（v2）：
   - 对战状态存入sessionStorage
   - 刷新后从最后完成的回合恢复
   - 如果LLM调用已完成但未展示，直接展示缓存结果
```

### 10.6 骰子动画卡死

```
场景：RefereeDice动画因CSS问题卡住
处理：
1. 动画超时保护：最长3秒后强制进入下一阶段
2. 用户可点击"跳过"按钮直接揭晓裁判
3. 动画失败fallback：直接显示裁判名字，不播动画
```

---

## 十一、上线后运营

### 11.1 内容更新

| 内容 | 频率 | 负责人 |
|------|------|--------|
| 新辩题 | 每周2-3个 | 运营团队 |
| 新蛐蛐预设 | 每周1个 | 运营团队 |
| 虚拟弹幕词库 | 每周更新10条 | 运营团队 |
| mock辩论数据 | 每个新辩题配套 | LLM生成+人工审核 |

### 11.2 监控指标

| 指标 | 目标值 | 告警阈值 |
|------|--------|---------|
| 日均对战场数 | 200+场 | <50场 |
| 场均观看人数 | 10+人 | <3人 |
| 下注参与率 | >30%观众下注 | <10% |
| 弹幕发送率 | >20%观众发弹幕 | <5% |
| 自定义蛐蛐创建数 | 20+/天 | <5/天 |
| LLM调用成功率 | >95% | <80% |
| 平均对战时长 | 2-4分钟 | >6分钟（可能LLM过慢） |

### 11.3 传播设计

```
分享卡片（BattleResultCard.tsx）：
- 对战结果截图风格卡片
- 包含：辩题、双方角色、最终比分、裁判点评
- 如果有精彩瞬间（highlight），高亮展示金句
- 底部：观微二维码 + "来看AI斗蛐蛐！"

传播路径：
1. 用户看完一场精彩对战 → 点击"分享"
2. 生成卡片 → 分享到朋友圈/微信群
3. 扫码进入观微 → 直接看到同一场对战的回放
4. 新用户被吸引 → 开始自己的第一场对战
```

---

## 十二、资源需求

### 12.1 LLM调用估算

| 场景 | 调用频率 | 单次token | 日均量 |
|------|---------|----------|--------|
| 正方发言 | 每场6轮×1次 | ~200 input + 150 output | 200场×6=1200次 |
| 反方发言 | 每场6轮×1次 | ~200 input + 150 output | 1200次 |
| 裁判评分 | 每场6轮×1次 | ~300 input + 50 output | 1200次 |
| AI润色（蛐蛐锻造） | 用户触发 | ~100 input + 400 output | 50次 |
| 虚拟弹幕生成 | 每场~10条 | ~50 input + 20 output | 200场×10=2000次 |
| **合计** | | | **~5650次/天** |

Groq配额分析：
- 30 rpm限制：高峰时每分钟最多30次调用
- 单场对战需要：12次发言生成 + 6次评分 = 18次调用
- 如果200场/天均匀分布：~8场/小时 → 每分钟0.13场 → 2.4次/分钟
- 远低于30rpm限制，Groq完全够用

书生模型配额：
- 9,000 token/月 ≈ 每天300 token
- 不用于AI竞技场（token太少）
- 仅用于AI润色蛐蛐（如果用户选择书生模型）

### 12.2 存储空间

| 数据类型 | 单条大小 | 预估数量/月 | 总空间 |
|---------|---------|-----------|--------|
| 对战记录 | ~5KB | 6000场 | ~30MB |
| 下注记录 | ~0.2KB | 2000条 | ~400KB |
| 自定义蛐蛐 | ~1KB | 500个 | ~500KB |
| **合计** | | | **~31MB** |

### 12.3 开发工时估算

| 任务 | 工时 | 说明 |
|------|------|------|
| battleEngine.ts（状态机） | 8h | 核心引擎，各阶段流转 |
| battleStore.ts | 4h | zustand store |
| BattleArena.tsx（主容器） | 6h | 编排各子组件 |
| BetPanel.tsx（下注面板） | 4h | 下注交互+积分联动 |
| DanmakuInput.tsx + 防刷 | 4h | 弹幕输入+频率限制+虚拟弹幕 |
| RefereeReveal.tsx（裁判揭晓） | 4h | 骰子动画增强+入场白展示 |
| BattleResultCard.tsx | 3h | 结果卡片+分享功能 |
| ScoreBoard.tsx | 2h | 实时记分板 |
| CricketForge预设扩充 | 2h | 新增4个预设+配置分离 |
| 辩题扩充（10-15个） | 3h | 配置+mock数据 |
| 虚拟弹幕词库 | 1h | 50条预设弹幕 |
| 后端bets API | 4h | 下注+结算+积分联动 |
| 测试+联调 | 6h | |
| **合计** | **47h** | 约6个工作日（1人全栈） |

---

## 十三、实现路径

### Phase 1：状态机核心（第1-2天）

```
交付物：
1. battleEngine.ts — 完整状态机，支持mock模式运行
2. battleStore.ts — zustand store，状态持久化
3. BattleArena.tsx — 主容器组件，串联各阶段

验证方式：
- 选择辩题+角色后，对战自动运行到底
- 各阶段正确切换，时间控制准确
- mock模式下不调用LLM也能完整运行
```

### Phase 2：下注+弹幕（第3-4天）

```
交付物：
1. BetPanel.tsx — 下注面板，积分联动
2. DanmakuInput.tsx — 弹幕输入+防刷
3. 虚拟弹幕系统 — 预设池+定时发送
4. 后端bets API — 下注记录+积分结算

验证方式：
- 下注后积分正确冻结和结算
- 弹幕发送频率限制生效
- 虚拟弹幕正常混入显示
- 防刷规则全部验证通过
```

### Phase 3：裁判揭晓+结果卡片（第5天）

```
交付物：
1. RefereeReveal.tsx — 骰子动画增强+裁判入场
2. BattleResultCard.tsx — 结果卡片+分享
3. 精彩瞬间高亮展示 — highlight卡片

验证方式：
- 骰子动画流畅，2秒内完成
- 裁判入场白正确展示
- 结果卡片包含完整信息
- 分享功能正常工作
```

### Phase 4：自定义蛐蛐+整合（第6天）

```
交付物：
1. CricketForge预设扩充 — 10个预设
2. 自定义蛐蛐与对战引擎对接 — 自定义角色可参与对战
3. 全流程测试 — 从竞技场大厅到对战结束
4. 辩题扩充 — 10-15个辩题+mock数据

验证方式：
- 自定义蛐蛐能正常参与对战
- AI润色功能正常
- 全流程无阻断性bug
- 所有辩题可正常对战
```
