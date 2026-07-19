import { callLLM } from '../stores/llmStore'
import { filterUserInput } from './contentFilter'
import { workspaceApi } from './workspaceApi'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useActivityStore } from '../stores/activityStore'
import { useCanonicalStore } from '../stores/canonicalStore'
import { useCommanderStore } from '../stores/commanderStore'
import type { EventAction } from '../types/activity'
import type { WorkspaceStatus } from '../types/workspace'

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
  useCommanderStore.setState({ pipelineStatus: 'running' })
  addEvent(workspaceId, 'info', 'orchestrator', '开始执行', '正在启动 Agent 管线...')

  useCanonicalStore.getState().reset()
  useCanonicalStore.getState().setTopic(state.spec.goal)
  useCanonicalStore.getState().updateMetadata({ mode })

  try {
    // ── 替换原 mock 管线：调用真实 workspaceApi.run ──
    // 事件流（agent_started / search_complete / research_complete / writing_complete 等）
    // 由后端通过 WebSocket 推送到 activityStore，前端不再本地 mock。
    const current = useWorkspaceStore.getState().getCurrent()
    const strategy = current?.strategy || 'dag'

    useWorkspaceStore.getState().setStatus(workspaceId, 'running')

    const result = await workspaceApi.run(workspaceId, { strategy })

    // 映射 run 返回状态到 workspace 状态
    const runStatus = result.status

    // 后端异步执行：status === 'running' 时管线在后台跑，状态由 WS 事件驱动更新
    // 此时不应切换 store 状态、不应释放执行锁（state.phase / pipelineStatus 保持 running）
    if (runStatus === 'running') {
      addEvent(
        workspaceId,
        'info',
        'orchestrator',
        '管线已启动',
        'Agent 管线正在后台执行，进度将通过事件流推送，完成后状态会自动更新。'
      )
      return
    }

    const wsStatus: WorkspaceStatus =
      runStatus === 'partial' ? 'partial' :
      runStatus === 'failed' ? 'failed' : 'completed'
    useWorkspaceStore.getState().setStatus(workspaceId, wsStatus)

    state.phase = 'done'
    useCommanderStore.setState({ pipelineStatus: wsStatus === 'failed' ? 'error' : 'completed' })
    addEvent(
      workspaceId,
      'info',
      'orchestrator',
      '任务完成 ✨',
      wsStatus === 'partial'
        ? '部分步骤已成功完成，你可以在编辑器中查看内容，或切换平台版本。'
        : '所有步骤已执行完毕，你可以在编辑器中查看和修改内容，或切换平台版本。需要调整可以随时告诉我。'
    )

  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    addEvent(workspaceId, 'error', 'system', '执行出错', error)
    useWorkspaceStore.getState().setStatus(workspaceId, 'failed')
    useCommanderStore.setState({ pipelineStatus: 'error' })
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
