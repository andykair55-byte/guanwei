import { callLLM } from '../stores/llmStore'
import { search, isMockSearch, type SearchResult } from './searchService'
import { useCommanderStore } from '../stores/commanderStore'
import { useCanonicalStore } from '../stores/canonicalStore'
import type { FactNode, ClaimNode, ViewpointNode, SectionNode, ReferenceNode } from '../types/canonicalDraft'

// ===== 类型定义 =====

export interface OrchestratorOutput {
  keywords: string[]        // 搜索关键词
  analysis: string          // 主题分析摘要
}

export interface SearchOutput {
  results: SearchResult[]
  keywords: string[]
}

export interface ResearchOutput {
  viewpoints: ViewpointNode[]
  keyConflicts: string[]    // 核心争议点
}

export interface VerifyOutput {
  claims: ClaimNode[]
}

export interface WritingOutput {
  structure: SectionNode[]
  content: string           // Markdown正文
  title: string
}

// ===== Agent 执行函数 =====

// 生成唯一ID
function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ===== 超时与去重 =====

const AGENT_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, agentType: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${agentType} Agent 执行超时（${AGENT_TIMEOUT_MS / 1000}s）`)), AGENT_TIMEOUT_MS)
    ),
  ])
}

// 去重：同一 Agent 同一 Workspace 只能有一个运行中任务
const runningAgents = new Map<string, AbortController>()

function startAgent(workspaceId: string, agentType: string): AbortController | null {
  const key = `${workspaceId}:${agentType}`
  const existing = runningAgents.get(key)
  if (existing) {
    existing.abort()
  }
  const controller = new AbortController()
  runningAgents.set(key, controller)
  return controller
}

function endAgent(workspaceId: string, agentType: string): void {
  const key = `${workspaceId}:${agentType}`
  runningAgents.delete(key)
}

// 主Agent：分析主题→生成搜索关键词
export async function runOrchestrator(topic: string): Promise<OrchestratorOutput> {
  const { setAgentStatus, addLog } = useCommanderStore.getState()
  setAgentStatus('orchestrator', 'thinking', '正在分析主题...')
  addLog('orchestrator', `开始分析主题：${topic}`)

  try {
    setAgentStatus('orchestrator', 'running', '生成搜索策略')
    const response = await withTimeout(callLLM([
      {
        role: 'system',
        content: '你是一个热点分析专家。分析给定主题，生成3-5个最有效的搜索关键词。只返回JSON格式。'
      },
      {
        role: 'user',
        content: `主题：${topic}\n\n生成3-5个搜索关键词，用于全面搜集相关信息。返回JSON格式：{"keywords": ["关键词1", "关键词2", ...], "analysis": "主题分析摘要"}`
      }
    ], { maxTokens: 500, temperature: 0.3 }), 'orchestrator')

    // 解析JSON（LLM可能返回markdown代码块包裹的JSON）
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const output: OrchestratorOutput = {
      keywords: parsed.keywords || [],
      analysis: parsed.analysis || '',
    }

    setAgentStatus('orchestrator', 'done', `生成了${output.keywords.length}个搜索关键词`)
    addLog('orchestrator', `分析完成，生成${output.keywords.length}个搜索关键词`, 'success')
    return output
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    useCommanderStore.getState().setAgentError('orchestrator', error)
    addLog('orchestrator', `分析失败：${error}`, 'error')
    // 降级：使用主题本身作为关键词
    const fallback: OrchestratorOutput = {
      keywords: [topic],
      analysis: `主题：${topic}`,
    }
    setAgentStatus('orchestrator', 'done', '使用降级策略')
    return fallback
  }
}

// Search Agent：调用搜索服务
export async function runSearchAgent(keywords: string[]): Promise<SearchOutput> {
  const { setAgentStatus, addLog } = useCommanderStore.getState()
  setAgentStatus('search', 'thinking', '准备搜索...')
  addLog('search', `开始搜索，关键词：${keywords.join(', ')}`)

  if (isMockSearch()) {
    addLog('search', '使用示例搜索数据（未配置搜索API）', 'warning')
  }

  try {
    setAgentStatus('search', 'running', `正在搜索${keywords.length}个关键词...`)
    const allResults: SearchResult[] = []
    for (const kw of keywords) {
      const results = await search(kw)
      allResults.push(...results)
      addLog('search', `搜索"${kw}"返回${results.length}条结果`)
    }

    // 去重（按URL）
    const seen = new Set<string>()
    const deduped = allResults.filter(r => {
      if (seen.has(r.url)) return false
      seen.add(r.url)
      return true
    })

    const output: SearchOutput = { results: deduped, keywords }
    setAgentStatus('search', 'done', `共收集${deduped.length}条搜索结果`)
    addLog('search', `搜索完成，共${deduped.length}条结果`, 'success')

    // 将搜索结果写入canonicalStore的facts和references
    const { addFacts, addReference, updateMetadata } = useCanonicalStore.getState()
    const facts: FactNode[] = deduped.map(r => ({
      id: genId('fact'),
      content: r.snippet,
      source: r.source,
      url: r.url,
      credibility: 'medium' as const,
      verified: false,
      collectedAt: new Date().toISOString(),
    }))
    addFacts(facts)

    const refs: ReferenceNode[] = deduped.map(r => ({
      id: genId('ref'),
      title: r.title,
      source: r.source,
      url: r.url,
      type: 'news' as const,
      publishedAt: r.publishedAt,
    }))
    refs.forEach(r => addReference(r))

    updateMetadata({ searchQueries: keywords, agents: ['search'] })

    return output
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    useCommanderStore.getState().setAgentError('search', error)
    addLog('search', `搜索失败：${error}`, 'error')
    throw e
  }
}

// Research Agent：提炼多角度观点
export async function runResearchAgent(searchResults: SearchResult[], topic: string): Promise<ResearchOutput> {
  const { setAgentStatus, addLog } = useCommanderStore.getState()
  setAgentStatus('research', 'thinking', '正在分析搜索结果...')
  addLog('research', '开始提炼观点')

  try {
    setAgentStatus('research', 'running', '提取多角度观点')
    const resultsText = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n来源：${r.source}\n摘要：${r.snippet}`)
      .join('\n\n')

    const response = await withTimeout(callLLM([
      {
        role: 'system',
        content: '你是一个研究分析专家。基于搜索结果，提炼多个角度的观点和核心争议点。只返回JSON格式。'
      },
      {
        role: 'user',
        content: `主题：${topic}\n\n搜索结果：\n${resultsText}\n\n请提炼3-5个不同角度的观点，每个观点包含立场、论点、支撑事实。同时列出2-3个核心争议点。\n返回JSON格式：{"viewpoints": [{"stance": "立场", "argument": "论点", "supportingFacts": []}], "keyConflicts": ["争议1", "争议2"]}`
      }
    ], { maxTokens: 1000, temperature: 0.5 }), 'research')

    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const viewpoints: ViewpointNode[] = (parsed.viewpoints || []).map((v: any) => ({
      id: genId('view'),
      stance: v.stance || '',
      argument: v.argument || '',
      supportingFactIds: [],
      counterArgument: v.counterArgument,
    }))

    const output: ResearchOutput = {
      viewpoints,
      keyConflicts: parsed.keyConflicts || [],
    }

    setAgentStatus('research', 'done', `提炼了${viewpoints.length}个观点`)
    addLog('research', `提炼完成，${viewpoints.length}个观点，${output.keyConflicts.length}个争议点`, 'success')

    // 写入canonicalStore
    useCanonicalStore.getState().updateViewpoints(viewpoints)

    return output
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    useCommanderStore.getState().setAgentError('research', error)
    addLog('research', `提炼失败：${error}`, 'error')
    throw e
  }
}

// Verify Agent：提取并核查事实声明
export async function runVerifyAgent(searchResults: SearchResult[]): Promise<VerifyOutput> {
  const { setAgentStatus, addLog } = useCommanderStore.getState()
  setAgentStatus('verify', 'thinking', '正在提取事实声明...')
  addLog('verify', '开始核查事实')

  try {
    setAgentStatus('verify', 'running', '核查事实声明')
    const resultsText = searchResults
      .map((r, i) => `[${i + 1}] ${r.snippet}（来源：${r.source}）`)
      .join('\n')

    const response = await withTimeout(callLLM([
      {
        role: 'system',
        content: '你是一个事实核查专家。从搜索结果中提取关键事实声明，并评估每条声明的可信度。只返回JSON格式。'
      },
      {
        role: 'user',
        content: `搜索结果：\n${resultsText}\n\n提取最多5条关键事实声明，评估每条的可信度。\n返回JSON格式：{"claims": [{"text": "声明内容", "type": "fact|data|quote|prediction", "status": "verified|disputed|unverifiable", "evidence": "核查依据"}]}`
      }
    ], { maxTokens: 800, temperature: 0.3 }), 'verify')

    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const claims: ClaimNode[] = (parsed.claims || []).map((c: any) => ({
      id: genId('claim'),
      text: c.text || '',
      type: c.type || 'fact',
      status: c.status || 'unverifiable',
      evidence: c.evidence,
    }))

    const output: VerifyOutput = { claims }

    setAgentStatus('verify', 'done', `核查了${claims.length}条声明`)
    addLog('verify', `核查完成，${claims.length}条声明`, 'success')

    // 写入canonicalStore
    useCanonicalStore.getState().updateClaims(claims)

    return output
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    useCommanderStore.getState().setAgentError('verify', error)
    addLog('verify', `核查失败：${error}`, 'error')
    throw e
  }
}

// Writing Agent：汇总产出→生成Canonical Draft的结构和正文
export async function runWritingAgent(
  topic: string,
  facts: FactNode[],
  claims: ClaimNode[],
  viewpoints: ViewpointNode[],
  references: ReferenceNode[]
): Promise<WritingOutput> {
  const { setAgentStatus, addLog } = useCommanderStore.getState()
  setAgentStatus('writing', 'thinking', '正在组织内容结构...')
  addLog('writing', '开始生成内容')

  try {
    setAgentStatus('writing', 'running', '生成文章结构和内容')

    const factsText = facts.map(f => `- ${f.content}（来源：${f.source}）`).join('\n')
    const claimsText = claims.map(c => `- [${c.status}] ${c.text}${c.evidence ? `（依据：${c.evidence}）` : ''}`).join('\n')
    const viewsText = viewpoints.map(v => `- 【${v.stance}】${v.argument}`).join('\n')
    const refsText = references.map(r => `- ${r.title}（${r.source}）${r.url}`).join('\n')

    const response = await withTimeout(callLLM([
      {
        role: 'system',
        content: '你是一个专业写作Agent。基于收集的事实、核查结果和观点，生成结构化的文章。返回JSON格式，包含标题、章节结构和正文内容。正文使用Markdown格式。'
      },
      {
        role: 'user',
        content: `主题：${topic}\n\n事实：\n${factsText}\n\n核查结果：\n${claimsText}\n\n观点：\n${viewsText}\n\n引用来源：\n${refsText}\n\n请生成：\n1. 一个吸引人的标题\n2. 4-5个章节的结构（每节有标题、类型、要点）\n3. 完整的Markdown正文（引用使用 > [来源] 格式）\n\n返回JSON格式：{"title": "标题", "structure": [{"title": "节标题", "type": "intro|background|analysis|argument|conclusion", "points": ["要点1", "要点2"]}], "content": "完整Markdown正文"}`
      }
    ], { maxTokens: 3000, temperature: 0.7 }), 'writing')

    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const structure: SectionNode[] = (parsed.structure || []).map((s: any) => ({
      id: genId('sec'),
      title: s.title || '',
      type: s.type || 'analysis',
      points: s.points || [],
      content: s.content,
      accepted: false,
    }))

    const output: WritingOutput = {
      title: parsed.title || topic,
      structure,
      content: parsed.content || '',
    }

    setAgentStatus('writing', 'done', '内容生成完成')
    addLog('writing', `生成完成：${output.title}，${output.structure.length}个章节`, 'success')

    // 写入canonicalStore
    const { updateStructure, updateMetadata } = useCanonicalStore.getState()
    updateStructure(structure)
    updateMetadata({ agents: ['orchestrator', 'search', 'research', 'verify', 'writing'] })

    return output
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    useCommanderStore.getState().setAgentError('writing', error)
    addLog('writing', `生成失败：${error}`, 'error')
    throw e
  }
}

// ===== 管线执行器 =====

// Auto模式：全自动执行完整管线
export async function runAutoPipeline(topic: string): Promise<void> {
  const { startPipeline, addLog } = useCommanderStore.getState()
  const { setTopic } = useCanonicalStore.getState()

  startPipeline()
  setTopic(topic)
  addLog('orchestrator', `Auto模式启动，主题：${topic}`, 'info')

  try {
    // 1. 主Agent
    const orchOutput = await runOrchestrator(topic)

    // 2. Search Agent
    const searchOutput = await runSearchAgent(orchOutput.keywords)

    // 3. Research + Verify 并行
    const [researchOutput, verifyOutput] = await Promise.all([
      runResearchAgent(searchOutput.results, topic),
      runVerifyAgent(searchOutput.results),
    ])

    // 4. Writing Agent
    const { draft } = useCanonicalStore.getState()
    await runWritingAgent(
      topic,
      draft.facts,
      verifyOutput.claims,
      researchOutput.viewpoints,
      draft.references
    )

    // 5. 完成
    useCommanderStore.getState().addLog('orchestrator', '管线执行完成！', 'success')
    useCommanderStore.setState({ pipelineStatus: 'completed', currentAgent: null })

    // 管线完成后清理 runningAgents
    runningAgents.clear()

    return
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    useCommanderStore.getState().addLog('orchestrator', `管线执行失败：${error}`, 'error')
    useCommanderStore.setState({ pipelineStatus: 'error' })
  }
}

// Assist模式：逐步执行，用户决定是否继续
export async function runAssistStep(topic: string): Promise<void> {
  const { startPipeline, addLog } = useCommanderStore.getState()
  const { setTopic } = useCanonicalStore.getState()

  startPipeline()
  setTopic(topic)
  addLog('orchestrator', `Assist模式启动，主题：${topic}`, 'info')

  // 只执行主Agent，后续由用户触发
  const orchOutput = await runOrchestrator(topic)

  // 自动执行搜索（因为搜索是必要步骤）
  await runSearchAgent(orchOutput.keywords)

  // 停在这里，让用户决定是否继续
  useCommanderStore.getState().addLog('orchestrator', '搜索完成，等待用户确认继续', 'info')
  useCommanderStore.setState({ pipelineStatus: 'paused' })
}

// 继续Assist模式的下一步
export async function continueAssist(): Promise<void> {
  const { agents } = useCommanderStore.getState()
  const { draft } = useCanonicalStore.getState()

  useCommanderStore.setState({ pipelineStatus: 'running' })

  try {
    // 如果Research和Verify还没执行
    if (agents.research.status === 'idle' && agents.verify.status === 'idle') {
      const searchOutput = agents.search.output as SearchOutput
      if (searchOutput) {
        await Promise.all([
          runResearchAgent(searchOutput.results, draft.topic),
          runVerifyAgent(searchOutput.results),
        ])
      }
    }

    // 如果Writing还没执行
    if (agents.writing.status === 'idle') {
      await runWritingAgent(
        draft.topic,
        draft.facts,
        draft.claims,
        draft.viewpoints,
        draft.references
      )
    }

    useCommanderStore.getState().addLog('orchestrator', '管线执行完成！', 'success')
    useCommanderStore.setState({ pipelineStatus: 'completed', currentAgent: null })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    useCommanderStore.getState().addLog('orchestrator', `执行失败：${error}`, 'error')
    useCommanderStore.setState({ pipelineStatus: 'error' })
  }
}
