/**
 * Debate service — AI argument polishing & dispute report generation.
 * Uses callLLM() for AI features, falls back to local templates.
 */

import { callLLM } from '../stores/llmStore'

// ===== Types =====

export type Camp = 'true' | 'false'

export interface DebateArgument {
  id: string
  camp: Camp
  content: string
  originalContent?: string   // before AI polish
  author: string
  avatar: string
  votes: number
  isPolished?: boolean
  timestamp: string
}

export interface DisputeReport {
  summary: string
  trueSideStrengths: string[]
  falseSideStrengths: string[]
  weakPoints: string[]
  verdict: string
  confidence: number  // 0-100
}

// ===== AI Polish =====

const POLISH_SYSTEM = `你是一个辩论语言润色助手。用户会给你一段辩论论据，你需要：
1. 让表述更清晰、更有逻辑
2. 保留原始观点和论据，不添加新信息
3. 语气自然，不要过于学术化
4. 直接输出润色后的文本，不要加任何前缀或解释`

/**
 * Polish a user's argument using AI, or local fallback.
 */
export async function polishArgument(raw: string): Promise<string> {
  try {
    const polished = await callLLM(
      [
        { role: 'system', content: POLISH_SYSTEM },
        { role: 'user', content: raw },
      ],
      { maxTokens: 300, temperature: 0.5 }
    )
    if (polished.trim()) return polished.trim()
  } catch { /* fallback */ }

  // Local fallback — simple structural improvement
  return localPolish(raw)
}

function localPolish(text: string): string {
  let polished = text.trim()
  // Add logical connectors
  if (!polished.match(/^(根据|因为|首先|其次|从|另外|此外)/)) {
    const connectors = ['根据我的了解，', '从现有信息来看，', '值得注意的是，', '有理由认为，']
    const pick = connectors[Math.floor(Math.random() * connectors.length)]
    polished = pick + polished
  }
  // Ensure ending punctuation
  if (!polished.match(/[。！？]$/)) {
    polished += '。'
  }
  return polished
}

// ===== Dispute Report =====

const REPORT_SYSTEM = `你是一个辩论裁判助手。根据以下辩论内容生成一份简洁的争议报告：

要求：
1. 用 JSON 格式输出，包含以下字段：
   - summary: 一段话总结双方核心分歧（50字以内）
   - trueSideStrengths: 数组，"真"方最有力的2-3个论据要点
   - falseSideStrengths: 数组，"假"方最有力的2-3个论据要点
   - weakPoints: 数组，双方论证中的薄弱环节
   - verdict: 一段话给出倾向性判断（80字以内）
   - confidence: 数字0-100，表示你对这个判断的信心
2. 保持客观中立
3. 只输出 JSON，不要其他内容`

/**
 * Generate a dispute report from debate arguments.
 */
export async function generateDisputeReport(
  melonTitle: string,
  trueArgs: DebateArgument[],
  falseArgs: DebateArgument[],
): Promise<DisputeReport> {
  const debateText = `话题：${melonTitle}\n\n【真方论据】\n${trueArgs.map((a, i) => `${i + 1}. ${a.content}（${a.votes}票）`).join('\n')}\n\n【假方论据】\n${falseArgs.map((a, i) => `${i + 1}. ${a.content}（${a.votes}票`).join('\n')}`

  try {
    const content = await callLLM(
      [
        { role: 'system', content: REPORT_SYSTEM },
        { role: 'user', content: debateText },
      ],
      { maxTokens: 600, temperature: 0.4 }
    )
    if (content) {
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          summary: parsed.summary || '',
          trueSideStrengths: parsed.trueSideStrengths || [],
          falseSideStrengths: parsed.falseSideStrengths || [],
          weakPoints: parsed.weakPoints || [],
          verdict: parsed.verdict || '',
          confidence: parsed.confidence ?? 50,
        }
      }
    }
  } catch { /* fallback */ }

  // Local fallback report
  return localReport(melonTitle, trueArgs, falseArgs)
}

function localReport(
  title: string,
  trueArgs: DebateArgument[],
  falseArgs: DebateArgument[],
): DisputeReport {
  const trueVotes = trueArgs.reduce((s, a) => s + a.votes, 0)
  const falseVotes = falseArgs.reduce((s, a) => s + a.votes, 0)
  const total = trueVotes + falseVotes
  const trueRatio = total > 0 ? Math.round((trueVotes / total) * 100) : 50

  const topTrue = [...trueArgs].sort((a, b) => b.votes - a.votes).slice(0, 3).map(a => a.content.slice(0, 40))
  const topFalse = [...falseArgs].sort((a, b) => b.votes - a.votes).slice(0, 3).map(a => a.content.slice(0, 40))

  return {
    summary: `围绕"${title.slice(0, 20)}"的争议，真方获得 ${trueRatio}% 的支持票，双方核心分歧在于证据的充分性和来源可信度。`,
    trueSideStrengths: topTrue.length > 0 ? topTrue : ['暂无有力论据'],
    falseSideStrengths: topFalse.length > 0 ? topFalse : ['暂无有力论据'],
    weakPoints: [
      '双方均缺少一手证据（如原始文件、权威来源引用）',
      '部分论据依赖个人经验而非客观数据',
    ],
    verdict: trueRatio >= 60
      ? `目前社区讨论更倾向于"真"方，${trueRatio}% 的参与者支持该说法。但投票数不等于事实，仍需更多一手证据支撑。`
      : trueRatio <= 40
      ? `目前社区讨论更倾向于"假"方，${100 - trueRatio}% 的参与者认为该说法存疑。但多数人的判断不一定正确，关键看证据质量。`
      : `双方势均力敌，社区意见分裂明显。在缺乏决定性证据的情况下，保持审慎观望是更理性的选择。`,
    confidence: Math.min(85, 40 + Math.abs(trueRatio - 50)),
  }
}
