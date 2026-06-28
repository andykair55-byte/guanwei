/**
 * 情绪操控检测引擎
 * 双模式：Groq API（需 VITE_GROQ_API_KEY）/ 本地规则引擎（零依赖 fallback）
 */

// ===== 类型定义 =====

export type RiskLevel = 'high' | 'medium' | 'low' | 'none'

export interface SentenceAnalysis {
  text: string
  riskLevel: RiskLevel
  technique?: string
  explanation?: string
}

export interface EmotionAnalysisResult {
  score: number
  level: 'high' | 'medium' | 'low'
  techniques: { name: string; description: string; count: number }[]
  sentences: SentenceAnalysis[]
  objectiveSummary: string
  keyPhrases: string[]
}

// ===== Groq API 分析 =====

const SYSTEM_PROMPT = `你是一位专业的修辞分析师，擅长识别文本中的情绪操控手法。

你的任务不是判断信息真假，而是像语文老师一样拆解话术结构：
- 这句话用了什么修辞手法？
- 试图激发什么情绪？
- 隐藏了什么前提？
- 省略了什么信息？

常见操控手法：
1. 恐惧诉求：用夸张的危险恐吓读者
2. 虚假两难：只给两个极端选项，忽略中间地带
3. 人身攻击：攻击人而非论点
4. 诉诸权威：用不相关的权威增加可信度
5. 偷换概念：悄悄改变讨论的核心概念
6. 数据操纵：用片面或误导性数据支撑观点
7. 情绪绑架：用道德/情感压力迫使认同
8. 以偏概全：用个例推导普遍结论
9. 滑坡谬误：夸大因果链条的必然性
10. 诉诸群众：用"大家都这么认为"替代论证

请对输入文本进行逐句分析，返回严格的 JSON 格式（不要 markdown 代码块）：
{
  "sentences": [
    {
      "text": "原句",
      "riskLevel": "high/medium/low/none",
      "technique": "操控手法名称（如有）",
      "explanation": "简要解释为什么这句话有操控性"
    }
  ],
  "techniques": [
    {
      "name": "手法名称",
      "description": "在本文中的具体表现",
      "count": 出现次数
    }
  ],
  "objectiveSummary": "去掉所有操控话术后的客观事实重述（50字以内）",
  "keyPhrases": ["关键操控性词组1", "关键操控性词组2"]
}

评分规则：
- high: 使用了明显的操控手法，情绪煽动性强
- medium: 有轻微操控倾向，措辞偏颇但不极端
- low: 略有主观色彩但基本客观
- none: 纯客观陈述

重要：只返回 JSON，不要有其他文字。`

async function analyzeWithGroq(text: string): Promise<EmotionAnalysisResult> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string
  if (!apiKey) throw new Error('No Groq API key')

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `请分析以下文本中的情绪操控手法：\n\n${text}` },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq API error: ${err}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from Groq')

  const parsed = JSON.parse(content)
  return normalizeResult(parsed)
}

function normalizeResult(raw: any): EmotionAnalysisResult {
  const sentences: SentenceAnalysis[] = (raw.sentences || []).map((s: any) => ({
    text: s.text || '',
    riskLevel: (['high', 'medium', 'low', 'none'].includes(s.riskLevel) ? s.riskLevel : 'none') as RiskLevel,
    technique: s.technique || undefined,
    explanation: s.explanation || undefined,
  }))

  const techniques = (raw.techniques || []).map((t: any) => ({
    name: t.name || '未知',
    description: t.description || '',
    count: t.count || 1,
  }))

  const highCount = sentences.filter(s => s.riskLevel === 'high').length
  const medCount = sentences.filter(s => s.riskLevel === 'medium').length
  const total = sentences.length || 1
  const score = Math.min(100, Math.round(((highCount * 30 + medCount * 15) / total) * (total > 3 ? 1 : 0.7)))

  return {
    score,
    level: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low',
    techniques,
    sentences,
    objectiveSummary: raw.objectiveSummary || '无法生成客观重述',
    keyPhrases: raw.keyPhrases || [],
  }
}

// ===== 本地规则引擎 fallback =====

const FEAR_WORDS = /(?:震惊|可怕|危险|恐怖|致命|毁灭|灾难|崩溃|完蛋|死定|紧急|警报| WARNING|危机|暴雷|翻车|塌房|炸裂|细思极恐)/g
const AUTHORITY_PATTERNS = /(?:专家(?:称|说|表示|提醒)|研究(?:表明|发现|证实)|据(?:了解|透露|消息称)|内部人士|知情人|权威(?:机构|人士|专家))/g
const FALSE_DICHOTOMY = /(?:要么.*要么|不是.*就是|如果不.*就|只有.*才能|除了.*别无)/g
const AD_HOMINEM = /(?:智商|脑子|脑残|智障|脑残|无知|蠢|傻|白痴|水军|五毛|公知|带节奏|洗地)/g
const EMOTIONAL_BIND = /(?:良心|道德|底线|还有.*吗|良心不会痛吗|你怎么.*|亏你|枉为|枉为|不转不是|是中国人就)/g
const SLIPPERY_SLOPE = /(?:后果不堪设想|将.*带来.*灾难|迟早会|迟早|必将|必然导致|连锁反应)/g
const HASTY_GENERALIZATION = /(?:所有.*都|全部.*都|每个人.*都|总是|从来不|无一例外|概莫能外)/g
const APPEAL_TO_MASSES = /(?:所有人都|大家都在|全网都在|朋友圈都在|刷屏了|全网热议|万人血书)/g

const TECHNIQUE_MAP: { pattern: RegExp; name: string; description: string; risk: RiskLevel }[] = [
  { pattern: FEAR_WORDS, name: '恐惧诉求', description: '使用夸张的危险词汇制造恐慌情绪', risk: 'high' },
  { pattern: AUTHORITY_PATTERNS, name: '诉诸权威', description: '引用模糊的权威来源增加可信度', risk: 'medium' },
  { pattern: FALSE_DICHOTOMY, name: '虚假两难', description: '只给两个极端选项，忽略中间地带', risk: 'high' },
  { pattern: AD_HOMINEM, name: '人身攻击', description: '攻击对方人格而非论点本身', risk: 'high' },
  { pattern: EMOTIONAL_BIND, name: '情绪绑架', description: '用道德或情感压力迫使认同', risk: 'high' },
  { pattern: SLIPPERY_SLOPE, name: '滑坡谬误', description: '夸大因果链条，暗示必然导致极端后果', risk: 'medium' },
  { pattern: HASTY_GENERALIZATION, name: '以偏概全', description: '用绝对化表述将个例推导为普遍结论', risk: 'medium' },
  { pattern: APPEAL_TO_MASSES, name: '诉诸群众', description: '用"大家都这么认为"替代实际论证', risk: 'medium' },
]

function analyzeLocally(text: string): EmotionAnalysisResult {
  // 按句号、问号、感叹号分句
  const rawSentences = text.split(/(?<=[。！？!?；;])\s*/).filter(s => s.trim().length > 2)

  const sentences: SentenceAnalysis[] = rawSentences.map(sentence => {
    let maxRisk: RiskLevel = 'none'
    let technique: string | undefined
    let explanation: string | undefined

    for (const { pattern, name, description, risk } of TECHNIQUE_MAP) {
      const matches = sentence.match(pattern)
      if (matches && matches.length > 0) {
        if (risk === 'high' || (risk === 'medium' && maxRisk !== 'high')) {
          maxRisk = risk
          technique = name
          explanation = `${description}。关键词：「${matches[0]}」`
        }
        if (risk === 'high' && maxRisk === 'high') break
      }
    }

    return { text: sentence.trim(), riskLevel: maxRisk, technique, explanation }
  })

  // 统计检测到的手法
  const techniqueCounts = new Map<string, { description: string; count: number }>()
  for (const s of sentences) {
    if (s.technique) {
      const entry = techniqueCounts.get(s.technique)
      if (entry) entry.count++
      else {
        const def = TECHNIQUE_MAP.find(t => t.name === s.technique)
        techniqueCounts.set(s.technique, { description: def?.description || '', count: 1 })
      }
    }
  }

  const techniques = Array.from(techniqueCounts.entries()).map(([name, { description, count }]) => ({
    name, description, count,
  }))

  // 提取关键操控词组
  const keyPhrases: string[] = []
  for (const { pattern } of TECHNIQUE_MAP) {
    const matches = text.match(pattern)
    if (matches) keyPhrases.push(...matches.slice(0, 2))
  }

  // 计算分数
  const highCount = sentences.filter(s => s.riskLevel === 'high').length
  const medCount = sentences.filter(s => s.riskLevel === 'medium').length
  const total = sentences.length || 1
  const score = Math.min(100, Math.round(((highCount * 30 + medCount * 15) / total) * (total > 3 ? 1 : 0.7)))

  // 生成客观重述（去掉操控性词句）
  let objectiveSummary = text
  for (const { pattern } of TECHNIQUE_MAP) {
    objectiveSummary = objectiveSummary.replace(pattern, '【...】')
  }
  objectiveSummary = objectiveSummary.replace(/【\.\.\.】+/g, '【...】').trim()
  if (objectiveSummary === text) {
    objectiveSummary = '未检测到明显的情绪操控手法，文本表述基本客观。'
  }

  return {
    score,
    level: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low',
    techniques,
    sentences,
    objectiveSummary,
    keyPhrases: [...new Set(keyPhrases)].slice(0, 6),
  }
}

// ===== 统一入口 =====

export async function analyzeEmotion(text: string): Promise<EmotionAnalysisResult> {
  // 模拟网络延迟
  await new Promise(r => setTimeout(r, 600 + Math.random() * 800))

  // 优先尝试 Groq API
  const hasGroqKey = !!import.meta.env.VITE_GROQ_API_KEY
  if (hasGroqKey) {
    try {
      return await analyzeWithGroq(text)
    } catch (e) {
      console.warn('Groq API 失败，降级到本地分析:', e)
    }
  }

  // Fallback 到本地规则引擎
  return analyzeLocally(text)
}
