// src/services/themeDebateService.ts
// 主题包辩论服务 — 将 ThemePack 适配为 AIArena 可用的 DebateMatch
// 模式：LLM 为主 + 降级 mock（与 nationalDebateService 的 mock 优先 + LLM 降级相反）

import { callLLM } from '../stores/llmStore'
import { getThemePack } from './themePackService'
import { MOCK_ROUNDS } from './debateArenaService'
import type { ThemePack, ThemeCharacter, ThemeTopic } from '../types/themePack'
import type { AICharacter, DebateStance } from './characters'
import type {
  DebateTopic, DebateMatch, DebateRound,
  RoundScore, FinalResult,
} from './debateArenaService'

// ============================================================
// 适配器：ThemeCharacter → AICharacter
// ============================================================

/** affirm 方默认视觉（amber/orange 暖色系，与白泽一致） */
const AFFIRM_VISUAL = {
  gradientFrom: 'from-amber-500',
  gradientTo: 'to-orange-600',
  bubbleBg: 'bg-amber-50',
  bubbleBorder: 'border-amber-200',
  textColor: 'text-amber-700',
  glowShadow: 'shadow-amber-200/50',
}

/** negate 方默认视觉（cyan/blue 冷色系，与獬豸对比） */
const NEGATE_VISUAL = {
  gradientFrom: 'from-cyan-500',
  gradientTo: 'to-blue-600',
  bubbleBg: 'bg-cyan-50',
  bubbleBorder: 'border-cyan-200',
  textColor: 'text-cyan-700',
  glowShadow: 'shadow-cyan-200/50',
}

/**
 * 将 ThemeCharacter 适配为 AICharacter
 * 保留 systemPrompt 供 LLM 调用使用；视觉用 affirm/negate 默认配色
 */
export function themeCharacterToAICharacter(
  themeChar: ThemeCharacter,
  stance: DebateStance,
): AICharacter {
  return {
    id: themeChar.id,
    name: themeChar.name,
    title: themeChar.era,
    emoji: '',
    icon: themeChar.id, // CharacterIcon 会 fallback 到默认问号图标
    stance,
    temperature: 0.7,
    visual: stance === 'affirm' ? AFFIRM_VISUAL : NEGATE_VISUAL,
    personality: themeChar.stanceHint,
    systemPrompt: themeChar.systemPrompt,
    taunts: { advantage: [], comeback: [], press: [] },
    celebrations: { winRound: [], winFinal: [], loseFinal: [] },
    respect: { closingLines: [] },
    stats: {
      totalDebates: 0,
      wins: 0,
      winRate: '—',
      favoriteTactic: themeChar.tags[0] || '—',
    },
  }
}

// ============================================================
// 适配器：ThemeTopic → DebateTopic
// ============================================================

/** 将 ThemeTopic 适配为 DebateTopic */
export function themeTopicToDebateTopic(
  themeTopic: ThemeTopic,
  pack: ThemePack,
): DebateTopic {
  return {
    id: themeTopic.id,
    title: themeTopic.title,
    category: pack.title,
    affirmLabel: themeTopic.affirmLabel,
    negateLabel: themeTopic.negateLabel,
    heat: 0,
    status: 'live',
  }
}

// ============================================================
// LLM 调用：生成单轮辩论
// ============================================================

/** LLM 返回的单轮辩论结构 */
interface LLMRoundResponse {
  affirmContent: string
  negateContent: string
  affirmScore: number
  negateScore: number
  judgeReason: string
}

/** 降级 mock 发言（LLM 失败时使用） */
function getFallbackContent(stance: 'affirm' | 'negate', topicTitle: string): string {
  const templates = stance === 'affirm'
    ? [
      `关于「${topicTitle}」，我方认为此观点成立。从道理与事实两方面来看，这都是站得住脚的。`,
      `我方坚持立场。对方所言虽有几分道理，但根本之处仍站不住脚，且听我一一道来。`,
    ]
    : [
      `对方辩友所言差矣。关于「${topicTitle}」，我方认为此观点不能成立，理由如下。`,
      `我方不能苟同。表面看来有理，实则经不起推敲，关键之处恰恰相反。`,
    ]
  return templates[Math.floor(Math.random() * templates.length)]
}

/** 生成单轮辩论（一次 LLM 调用生成双方发言 + 评分） */
async function generateThemeRound(
  topic: DebateTopic,
  affirmChar: AICharacter,
  negateChar: AICharacter,
  roundNum: number,
  totalRounds: number,
  prevRounds: DebateRound[],
): Promise<DebateRound> {
  const prevSummary = prevRounds.length > 0
    ? prevRounds.map((r, i) => `第${i + 1}轮 正方：${r.affirm.content}\n第${i + 1}轮 反方：${r.negate.content}`).join('\n')
    : '（首轮，无历史记录）'

  // 优先使用 mock 预设数据（深度辩题内容）
  const mockData = MOCK_ROUNDS[topic.id]
  if (mockData && mockData[roundNum - 1]) {
    const r = mockData[roundNum - 1]
    const score: RoundScore = {
      affirmScore: r.score[0],
      negateScore: r.score[1],
      winner: r.score[0] > r.score[1] ? 'affirm' : r.score[1] > r.score[0] ? 'negate' : 'draw',
      reason: r.judgeReason,
    }
    const round: DebateRound = {
      affirm: {
        charId: affirmChar.id,
        charName: affirmChar.name,
        content: r.affirm,
        thinkingSteps: r.affirmThinking || [],
      },
      negate: {
        charId: negateChar.id,
        charName: negateChar.name,
        content: r.negate,
        thinkingSteps: r.negateThinking || [],
      },
      score,
      highlight: r.highlightSide ? {
        side: r.highlightSide,
        type: r.highlightType || 'killer-analogy',
        label: r.highlightLabel || '名场面',
        quote: r.highlightQuote || r.affirm.slice(0, 20),
      } : undefined,
      taunt: undefined,
    }
    // 模拟异步延迟，让前端有时间展示思考动画
    await new Promise(resolve => setTimeout(resolve, 800))
    return round
  }

  const systemPrompt = `你是一场历史名人辩论赛的导演。你需要同时扮演正反双方，生成一轮精彩的辩论。

【正方角色】${affirmChar.name}（${affirmChar.title}）
${affirmChar.systemPrompt}

【反方角色】${negateChar.name}（${negateChar.title}）
${negateChar.systemPrompt}

【你的任务】生成本轮辩论，双方各发言一次。反方必须回应正方观点。严格输出 JSON，不要加任何其他文字。`

  const userPrompt = `辩题：${topic.title}
正方立场：${topic.affirmLabel}
反方立场：${topic.negateLabel}

当前是第 ${roundNum} / ${totalRounds} 轮。

之前的发言记录：
${prevSummary}

请生成本轮辩论，严格输出以下 JSON 格式（不要加 markdown 代码块标记，不要加任何其他文字）：
{
  "affirmContent": "正方发言，80-150字，纯文本，体现正方角色风格",
  "negateContent": "反方发言，80-150字，纯文本，必须回应正方，体现反方角色风格",
  "affirmScore": 1到10的整数,
  "negateScore": 1到10的整数,
  "judgeReason": "评委一句话点评，说明谁更胜一筹及原因"
}`

  let llmResult: LLMRoundResponse | null = null

  try {
    const raw = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.8, maxTokens: 1024 },
    )

    // 尝试提取 JSON（LLM 可能包裹 markdown 代码块）
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (
        typeof parsed.affirmContent === 'string' &&
        typeof parsed.negateContent === 'string' &&
        typeof parsed.affirmScore === 'number' &&
        typeof parsed.negateScore === 'number' &&
        typeof parsed.judgeReason === 'string'
      ) {
        llmResult = parsed
      }
    }
  } catch {
    // 降级到 mock
  }

  // 降级 mock
  const affirmContent = llmResult?.affirmContent || getFallbackContent('affirm', topic.title)
  const negateContent = llmResult?.negateContent || getFallbackContent('negate', topic.title)
  const affirmScore = llmResult?.affirmScore ?? (6 + Math.floor(Math.random() * 4))
  const negateScore = llmResult?.negateScore ?? (6 + Math.floor(Math.random() * 4))
  const judgeReason = llmResult?.judgeReason || '双方旗鼓相当，各有千秋。'

  const score: RoundScore = {
    affirmScore,
    negateScore,
    winner: affirmScore > negateScore ? 'affirm' : negateScore > affirmScore ? 'negate' : 'draw',
    reason: judgeReason,
  }

  return {
    round: roundNum,
    affirm: { characterId: affirmChar.id, content: affirmContent },
    negate: { characterId: negateChar.id, content: negateContent },
    score,
  }
}

// ============================================================
// 组装完整辩论赛
// ============================================================

/** 通用结语模板（不调 LLM，保证速度） */
function getClosing(char: AICharacter, isWinner: boolean, isDraw: boolean): string {
  if (isDraw) {
    return `今日一战，棋逢对手。${char.name}致敬对方，期待来日再论。`
  }
  return isWinner
    ? `承蒙评委与观众厚爱。${char.name}以为，理越辩越明，今日之胜非我一人之功。`
    : `对方辩友所言确有可取之处。${char.name}虽败犹荣，今日受教了。`
}

/** 通用尊重话语 */
function getRespect(char: AICharacter): string {
  return `${char.name}：与君一辩，受益匪浅。他日有缘，再共论道。`
}

/**
 * 运行完整主题包辩论
 * 串行调用 LLM 生成每轮，组装为 DebateMatch
 */
export async function runThemeDebate(
  topic: DebateTopic,
  affirmChar: AICharacter,
  negateChar: AICharacter,
  totalRounds: number,
): Promise<DebateMatch> {
  const rounds: DebateRound[] = []

  for (let i = 0; i < totalRounds; i++) {
    // 串行生成：每轮需要看到前一轮内容才能回应
    const round = await generateThemeRound(
      topic, affirmChar, negateChar,
      i + 1, totalRounds, rounds,
    )
    rounds.push(round)
  }

  const affirmTotal = rounds.reduce((sum, r) => sum + r.score.affirmScore, 0)
  const negateTotal = rounds.reduce((sum, r) => sum + r.score.negateScore, 0)
  const winner: 'affirm' | 'negate' | 'draw' =
    affirmTotal > negateTotal ? 'affirm' : negateTotal > affirmTotal ? 'negate' : 'draw'

  const isDraw = winner === 'draw'
  const finalResult: FinalResult = {
    affirmTotalScore: affirmTotal,
    negateTotalScore: negateTotal,
    winner,
    affirmClosing: getClosing(affirmChar, winner === 'affirm', isDraw),
    negateClosing: getClosing(negateChar, winner === 'negate', isDraw),
    affirmRespect: getRespect(affirmChar),
    negateRespect: getRespect(negateChar),
  }

  return {
    topic,
    affirmChar,
    negateChar,
    rounds,
    totalRounds: rounds.length,
    finalResult,
  }
}

// ============================================================
// 便捷入口：根据 theme 参数初始化辩论
// ============================================================

export interface ThemeDebateInitResult {
  pack: ThemePack
  topic: DebateTopic
  affirmChar: AICharacter
  negateChar: AICharacter
}

/**
 * 根据 theme 参数初始化辩论配置
 * 返回适配后的 pack/topic/characters，供 AIArena 调用 runThemeDebate
 * 找不到主题包时返回 null（调用方应回退到默认 mock 模式）
 */
export function initThemeDebate(
  themeId: string,
  topicId: string,
): ThemeDebateInitResult | null {
  const pack = getThemePack(themeId)
  if (!pack) return null

  // 优先用 URL 中的 topicId 匹配主题包辩题，否则用第一个
  const themeTopic = pack.topics.find(t => t.id === topicId) || pack.topics[0]
  if (!themeTopic) return null

  return {
    pack,
    topic: themeTopicToDebateTopic(themeTopic, pack),
    affirmChar: themeCharacterToAICharacter(pack.affirm, 'affirm'),
    negateChar: themeCharacterToAICharacter(pack.negate, 'negate'),
  }
}
