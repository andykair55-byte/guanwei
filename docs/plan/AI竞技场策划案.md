# 见微「AI 竞技场」策划案

> 版本：v4.0 | 更新日期：2026-07-16 | 状态：基于 Demo 现状重写

---

## 一、模块定位

**AI 竞技场是观微的"看 AI 斗嘴"娱乐模块——用户选角色上场与 AI 辩手对线，或围观历史名人/AI 顶流的自动辩论，配弹幕、下注、观众投票，制造可传播的社交货币。**

---

## 二、入口与路由

路由表（唯一数据源：`src/router/routes.ts`）：

| 路径 | 组件 | 平台 | 说明 |
|------|------|------|------|
| `/entertainment/arena` | `AIArenaLobby` | both | 大厅入口：Banner + 名人擂台 + 自由对战 |
| `/entertainment/arena/character-select` | `CharacterSelect` | both | 角色选择页（3 Tab：历史名人 / AI辩手 / 我的角色） |
| `/entertainment/arena/human-battle` | `AIBattle` | both | 人机对战页（支持 `?forgeId=` / `?themeChar=1&negate=` / `?negate=` 三种参数） |
| `/entertainment/arena/ai-battle/:topicId` | `AIArena` | both | AI 对战观战页（支持 `?theme=` / `?affirm=` / `?negate=` / `?rounds=`） |
| `/entertainment/arena/forge` | `CricketForge` | web | 角色工坊（自创蛐蛐） |

大厅入口卡片（`AIArenaLobby.featureCards`）：

| 卡片 | 跳转 | 备注 |
|------|------|------|
| 人机对战 | `/entertainment/arena/character-select` | 标 `NEW` 角标 |
| 角色工坊 | `/entertainment/arena/forge` | — |

> 自由对战入口已砍掉，大厅只保留上述两个 FeatureCard；名人擂台区块直接展示主题包对战卡片，点击进入观战。

---

## 三、三套角色体系

### 3.1 内置 AI 辩手（4 神兽）

数据源：`src/services/characters.ts`，导出 `ALL_CHARACTERS` / `CHARACTER_MAP` / `getCharacter(id)`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识（`baize` / `xiezhi` / `zhulong` / `qiongqi`） |
| `name` / `title` | string | 名字 + 称号 |
| `icon` | string | `CharacterIcon` 组件的 characterId |
| `stance` | `'affirm' \| 'negate'` | 默认立场倾向 |
| `temperature` | number | LLM 生成温度，影响辩论风格 |
| `visual` | object | `gradientFrom/gradientTo/bubbleBg/bubbleBorder/textColor/glowShadow` |
| `personality` | string | 一句话人设 |
| `systemPrompt` | string | 完整辩论 prompt（含身份/风格/语言特征/底线/节奏/输出格式） |
| `taunts` | object | `advantage` / `comeback` / `press` 三种嘲讽话术数组 |
| `celebrations` | object | `winRound` / `winFinal` / `loseFinal` 庆祝话术 |
| `respect` | object | `closingLines` 收尾尊重话术 |
| `stats` | object | `totalDebates` / `wins` / `winRate` / `favoriteTactic`（mock 展示） |

示例（白泽）：

```
id: 'baize' | name: '白泽' | title: '博古通今 · 数据派'
temperature: 0.55 | stance: 'affirm'
personality: '通晓万物的上古神兽，说话温和但数据信手拈来'
favoriteTactic: '数据伏击' | winRate: '67%'
```

四角色一览：

| 角色 | 阵营倾向 | 风格 | temperature | 招牌战术 |
|------|---------|------|-------------|---------|
| 白泽 | affirm | 数据派、温和博学 | 0.55 | 数据伏击 |
| 獬豸 | negate | 逻辑猎手、锋利直接 | 0.80 | 逻辑拆解 |
| 烛龙 | affirm | 故事大师、共情感染 | 0.65 | 共情攻势 |
| 穷奇 | negate | 鬼才辩手、剑走偏锋 | 0.90 | 釜底抽薪 |

### 3.2 历史名人主题包

数据源：`src/config/themePacks.ts`（`THEME_PACKS`），通过 `src/services/themePackService.ts` 的 `getAllThemePacks()` / `getAllThemeCharacters()` 读取。

`ThemeCharacter` 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识（如 `zhuge-liang` / `wang-lang`） |
| `name` | string | 名字 |
| `era` | string | 时代/阵营（如 `三国·蜀汉`、`AI`） |
| `stanceHint` | string | 立场提示语 |
| `systemPrompt` | string | 完整辩论 prompt |
| `avatar` | string | 立绘图路径（空字符串表示无图，回退 PixelAvatar） |
| `tags` | string[] | 标签数组 |

立绘图映射（`AIArenaLobby.CHARACTER_PORTRAITS` / `AIArena.CHARACTER_PORTRAITS`）：

```
zhuge-liang / zhuge-liang-2 → /assets/arena/characters/zhuge-liang.jpg
wang-lang                   → /assets/arena/characters/wang-lang.jpg
zhou-yu                     → /assets/arena/characters/zhou-yu.jpg
doubao                      → /assets/arena/characters/doubao.jpg
deepseek                    → /assets/arena/characters/deepseek.jpg
```

主题包一览（4 包）：

| 主题包 | 正方 | 反方 | 辩题示例 |
|--------|------|------|---------|
| 舌战群儒 (shelan) | 诸葛亮（蜀） | 王朗（魏） | 阿斗到底是不是庸才？ |
| 儒法之争 (ru-fa) | 孟子（儒） | 荀子（法源） | 人性本善还是本恶？ |
| 赤壁之谋 (chibi) | 诸葛亮（蜀） | 周瑜（吴） | 赤壁之战，联吴是否必要？ |
| AI 巅峰对决 (gu-jin) | 豆包（字） | DeepSeek（深） | AI 应该更有趣还是更聪明？ |

阵营色（`FACTION_COLORS`）：蜀 #3b82f6 / 魏 #dc2626 / 吴 #059669 / 儒 #7c3aed / 新 #ea580c / 神 #d97706 / 字 #3370ff / 深 #1a1a6e。

### 3.3 自创蛐蛐

数据源：`localStorage` key=`cricket-forges`，由 `CricketForge.tsx` 写入，`CharacterSelect.tsx` / `AIBattle.tsx` 读取。

`ForgeCharacter` 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | `crypto.randomUUID()` 或 `${Date.now()}-${random}` |
| `name` | string | 用户命名（≤12 字） |
| `prompt` | string | 人设描述（可被 AI 润色扩展） |
| `avatar` | string | tailwind 渐变 class 串（如 `from-red-500 to-orange-500`） |
| `createdAt` | number | 创建时间戳 |

适配规则（`AIBattle.forgeToCharacter`）：自创蛐蛐被适配为 `AICharacter`，`title='自创角色'`、`icon='baize'`、`temperature=0.7`、`taunts/celebrations/respect` 均为空数组，`stats.winRate='—'`。

预设模板（`CricketForge.PRESETS`，6 个）：东北大妈 / 理工直男 / 文艺青年 / 高中班主任 / 创业大佬 / 十岁小孩。

---

## 四、人机对战流程

入口：大厅点"人机对战" → `CharacterSelect` → 选角色 → `AIBattle`。

### 4.1 角色选择（`CharacterSelect.tsx`）

3 个 Tab，默认 `celebrity`：

| Tab | 数据源 | 选择后跳转 |
|-----|--------|-----------|
| 历史名人 | `getAllThemeCharacters()` | `?negate=${id}&themeChar=1` |
| AI辩手 | `ALL_CHARACTERS` | `?negate=${id}` |
| 我的角色 | `localStorage` | `?forgeId=${id}` |

支持搜索（按 name / era / stanceHint / personality / prompt 过滤），"我的角色" Tab 顶部有"创建新角色"虚线入口跳转 `/forge`。

### 4.2 对手解析（`AIBattle.tsx`）

通过 `useSearchParams` 读取参数，`useMemo` 按优先级解析对手：

```
forgeId（自创）> themeChar=1（名人）> negate（内置 id，默认 xiezhi）
```

- 自创：`getForgeCharacter(forgeId)` → `forgeToCharacter`
- 名人：`themeCharToCharacter(opponentId)` 从 `getAllThemeCharacters()` 查找
- 内置：`getCharacter(opponentId)`

用户固定为 affirm（正方），AI 角色为 negate（反方）。辩题默认 `college`（可通过 `?topic=` 覆盖）。

### 4.3 对战流程

```
进入 AIBattle
   │
   ▼
[准备阶段] 展示对手卡片 + 辩题 + 下注面板（BetPanel）
   │ 点击"开始辩论"
   ▼
[辩论中] 4 回合循环（TOTAL_ROUNDS = 4）
   │  每回合：
   │    1. 用户输入论点（文本 / 语音 webkitSpeechRecognition）
   │    2. AI 思考步骤可视化（generateThinkingSteps 按 800ms 逐条展示）
   │    3. callLLM 生成 AI 回复（失败回退 getMockResponse）
   │    4. 随机评分 6-8 分（RoundScore）
   │    5. 触发弹幕（spawnDanmaku：score-upset/highlight/taunt/speech）
   │    6. 更新优势状态（leading/trailing/tie）→ 边缘脉冲
   │
   ▼
[查看结果] 按钮触发 showResult
   │
   ▼
[观众投票] 二选一（你 / 对手），显示投票占比条
   │
   ▼
[再来一场] handleReset 清空状态
```

### 4.4 游戏化元素

| 元素 | 实现 |
|------|------|
| 状态步骤条 | `PHASES = ['匹配','准备','辩论中','裁判评分','结算','完成']`，按本地状态推进 `currentPhaseIndex` |
| AI 思考可视化 | 4 套风格化思考链（白泽调数据/獬豸扫漏洞/烛龙搜案例/穷奇翻转视角） |
| 弹幕系统 | `DanmakuOverlay` + `DanmakuInput`，`pickDanmaku(trigger, count, charId)` 按触发器选模板 |
| 下注系统 | `BetPanel` 组件，`handleBet` 扣减 `useAuthStore.user.points`（结算逻辑未接） |
| 观众数滚动 | 每 3-8 秒随机 ±1~5 |
| 优势脉冲 | 优势方变化时全屏 inset shadow 闪现 1.5s |
| 语音输入 | `webkitSpeechRecognition`（zh-CN，interimResults） |
| 评委打分 | 随机 6-8 分 + 通用 reason（**未接 LLM 裁判**） |

---

## 五、AI 对战观战（`AIArena.tsx`）

入口：大厅"名人擂台"卡片点击 → `/entertainment/arena/ai-battle/${topicId}?theme=${packId}&affirm=${affirmId}&negate=${negateId}`。

核心特性：

- **主题包模式**：`themeId` 存在时调用 `initThemeDebate()` 初始化，`runThemeDebate()` 异步生成完整辩论（失败显示重试按钮）
- **回退模式**：无 themeId 时用 `getMockMatch()` 生成 mock 辩论
- **5 阶段状态机**：`think-affirm` → `affirm` → `think-negate` → `negate` → `scored`，`advance()` 推进
- **PK 双时钟**：每方 30 秒思考时间（`PKTimer`），到时自动 `advance()`；支持暂停
- **三国杀风格立绘**：`VerticalNameBanner` 竖排武将名牌 + `CharacterPortrait` 立绘框 + 阵营色边框 + 技能标签
- **打字机动画**：`useTypingAnimation(text, 22, trigger)` 逐字展示发言
- **弹幕系统**：`DanmakuOverlay` + 按阶段触发（speech/highlight/taunt/closing）
- **历史人物空降**：`liveComments` 内置刘禅/司马/曹操/赵云/魏延等评论，30% 概率插入历史人物弹幕
- **辩手弹幕回复**：`DebaterCommentReply` 在思考阶段抓取历史人物评论，2.5s 后展示角色内回复（`HISTORICAL_REPLIES` 映射表）
- **观众助攻**：思考阶段显示 `AudienceAssist` 面板（提供史料/观点/引用/加油），点击后插入特殊弹幕
- **互动按钮**：点赞/要求举证/申请反驳/换个角度/分享本场
- **热度计量**：`HeatMeter` 展示辩论热度（基础值 + 回合数 × 1200）
- **投票**：正反方投票，显示支持率百分比条
- **控制**：开始/自动播放/暂停/跳过（直接全部 scored）/重置

右侧弹幕面板（`LiveCommentPanel`，xl 屏以上显示）：3 Tab（实时弹幕/精彩瞬间/观众榜单）+ 弹幕输入框。

---

## 六、角色工坊（`CricketForge.tsx`）

入口：大厅"角色工坊"卡片 → `/entertainment/arena/forge`（仅 web）。

3 步流程：

| 步骤 | 内容 |
|------|------|
| preset | 顶部"随机一只"/"从零开始"按钮 + 6 个预设模板列表 |
| customize | 输入蛐蛐名（≤12 字）+ 人设描述（textarea）+ 8 色战袍选择 + "AI 润色"按钮 |
| preview | 蛐蛐卡片预览 + 对战设置（辩题/对手/裁判/回合数）+ "开斗！"按钮 |

AI 润色：调用 `callLLM`，system prompt 要求扩展为 200-400 字完整辩论 prompt（保留人格 + 补充策略/语言特征/底线/节奏）。

保存：生成 `ForgeCharacter`（含 UUID + 时间戳），push 到 `localStorage[cricket-forges]`，跳转 `/entertainment/arena/human-battle?forgeId=${id}` 直接开战。

---

## 七、待实现清单

| 项 | 状态 | 说明 |
|----|------|------|
| `battleEngine.ts` 状态机 | **未开始** | 当前 `AIBattle` 用本地 `useState` 推进，无独立引擎；`AIArena` 用 `revealed` 数组 + `advance()` |
| `battleStore.ts`（zustand） | **未开始** | 无集中 store，状态散落在组件内 |
| 5 种裁判风格 | **未开始** | `refereeService.ts` 不存在；`AIBattle` 评分用 `Math.floor(Math.random()*3)+6` 随机；`AIArena` 评分来自 mock/LLM 生成 |
| 骰子选裁判动画 | **未开始** | `RefereeDice.tsx` 不存在；无裁判揭晓阶段 |
| 裁判 LLM 打分 | **未开始** | 评分维度（逻辑/事实/说服力/应变）未落地 |
| 下注结算逻辑 | **未开始** | `AIBattle.handleBet` 仅扣减用户积分，`side` 闭包变量未消费，无胜负结算 |
| 弹幕防刷 | **未开始** | 无频率限制/重复检测/长度校验，`DanmakuInput` 直接 `toQueueItems` 追加 |
| 辩题扩充 | **未开始** | `TOPICS` 仍为少量辩题，无分类/热度字段 |
| 自定义蛐蛐安全过滤 | **未开始** | `CricketForge` 无 contentFilter 校验 |
| 对战记录持久化 | **未开始** | 纯前端 localStorage，无对战历史 |
| 结果卡片分享 | **未开始** | `BattleResultCard.tsx` 不存在 |
| 裁判点评触发时机 | **未开始** | 无 blowout/close/highlight/finalWin/finalLose 分支 |
