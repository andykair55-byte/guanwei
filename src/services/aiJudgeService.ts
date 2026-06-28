/**
 * AI Judge Agent Service
 * - Scores each debater per round (0-10)
 * - Detects logical fallacies (滑坡论证, 偷换概念, 人身攻击, 循环论证, 稻草人谬误)
 * - Identifies highlights and weak points per debater
 * - Provides a one-line judge comment per round
 * - Groq API (llama-3.3-70b-versatile) with mock fallback
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

// ===== Types =====

export interface JudgeInput {
  topic: string
  affirmLabel: string
  negateLabel: string
  round: number
  speeches: {
    seatIndex: number
    nickname: string
    side: 'affirm' | 'negate'
    content: string
  }[]
}

export interface JudgeResult {
  seatScores: {
    seatIndex: number
    score: number
    highlights: string[]
    weaknesses: string[]
  }[]
  fallacies: {
    seatIndex: number
    fallacyType: string
    quote: string
    explanation: string
  }[]
  roundWinner: 'affirm' | 'negate' | 'draw'
  judgeComment: string
}

// ===== Fallacy Definitions =====

const FALLACY_TYPES = [
  '滑坡论证',
  '偷换概念',
  '人身攻击',
  '循环论证',
  '稻草人谬误',
] as const

// ===== Mock Data Pools =====

const MOCK_HIGHLIGHTS: string[] = [
  '论点切入角度新颖，令人耳目一新',
  '数据引用精准，论据链条完整',
  '类比生动有力，说服效果显著',
  '反驳切中要害，逻辑反击犀利',
  '收尾总结精辟，观点提炼到位',
  '对对方论点的拆解层次分明',
  '立论框架清晰，论证结构严密',
  '善用反问增强气势，节奏把控出色',
  '案例选取典型，代表性强',
  '逻辑递进自然，层层推进有说服力',
]

const MOCK_WEAKNESSES: string[] = [
  '论据单一，缺乏多维度支撑',
  '回避了对方提出的核心质疑',
  '部分论述偏离辩题，焦点不够集中',
  '数据引用缺乏出处，可信度不足',
  '情绪表达过多，理性论证偏弱',
  '对关键概念的定义不够清晰',
  '未能有效回应对方反驳',
  '论证跳跃较大，中间环节缺失',
  '例子过于极端，缺乏普遍性',
  '重复已有论点，缺乏新信息增量',
]

const MOCK_COMMENTS: string[] = [
  '双方各有千秋，正方论据更为扎实',
  '反方的反击出人意料，略占上风',
  '本回合势均力敌，难分伯仲',
  '正方的数据链更完整，逻辑更自洽',
  '反方的类比更加生动有力，感染力强',
  '正方立论稳健，但缺少亮点',
  '反方防守反击策略执行到位',
  '双方交锋激烈，正方稍胜半筹',
  '反方抓住了正方论证的关键漏洞',
  '本回合双方都在试探，未全力出击',
]

// ===== Helpers =====

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function clampScore(n: number): number {
  return Math.min(10, Math.max(0, Math.round(n)))
}

// ===== Mock Fallback =====

function generateMockJudge(input: JudgeInput): JudgeResult {
  const seatScores = input.speeches.map(s => {
    const score = Math.floor(Math.random() * 4) + 6 // 6-9

    // Pick 1-3 highlights and 1-2 weaknesses
    const hlCount = Math.floor(Math.random() * 3) + 1
    const wkCount = Math.floor(Math.random() * 2) + 1

    const shuffledHl = [...MOCK_HIGHLIGHTS].sort(() => Math.random() - 0.5)
    const shuffledWk = [...MOCK_WEAKNESSES].sort(() => Math.random() - 0.5)

    return {
      seatIndex: s.seatIndex,
      score,
      highlights: shuffledHl.slice(0, hlCount),
      weaknesses: shuffledWk.slice(0, wkCount),
    }
  })

  // Determine round winner by comparing average scores per side
  const affirmSeats = seatScores.filter((_, i) => input.speeches[i].side === 'affirm')
  const negateSeats = seatScores.filter((_, i) => input.speeches[i].side === 'negate')
  const affirmAvg = affirmSeats.reduce((sum, s) => sum + s.score, 0) / (affirmSeats.length || 1)
  const negateAvg = negateSeats.reduce((sum, s) => sum + s.score, 0) / (negateSeats.length || 1)

  const diff = Math.abs(affirmAvg - negateAvg)
  let roundWinner: 'affirm' | 'negate' | 'draw'
  if (diff < 0.5) {
    roundWinner = 'draw'
  } else {
    roundWinner = affirmAvg > negateAvg ? 'affirm' : 'negate'
  }

  // Mock fallacies: ~30% chance per speaker
  const fallacies: JudgeResult['fallacies'] = []
  for (const s of input.speeches) {
    if (Math.random() < 0.3) {
      const sentences = s.content.split(/[，。！？,.!?]/).filter(t => t.trim().length > 6)
      const quote = sentences.length > 0
        ? pickRandom(sentences).trim()
        : s.content.slice(0, 30)

      fallacies.push({
        seatIndex: s.seatIndex,
        fallacyType: pickRandom([...FALLACY_TYPES]),
        quote: quote.length > 40 ? quote.slice(0, 40) + '...' : quote,
        explanation: `${s.nickname}在此处使用了${pickRandom([...FALLACY_TYPES])}的手法，论证逻辑存在缺陷。`,
      })
    }
  }

  return {
    seatScores,
    fallacies,
    roundWinner,
    judgeComment: pickRandom(MOCK_COMMENTS),
  }
}

// ===== Groq API Judge =====

async function judgeRoundViaAPI(input: JudgeInput): Promise<JudgeResult> {
  if (!GROQ_API_KEY) throw new Error('No API key')

  const speechesText = input.speeches
    .map(s => {
      const sideLabel = s.side === 'affirm' ? `正方(${input.affirmLabel})` : `反方(${input.negateLabel})`
      return `${sideLabel} ${s.nickname}（座位${s.seatIndex}）：${s.content}`
    })
    .join('\n')

  const userPrompt = `你是一位专业的辩论赛评委。请为以下第${input.round}回合进行评审。

辩题：${input.topic}
正方立场：${input.affirmLabel}
反方立场：${input.negateLabel}

本回合发言：
${speechesText}

请完成以下评审任务：
1. 为每位辩手打分（0-10的整数），并指出各自的亮点和不足
2. 检测是否存在逻辑谬误（滑坡论证、偷换概念、人身攻击、循环论证、稻草人谬误），如存在请引用原文说明
3. 判定本回合获胜方（affirm/negate/draw）
4. 给出一句话点评（20字以内）

严格按以下JSON格式回复，不要有任何其他内容：
{
  "seatScores": [
    {"seatIndex": 座位号, "score": 分数, "highlights": ["亮点1", "亮点2"], "weaknesses": ["不足1"]}
  ],
  "fallacies": [
    {"seatIndex": 座位号, "fallacyType": "谬误类型", "quote": "原文引用", "explanation": "解释"}
  ],
  "roundWinner": "affirm或negate或draw",
  "judgeComment": "一句话点评"
}`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: '你是辩论赛专业评委，只输出JSON，不输出任何其他内容。评分要客观公正，逻辑谬误检测要严谨。',
        },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) throw new Error('API error')
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content?.trim() || ''

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')
  const parsed = JSON.parse(jsonMatch[0])

  // Validate and normalize seatScores
  const seatScores: JudgeResult['seatScores'] = (parsed.seatScores || []).map((s: any) => ({
    seatIndex: Number(s.seatIndex) || 0,
    score: clampScore(Number(s.score) || 5),
    highlights: Array.isArray(s.highlights) ? s.highlights.map(String) : [],
    weaknesses: Array.isArray(s.weaknesses) ? s.weaknesses.map(String) : [],
  }))

  // Validate and normalize fallacies
  const fallacies: JudgeResult['fallacies'] = (parsed.fallacies || [])
    .filter((f: any) => f.fallacyType && FALLACY_TYPES.includes(f.fallacyType))
    .map((f: any) => ({
      seatIndex: Number(f.seatIndex) || 0,
      fallacyType: String(f.fallacyType),
      quote: String(f.quote || ''),
      explanation: String(f.explanation || ''),
    }))

  // Validate roundWinner
  const validWinner = ['affirm', 'negate', 'draw'].includes(parsed.roundWinner)
    ? parsed.roundWinner
    : 'draw'

  return {
    seatScores,
    fallacies,
    roundWinner: validWinner,
    judgeComment: String(parsed.judgeComment || '双方表现相当'),
  }
}

// ===== Main Export =====

/**
 * Judge a single debate round.
 * Tries Groq API first; falls back to mock scoring on any failure.
 */
export async function judgeRound(input: JudgeInput): Promise<JudgeResult> {
  try {
    return await judgeRoundViaAPI(input)
  } catch {
    return generateMockJudge(input)
  }
}
