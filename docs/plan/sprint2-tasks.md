# Sprint 2 实现计划（Phase 1 Day 6-10）

> **执行方式：** subagent 逐任务执行，每个任务独立 commit。任务间无强依赖，大部分可并行。
> **原则：** 前端界面重构，所有改动用 mock 可演示，不碰后端 API、不碰 LLM 调用逻辑。
> **来源：** `docs/plan/0.迭代开发计划.md` Phase 1 Sprint 2 + 各模块策划案 v3.0

**目标：** AI创作助手核心页面可用 + P1模块（热点/佐证/求证）前端改完 + P2模块（社区/笔记/管理后台）收尾

**架构：** 在现有 Zustand store + React Router + Tailwind v4 基础上改造，新增组件放 `src/components/{module}/`。所有改动保留 mock fallback。

**技术栈：** React 19 + TypeScript 6 + Vite 8 + Tailwind v4 + Zustand 5 + react-router-dom 7 + lucide-react

---

## 全局约束（所有任务必须遵守）

- **测试策略**：项目无单元测试框架，每个任务用 `npx tsc --noEmit` + `npx oxlint` 验证，再手动验收
- **图片 URL**：统一用 `https://picsum.photos/seed/<id>/<w>/<h>`，禁用 pravatar/unsplash/dicebear
- **毛玻璃**：若使用 backdrop-blur，必须 `blur ≥20px` + `saturate ≥1.5`
- **响应式宽度**：详情页禁用 `max-w-[480px]` 硬编码，用响应式前缀（如 `md:max-w-2xl`）
- **移动端底部**：内容区底部留 `pb-[64px]` 防 TabBar 遮挡
- **可访问性**：禁用全局 `outline:none`，用 `focus-visible:` 替代；所有动画加 `motion-reduce:` 回退
- **文字对比度**：正文 ≥14px，次要文字 ≥11px 且对比度足够
- **错误边界**：新组件无需自己包 ErrorBoundary（WebApp/MobileApp 入口已包）
- **懒加载**：新增页面组件在 `entry/WebApp.tsx` 和 `entry/MobileApp.tsx` 用 `lazy()` 注册
- **commit 规范**：`feat(<scope>): <desc>` / `fix(<scope>): <desc>`，scope 用模块名（create/melon/arena/user/hot/community/note/admin）

---

## 文件结构总览

```
src/
  pages/
    CreatePage.tsx                [新] Day6-7 T1 创作主页面
    HotPage.tsx                   [改] Day9 T6 热点数据mock化
    HotEventDetailPage.tsx        [改] Day9 T7 时间线复用EvidenceTimeline
    VerifyPage.tsx                [改] Day9 T10 一键求证简化
    CommunityPage.tsx             [改] Day10 T12 种子数据
    CommunityDetailPage.tsx       [改] Day10 T13 帖子列表+发帖+评论
    NotesPage.tsx                 [改] Day10 T14 笔记简化编辑器
    AdminPage.tsx                 [改] Day10 T16 开奖面板+降级开关
  components/
    create/
      StructuredEditor.tsx        [新] Day6-7 T2 结构化编辑器
      AISkeletonPanel.tsx         [新] Day6-7 T3 AI骨架面板
      StyleProfileCard.tsx        [新] Day6-7 T4 风格档案卡片
      QualityPreview.tsx          [新] Day6-7 T5 4维度评分+雷达图
      PublishTargetSelector.tsx   [新] Day6-7 T6 发布目标选择
      ClaimVerifier.tsx           [新] Day8 T7 声明核查组件
    hot/
      HotEventCard.tsx            [新] Day9 热点事件卡片
      TimelineView.tsx            [新] Day9 时间线展示组件
      RelatedMelonList.tsx        [新] Day9 关联瓜列表
    community/
      CommunityCard.tsx           [新] Day10 社区卡片
      PostDetail.tsx              [新] Day10 帖子详情+评论
  stores/
    creationStore.ts              [新] Day8 T8 创作状态store
    hotStore.ts                   [新] Day9 热点store
    communityStore.ts             [新] Day10 社区store
    noteStore.ts                  [新] Day10 笔记store
  services/
    creationService.ts            [新] Day6-7 创作辅助AI服务
  entry/
    WebApp.tsx                    [改] Day6-7 加 /create /hot /community /notes 路由
    MobileApp.tsx                 [改] Day6-7 同上
```

---

## Section A：AI创作助手页面（Day 6-7）

> 参考策划案：`AI创作助手策划案.md` v1.0 三、技术架构 / 四、核心功能

### T1：CreatePage 创作主页面

**Files:**
- Create: `src/pages/CreatePage.tsx`

**改造要点：**
- 左右布局（PC）或上下布局（移动）：左侧编辑器 / 右侧AI辅助面板
- 整体分4步：选题→骨架→填充→预览发布
- 步骤指示器在顶部，显示当前在第几步
- 编辑器区域和AI面板区域通过 `usePlatform` 响应式适配

**Steps:**

- [ ] **Step 1: 创建页面骨架**
  ```tsx
  // src/pages/CreatePage.tsx
  import { useState } from 'react'
  import { useSearchParams } from 'react-router-dom'
  import StructuredEditor from '../components/create/StructuredEditor'
  import AISkeletonPanel from '../components/create/AISkeletonPanel'
  import StyleProfileCard from '../components/create/StyleProfileCard'
  import QualityPreview from '../components/create/QualityPreview'
  import PublishTargetSelector from '../components/create/PublishTargetSelector'
  import { usePlatform } from '../hooks/usePlatform'

  const STEPS = ['选题与立场', '骨架', '写作', '预览与发布']

  export default function CreatePage() {
    const [searchParams] = useSearchParams()
    const melonId = searchParams.get('melonId')
    const melonTitle = searchParams.get('title')
    const [step, setStep] = useState(0)
    const { isMobile } = usePlatform()

    return (
      <div className="min-h-screen bg-ink-50/50">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-surface border-b border-ink-100">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              {i > 0 && <div className={`w-6 h-px ${i <= step ? 'bg-seal' : 'bg-ink-200'}`} />}
              <span className={`text-[12px] ${i === step ? 'text-seal font-semibold' : i < step ? 'text-bamboo' : 'text-ink-300'}`}>
                {i < step ? '✓ ' : ''}{s}
              </span>
            </div>
          ))}
        </div>

        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4 p-4 max-w-5xl mx-auto`}>
          {/* 左侧编辑器 */}
          <div className={isMobile ? 'w-full' : 'flex-1 min-w-0'}>
            <StructuredEditor
              initialMelonId={melonId}
              initialMelonTitle={melonTitle}
              step={step}
              onStepChange={setStep}
            />
          </div>

          {/* 右侧AI面板 */}
          {!isMobile && (
            <div className="w-80 shrink-0 space-y-4">
              <AISkeletonPanel />
              <StyleProfileCard />
            </div>
          )}
        </div>

        {/* 移动端AI面板（折叠在底部） */}
        {isMobile && step === 1 && <AISkeletonPanel />}
        {isMobile && step === 2 && <StyleProfileCard />}
        {isMobile && step === 3 && <QualityPreview />}

        {/* 发布目标（在Step 3时显示） */}
        {step === 3 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-ink-100">
            <PublishTargetSelector />
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: 类型检查 + lint**
  Run: `npx tsc --noEmit && npx oxlint`

- [ ] **Step 3: commit**
  ```bash
  git add src/pages/CreatePage.tsx
  git commit -m "feat(create): 创作主页面CreatePage布局+步骤指示器"
  ```

**验收标准：**
- `/create` 页面可访问，显示4步步骤指示器
- 带 `?melonId=xxx&title=xxx` 参数时，预填到编辑器
- PC端左右布局，移动端上下布局

---

### T2：StructuredEditor 结构化编辑器

**Files:**
- Create: `src/components/create/StructuredEditor.tsx`

**改造要点：**
- **不是**块编辑器，是带AI引导的结构化表单
- Step 0（选题）：主题+立场+目标读者 三个输入框
- Step 1（骨架）：骨架节点列表（标题建议+论点列表），可接受/修改/删除/排序
- Step 2（写作）：富文本区域，逐段填充骨架对应的内容
- Step 3（预览）：预览完整内容+质量评分
- 草稿自动保存到 `creationStore`（localStorage）

**Steps:**

- [ ] **Step 1: 创建编辑器组件**
  ```tsx
  // src/components/create/StructuredEditor.tsx
  import { useState, useEffect } from 'react'
  import { useCreationStore } from '../../stores/creationStore'

  interface Props {
    initialMelonId?: string | null
    initialMelonTitle?: string | null
    step: number
    onStepChange: (s: number) => void
  }

  export default function StructuredEditor({ initialMelonId, initialMelonTitle, step, onStepChange }: Props) {
    const store = useCreationStore()
    const [topic, setTopic] = useState(initialMelonTitle || store.draft?.topic || '')
    const [stance, setStance] = useState(store.draft?.stance || '')
    const [readerType, setReaderType] = useState(store.draft?.readerType || '大学生')

    // 自动保存草稿
    useEffect(() => {
      if (topic || stance) {
        const timer = setTimeout(() => {
          store.saveDraft({ topic, stance, readerType })
        }, 3000)
        return () => clearTimeout(timer)
      }
    }, [topic, stance, readerType])

    if (step === 0) {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1 block">主题</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="如：南开大学学生被骗220万"
              className="w-full px-3 py-2 rounded-lg border border-ink-200 text-[14px] outline-none focus:border-seal transition-colors"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1 block">你的立场/观点</label>
            <textarea
              value={stance}
              onChange={e => setStance(e.target.value)}
              placeholder="如：大学反诈教育严重缺失"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-ink-200 text-[14px] outline-none focus:border-seal transition-colors resize-none"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1 block">目标读者</label>
            <select
              value={readerType}
              onChange={e => setReaderType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-ink-200 text-[14px] outline-none focus:border-seal bg-white"
            >
              <option>大学生</option>
              <option>普通网友</option>
              <option>行业内人士</option>
              <option>吃瓜群众</option>
            </select>
          </div>

          <button
            onClick={() => { onStepChange(1); store.generateSkeleton(topic, stance, readerType) }}
            disabled={!topic || !stance}
            className="w-full py-2.5 rounded-xl bg-seal text-white text-[13px] font-semibold disabled:opacity-40 active:scale-95 transition-all"
          >
            生成骨架
          </button>
        </div>
      )
    }

    if (step === 1) {
      // 骨架展示区：store.skeleton 渲染
      const skeleton = store.skeleton
      if (!skeleton) return <div className="text-ink-400 text-[13px]">点击"生成骨架"开始</div>

      return (
        <div className="space-y-3">
          {/* 标题建议 */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-ink-500">标题建议</label>
            {skeleton.titles.map((t, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-ink-100">
                <input type="radio" name="title" defaultChecked={i === 0} className="accent-seal" />
                <span className="text-[13px] text-ink-800">{t}</span>
              </div>
            ))}
          </div>

          {/* 骨架节点 */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-ink-500">文章骨架</label>
            {skeleton.nodes.map((node, i) => (
              <div key={i} className="group px-3 py-2.5 rounded-lg border border-ink-100 hover:border-seal/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink-800">{node.label}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-ink-400 hover:text-ink-600 p-0.5"><ChevronUp size={14} /></button>
                    <button className="text-ink-400 hover:text-ink-600 p-0.5"><ChevronDown size={14} /></button>
                    <button className="text-red-400 hover:text-red-600 p-0.5"><X size={14} /></button>
                  </div>
                </div>
                {node.claim && (
                  <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 text-[10px] rounded bg-amber-50 text-amber-600">
                    ⚠️ 需核查
                  </span>
                )}
                <input
                  value={node.content}
                  onChange={e => store.updateNode(i, { content: e.target.value })}
                  placeholder={node.hint}
                  className="w-full mt-1 bg-transparent text-[12px] text-ink-600 placeholder:text-ink-300 outline-none resize-none"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => onStepChange(2)}
            className="w-full py-2.5 rounded-xl bg-seal text-white text-[13px] font-semibold active:scale-95 transition-all"
          >
            开始写作
          </button>
        </div>
      )
    }

    if (step === 2) {
      // 写作区：逐段填充
      return (
        <div className="space-y-4">
          {(store.skeleton?.nodes ?? []).map((node, i) => (
            <div key={i} className="p-3 rounded-lg border border-ink-100">
              <div className="text-[12px] font-medium text-seal mb-1.5">{node.label}</div>
              <textarea
                value={store.draft?.sections?.[i] ?? ''}
                onChange={e => store.updateSection(i, e.target.value)}
                placeholder={node.hint}
                rows={4}
                className="w-full text-[13px] text-ink-800 placeholder:text-ink-300 outline-none resize-none bg-transparent leading-relaxed"
              />
              {/* 内置声明核查 */}
              <ClaimVerifier text={store.draft?.sections?.[i] ?? ''} />
            </div>
          ))}

          <button
            onClick={() => onStepChange(3)}
            className="w-full py-2.5 rounded-xl bg-seal text-white text-[13px] font-semibold active:scale-95 transition-all"
          >
            预览与发布
          </button>
        </div>
      )
    }

    if (step === 3) {
      return <QualityPreview />
    }

    return null
  }
  ```

- [ ] **Step 2: 类型检查 + lint**
  Run: `npx tsc --noEmit && npx oxlint`

- [ ] **Step 3: commit**
  ```bash
  git add src/components/create/StructuredEditor.tsx
  git commit -m "feat(create): 结构化编辑器StructuredEditor四步流程"
  ```

**验收标准：**
- Step 0：主题+立场+目标读者输入框
- Step 1：点击"生成骨架"后显示骨架（默认3个预设模板骨架）
- Step 2：逐段写作，每段对应骨架节点
- Step 3：预览完整内容

---

### T3：AISkeletonPanel AI骨架面板

**Files:**
- Create: `src/components/create/AISkeletonPanel.tsx`

**改造要点：**
- 展示AI生成的骨架（大纲+论点+待核查标记）
- MVP阶段默认3个预设模板骨架（事件分析/观点论述/对比评测），无LLM调用
- 用户点击"使用此骨架"后，骨架写入creationStore，跳转到Step 2

**Steps:**

- [ ] **Step 1: 创建骨架面板组件**
  ```tsx
  // src/components/create/AISkeletonPanel.tsx
  import { useState } from 'react'
  import { Lightbulb, Sparkles } from 'lucide-react'
  import { useCreationStore } from '../../stores/creationStore'

  const PRESET_SKELETONS = [
    {
      name: '事件分析',
      titles: ['事件梳理与深度分析：{topic}', '从{topic}看背后的逻辑', '{topic}——不只是个例'],
      nodes: [
        { label: '开头：事件概述', hint: '用1-2句话概括核心事件，包括时间、地点、主体', claim: false },
        { label: '事实梳理', hint: '按时间顺序整理事件关键节点', claim: true },
        { label: '深度分析', hint: '分析事件的深层原因和影响', claim: false },
        { label: '多方观点', hint: '整理不同立场的主要观点和论据', claim: true },
        { label: '结论与思考', hint: '总结核心结论，提出开放性问题', claim: false },
      ]
    },
    {
      name: '观点论述',
      titles: ['为什么{stance}——关于{topic}的几点思考', '驳斥{opposing_view}：关于{topic}的理性分析', '{topic}的真正问题在哪'],
      nodes: [
        { label: '开头：亮明观点', hint: '直接陈述你的核心观点，吸引读者', claim: false },
        { label: '论据一', hint: '第一个核心论据+事实支撑', claim: true },
        { label: '论据二', hint: '第二个核心论据+事实支撑', claim: true },
        { label: '回应质疑', hint: '预判可能的质疑并回应', claim: false },
        { label: '结尾：呼吁行动', hint: '总结观点，呼吁读者采取行动', claim: false },
      ]
    },
    {
      name: '对比评测',
      titles: ['{topic}全面对比：谁更可信？', '{topic}——正反双方论据梳理', '深度拆解{topic}：真相可能在这'],
      nodes: [
        { label: '开头：背景介绍', hint: '介绍对比的议题背景', claim: false },
        { label: '正方观点', hint: '梳理正方的核心论据', claim: true },
        { label: '反方观点', hint: '梳理反方的核心论据', claim: true },
        { label: '关键分歧点', hint: '对比双方争议的焦点', claim: true },
        { label: '综合评估', hint: '给出你的综合判断和理由', claim: false },
      ]
    }
  ]

  export default function AISkeletonPanel() {
    const store = useCreationStore()
    const [selected, setSelected] = useState(0)

    return (
      <div className="p-4 rounded-xl bg-surface border border-ink-100">
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles size={15} className="text-seal" />
          <span className="text-[13px] font-semibold text-ink-800">AI骨架模板</span>
        </div>

        <div className="space-y-2">
          {PRESET_SKELETONS.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setSelected(i)}
              className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-colors ${
                selected === i ? 'bg-seal/8 border border-seal/30' : 'bg-ink-50 hover:bg-ink-100'
              }`}
            >
              <div className="font-medium text-ink-700">{s.name}</div>
              <div className="text-ink-400 mt-0.5">{s.nodes.length}个节点 · {s.titles.length}个标题建议</div>
            </button>
          ))}
        </div>

        <button
          onClick={() => { store.setSkeleton(PRESET_SKELETONS[selected]); store.setStep(1) }}
          className="w-full mt-3 py-2 rounded-lg bg-seal text-white text-[12px] font-medium active:scale-95 transition-all"
        >
          <Lightbulb size={13} className="inline mr-1" />
          使用此骨架
        </button>
      </div>
    )
  }
  ```

- [ ] **Step 2: 在 creationStore 中增加 `setSkeleton` 和 `setStep` 方法**
  （与 T8 creationStore 合并实现，此处仅声明接口）

- [ ] **Step 3: 类型检查 + lint + commit**
  ```bash
  git add src/components/create/AISkeletonPanel.tsx
  git commit -m "feat(create): AI骨架面板AISkeletonPanel+3种预设模板"
  ```

**验收标准：**
- 右侧面板显示3种预设骨架模板
- 点击"使用此骨架"后，骨架写入store，编辑器跳转到Step 2

---

### T4：StyleProfileCard 风格档案卡片

**Files:**
- Create: `src/components/create/StyleProfileCard.tsx`

**改造要点：**
- 6种预设风格：理性分析、犀利评论、温和科普、幽默吐槽、严谨学术、故事讲述
- 每种风格有图标+简短描述
- 当前选中风格高亮
- MVP阶段仅展示风格选择和效果预览，不实际分析用户历史

**Steps:**

- [ ] **Step 1: 创建风格档案组件**
  ```tsx
  // src/components/create/StyleProfileCard.tsx
  import { useState } from 'react'
  import { useCreationStore } from '../../stores/creationStore'

  const STYLES = [
    { id: 'analytical', name: '理性分析', icon: '📊', desc: '数据驱动，逻辑严密，用事实说话' },
    { id: 'critical', name: '犀利评论', icon: '⚡', desc: '观点鲜明，一针见血，敢于质疑' },
    { id: 'warm', name: '温和科普', icon: '📖', desc: '平易近人，用通俗语言讲复杂问题' },
    { id: 'humorous', name: '幽默吐槽', icon: '😏', desc: '轻松有趣，用调侃的方式传递观点' },
    { id: 'academic', name: '严谨学术', icon: '🎓', desc: '引经据典，注重引用和来源标注' },
    { id: 'story', name: '故事讲述', icon: '📝', desc: '以叙事驱动，用故事承载观点' },
  ]

  export default function StyleProfileCard() {
    const store = useCreationStore()
    const [selected, setSelected] = useState(store.styleProfile?.id || 'analytical')

    return (
      <div className="p-4 rounded-xl bg-surface border border-ink-100">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[13px] font-semibold text-ink-800">写作风格</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelected(s.id); store.setStyleProfile(s) }}
              className={`text-left px-2.5 py-2 rounded-lg transition-colors ${
                selected === s.id ? 'bg-seal/8 border border-seal/30' : 'bg-ink-50 hover:bg-ink-100'
              }`}
            >
              <div className="text-[16px]">{s.icon}</div>
              <div className="text-[11px] font-medium text-ink-700 mt-0.5">{s.name}</div>
              <div className="text-[10px] text-ink-400 leading-tight mt-0.5">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: 类型检查 + lint + commit**
  ```bash
  git add src/components/create/StyleProfileCard.tsx
  git commit -m "feat(create): 风格档案卡片StyleProfileCard+6种预设风格"
  ```

**验收标准：**
- 显示6种风格卡片，可选中切换
- 选中风格后store中styleProfile更新

---

### T5：QualityPreview 质量预览面板

**Files:**
- Create: `src/components/create/QualityPreview.tsx`

**改造要点：**
- 4维度评分：论据密度/逻辑连贯性/信息增量/风格一致性（各25分）
- 默认mock评分（LLM不可用时的兜底规则评分）
- 雷达图用CSS/SVG实现（不引入第三方图表库）
- 改进建议列表

**Steps:**

- [ ] **Step 1: 创建质量预览组件**
  ```tsx
  // src/components/create/QualityPreview.tsx
  import { useCreationStore } from '../../stores/creationStore'

  function RadarChart({ scores }: { scores: Record<string, number> }) {
    const dims = Object.entries(scores)
    const cx = 80, cy = 80, r = 60
    const angle = (2 * Math.PI) / dims.length

    const points = dims.map(([, v], i) => {
      const a = angle * i - Math.PI / 2
      const dist = (v / 100) * r
      return [cx + dist * Math.cos(a), cy + dist * Math.sin(a)]
    })
    const polygon = points.map(p => p.join(',')).join(' ')

    return (
      <svg width={160} height={160} viewBox="0 0 160 160" className="mx-auto">
        {/* 背景网格 */}
        {[0.25, 0.5, 0.75, 1].map(ratio => (
          <polygon
            key={ratio}
            points={dims.map((_, i) => {
              const a = angle * i - Math.PI / 2
              const d = r * ratio
              return [cx + d * Math.cos(a), cy + d * Math.sin(a)].join(',')
            }).join(' ')}
            fill="none" stroke="#e5e7eb" strokeWidth={0.5}
          />
        ))}
        {/* 数据区域 */}
        <polygon points={polygon} fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth={1.5} />
        {/* 标签 */}
        {dims.map(([name, v], i) => {
          const a = angle * i - Math.PI / 2
          const lx = cx + (r + 16) * Math.cos(a)
          const ly = cy + (r + 16) * Math.sin(a)
          return (
            <text key={name} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              className="text-[8px]" fill="#6b7280" fontSize={8}>
              {name} {v}
            </text>
          )
        })}
      </svg>
    )
  }

  export default function QualityPreview() {
    const store = useCreationStore()
    const draft = store.draft

    // 纯规则评分（LLM不可用时降级）
    const scores = {
      '论据密度': Math.min(25, Math.floor(((draft?.content?.length ?? 0) / 500) * 25)),
      '逻辑连贯性': Math.min(25, Math.floor((draft?.sections?.filter(s => s?.length > 50).length ?? 0) * 6)),
      '信息增量': Math.min(25, Math.floor(((draft?.content?.match(/https?:\/\/[^\s]+/g)?.length ?? 0) / 3) * 25)),
      '风格一致性': 18,
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0)

    const suggestions: string[] = []
    if (scores['论据密度'] < 15) suggestions.push('建议增加更多可验证的论据')
    if (scores['逻辑连贯性'] < 15) suggestions.push('注意段落之间的逻辑过渡')
    if (scores['信息增量'] < 15) suggestions.push('考虑加入新的信息或独特视角')
    if (total < 60) suggestions.push('整体质量偏低，建议修改后发布')

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-surface border border-ink-100">
          <div className="text-center mb-3">
            <span className={`text-[28px] font-bold ${total >= 80 ? 'text-bamboo' : total >= 60 ? 'text-gold' : 'text-ink-400'}`}>
              {total}
            </span>
            <span className="text-[14px] text-ink-400">/100</span>
            <div className="text-[12px] text-ink-500 mt-0.5">
              {total >= 80 ? '高质量内容，建议发布' : total >= 60 ? '可以发布，有改进空间' : '建议修改后发布'}
            </div>
          </div>

          <RadarChart scores={scores} />
        </div>

        {suggestions.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
            <div className="text-[12px] font-medium text-amber-700 mb-1.5">改进建议</div>
            <ul className="space-y-1">
              {suggestions.map((s, i) => (
                <li key={i} className="text-[11px] text-amber-600 flex items-start gap-1">
                  <span>·</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: 类型检查 + lint + commit**
  ```bash
  git add src/components/create/QualityPreview.tsx
  git commit -m "feat(create): 质量预览QualityPreview+纯规则评分兜底"
  ```

**验收标准：**
- 显示4维度评分+总分
- 雷达图可视化
- 总分<60分时显示改进建议
- 默认规则评分可用（无需LLM）

---

### T6：PublishTargetSelector 发布目标选择

**Files:**
- Create: `src/components/create/PublishTargetSelector.tsx`

**改造要点：**
- 3个发布目标：瓜田佐证 / 社区帖子 / 保存笔记
- 发布为佐证时：选择瓜+方向
- 发布为社区帖子时：选择社区
- 保存为笔记：无需额外选择
- 发布成功后跳转到目标页面

**Steps:**

- [ ] **Step 1: 创建发布选择组件**
  ```tsx
  // src/components/create/PublishTargetSelector.tsx
  import { useState } from 'react'
  import { useNavigate } from 'react-router-dom'
  import { FileText, Globe, BookOpen } from 'lucide-react'
  import { useCreationStore } from '../../stores/creationStore'
  import { usePlatform } from '../../hooks/usePlatform'

  const COMMUNITIES = ['科技真相', '娱乐吃瓜', '社会热点', '财经观察', '体育赛事', '游戏前沿', '校园生活', '职场那些事', '情感树洞', '生活百科']

  export default function PublishTargetSelector() {
    const navigate = useNavigate()
    const store = useCreationStore()
    const { isMobile } = usePlatform()
    const [target, setTarget] = useState<'evidence' | 'community' | 'note'>('evidence')
    const [melonId, setMelonId] = useState(store.draft?.melonId || '')
    const [direction, setDirection] = useState<'support' | 'against'>('support')
    const [community, setCommunity] = useState('')
    const [publishing, setPublishing] = useState(false)

    const handlePublish = async () => {
      setPublishing(true)
      // 模拟发布延迟
      await new Promise(r => setTimeout(r, 500))
      store.publish(target, { melonId, direction, community })
      setPublishing(false)
      // 跳转
      if (target === 'evidence' && melonId) {
        navigate(`/melon/${melonId}`)
      } else if (target === 'community') {
        navigate(`/community/${community}`)
      } else {
        navigate('/notes')
      }
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          {[
            { key: 'evidence', label: '瓜田佐证', icon: FileText },
            { key: 'community', label: '社区帖子', icon: Globe },
            { key: 'note', label: '保存笔记', icon: BookOpen },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setTarget(opt.key as typeof target)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                target === opt.key ? 'bg-seal text-white' : 'bg-ink-50 text-ink-600'
              }`}
            >
              <opt.icon size={14} />
              {opt.label}
            </button>
          ))}
        </div>

        {target === 'evidence' && (
          <div className="space-y-2">
            <input
              value={melonId}
              onChange={e => setMelonId(e.target.value)}
              placeholder="选择目标瓜（输入瓜ID或标题搜索）"
              className="w-full px-3 py-2 rounded-lg border border-ink-200 text-[12px] outline-none focus:border-seal"
            />
            <div className="flex gap-2">
              {(['support', 'against'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                    direction === d ? (d === 'support' ? 'bg-bamboo text-white' : 'bg-red-400 text-white') : 'bg-ink-50 text-ink-600'
                  }`}
                >
                  {d === 'support' ? '支持真 ✓' : '支持假 ✗'}
                </button>
              ))}
            </div>
          </div>
        )}

        {target === 'community' && (
          <select
            value={community}
            onChange={e => setCommunity(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-ink-200 text-[12px] outline-none focus:border-seal bg-white"
          >
            <option value="">选择社区</option>
            {COMMUNITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <button
          onClick={handlePublish}
          disabled={publishing || (target === 'evidence' && !melonId) || (target === 'community' && !community)}
          className="w-full py-2.5 rounded-xl bg-seal text-white text-[13px] font-semibold disabled:opacity-40 active:scale-95 transition-all"
        >
          {publishing ? '发布中…' : `发布到${target === 'evidence' ? '佐证' : target === 'community' ? '社区' : '笔记'}`}
        </button>
      </div>
    )
  }
  ```

- [ ] **Step 2: 类型检查 + lint + commit**
  ```bash
  git add src/components/create/PublishTargetSelector.tsx
  git commit -m "feat(create): 发布目标选择器PublishTargetSelector"
  ```

**验收标准：**
- 3个发布目标可切换
- 发布为佐证：选择瓜+方向
- 发布成功后跳转到对应页面

---

## Section B：声明核查 + creationStore + 路由（Day 8）

> 参考策划案：`AI创作助手策划案.md` v1.0 4.3节 + `求证工具集策划案.md` v3.0

### T7：ClaimVerifier 声明核查组件

**Files:**
- Create: `src/components/create/ClaimVerifier.tsx`

**改造要点：**
- 内联在编辑器中：检测文本中的声明性语句，标记⚠️
- MVP阶段用简单规则检测（含数字/百分比/统计词的句子），无需LLM
- 点击"一键核查" → 调用 verificationStore.verify()（mock返回结果）
- 核查结果：✅ 找到支撑 / ❌ 未找到支撑 / ⚠️ 数据有出入

**Steps:**

- [ ] **Step 1: 创建声明核查组件**
  ```tsx
  // src/components/create/ClaimVerifier.tsx
  import { useState, useMemo } from 'react'
  import { AlertTriangle, CheckCircle, XCircle, HelpCircle, Loader2 } from 'lucide-react'

  interface Props { text: string }

  // 简单规则：含数字+关键词的句子识别为声明
  const CLAIM_PATTERNS = /[。！？]/g
  const CLAIM_KEYWORDS = /据|统计|数据|调查|报告|研究|显示|比例|率|%|数字|数量|人数|增长|下降|同比|环比|预计|可能|或|是.*[的].*[最]/g

  export default function ClaimVerifier({ text }: Props) {
    const sentences = useMemo(() => {
      return text.split(CLAIM_PATTERNS).filter(s => s.trim().length > 10 && CLAIM_KEYWORDS.test(s))
    }, [text])

    const [results, setResults] = useState<Record<number, 'pending' | 'loading' | 'supported' | 'unsupported' | 'discrepancy'>>({})

    const handleVerify = async (i: number) => {
      setResults(prev => ({ ...prev, [i]: 'loading' }))
      // mock核查：延迟1秒返回随机结果
      await new Promise(r => setTimeout(r, 1000))
      const outcomes: ('supported' | 'unsupported' | 'discrepancy')[] = ['supported', 'unsupported', 'discrepancy']
      setResults(prev => ({ ...prev, [i]: outcomes[Math.floor(Math.random() * outcomes.length)] }))
    }

    if (sentences.length === 0) return null

    return (
      <div className="mt-2 space-y-1">
        {sentences.map((s, i) => (
          <div key={i} className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-amber-50/50 border border-amber-100">
            <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-amber-700 line-clamp-2">{s.trim()}</p>
              <div className="flex items-center gap-2 mt-1">
                {results[i] === 'loading' ? (
                  <span className="flex items-center gap-1 text-[10px] text-ink-400">
                    <Loader2 size={10} className="animate-spin" /> 核查中…
                  </span>
                ) : results[i] === 'supported' ? (
                  <span className="flex items-center gap-1 text-[10px] text-bamboo">
                    <CheckCircle size={10} /> 已找到来源支撑
                  </span>
                ) : results[i] === 'unsupported' ? (
                  <span className="flex items-center gap-1 text-[10px] text-red-500">
                    <XCircle size={10} /> 未找到权威来源
                  </span>
                ) : results[i] === 'discrepancy' ? (
                  <span className="flex items-center gap-1 text-[10px] text-gold">
                    <HelpCircle size={10} /> 数据有出入
                  </span>
                ) : (
                  <button
                    onClick={() => handleVerify(i)}
                    className="text-[10px] text-seal hover:text-seal/80 font-medium"
                  >
                    一键核查
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  ```

- [ ] **Step 2: 在 StructuredEditor.tsx 中集成 ClaimVerifier**
  （T2 Step 2 的写作区已预留 `<ClaimVerifier>` 调用，确保按段落传入 text）

- [ ] **Step 3: 类型检查 + lint + commit**
  ```bash
  git add src/components/create/ClaimVerifier.tsx
  git commit -m "feat(create): 声明核查组件ClaimVerifier+规则检测+一键mock核查"
  ```

**验收标准：**
- 编辑器中含有数字/统计关键词的句子被标记⚠️
- 点击"一键核查"后显示mock核查结果

---

### T8：creationStore 创作状态store

**Files:**
- Create: `src/stores/creationStore.ts`

**改造要点：**
- 存储：当前草稿（topic/stance/readerType/sections/content）、骨架（titles/nodes）、风格档案、发布状态
- localStorage自动保存草稿（每3秒）
- 默认3个预设模板骨架（与T3共享数据）
- setSkeleton / setStyleProfile / updateNode / updateSection / saveDraft / publish 方法

**Steps:**

- [ ] **Step 1: 创建 store**
  ```tsx
  // src/stores/creationStore.ts
  import { create } from 'zustand'
  import { persist } from 'zustand/middleware'

  interface SkeletonNode {
    label: string
    hint: string
    claim: boolean
    content: string
  }

  interface Skeleton {
    titles: string[]
    nodes: SkeletonNode[]
  }

  interface Draft {
    topic: string
    stance: string
    readerType: string
    melonId?: string
    melonTitle?: string
    sections: string[]
    content: string
  }

  interface StyleProfile {
    id: string
    name: string
    icon: string
    desc: string
  }

  interface CreationStore {
    // 状态
    step: number
    draft: Draft
    skeleton: Skeleton | null
    styleProfile: StyleProfile | null
    publishing: boolean
    published: boolean

    // 方法
    setStep: (s: number) => void
    saveDraft: (partial: Partial<Draft>) => void
    setSkeleton: (s: Skeleton) => void
    setStyleProfile: (s: StyleProfile) => void
    updateNode: (i: number, data: Partial<SkeletonNode>) => void
    updateSection: (i: number, text: string) => void
    generateSkeleton: (topic: string, stance: string, readerType: string) => void
    publish: (target: string, meta: Record<string, string>) => void
    reset: () => void
  }

  const DEFAULT_DRAFT: Draft = {
    topic: '', stance: '', readerType: '大学生',
    melonId: undefined, melonTitle: undefined,
    sections: [], content: '',
  }

  // 预设骨架（与AISkeletonPanel共享）
  const PRESET_SKELETONS = [
    {
      titles: ['事件梳理与深度分析：{topic}', '从{topic}看背后的逻辑', '{topic}——不只是个例'],
      nodes: [
        { label: '开头：事件概述', hint: '用1-2句话概括核心事件', claim: false, content: '' },
        { label: '事实梳理', hint: '按时间顺序整理关键节点', claim: true, content: '' },
        { label: '深度分析', hint: '分析深层原因和影响', claim: false, content: '' },
        { label: '多方观点', hint: '不同立场的主要观点', claim: true, content: '' },
        { label: '结论与思考', hint: '总结核心结论', claim: false, content: '' },
      ]
    },
    // ... 更多模板在T3中有定义
  ]

  export const useCreationStore = create<CreationStore>()(
    persist(
      (set, get) => ({
        step: 0,
        draft: DEFAULT_DRAFT,
        skeleton: null,
        styleProfile: { id: 'analytical', name: '理性分析', icon: '📊', desc: '数据驱动，逻辑严密' },
        publishing: false,
        published: false,

        setStep: (step) => set({ step }),

        saveDraft: (partial) => set(state => ({
          draft: { ...state.draft, ...partial }
        })),

        setSkeleton: (skeleton) => set({ skeleton }),

        setStyleProfile: (styleProfile) => set({ styleProfile }),

        updateNode: (i, data) => set(state => ({
          skeleton: state.skeleton ? {
            ...state.skeleton,
            nodes: state.skeleton.nodes.map((n, j) => j === i ? { ...n, ...data } : n)
          } : null
        })),

        updateSection: (i, text) => set(state => {
          const sections = [...(state.draft.sections || [])]
          sections[i] = text
          return { draft: { ...state.draft, sections, content: sections.filter(Boolean).join('\n\n') } }
        }),

        generateSkeleton: (topic, stance, readerType) => {
          // MVP阶段：从预设模板选第1个，替换占位符
          const template = PRESET_SKELETONS[0]
          const skeleton = {
            titles: template.titles.map(t => t.replace('{topic}', topic)),
            nodes: template.nodes.map(n => ({ ...n, content: '' }))
          }
          set({ skeleton, step: 1 })
        },

        publish: async (target, meta) => {
          set({ publishing: true })
          // 模拟延迟
          await new Promise(r => setTimeout(r, 500))
          set({ publishing: false, published: true, step: 0, draft: DEFAULT_DRAFT, skeleton: null })
        },

        reset: () => set({ step: 0, draft: DEFAULT_DRAFT, skeleton: null, published: false }),
      }),
      {
        name: 'creation-store',
        partialize: (state) => ({ draft: state.draft, step: state.step, styleProfile: state.styleProfile }),
      }
    )
  )
  ```

- [ ] **Step 2: 类型检查 + lint + commit**
  ```bash
  git add src/stores/creationStore.ts
  git commit -m "feat(create): creationStore创作状态store+localStorage持久化"
  ```

**验收标准：**
- store可存储/读取草稿
- localStorage持久化，刷新不丢失
- 预设骨架生成方法正常

---

### T9：路由注册 + 路由守卫

**Files:**
- Modify: `src/entry/WebApp.tsx`
- Modify: `src/entry/MobileApp.tsx`

**改造要点：**
- 新增路由：`/create` → CreatePage（lazy加载）
- 新增路由：`/hot` → HotPage
- 新增路由：`/community` → CommunityPage
- 新增路由：`/community/:id` → CommunityDetailPage
- 新增路由：`/notes` → NotesPage
- 确保所有新增路由在双端注册

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/entry/WebApp.tsx` 和 `src/entry/MobileApp.tsx`，确认现有路由注册方式（lazy import + Suspense）

- [ ] **Step 2: 添加路由**
  ```tsx
  // WebApp.tsx
  import { lazy, Suspense } from 'react'

  const CreatePage = lazy(() => import('../pages/CreatePage'))
  const HotPage = lazy(() => import('../pages/HotPage'))
  const CommunityPage = lazy(() => import('../pages/CommunityPage'))
  const CommunityDetailPage = lazy(() => import('../pages/CommunityDetailPage'))
  const NotesPage = lazy(() => import('../pages/NotesPage'))

  // 在 Routes 中添加：
  // <Route path="/create" element={<CreatePage />} />
  // <Route path="/hot" element={<HotPage />} />
  // <Route path="/community" element={<CommunityPage />} />
  // <Route path="/community/:id" element={<CommunityDetailPage />} />
  // <Route path="/notes" element={<NotesPage />} />
  ```

- [ ] **Step 3: 类型检查 + lint + commit**
  ```bash
  git add src/entry/WebApp.tsx src/entry/MobileApp.tsx
  git commit -m "feat: 注册/create /hot /community /notes路由"
  ```

**验收标准：**
- 双端访问 `/create` `/hot` `/community` `/notes` 路由可达（页面内容可为空或mock）

---

## Section C：热点+佐证+求证工具 前端改造（Day 9）

> 参考策划案：`热点系统策划案.md` v3.0 / `佐证系统策划案.md` v3.0 / `求证工具集策划案.md` v3.0

### T10：HotPage 热点数据mock化

**Files:**
- Modify: `src/pages/HotPage.tsx`（590行）

**改造要点：**
- 替换hardcoded数据为mockData中的10个热点事件
- 每个热点含：标题、描述、热度（参与人数+时间衰减）、关联瓜列表、时间线节点
- 列表按热度排序（参与人数×时间衰减）
- 点击卡片跳转到 `/hot-event/:id` 详情页

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/pages/HotPage.tsx` 全文，定位hardcoded数据区域

- [ ] **Step 2: 替换为 mock 数据**
  ```tsx
  const MOCK_HOT_EVENTS = [
    {
      id: 'hot-1', title: '南开大学学生被骗220万',
      desc: '一名南开大学学生遭遇电信诈骗，损失220万元，引发校园反诈讨论',
      participantCount: 1280, melonCount: 3, debateCount: 1,
      createdAt: '2026-07-05T10:00:00Z',
      tags: ['校园', '诈骗', '反诈'],
      timeline: [
        { date: '2026-07-01', summary: '学生接到诈骗电话' },
        { date: '2026-07-03', summary: '发现被骗后报警' },
        { date: '2026-07-05', summary: '校方发布通报' },
      ],
      relatedMelons: ['melon-1', 'melon-2', 'melon-3'],
    },
    { id: 'hot-2', title: '某新能源车续航虚标', desc: '冬季实测续航仅标称40%，车主集体维权', participantCount: 960, melonCount: 2, debateCount: 0, createdAt: '2026-07-04T10:00:00Z', tags: ['汽车', '新能源', '维权'], timeline: [], relatedMelons: [] },
    { id: 'hot-3', title: '流量明星数据造假被曝光', desc: '某顶流明星粉丝后援会被曝刷数据，平台介入调查', participantCount: 2340, melonCount: 4, debateCount: 2, createdAt: '2026-07-03T10:00:00Z', tags: ['娱乐', '数据造假'], timeline: [], relatedMelons: [] },
    { id: 'hot-4', title: 'AI生成内容版权首案宣判', desc: '法院首次判定AI生成内容的版权归属，具有里程碑意义', participantCount: 720, melonCount: 1, debateCount: 1, createdAt: '2026-07-06T10:00:00Z', tags: ['AI', '法律', '版权'], timeline: [], relatedMelons: [] },
    { id: 'hot-5', title: '某大学食堂涨价引争议', desc: '食堂价格上调30%，学生抗议后校方承诺调整', participantCount: 450, melonCount: 1, debateCount: 0, createdAt: '2026-07-05T14:00:00Z', tags: ['校园', '生活'], timeline: [], relatedMelons: [] },
    { id: 'hot-6', title: '知名博主被曝洗稿', desc: '百万粉博主被原作者逐篇对比指控洗稿', participantCount: 1890, melonCount: 3, debateCount: 1, createdAt: '2026-07-02T10:00:00Z', tags: ['自媒体', '洗稿'], timeline: [], relatedMelons: [] },
    { id: 'hot-7', title: '新型AI换脸诈骗出现', desc: '骗子用AI换脸冒充熟人视频通话，已有多人受骗', participantCount: 1560, melonCount: 2, debateCount: 1, createdAt: '2026-07-04T16:00:00Z', tags: ['AI', '诈骗', '安全'], timeline: [], relatedMelons: [] },
    { id: 'hot-8', title: '某游戏厂商虚假宣传被罚', desc: '宣传画面与实际游戏不符，被监管部门处罚', participantCount: 870, melonCount: 1, debateCount: 0, createdAt: '2026-07-06T08:00:00Z', tags: ['游戏', '虚假宣传'], timeline: [], relatedMelons: [] },
    { id: 'hot-9', title: '考研机构承诺"保过"被查', desc: '多家考研机构因承诺"保过"被教育部门调查', participantCount: 620, melonCount: 1, debateCount: 0, createdAt: '2026-07-05T20:00:00Z', tags: ['教育', '考研'], timeline: [], relatedMelons: [] },
    { id: 'hot-10', title: '社交平台算法推荐引争议', desc: '用户指控平台算法推荐导致信息茧房加剧', participantCount: 1100, melonCount: 2, debateCount: 1, createdAt: '2026-07-03T18:00:00Z', tags: ['社交', '算法'], timeline: [], relatedMelons: [] },
  ].map(e => ({
    ...e,
    // 热度 = 参与人数 × 时间衰减（7天内线性衰减到0.1）
    hotScore: Math.round(e.participantCount * Math.max(0.1, 1 - (Date.now() - new Date(e.createdAt).getTime()) / (7 * 24 * 3600 * 1000)))
  })).sort((a, b) => b.hotScore - a.hotScore)
  ```

- [ ] **Step 3: 确保卡片渲染正确**
  检查 HotPage 内卡片组件是否使用 `title` / `desc` / `hotScore` / `tags` 等字段

- [ ] **Step 4: 类型检查 + lint + commit**
  ```bash
  git add src/pages/HotPage.tsx
  git commit -m "feat(hot): 热点页数据mock化+10个种子热点事件"
  ```

**验收标准：**
- 热点页展示10个热点事件，按热度排序
- 每个卡片含标题/描述/热度分数/标签
- 点击卡片跳转到详情页

---

### T11：HotEventDetailPage 时间线复用

**Files:**
- Modify: `src/pages/HotEventDetailPage.tsx`（440行）

**改造要点：**
- 时间线组件复用瓜田的 `EvidenceTimeline`（统一时间线组件）
- 展示关联瓜列表和关联辩论列表
- 数据来源于 hotStore（mock数据）

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/pages/HotEventDetailPage.tsx` 全文，定位时间线区域

- [ ] **Step 2: 复用 EvidenceTimeline**
  ```tsx
  import EvidenceTimeline from '../../components/EvidenceTimeline'

  // 替换原有时间线渲染
  <EvidenceTimeline
    items={event.timeline.map(t => ({
      id: t.date,
      date: t.date,
      summary: t.summary,
      status: 'confirmed' as const,
    }))}
  />
  ```

- [ ] **Step 3: 类型检查 + lint + commit**
  ```bash
  git add src/pages/HotEventDetailPage.tsx
  git commit -m "feat(hot): 热点详情页复用EvidenceTimeline时间线"
  ```

**验收标准：**
- 热点详情页时间线使用统一的 EvidenceTimeline 组件
- 关联瓜列表展示正确

---

### T12：佐证区域增加"AI辅助写佐证"入口

**Files:**
- Modify: `src/pages/MelonDetailPage.tsx`（佐证区域）

**改造要点：**
- 在佐证提交表单区增加"AI辅助写佐证"按钮
- 点击跳转 `/create?melonId=xxx&title=xxx`（复用 Sprint 1 T3 的入口逻辑）
- 与 T3 按钮的区别：T3 在佐证列表顶部，T12 在佐证表单区域

**Steps:**

- [ ] **Step 1: 定位佐证提交表单**
  读 `src/pages/MelonDetailPage.tsx` 中佐证提交表单的区域

- [ ] **Step 2: 增加按钮**
  ```tsx
  <button
    onClick={() => navigate(`/create?melonId=${melon.id}&title=${encodeURIComponent(melon.title)}`)}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 text-[12px] font-medium hover:bg-purple-100 transition-colors"
  >
    <Sparkles size={13} />
    AI辅助写佐证
  </button>
  ```

- [ ] **Step 3: 类型检查 + lint + commit**
  ```bash
  git add src/pages/MelonDetailPage.tsx
  git commit -m "feat(melon): 佐证提交区增加AI辅助写佐证入口"
  ```

**验收标准：**
- 佐证提交表单区有"AI辅助写佐证"按钮
- 点击跳转 /create 页面

---

### T13：求证工具 coming soon + 一键求证简化

**Files:**
- Modify: `src/pages/ReverseImageSearch.tsx`（如存在）
- Modify: `src/pages/MultiSourceVerify.tsx`
- Modify: `src/pages/PlagiarismChecker.tsx`
- Modify: `src/pages/VerifyPage.tsx`（307行）

**改造要点：**
- 反向搜图/多源验证/洗稿检测 标记为"coming soon"（保留页面骨架，显示占位提示）
- 一键求证（VerifyPage）简化为纯文字输入→LLM分析→结果展示
- 去掉agent动画的mock chat环节
- 保持EXIF+情绪检测为可用状态

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/pages/ReverseImageSearch.tsx` / `MultiSourceVerify.tsx` / `PlagiarismChecker.tsx` / `VerifyPage.tsx` 确认页面结构

- [ ] **Step 2: Coming soon 页面替换**
  ```tsx
  // 通用coming soon模板
  export default function ComingSoonPage({ title, description }: { title: string; description: string }) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-16 h-16 rounded-full bg-ink-50 flex items-center justify-center mb-4">
          <Construction size={28} className="text-ink-300" />
        </div>
        <h2 className="text-[16px] font-semibold text-ink-700 mb-1">{title}</h2>
        <p className="text-[13px] text-ink-400 text-center max-w-xs">{description}</p>
      </div>
    )
  }
  ```

- [ ] **Step 3: VerifyPage 简化**
  读 `src/pages/VerifyPage.tsx`（307行），简化文字输入+分析流程：
  - 去掉agent动画mock chat
  - 保留文字输入+LLM分析按钮
  - 保留结果展示区域（mock分析结果）

- [ ] **Step 4: 类型检查 + lint + commit**
  ```bash
  git add src/pages/ReverseImageSearch.tsx src/pages/MultiSourceVerify.tsx src/pages/PlagiarismChecker.tsx src/pages/VerifyPage.tsx
  git commit -m "feat(tools): 3个工具标记coming soon+一键求证简化"
  ```

**验收标准：**
- 3个不可用工具显示coming soon占位
- 一键求证可输入文字并返回mock结果
- EXIF+情绪检测未受影响

---

## Section D：社区+笔记+管理后台 前端收尾（Day 10）

> 参考策划案：`社区系统策划案.md` v3.0 / `笔记系统策划案.md` v3.0 / `管理后台与平台架构策划案.md` v3.0

### T14：CommunityPage 种子数据

**Files:**
- Modify: `src/pages/CommunityPage.tsx`（296行）

**改造要点：**
- 替换hardcoded为10个官方社区+种子帖子
- 社区卡片：图标/名称/描述/人数/帖子数
- 点击卡片跳转 `/community/:id`

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/pages/CommunityPage.tsx` 全文，定位社区列表数据

- [ ] **Step 2: 替换为 mock 数据**
  ```tsx
  const MOCK_COMMUNITIES = [
    { id: 'tech', name: '科技真相', icon: '🔬', desc: '关注科技圈最新动态', memberCount: 1230, postCount: 156 },
    { id: 'entertainment', name: '娱乐吃瓜', icon: '🎬', desc: '娱乐圈热点追踪', memberCount: 2340, postCount: 312 },
    { id: 'society', name: '社会热点', icon: '🌐', desc: '社会民生深度讨论', memberCount: 980, postCount: 89 },
    { id: 'finance', name: '财经观察', icon: '💰', desc: '投资理财信息甄别', memberCount: 670, postCount: 67 },
    { id: 'sports', name: '体育赛事', icon: '🏀', desc: '体育圈真假消息', memberCount: 540, postCount: 45 },
    { id: 'game', name: '游戏前沿', icon: '🎮', desc: '游戏资讯与反诈', memberCount: 890, postCount: 123 },
    { id: 'campus', name: '校园生活', icon: '📚', desc: '大学生活经验分享', memberCount: 1560, postCount: 234 },
    { id: 'career', name: '职场那些事', icon: '💼', desc: '职场避坑与反诈', memberCount: 430, postCount: 56 },
    { id: 'emotion', name: '情感树洞', icon: '💝', desc: '情感话题理性讨论', memberCount: 780, postCount: 167 },
    { id: 'life', name: '生活百科', icon: '🏠', desc: '生活常识甄别验证', memberCount: 320, postCount: 34 },
  ]
  ```

- [ ] **Step 3: 类型检查 + lint + commit**
  ```bash
  git add src/pages/CommunityPage.tsx
  git commit -m "feat(community): 社区页种子数据+10个官方社区"
  ```

**验收标准：**
- 社区页展示10个社区卡片
- 每个卡片含图标/名称/描述/人数/帖子数

---

### T15：CommunityDetailPage 帖子列表+发帖+评论

**Files:**
- Modify: `src/pages/CommunityDetailPage.tsx`（222行）

**改造要点：**
- 帖子列表（热门/最新/精华tab切换）
- 发帖表单（标题+正文）
- 单层评论（不做楼中楼）
- 每个帖子支持点赞

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/pages/CommunityDetailPage.tsx` 全文

- [ ] **Step 2: 实现帖子列表+tab**
  ```tsx
  const [postTab, setPostTab] = useState<'hot' | 'latest' | 'featured'>('hot')
  
  const sortedPosts = useMemo(() => {
    if (postTab === 'hot') return [...posts].sort((a, b) => b.likeCount - a.likeCount)
    if (postTab === 'latest') return [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return posts.filter(p => p.isFeatured)
  }, [posts, postTab])
  ```

- [ ] **Step 3: 实现发帖表单**
  在社区详情页底部或弹出层增加发帖表单（标题input + 正文textarea + 发布按钮）

- [ ] **Step 4: 实现单层评论**
  帖子详情中展示评论列表（按时间排序），底部有评论输入框

- [ ] **Step 5: 类型检查 + lint + commit**
  ```bash
  git add src/pages/CommunityDetailPage.tsx
  git commit -m "feat(community): 社区详情页+帖子列表+发帖+评论"
  ```

**验收标准：**
- 帖子列表支持热门/最新/精华tab切换
- 可发帖，帖子出现在列表中
- 可评论，评论显示在帖子下方

---

### T16：NotesPage 笔记简化编辑器

**Files:**
- Modify: `src/pages/NotesPage.tsx`（682行）

**改造要点：**
- 砍掉workspace概念
- 改为：标题+textarea正文+标签（最多5个）+列表
- 核心联动：笔记一键发布为佐证
- 自动保存草稿到 localStorage

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/pages/NotesPage.tsx`（682行），定位现有workspace逻辑

- [ ] **Step 2: 简化编辑器**
  重构为：
  - 笔记列表（最近/标签筛选）
  - 笔记编辑（标题+textarea+标签+关联瓜选择）
  - 笔记查看（展示内容+[编辑][发布为佐证]按钮）

- [ ] **Step 3: 实现笔记→佐证联动**
  ```tsx
  const publishAsEvidence = async (note: Note) => {
    if (!note.relatedMelonId) {
      // 弹窗选择瓜
      const selected = await selectMelon()
      if (!selected) return
      note.relatedMelonId = selected.id
    }
    const direction = await selectDirection()
    await evidenceStore.submitEvidence({
      melonId: note.relatedMelonId,
      content: note.content,
      direction,
      source: 'note',
      sourceNoteId: note.id,
    })
    navigate(`/melon/${note.relatedMelonId}`)
  }
  ```

- [ ] **Step 4: 类型检查 + lint + commit**
  ```bash
  git add src/pages/NotesPage.tsx
  git commit -m "feat(note): 笔记简化编辑器+笔记→佐证发布联动"
  ```

**验收标准：**
- 笔记列表展示最近笔记+标签筛选
- 创建笔记：标题+正文+标签保存成功
- 笔记可发布为佐证，佐证出现在瓜详情页

---

### T17：AdminPage 开奖面板+LLM降级开关

**Files:**
- Modify: `src/pages/AdminPage.tsx`（1145行）

**改造要点：**
- 增加MelonManager子面板：pending瓜列表+一键开奖
- 增加LLM降级开关toggle+各模块降级状态展示
- 增加紧急下线操作

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/pages/AdminPage.tsx`（1145行），定位现有Tab结构

- [ ] **Step 2: 增加 MelonManager 面板**
  ```tsx
  // pending瓜列表+开奖按钮
  const PENDING_MELONS = [
    { id: 'm1', title: '某顶流男星被曝隐婚生子', status: 'pending', guessCount: 45, evidenceCount: 12 },
    { id: 'm2', title: '某新能源车续航虚标', status: 'pending', guessCount: 32, evidenceCount: 8 },
    // ...
  ]

  const handleReveal = (melonId: string) => {
    // 调 verificationStore 开奖
    store.setMelonResult(melonId, { result: 'true', revealedAt: new Date().toISOString() })
    toast.success('开奖成功')
  }
  ```

- [ ] **Step 3: 增加 LLM 降级开关**
  ```tsx
  const [fallbackMode, setFallbackMode] = useState(false)
  
  const FALLBACK_MODULES = [
    { key: 'aiArena', label: 'AI竞技场', status: fallbackMode ? '降级中' : '正常' },
    { key: 'verifyTools', label: '求证工具', status: fallbackMode ? '降级中' : '正常' },
    { key: 'creation', label: '创作助手', status: fallbackMode ? '降级中' : '正常' },
  ]
  ```

- [ ] **Step 4: 类型检查 + lint + commit**
  ```bash
  git add src/pages/AdminPage.tsx
  git commit -m "feat(admin): 管理后台开奖面板+LLM降级开关"
  ```

**验收标准：**
- 管理后台显示pending瓜列表
- 一键开奖操作可执行
- LLM降级开关可toggle，各模块降级状态可见

---

## Sprint 2 退出标准（Day 10 末尾验证）

- [ ] **类型检查全通过**：`npx tsc --noEmit` 无错误
- [ ] **Lint 全通过**：`npx oxlint` 无错误
- [ ] **构建成功**：`npm run build` 无错误
- [ ] **PC 端走查**，以下路由mock流程可走通：
  - `/create` — 完整创作流程（选题→骨架→写作→预览发布）
  - `/create?melonId=xxx&title=xxx` — 预填瓜信息
  - `/hot` — 10个热点事件，按热度排序
  - `/hot-event/:id` — 时间线+关联瓜
  - `/melon/:id` — 佐证区"AI辅助写佐证"入口
  - `/verify` — 文字输入+分析结果
  - `/community` — 10个社区列表
  - `/community/:id` — 帖子列表+发帖+评论
  - `/notes` — 笔记列表+编辑+发布为佐证
  - `/admin` — 开奖面板+降级开关
- [ ] **移动端走查**：`?platform=mobile` 访问上述页面，底部不被TabBar遮挡
- [ ] **commit 历史清晰**：17个任务对应17+ commit，message符合规范
- [ ] **构建体积**：`npm run build` 后 gzip 体积 < 300KB

---

## 依赖与并行策略

```
Section A（创作助手Day 6-7）
  T1(CreatePage) ──────────────┐
  T2(StructuredEditor) ────────┤
  T3(AISkeletonPanel) ─────────┼── 互不依赖，可并行完成后再联调
  T4(StyleProfileCard) ────────┤
  T5(QualityPreview) ──────────┤
  T6(PublishTargetSelector) ───┘

Section B（准备Day 8）
  T7(ClaimVerifier) ── 依赖 T2（编辑器集成）
  T8(creationStore) ── 依赖 T1-T6（被各组件引用）
  T9(路由注册) ────── 依赖 T1（CreatePage存在）

Section C（改造Day 9）
  T10(HotPage mock) ────┐
  T11(HotEventDetail) ───┼── 互不依赖，可并行
  T12(佐证AI入口) ──────┤
  T13(coming soon) ──────┘

Section D（收尾Day 10）
  T14(CommunityPage) ────────┐
  T15(CommunityDetail) ──────┼── 互不依赖，可并行
  T16(NotesPage) ────────────┤
  T17(AdminPage) ────────────┘

跨Section依赖：
  Section A → Section B（创作助手页面→creationStore/路由）
  Section C ← 独立，不依赖A/B
  Section D ← 独立，不依赖A/B/C
```

**推荐执行顺序**：
- 4个subagent并行：Section A（Day 6-7） / Section B（Day 8） / Section C（Day 9） / Section D（Day 10）
- Section A 内部：T1→T2→T3/T4/T5/T6 并行（T2完成后T3-T6可挂载到CreatePage）
- Section B 内部：T7/T8 可并行，T9 需 T1 完成
- Section C 内部：全部并行
- Section D 内部：全部并行

---

> 计划完成。执行时每个 subagent 只需读本任务块 + 任务涉及的现有文件，无需读全 plan。
