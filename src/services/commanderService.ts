import { callLLM } from '../stores/llmStore'
import { type SearchResult } from './searchService'
import { runOrchestrator, runSearchAgent, runResearchAgent, runVerifyAgent, runWritingAgent } from './agentService'
import { adaptToAllPlatforms } from './platformAdapter'
import { filterUserInput } from './contentFilter'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useActivityStore } from '../stores/activityStore'
import { useCanonicalStore } from '../stores/canonicalStore'
import type { EventAction } from '../types/activity'

// ===== 信息完整度判断（MVP 简化版） =====

export interface CompletenessResult {
  isComplete: boolean
  missing: string[]
  question?: string
}

const PLATFORM_KEYWORDS: Record<string, string[]> = {
  zhihu: ['知乎', 'zhihu'],
  xiaohongshu: ['小红书', '红书', 'xiaohongshu'],
  weibo: ['微博', 'weibo'],
  douyin: ['抖音', 'douyin'],
  tieba: ['贴吧', 'tieba'],
  guanwei: ['观微', 'guanwei'],
}

export function checkCompleteness(input: string): CompletenessResult {
  const missing: string[] = []

  if (!input || input.trim().length < 4) {
    missing.push('topic')
  }

  const lower = input.toLowerCase()
  const hasPlatform = Object.values(PLATFORM_KEYWORDS).some(keywords =>
    keywords.some(kw => lower.includes(kw.toLowerCase()))
  )
  if (!hasPlatform) {
    missing.push('platform')
  }

  if (missing.length > 0) {
    const questions: string[] = []
    if (missing.includes('topic')) questions.push('你想写什么主题？')
    if (missing.includes('platform')) questions.push('目标发布在哪个平台？')
    return {
      isComplete: false,
      missing,
      question: questions.join(' '),
    }
  }

  return { isComplete: true, missing: [] }
}

interface TaskSpec {
  goal: string
  targetPlatform?: string
  audience?: string
  depth?: 'quick' | 'standard' | 'deep'
  needSearch?: boolean
  outputForm?: string
}

interface PlanStep {
  id: string
  agent: 'search' | 'research' | 'verify' | 'writing' | 'adapt'
  description: string
}

interface CommanderState {
  phase: 'idle' | 'collecting' | 'planning' | 'executing' | 'awaiting_confirmation' | 'done'
  spec: TaskSpec
  plan: PlanStep[]
  currentStep: number
}

let state: CommanderState = {
  phase: 'idle',
  spec: { goal: '' },
  plan: [],
  currentStep: 0,
}

export function resetCommander() {
  state = {
    phase: 'idle',
    spec: { goal: '' },
    plan: [],
    currentStep: 0,
  }
  useCanonicalStore.getState().reset()
}

export function getCommanderState(): CommanderState {
  return { ...state }
}

function addEvent(
  workspaceId: string,
  type: 'search_complete' | 'research_complete' | 'verify_warning' | 'writing_complete' | 'commander_question' | 'commander_plan' | 'commander_welcome' | 'user_action' | 'error' | 'info',
  agentType: 'orchestrator' | 'search' | 'research' | 'verify' | 'writing' | 'user' | 'system',
  title: string,
  content: string,
  actions?: EventAction[],
  data?: Record<string, unknown>
) {
  useActivityStore.getState().addEventSimple(workspaceId, type, agentType, title, content, actions, data)
}

export function sendWelcome(workspaceId: string) {
  addEvent(
    workspaceId,
    'commander_welcome',
    'orchestrator',
    '你好！我是你的创作指挥官 🎖️',
    '告诉我你想创作什么内容，我会帮你搜集信息、核查事实、提炼观点，最终生成适合各平台发布的内容。\n\n例如："帮我分析AI换脸诈骗频发这个话题"',
    undefined,
    { phase: 'collecting' }
  )
  state.phase = 'collecting'
}

export async function handleUserInput(workspaceId: string, input: string, mode: 'assist' | 'auto'): Promise<void> {
  // 内容策略过滤
  const filterResult = filterUserInput(input)
  if (!filterResult.passed) {
    useActivityStore.getState().addEventSimple(workspaceId, 'error', 'system', '内容被拦截', filterResult.reason || '输入内容不合规')
    return
  }

  addEvent(workspaceId, 'user_action', 'user', '你', input, undefined, { input })

  const current = useWorkspaceStore.getState().getCurrent()
  if (!current) return

  if (!current.topic) {
    useWorkspaceStore.getState().updateTopic(workspaceId, input)
  }

  switch (state.phase) {
    case 'idle':
      await parseGoal(workspaceId, input)
      break
    case 'collecting':
      await processAnswer(workspaceId, input)
      break
    case 'awaiting_confirmation':
      if (input.includes('确认') || input.includes('开始') || input.includes('执行') || input === '好' || input === '是' || input === 'yes') {
        await executePlan(workspaceId, mode)
      } else {
        await parseGoal(workspaceId, input)
      }
      break
    case 'executing':
      addEvent(workspaceId, 'info', 'system', '指令已接收', '正在执行中，完成后会处理你的补充要求。')
      break
    case 'done':
      resetCommander()
      await parseGoal(workspaceId, input)
      break
  }
}

async function parseGoal(workspaceId: string, input: string): Promise<void> {
  state.spec.goal = input
  state.phase = 'collecting'

  try {
    const response = await callLLM([
      {
        role: 'system',
        content: `你是创作Commander，分析用户的创作目标，判断需要补充什么信息。
你需要判断以下信息是否明确：
1. 目标平台（用户想发布到哪里？如果没说就问）
2. 目标受众（写给谁看？如果不明确就问）
3. 内容深度（快速概述/标准分析/深度研究？默认标准）
4. 是否需要联网搜索（默认是）

每次只问1-2个最关键的问题，不要一次问太多。
返回JSON格式：{"missing": ["platform"|"audience"|"depth"], "question": "你的问题", "quickReplies": ["选项1","选项2"]}`
      },
      {
        role: 'user',
        content: `用户目标：${input}\n\n当前已收集的信息：${JSON.stringify(state.spec)}`
      }
    ], { maxTokens: 300, temperature: 0.3 })

    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    if (parsed.missing && parsed.missing.length > 0) {
      const actions: EventAction[] = (parsed.quickReplies || []).map((r: string, i: number) => ({
        id: `reply-${i}`,
        label: r,
        style: i === 0 ? 'primary' : 'secondary',
      }))

      addEvent(
        workspaceId,
        'commander_question',
        'orchestrator',
        '让我确认一下',
        parsed.question,
        actions,
        { missing: parsed.missing }
      )
    } else {
      await buildPlan(workspaceId)
    }
  } catch {
    state.spec.needSearch = true
    state.spec.depth = 'standard'
    await buildPlan(workspaceId)
  }
}

async function processAnswer(workspaceId: string, input: string): Promise<void> {
  const lower = input.toLowerCase()

  if (!state.spec.targetPlatform) {
    if (lower.includes('知乎')) state.spec.targetPlatform = 'zhihu'
    else if (lower.includes('小红书') || lower.includes('红书')) state.spec.targetPlatform = 'xiaohongshu'
    else if (lower.includes('微博')) state.spec.targetPlatform = 'weibo'
    else if (lower.includes('抖音')) state.spec.targetPlatform = 'douyin'
    else if (lower.includes('观微')) state.spec.targetPlatform = 'guanwei'
    else if (lower.includes('贴吧')) state.spec.targetPlatform = 'tieba'
    else if (lower.includes('全平台') || lower.includes('所有平台') || lower.includes('全部')) state.spec.targetPlatform = 'all'
  }

  if (!state.spec.audience) {
    if (lower.includes('大学生') || lower.includes('学生')) state.spec.audience = '大学生'
    else if (lower.includes('普通')) state.spec.audience = '普通读者'
    else if (lower.includes('专业')) state.spec.audience = '专业人士'
  }

  if (!state.spec.depth) {
    if (lower.includes('快速') || lower.includes('简单') || lower.includes('简短')) state.spec.depth = 'quick'
    else if (lower.includes('深度') || lower.includes('详细') || lower.includes('全面')) state.spec.depth = 'deep'
  }

  const missing: string[] = []
  if (!state.spec.targetPlatform) missing.push('platform')
  if (!state.spec.audience && state.spec.depth !== 'quick') missing.push('audience')

  if (missing.length > 0) {
    try {
      const response = await callLLM([
        {
          role: 'system',
          content: '你是创作Commander，根据缺失的信息项，生成一个自然的追问。每次只问1个问题。返回JSON：{"question": "问题", "quickReplies": ["选项1","选项2","选项3"]}'
        },
        {
          role: 'user',
          content: `已收集：${JSON.stringify(state.spec)}\n还缺失：${missing.join(',')}\n用户最新回答：${input}`
        }
      ], { maxTokens: 200, temperature: 0.5 })

      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)

      const actions: EventAction[] = (parsed.quickReplies || []).map((r: string, i: number) => ({
        id: `reply-${i}`,
        label: r,
        style: i === 0 ? 'primary' : 'secondary',
      }))

      addEvent(workspaceId, 'commander_question', 'orchestrator', '再确认一下', parsed.question, actions)
    } catch {
      if (!state.spec.targetPlatform) state.spec.targetPlatform = 'all'
      if (!state.spec.audience) state.spec.audience = '普通读者'
      if (!state.spec.depth) state.spec.depth = 'standard'
      await buildPlan(workspaceId)
    }
  } else {
    if (!state.spec.depth) state.spec.depth = 'standard'
    state.spec.needSearch = true
    await buildPlan(workspaceId)
  }
}

async function buildPlan(workspaceId: string): Promise<void> {
  state.phase = 'planning'

  const steps: PlanStep[] = []

  if (state.spec.needSearch !== false) {
    steps.push({ id: 's1', agent: 'search', description: '联网搜集相关信息和报道' })
  }
  steps.push({ id: 's2', agent: 'research', description: '提炼多角度观点和核心争议' })
  steps.push({ id: 's3', agent: 'verify', description: '核查关键事实声明' })
  steps.push({ id: 's4', agent: 'writing', description: '组织结构，生成标准稿' })

  if (state.spec.targetPlatform === 'all' || !state.spec.targetPlatform) {
    steps.push({ id: 's5', agent: 'adapt', description: '适配6个平台版本' })
  } else if (state.spec.targetPlatform !== 'guanwei') {
    steps.push({ id: 's5', agent: 'adapt', description: `适配${state.spec.targetPlatform}版本` })
  }

  state.plan = steps
  state.currentStep = 0
  state.phase = 'awaiting_confirmation'

  const planText = steps.map((s, i) => `${i + 1}. ${s.description}`).join('\n')
  const audienceText = state.spec.audience ? `，面向${state.spec.audience}` : ''
  const platformText = state.spec.targetPlatform === 'all' ? '全平台' : (state.spec.targetPlatform || '观微')

  addEvent(
    workspaceId,
    'commander_plan',
    'orchestrator',
    '执行计划',
    `目标：${state.spec.goal}\n平台：${platformText}${audienceText}\n\n我将按以下步骤执行：\n${planText}`,
    [
      { id: 'confirm', label: '开始执行', style: 'primary' },
      { id: 'modify', label: '修改计划', style: 'secondary' },
    ],
    { steps, spec: state.spec }
  )
}

export function confirmPlan(workspaceId: string, mode: 'assist' | 'auto') {
  executePlan(workspaceId, mode)
}

async function executePlan(workspaceId: string, mode: 'assist' | 'auto'): Promise<void> {
  state.phase = 'executing'
  addEvent(workspaceId, 'info', 'orchestrator', '开始执行', '正在启动Agent管线...')

  useCanonicalStore.getState().reset()
  useCanonicalStore.getState().setTopic(state.spec.goal)
  useCanonicalStore.getState().updateMetadata({ mode })

  let searchResults: SearchResult[] = []

  try {
    if (state.plan[state.currentStep]?.agent === 'search') {
      useActivityStore.getState().addEventSimple(workspaceId, 'agent_started', 'search', '搜索员启动', '正在搜集相关信息...')
      addEvent(workspaceId, 'info', 'search', '搜索开始', '正在搜集相关信息...')
      const orchOutput = await runOrchestrator(state.spec.goal)
      const searchOutput = await runSearchAgent(orchOutput.keywords)
      searchResults = searchOutput.results

      const factCount = useCanonicalStore.getState().draft.facts.length
      addEvent(
        workspaceId,
        'search_complete',
        'search',
        '搜索完成',
        `找到 ${searchResults.length} 篇相关报道和 ${factCount} 个数据来源`,
        [
          { id: 'use_all', label: '引用全部', style: 'primary' },
          { id: 'view_results', label: '查看结果', style: 'secondary' },
        ],
        { resultCount: searchResults.length }
      )
      state.currentStep++
    }

    if (state.plan[state.currentStep]?.agent === 'research') {
      useActivityStore.getState().addEventSimple(workspaceId, 'agent_started', 'research', '研究员启动', '正在整理资料与观点...')
      addEvent(workspaceId, 'info', 'research', '研究开始', '正在提炼多角度观点...')
      const researchOutput = await runResearchAgent(searchResults, state.spec.goal)

      const vpCount = researchOutput.viewpoints.length
      addEvent(
        workspaceId,
        'research_complete',
        'research',
        '观点提炼完成',
        `提炼出 ${vpCount} 个核心观点和 ${researchOutput.keyConflicts.length} 个争议点：\n${researchOutput.viewpoints.map(v => `• ${v.stance}：${v.argument.slice(0, 50)}...`).join('\n')}`,
        [
          { id: 'adopt_views', label: '采纳观点', style: 'primary' },
          { id: 'view_detail', label: '查看详情', style: 'secondary' },
        ],
        { viewpointCount: vpCount }
      )
      state.currentStep++
    }

    if (state.plan[state.currentStep]?.agent === 'verify') {
      useActivityStore.getState().addEventSimple(workspaceId, 'agent_started', 'verify', '核查员启动', '正在核查关键声明...')
      addEvent(workspaceId, 'info', 'verify', '核查开始', '正在验证事实声明...')
      const verifyOutput = await runVerifyAgent(searchResults)

      const warnings = verifyOutput.claims.filter(c => c.status === 'disputed' || c.status === 'unverifiable')
      if (warnings.length > 0) {
        addEvent(
          workspaceId,
          'verify_warning',
          'verify',
          `发现 ${warnings.length} 条信息存疑`,
          warnings.map(w => `• [${w.status}] ${w.text.slice(0, 80)}`).join('\n'),
          [
            { id: 'reverify', label: '重新核查', style: 'warning' },
            { id: 'view_evidence', label: '查看证据', style: 'secondary' },
          ],
          { warningCount: warnings.length }
        )
      } else {
        addEvent(
          workspaceId,
          'info',
          'verify',
          '核查完成',
          `已核查 ${verifyOutput.claims.length} 条声明，未发现明显存疑信息。`
        )
      }
      state.currentStep++
    }

    const canonDraft = useCanonicalStore.getState().draft

    if (state.plan[state.currentStep]?.agent === 'writing') {
      useActivityStore.getState().addEventSimple(workspaceId, 'agent_started', 'writing', '写作员启动', '正在生成主稿...')
      addEvent(workspaceId, 'info', 'writing', '写作开始', '正在组织结构，生成标准稿...')
      const writingOutput = await runWritingAgent(
        state.spec.goal,
        canonDraft.facts,
        canonDraft.claims,
        canonDraft.viewpoints,
        canonDraft.references
      )

      useWorkspaceStore.getState().updateDraft({
        topic: state.spec.goal,
        facts: canonDraft.facts,
        claims: canonDraft.claims,
        viewpoints: canonDraft.viewpoints,
        references: canonDraft.references,
        structure: writingOutput.structure,
      })

      useWorkspaceStore.getState().updatePlatformContent('guanwei', {
        content: writingOutput.content,
        title: writingOutput.title,
        generated: true,
      })

      addEvent(
        workspaceId,
        'writing_complete',
        'writing',
        '标准稿生成完成',
        `标题：${writingOutput.title}\n共 ${writingOutput.structure.length} 个章节`,
        [
          { id: 'adapt_all', label: '生成平台版本', style: 'primary' },
        ],
        { title: writingOutput.title, sectionCount: writingOutput.structure.length }
      )
      state.currentStep++
    }

    if (state.plan[state.currentStep]?.agent === 'adapt') {
      const latestDraft = useCanonicalStore.getState().draft
      addEvent(workspaceId, 'info', 'writing', '平台适配', '正在生成各平台版本...')

      try {
        const allContent = await adaptToAllPlatforms(latestDraft)
        for (const pc of allContent) {
          useWorkspaceStore.getState().updatePlatformContent(pc.platform, {
            content: pc.content,
            title: pc.title,
            generated: true,
          })
        }

        const platformIcons: Record<string, string> = {
          zhihu: '知', xiaohongshu: '红', weibo: '微', douyin: '抖', tieba: '贴', guanwei: '观', bilibili: 'B'
        }

        addEvent(
          workspaceId,
          'writing_complete',
          'writing',
          '平台版本已生成',
          `已生成 ${allContent.length} 个平台版本，可切换查看和编辑。`,
          allContent.map((pc, i) => ({
            id: `platform-${pc.platform}`,
            label: platformIcons[pc.platform] || pc.platform,
            style: i === 0 ? 'primary' : 'secondary',
          })),
          { platforms: allContent.map(p => p.platform) }
        )
      } catch {
        addEvent(workspaceId, 'error', 'system', '平台适配部分失败', '部分平台版本生成失败，可以单独重试。')
      }
      state.currentStep++
    }

    state.phase = 'done'
    addEvent(workspaceId, 'info', 'orchestrator', '任务完成 ✨', '所有步骤已执行完毕，你可以在编辑器中查看和修改内容，或切换平台版本。需要调整可以随时告诉我。')

  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    addEvent(workspaceId, 'error', 'system', '执行出错', error)
    state.phase = 'idle'
  }
}

export async function quickStart(workspaceId: string, topic: string, _mode: 'assist' | 'auto'): Promise<void> {
  state.spec = {
    goal: topic,
    targetPlatform: 'all',
    audience: '普通读者',
    depth: 'standard',
    needSearch: true,
  }
  state.plan = [
    { id: 's1', agent: 'search', description: '联网搜集相关信息和报道' },
    { id: 's2', agent: 'research', description: '提炼多角度观点和核心争议' },
    { id: 's3', agent: 'verify', description: '核查关键事实声明' },
    { id: 's4', agent: 'writing', description: '组织结构，生成标准稿' },
    { id: 's5', agent: 'adapt', description: '适配6个平台版本' },
  ]
  state.currentStep = 0

  addEvent(workspaceId, 'commander_plan', 'orchestrator', '快速执行', `目标：${topic}\n全平台标准深度分析。\n\n点击"开始执行"启动Agent管线。`, [
    { id: 'confirm', label: '开始执行', style: 'primary' },
    { id: 'modify', label: '修改参数', style: 'secondary' },
  ])
  state.phase = 'awaiting_confirmation'
}
