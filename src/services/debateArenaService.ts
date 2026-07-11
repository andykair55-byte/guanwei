/**
 * AI Debate Arena Service v2
 * - Character-based debates with per-round scoring
 * - AI judge evaluates each round
 * - Highlight detection (精彩瞬间)
 * - Taunting / respect mechanics
 * - Groq API with mock fallback
 */

import {
  type AICharacter,
  getCharacter,
  getMatchup,
  pickRandom,
  getTaunt,
  getCelebration,
  getRespectClosing,
  ALL_CHARACTERS,
} from './characters'
import { callLLM } from '../stores/llmStore'

// ===== Types =====

export type Side = 'affirm' | 'negate'

export interface DebateTopic {
  id: string
  title: string
  category: string
  affirmLabel: string
  negateLabel: string
  heat: number
  status: 'live' | 'upcoming' | 'ended'
}

/** 思考步骤 — 展示角色如何准备发言 */
export interface ThinkingStep {
  icon: string       // emoji
  label: string      // 动作标签 e.g. "搜集数据"
  content: string    // 思考内容（简短，15-25字）
}

/** 单条发言 */
export interface DebateSpeech {
  characterId: string
  content: string
  thinkingSteps?: ThinkingStep[]  // 发言前的思考过程
}

/** 一个完整回合 = 双方各发言一次 + 评分 */
export interface DebateRound {
  round: number
  affirm: DebateSpeech
  negate: DebateSpeech
  score: RoundScore
  highlight?: Highlight
  /** 回合间插曲：落后方的嘲讽 */
  taunt?: TauntMoment
}

/** 单回合评分 */
export interface RoundScore {
  affirmScore: number   // 0-10
  negateScore: number   // 0-10
  winner: Side | 'draw'
  reason: string        // 评委点评（一句话）
}

/** 精彩瞬间 */
export interface Highlight {
  side: Side
  characterId: string
  type: 'logic-bomb' | 'data-crush' | 'killer-analogy' | 'counter-attack' | 'audience-favorite'
  label: string         // e.g. "逻辑炸弹"
  quote: string         // 被高亮的金句（从发言中截取）
}

/** 嘲讽时刻 */
export interface TauntMoment {
  side: Side            // 嘲讽方
  characterId: string
  content: string
}

/** 完整辩论赛状态 */
export interface DebateMatch {
  topic: DebateTopic
  affirmChar: AICharacter
  negateChar: AICharacter
  rounds: DebateRound[]
  totalRounds: number
  /** 最终结果 */
  finalResult?: FinalResult
}

export interface FinalResult {
  affirmTotalScore: number
  negateTotalScore: number
  winner: Side | 'draw'
  affirmClosing: string   // 胜方结语
  negateClosing: string   // 败方结语
  affirmRespect: string   // 尊重话语
  negateRespect: string
}

// ===== Topics =====

export const TOPICS: DebateTopic[] = [
  {
    id: 'college',
    title: '现在上大学还有没有用？',
    category: '社会',
    affirmLabel: '有用',
    negateLabel: '没用',
    heat: 12843,
    status: 'live',
  },
  {
    id: 'ai-replace',
    title: 'AI 会在十年内取代大部分白领工作吗？',
    category: '科技',
    affirmLabel: '会取代',
    negateLabel: '不会取代',
    heat: 9721,
    status: 'live',
  },
  {
    id: 'short-video',
    title: '短视频正在毁掉年轻人的深度思考能力',
    category: '文化',
    affirmLabel: '确实毁了',
    negateLabel: '没那么严重',
    heat: 8356,
    status: 'live',
  },
  {
    id: 'remote-work',
    title: '远程办公应该成为常态还是回归办公室？',
    category: '职场',
    affirmLabel: '远程常态',
    negateLabel: '回归办公',
    heat: 6542,
    status: 'upcoming',
  },
]

// ===== Mock Debates (pre-written, structured as full rounds) =====

interface MockRound {
  affirm: string
  negate: string
  affirmThinking?: ThinkingStep[]  // 正方思考过程
  negateThinking?: ThinkingStep[]  // 反方思考过程
  score: [number, number]   // [affirm, negate]
  judgeReason: string
  highlightSide?: Side
  highlightType?: Highlight['type']
  highlightLabel?: string
  highlightQuote?: string
}

const MOCK_ROUNDS: Record<string, MockRound[]> = {
  college: [
    {
      affirm: '中国每年 1200 万大学毕业生中，本科以上占比超过 45%。国家统计局数据显示，本科学历持有者的平均收入比高中学历高出 68%，这不是个别现象，是系统性的经济回报。',
      affirmThinking: [
        { icon: '📊', label: '调取数据', content: '国家统计局最新年度教育回报报告……' },
        { icon: '🎯', label: '锁定论点', content: '用收入差距 68% 这个硬数据开场，建立数据优势' },
        { icon: '🛡️', label: '预判反击', content: '对方大概率会用幸存者偏差来反驳，准备好概率论回应' },
      ],
      negate: '收入高 68%？你把幸存者偏差吃了？那些没上大学但创业成功的人、那些上了大学却在送外卖的人，你选择性无视了。大学文凭正在从"敲门砖"变成"安慰剂"。',
      negateThinking: [
        { icon: '🔍', label: '扫描漏洞', content: '对方只看了平均值，完全忽略了分布和幸存者偏差' },
        { icon: '💡', label: '找到突破口', content: '送外卖的大学生——这个反差案例杀伤力最大' },
        { icon: '⚔️', label: '制定反击', content: '用"安慰剂"这个比喻收尾，暗示大学只是心理安慰' },
      ],
      score: [7, 6],
      judgeReason: '正方数据扎实，但反方幸存者偏差的质疑切中要害',
      highlightSide: 'affirm',
      highlightType: 'data-crush',
      highlightLabel: '数据碾压',
      highlightQuote: '本科学历持有者的平均收入比高中学历高出 68%',
    },
    {
      affirm: '幸存者偏差恰恰说明了问题——我们讨论的是概率，不是个例。送外卖的大学毕业生占毕业生总数不到 3%，而 95% 以上的白领岗位要求本科以上学历。你说没用，是让那 95% 的岗位都改招聘条件吗？',
      affirmThinking: [
        { icon: '📊', label: '补充数据', content: '查一下送外卖大学生的真实占比……不到 3%' },
        { icon: '🎯', label: '转换攻势', content: '不纠缠个例，把话题拉回 95% 岗位的大数据' },
        { icon: '⚔️', label: '设置陷阱', content: '用反问句"让 95% 岗位改招聘条件"逼对方正面回应' },
      ],
      negate: '95% 的岗位"要求"本科，不代表这些岗位需要大学教的知识。一个程序员花四年学的数据结构，培训班六个月就能搞定，而且实战更强。大学四年真正在教什么？三分之一时间在混学分。',
      negateThinking: [
        { icon: '🔍', label: '拆解论证', content: '对方用 95% 岗位要求来论证价值，但"要求"≠"需要"' },
        { icon: '💡', label: '找到类比', content: '培训班六个月 vs 大学四年——时间效率对比最直观' },
        { icon: '⚔️', label: '致命一击', content: '"三分之一时间混学分"——这个数据会让在场学生共鸣' },
      ],
      score: [7, 8],
      judgeReason: '反方"培训班六个月"的类比直击痛点，正方防守略显被动',
      highlightSide: 'negate',
      highlightType: 'killer-analogy',
      highlightLabel: '绝杀类比',
      highlightQuote: '培训班六个月就能搞定，大学四年真正在教什么？三分之一时间在混学分',
    },
    {
      affirm: '培训班能教技能，但大学教的是思维方式。哈佛的研究表明，大学教育对批判性思维、复杂问题解决能力的培养有显著长期效果，这些是短期培训无法替代的。而且大学提供的社交网络、学术资源是隐性价值。',
      affirmThinking: [
        { icon: '📊', label: '调取研究', content: '哈佛大学教育长期追踪研究……批判性思维培养数据' },
        { icon: '🎯', label: '升级维度', content: '对方在"技能"层面攻击，我要把战场拉到"思维方式"和"隐性价值"' },
        { icon: '🛡️', label: '防守准备', content: '"不可量化"会是对方下一个攻击点，但先打出这张牌再说' },
      ],
      negate: '又在画饼了。"思维方式"这种不可量化的东西你说得好像真的一样。McKinsey 2024 年的报告指出，越来越多雇主开始技能导向招聘而非学历导向。Google、Apple 早已取消部分岗位的学历要求——如果大学真那么有用，这些公司为什么不在乎？',
      negateThinking: [
        { icon: '🔍', label: '识别弱点', content: '"思维方式"——典型的不可证伪论点，最好打' },
        { icon: '💡', label: '调取案例', content: 'McKinsey 2024 报告 + Google/Apple 取消学历要求，三连击' },
        { icon: '⚔️', label: '设置反问', content: '"这些公司为什么不在乎？"——用反问收尾，把球踢回去' },
      ],
      score: [6, 8],
      judgeReason: '反方连出Google、Apple、McKinsey三记重拳，正方"思维方式"论点显得空泛',
      highlightSide: 'negate',
      highlightType: 'logic-bomb',
      highlightLabel: '逻辑炸弹',
      highlightQuote: 'Google、Apple 早已取消部分岗位的学历要求——如果大学真那么有用，这些公司为什么不在乎？',
    },
    {
      affirm: '科技公司取消学历要求是新闻，但不是趋势。LinkedIn 数据显示，仍有 87% 的岗位明确或隐性要求本科学历。而且你说的"技能导向"恰恰需要大学的基础训练——没有数学基础，你连机器学习培训班都听不懂。',
      affirmThinking: [
        { icon: '📊', label: '数据反击', content: 'LinkedIn 最新数据：87% 岗位仍要求学历' },
        { icon: '🎯', label: '借力打力', content: '把对方的"技能导向"论点翻转——技能恰恰需要大学基础' },
        { icon: '⚔️', label: '金句打磨', content: '"没有数学基础，连培训班都听不懂"——这句话够狠' },
      ],
      negate: '87% 的岗位"要求"学历，但越来越多岗位的实际工作内容根本不需要四年学术训练。更关键的是——大学学费四年十几万，机会成本几十万。如果回报不确定、成本这么高，对普通家庭来说就是一场豪赌。你说有用，请问对谁有用？',
      negateThinking: [
        { icon: '🔍', label: '拆解数据', content: '87% 要求学历≠需要四年学术训练，区分"门槛"和"内容"' },
        { icon: '💡', label: '转换战场', content: '从"有没有用"转到"对谁有用"——成本收益分析才是核心' },
        { icon: '⚔️', label: '致命追问', content: '"对谁有用？"——把抽象辩题拉回普通家庭的真实困境' },
      ],
      score: [7, 8],
      judgeReason: '反方"对谁有用"的追问将辩题拉回现实，正方数据虽好但回避了成本问题',
    },
    {
      affirm: '对普通家庭来说，大学恰恰是最可靠的社会流动通道。北大教育学院的追踪研究表明，来自农村家庭的大学生毕业后收入是同龄非大学生的 3.2 倍。没有大学，这些人连参与竞争的入场券都没有。',
      affirmThinking: [
        { icon: '📊', label: '调取研究', content: '北大教育学院农村学生追踪数据……收入 3.2 倍差距' },
        { icon: '🎯', label: '情感升级', content: '从数据切入到"人"——普通家庭、农村孩子的真实处境' },
        { icon: '⚔️', label: '核心论点', content: '"入场券"——没有大学，连上桌的资格都没有' },
      ],
      negate: '入场券？现在这张入场券的价格已经涨到大多数农村家庭负担不起了。更讽刺的是，你引以为傲的"社会流动通道"正在变成阶层复制工具——985 高校中农村学生比例持续下降。大学没有打破不平等，它在固化不平等。',
      negateThinking: [
        { icon: '🔍', label: '抓住矛盾', content: '对方说"入场券"，但入场券本身已经买不起了' },
        { icon: '💡', label: '翻转论点', content: '"社会流动通道"→"阶层复制工具"——同一个事实，相反解读' },
        { icon: '⚔️', label: '绝杀收尾', content: '"大学在固化不平等"——这句话会让评委记住' },
      ],
      score: [8, 9],
      judgeReason: '双方都打出了漂亮的社会学论据，但反方"阶层复制工具"的反击更为致命',
      highlightSide: 'negate',
      highlightType: 'counter-attack',
      highlightLabel: '绝地反击',
      highlightQuote: '大学没有打破不平等，它在固化不平等',
    },
    {
      affirm: '问题不在于大学本身，而在于教育资源分配不均。解决方案应该是改善教育公平，而不是否定大学的价值。因噎废食是最糟糕的逻辑——不能因为门票贵就说演唱会不值得看。',
      affirmThinking: [
        { icon: '📊', label: '回归逻辑', content: '区分"大学本身的价值"和"资源分配问题"——这是两个不同的命题' },
        { icon: '🎯', label: '类比武器', content: '"因噎废食"——门票贵≠演唱会不值得看，这个类比够直观' },
        { icon: '🛡️', label: '防守策略', content: '把"不平等"问题归因到分配而非大学本身，化解对方攻击' },
      ],
      negate: '好一个"因噎废食"。但现实是，已经有越来越多的年轻人用脚投票了——考研人数连续两年下降，职业教育招生首次超过普通本科。当越来越多人发现这笔账算不过来的时候，你还在替大学辩护？',
      negateThinking: [
        { icon: '🔍', label: '识别回避', content: '对方在转移话题——从"大学有没有用"转到"分配不均"' },
        { icon: '💡', label: '数据反击', content: '考研人数下降 + 职业教育招生超本科——用脚投票最说明问题' },
        { icon: '⚔️', label: '终极追问', content: '"这笔账算不过来"——把辩题拉回经济理性，让对方的情怀无处安放' },
      ],
      score: [7, 7],
      judgeReason: '正方"因噎废食"类比精彩，反方"用脚投票"数据有力，本回合平局',
    },
  ],
  'ai-replace': [
    {
      affirm: 'OpenAI 的 GPT 系列在代码生成、文案撰写、数据分析等领域的表现已经达到或超过初级白领水平。麦肯锡估算，生成式 AI 可以自动化目前 60-70% 的知识工作任务。这不是预测，是正在发生的事。',
      negate: '60-70% 的"任务"不等于 60-70% 的"工作"。每个白领的工作都不只是执行任务——还包括判断、协调、承担责任。AI 能写报告，但它不能为报告的结论负责。公司需要的不是打字机，是能做决策的人。',
      score: [7, 8],
      judgeReason: '反方"任务≠工作"的区分精准，"不是打字机"的类比到位',
      highlightSide: 'negate',
      highlightType: 'killer-analogy',
      highlightLabel: '绝杀类比',
      highlightQuote: '公司需要的不是打字机，是能做决策的人',
    },
    {
      affirm: '今天的"不能负责"不代表明天不能。自动驾驶已经在承担"责任"了——它做决策、处理突发情况。当 AI 的能力边界持续扩展，"只有人类能做的"这个范围会越来越小。这不是线性变化，是指数变化。',
      negate: '指数变化论者每十年就会出现一次，然后被打脸。专家系统在 80 年代被说成要取代医生，结果呢？AI 的"能力扩展"遇到了瓶颈——大模型的幻觉问题至今无解，在需要精确性的专业领域，这恰恰是致命伤。',
      score: [7, 8],
      judgeReason: '反方用专家系统的历史类比精准回击了"指数变化"论',
    },
    {
      affirm: '你用专家系统的失败来类比大模型，就像用莱特兄弟的飞机来否定波音 747。技术代际不同，不可同日而语。2024 年的大模型在医学考试、法律分析、编程竞赛中的表现已经超过了大多数人类专家。',
      negate: '考试高分不等于实际工作能力。一个能过司法考试但没处理过一个真实案件的 AI，你敢让它替你打官司？白领工作的核心不是"回答问题"，而是"在模糊情境中做判断"——这恰恰是 AI 最不擅长的。',
      score: [8, 9],
      judgeReason: '反方"模糊情境中做判断"的论点直击白领工作本质，正方考试数据在此显得苍白',
      highlightSide: 'negate',
      highlightType: 'logic-bomb',
      highlightLabel: '逻辑炸弹',
      highlightQuote: '白领工作的核心不是"回答问题"，而是"在模糊情境中做判断"',
    },
  ],
  'short-video': [
    {
      affirm: '中国科学院心理研究所 2024 年的报告显示，日均刷短视频超过 2 小时的青少年，其持续注意力时长比对照组短了 40%。短视频的算法推荐机制本质上是在训练大脑追求即时刺激，这直接损害深度思考的神经基础。',
      negate: '注意力时长下降的原因多了去了——学业压力、睡眠不足、信息过载。你把锅全甩给短视频，就像把近视归咎于看书一样。而且短视频用户中也有大量知识类内容——科普、历史、编程教学，这些难道不是在"深度思考"？',
      score: [8, 6],
      judgeReason: '正方数据翔实，反方"把近视归咎于看书"的类比虽妙但论证力度不足',
      highlightSide: 'affirm',
      highlightType: 'data-crush',
      highlightLabel: '数据碾压',
      highlightQuote: '持续注意力时长比对照组短了 40%',
    },
    {
      affirm: '知识类内容在短视频平台的占比不到 5%，算法推荐机制决定了用户消费的主流是娱乐和情绪化内容。而且"刷到一条科普视频"和"系统学习一个知识领域"完全是两回事。碎片化获取不等于深度理解，这是认知科学的基本共识。',
      negate: '5% 的占比在 10 亿用户基数上就是 5000 万人每天在看知识内容。你口中的"碎片化获取"恰恰是很多人接触新知识的唯一入口。没有短视频，这些人可能连"碎片"都接触不到。精英主义地鄙视碎片化学习，本身就是一种认知偏见。',
      score: [7, 8],
      judgeReason: '反方"5000万人"的反算巧妙，"精英主义"的标签给正方扣上了帽子',
      highlightSide: 'negate',
      highlightType: 'counter-attack',
      highlightLabel: '绝地反击',
      highlightQuote: '精英主义地鄙视碎片化学习，本身就是一种认知偏见',
    },
    {
      affirm: '这不是精英主义，是质量标准。如果"接触碎片"就算"没有毁掉"，那你的标准也太低了。深度思考的核心是"持续追踪一个复杂问题"的能力——这需要在长时间内保持专注、处理矛盾信息、构建系统框架。短视频的 15 秒格式从根本上与这种能力对立。',
      negate: '你说得好像看短视频之前大家就在深度思考一样。2019 年的国民阅读调查显示，中国人均年读书量只有 4.7 本。短视频之前，毁掉深度思考的是电视剧、是网游、是社交媒体。每一代人都觉得自己正在被新技术毁掉，历史从不买账。',
      score: [7, 8],
      judgeReason: '反方"历史从不买账"的收尾精彩，用历史视角消解了正方的技术恐惧论',
      highlightSide: 'negate',
      highlightType: 'audience-favorite',
      highlightLabel: '全场最佳',
      highlightQuote: '每一代人都觉得自己正在被新技术毁掉，历史从不买账',
    },
  ],
}

// ===== Mock Score Generation (for topics without pre-written rounds) =====

function generateMockScore(): RoundScore {
  const a = Math.floor(Math.random() * 4) + 5  // 5-8
  const n = Math.floor(Math.random() * 4) + 5
  const reasons = [
    '双方各有千秋，正方论据更扎实',
    '反方的反击出人意料，略占上风',
    '本回合势均力敌，难分伯仲',
    '正方的数据链更完整',
    '反方的类比更加生动有力',
  ]
  return {
    affirmScore: a,
    negateScore: n,
    winner: a > n ? 'affirm' : n > a ? 'negate' : 'draw',
    reason: pickRandom(reasons),
  }
}

// ===== API: Groq calls =====

/** 生成角色发言 */
async function generateSpeech(
  char: AICharacter,
  topic: string,
  stance: string,
  history: { name: string; content: string; round: number }[],
  otherCharName: string,
  roundNum: number,
): Promise<string> {
  const historyText = history.map(h =>
    `${h.name}（第${h.round}轮）：${h.content}`
  ).join('\n')

  const userPrompt = `辩题：${topic}
你的立场：${stance}
对方辩手：${otherCharName}

${history.length > 0 ? `辩论记录：\n${historyText}\n` : ''}
请发表你的第 ${roundNum} 轮发言。记住：
- 保持你的人设风格
- 不要重复之前说过的内容，找新角度
- 80-150 字，简洁有力
- 纯文本，不用 markdown 格式`

  const content = await callLLM(
    [
      { role: 'system', content: char.systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 250, temperature: char.temperature }
  )
  return content.trim()
}

/** AI 评委打分 */
async function judgeRoundViaAPI(
  topic: string,
  affirmSpeech: string,
  negateSpeech: string,
  affirmName: string,
  negateName: string,
): Promise<RoundScore> {
  const prompt = `你是一位辩论赛评委。请为以下回合打分。

辩题：${topic}
正方「${affirmName}」：${affirmSpeech}
反方「${negateName}」：${negateSpeech}

请给出：
1. 正方得分（0-10的整数）
2. 反方得分（0-10的整数）
3. 一句话点评（15字以内）

严格按以下JSON格式回复，不要有其他内容：
{"affirm": 分数, "negate": 分数, "reason": "点评"}`

  const text = await callLLM(
    [
      { role: 'system', content: '你是辩论赛评委，只输出JSON，不输出其他内容。' },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 100, temperature: 0.3 }
  )

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found')
  const parsed = JSON.parse(jsonMatch[0])
  return {
    affirmScore: Math.min(10, Math.max(0, Number(parsed.affirm) || 5)),
    negateScore: Math.min(10, Math.max(0, Number(parsed.negate) || 5)),
    winner: parsed.affirm > parsed.negate ? 'affirm' : parsed.negate > parsed.affirm ? 'negate' : 'draw',
    reason: String(parsed.reason || '双方表现相当'),
  }
}

// ===== Highlight Detection =====

const HIGHLIGHT_TYPES: { type: Highlight['type']; label: string }[] = [
  { type: 'logic-bomb', label: '逻辑炸弹' },
  { type: 'data-crush', label: '数据碾压' },
  { type: 'killer-analogy', label: '绝杀类比' },
  { type: 'counter-attack', label: '绝地反击' },
  { type: 'audience-favorite', label: '全场最佳' },
]

/** 检测精彩瞬间（基于分差 + 随机概率） */
function detectHighlight(
  score: RoundScore,
  affirmSpeech: string,
  negateSpeech: string,
  affirmCharId: string,
  negateCharId: string,
): Highlight | undefined {
  const diff = Math.abs(score.affirmScore - score.negateScore)

  // 分差 >= 2 时有 60% 概率触发，分差 >= 3 时 90%
  const threshold = diff >= 3 ? 0.9 : diff >= 2 ? 0.6 : 0.15
  if (Math.random() > threshold) return undefined

  const winningSide: Side = score.affirmScore > score.negateScore ? 'affirm' : 'negate'
  const speech = winningSide === 'affirm' ? affirmSpeech : negateSpeech
  const charId = winningSide === 'affirm' ? affirmCharId : negateCharId

  // 从发言中截取"金句"（取中间偏后的部分，通常是结论句）
  const sentences = speech.split(/[，。！？,.!?]/).filter(s => s.length > 8)
  const quoteIdx = Math.min(sentences.length - 1, Math.floor(sentences.length * 0.6))
  const quote = (sentences[quoteIdx] || speech).trim()

  const hlType = pickRandom(HIGHLIGHT_TYPES)

  return {
    side: winningSide,
    characterId: charId,
    type: hlType.type,
    label: hlType.label,
    quote: quote.length > 40 ? quote.slice(0, 40) + '…' : quote,
  }
}

// ===== Main Debate Runner =====

export interface RunDebateOptions {
  topic: DebateTopic
  affirmCharId?: string
  negateCharId?: string
  totalRounds?: number
  /** 每完成一个回合回调 */
  onRound?: (round: DebateRound) => void
  /** 检测到精彩瞬间回调 */
  onHighlight?: (highlight: Highlight) => void
  /** 嘲讽时刻回调 */
  onTaunt?: (taunt: TauntMoment) => void
}

/**
 * 运行一场完整辩论赛
 * 每回合：双方各发言一次 → AI评委打分 → 检测精彩瞬间 → 可能触发嘲讽
 * 结束后：双方互致敬意
 */
export async function runDebate(opts: RunDebateOptions): Promise<DebateMatch> {
  const {
    topic,
    affirmCharId = 'baize',
    negateCharId = 'xiezhi',
    totalRounds = 6,
    onRound,
    onHighlight,
    onTaunt,
  } = opts

  const affirmChar = getCharacter(affirmCharId)
  const negateChar = getCharacter(negateCharId)
  const rounds: DebateRound[] = []

  // 追踪累计分数
  let affirmTotal = 0
  let negateTotal = 0

  for (let i = 1; i <= totalRounds; i++) {
    let affirmSpeech: string
    let negateSpeech: string
    let score: RoundScore
    let mockFallback: MockRound | undefined

    // 尝试用 API 生成
    try {
      const history = rounds.flatMap(r => [
        { name: affirmChar.name, content: r.affirm.content, round: r.round },
        { name: negateChar.name, content: r.negate.content, round: r.round },
      ])

      ;[affirmSpeech, negateSpeech] = await Promise.all([
        generateSpeech(affirmChar, topic.title, topic.affirmLabel, history, negateChar.name, i),
        generateSpeech(negateChar, topic.title, topic.negateLabel, history, affirmChar.name, i),
      ])

      score = await judgeRoundViaAPI(topic.title, affirmSpeech, negateSpeech, affirmChar.name, negateChar.name)
    } catch {
      // Fallback to mock
      const mockRounds = MOCK_ROUNDS[topic.id]
      if (mockRounds && i <= mockRounds.length) {
        const mock = mockRounds[i - 1]
        mockFallback = mock
        affirmSpeech = mock.affirm
        negateSpeech = mock.negate
        score = {
          affirmScore: mock.score[0],
          negateScore: mock.score[1],
          winner: mock.score[0] > mock.score[1] ? 'affirm' : mock.score[1] > mock.score[0] ? 'negate' : 'draw',
          reason: mock.judgeReason,
        }
      } else {
        affirmSpeech = `${affirmChar.name}就「${topic.affirmLabel}」发表第${i}轮论述。`
        negateSpeech = `${negateChar.name}就「${topic.negateLabel}」发表第${i}轮反驳。`
        score = generateMockScore()
      }
    }

    affirmTotal += score.affirmScore
    negateTotal += score.negateScore

    // 检测精彩瞬间
    const highlight = detectHighlight(score, affirmSpeech, negateSpeech, affirmChar.id, negateChar.id)

    // 嘲讽时刻：落后方在分差较大时触发
    let taunt: TauntMoment | undefined
    const scoreDiff = affirmTotal - negateTotal
    if (i >= 2 && Math.abs(scoreDiff) >= 4) {
      const losingSide: Side = scoreDiff < 0 ? 'affirm' : 'negate'
      const losingChar = losingSide === 'affirm' ? affirmChar : negateChar
      const situation = scoreDiff < 0 ? 'comeback' : 'comeback'
      taunt = {
        side: losingSide,
        characterId: losingChar.id,
        content: getTaunt(losingChar, situation),
      }
    }

    const round: DebateRound = {
      round: i,
      affirm: {
        characterId: affirmChar.id,
        content: affirmSpeech,
        thinkingSteps: mockFallback?.affirmThinking,
      },
      negate: {
        characterId: negateChar.id,
        content: negateSpeech,
        thinkingSteps: mockFallback?.negateThinking,
      },
      score,
      highlight,
      taunt,
    }

    rounds.push(round)
    onRound?.(round)
    if (highlight) onHighlight?.(highlight)
    if (taunt) onTaunt?.(taunt)

    // 回合间延迟
    if (i < totalRounds) {
      await new Promise(r => setTimeout(r, 600))
    }
  }

  // 最终结果
  const winner: Side | 'draw' = affirmTotal > negateTotal ? 'affirm' : negateTotal > affirmTotal ? 'negate' : 'draw'
  const affirmWon = winner === 'affirm'

  const finalResult: FinalResult = {
    affirmTotalScore: affirmTotal,
    negateTotalScore: negateTotal,
    winner,
    affirmClosing: getCelebration(affirmChar, affirmWon),
    negateClosing: getCelebration(negateChar, !affirmWon),
    affirmRespect: getRespectClosing(affirmChar),
    negateRespect: getRespectClosing(negateChar),
  }

  return {
    topic,
    affirmChar,
    negateChar,
    rounds,
    totalRounds,
    finalResult,
  }
}

/**
 * 获取 mock 辩论（即时返回，不调用 API）
 * @param totalRounds 自定义回合数，默认使用全部 mock 数据
 */
export function getMockMatch(
  topicId: string,
  affirmCharId?: string,
  negateCharId?: string,
  totalRounds?: number,
): DebateMatch {
  const topic = TOPICS.find(t => t.id === topicId) || TOPICS[0]
  const affirmChar = getCharacter(affirmCharId || 'baize')
  const negateChar = getCharacter(negateCharId || 'xiezhi')
  const allMockRounds = MOCK_ROUNDS[topicId] || MOCK_ROUNDS.college!

  // 按请求回合数裁剪或循环
  let selectedMocks: (MockRound & { _cycled?: boolean })[]
  const requested = totalRounds ?? allMockRounds.length

  if (requested <= allMockRounds.length) {
    // 截取前 N 轮
    selectedMocks = allMockRounds.slice(0, requested)
  } else {
    // 循环复用，超出部分加分数扰动
    selectedMocks = []
    for (let i = 0; i < requested; i++) {
      const base = allMockRounds[i % allMockRounds.length]
      if (i < allMockRounds.length) {
        selectedMocks.push(base)
      } else {
        // 扰动分数 ±1
        const perturb = () => Math.max(3, Math.min(10, base.score[0] + Math.floor(Math.random() * 3) - 1))
        selectedMocks.push({
          ...base,
          score: [perturb(), perturb()] as [number, number],
          _cycled: true,
        })
      }
    }
  }

  let affirmTotal = 0
  let negateTotal = 0

  const rounds: DebateRound[] = selectedMocks.map((mock, i) => {
    const score: RoundScore = {
      affirmScore: mock.score[0],
      negateScore: mock.score[1],
      winner: mock.score[0] > mock.score[1] ? 'affirm' : mock.score[1] > mock.score[0] ? 'negate' : 'draw',
      reason: mock.judgeReason,
    }
    affirmTotal += score.affirmScore
    negateTotal += score.negateScore

    const highlight: Highlight | undefined = (!mock._cycled && mock.highlightSide) ? {
      side: mock.highlightSide,
      characterId: mock.highlightSide === 'affirm' ? affirmChar.id : negateChar.id,
      type: mock.highlightType || 'audience-favorite',
      label: mock.highlightLabel || '全场最佳',
      quote: mock.highlightQuote || '',
    } : undefined

    return {
      round: i + 1,
      affirm: { characterId: affirmChar.id, content: mock.affirm, thinkingSteps: mock.affirmThinking },
      negate: { characterId: negateChar.id, content: mock.negate, thinkingSteps: mock.negateThinking },
      score,
      highlight,
    }
  })

  const winner: Side | 'draw' = affirmTotal > negateTotal ? 'affirm' : negateTotal > affirmTotal ? 'negate' : 'draw'
  const affirmWon = winner === 'affirm'

  return {
    topic,
    affirmChar,
    negateChar,
    rounds,
    totalRounds: rounds.length,
    finalResult: {
      affirmTotalScore: affirmTotal,
      negateTotalScore: negateTotal,
      winner,
      affirmClosing: getCelebration(affirmChar, affirmWon),
      negateClosing: getCelebration(negateChar, !affirmWon),
      affirmRespect: getRespectClosing(affirmChar),
      negateRespect: getRespectClosing(negateChar),
    },
  }
}

export function getTopic(id: string): DebateTopic | undefined {
  return TOPICS.find(t => t.id === id)
}

// Re-export character utilities for UI usage
export { ALL_CHARACTERS, getCharacter, getMatchup }
