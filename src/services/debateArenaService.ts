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

export const MOCK_ROUNDS: Record<string, MockRound[]> = {
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
  'adou-fool': [
    {
      // 第1轮：开场立论
      affirm: '我来说句公道话。大家一提到阿斗就想到"扶不起的阿斗"，但你们知道吗？刘禅在位41年，是三国所有皇帝里在位时间最长的。曹操的魏国换了几个皇帝？曹丕、曹叡、曹芳……走马灯一样。刘禅能坐稳江山41年，这本身就说明他有几分本事。再说"乐不思蜀"这件事——当时司马昭设宴试探他，他要是真说"我想蜀国"，第二天脑袋就搬家了。装傻保命，这叫大智若愚。《三国志》里陈寿写他"任贤相则为循理之君"，翻译成大白话就是：有诸葛亮辅佐时，他是个讲道理、守规矩的好领导。这不比大部分皇帝强？',
      affirmThinking: [
        { icon: '📖', label: '翻阅古书', content: '让我查查《三国志》……刘禅在位41年，三国皇帝里最长的' },
        { icon: '👥', label: '求助观众', content: '弹幕有人说"阿斗就是个废物"，有没有人知道他的真实政绩？' },
        { icon: '🔍', label: '整理论点', content: '理出三条：在位时间长、乐不思蜀是自保、后世评价有偏见' },
      ],
      negate: '我来说两句。诸葛亮大人说得好听，"在位41年"，但这41年怎么过的？前11年有诸葛亮撑着，后来看蒋琬、费祎、董允这些大臣苦苦支撑。等这些能臣一走，刘禅干了什么？宠信宦官黄皓，让一个太监把持朝政！姜维在前线打仗，他在后宫听太监的话。"乐不思蜀"你说是大智若愚？我说就是没心没肺。一个皇帝，国家灭亡了，在敌国宴席上说"这里挺好，不想家了"——这不是聪明，这是可悲。裴松之在注里说得很清楚：刘禅不是不聪明，是聪明用错了地方。',
      negateThinking: [
        { icon: '📖', label: '翻阅史书', content: '查《三国志》裴注……刘禅宠信宦官黄皓，朝政荒废都有记载' },
        { icon: '💬', label: '看到弹幕', content: '观众说"乐不思蜀就是铁证"，说得没错，这就是没心没肺' },
        { icon: '🔍', label: '整理论点', content: '理出三条：宠信宦官、乐不思蜀、不战而降' },
      ],
      score: [7, 6],
      judgeReason: '正方以在位时长和"乐不思蜀"的自保逻辑立论，有说服力；反方抓宦官黄皓和朝政腐败做文章也很实在。但正方略胜一筹——"三国在位最长的皇帝"这个数据确实震撼',
    },
    {
      // 第2轮：交锋深化
      affirm: '王大人说刘禅靠大臣撑着，那我反问一句：能识人、能用好人，不也是一种能力吗？诸葛亮去世后，刘禅又维持了29年才亡国。29年啊！如果真是废物，能撑29年？他做了什么？不设丞相，让蒋琬管军事、费祎管政事，互相制衡——这不就是现代企业的分权管理？再说黄皓的事，确实有这个污点，但哪个皇帝没犯过错？唐太宗还有玄武门之变呢。司马昭试探他"想不想蜀国"，他回答"此间乐，不思蜀"，后来郤正教他说"先人坟墓在蜀，想念"，他照说了，司马昭拆穿他，他立马装傻说"就是郤正教我的"——这一手把司马昭都逗乐了，觉得这人确实没威胁。这叫什么？这叫示弱求生。古今中外，会示弱的人才能活得久。',
      affirmThinking: [
        { icon: '📖', label: '翻阅史料', content: '诸葛亮死后刘禅又撑了29年，查查他靠什么管的' },
        { icon: '💬', label: '看到弹幕', content: '有人问"29年靠谁撑的"，我来回复：靠分权制衡，不设丞相' },
        { icon: '🔍', label: '整理论点', content: '三条：识人善任也是能力、分权制衡、示弱求生' },
      ],
      negate: '29年？那29年是蜀国在走下坡路！人口从90万掉到灭亡时的28万户，国力一天不如一天。你说是"分权管理"，我说就是没人能扛事了。诸葛亮在时，蜀国还能北伐；诸葛亮走了，蜀国就只剩防守。姜维九伐中原，次次无功而返，刘禅在背后不支持、还猜忌。你说"哪个皇帝没犯过错"，但黄皓不是小错——他让蜀国在亡国前三年还在内斗！至于"示弱求生"，一个皇帝需要靠装傻来活命，这本身就说明他无能到连反抗的资本都没有。东吴的孙皓虽然暴虐，但至少敢抵抗到底。刘禅呢？邓艾兵临城下，他连打都不打就投降了。',
      negateThinking: [
        { icon: '📖', label: '翻阅史书', content: '查蜀国人口数据，从90万掉到28万户，国力衰退' },
        { icon: '💬', label: '看到弹幕', content: '观众说"29年就是苟延残喘"，一针见血' },
        { icon: '🔍', label: '整理论点', content: '三条：国力衰退、内斗不断、不战而降' },
      ],
      score: [8, 7],
      judgeReason: '正方"识人善任也是一种能力"这个角度很妙；反方用人口数据说话很有说服力。但正方略胜——"示弱求生"的论述层次更丰富',
    },
    {
      // 第3轮：高潮名场面
      affirm: '我说句可能得罪人的话——"扶不起的阿斗"这五个字，是罗贯中在《三国演义》里给刘禅贴的标签，不是正史的评价。你们想想，我们今天对阿斗的印象，有多少来自正史，有多少来自小说和电视剧？《三国志》是陈寿写的，陈寿是什么人？蜀国旧臣，他要是觉得刘禅真是废物，大可以痛骂。但他怎么写的？"后主任贤相则为循理之君"——用大白话说就是：用对了人，他就是个讲道理的好皇帝。再看"乐不思蜀"，有人说这是耻辱，我说这是慈悲。蜀汉灭亡时，如果刘禅死守成都，死的是谁？是城中百姓。他选择了投降，保全了一城百姓的性命。一个皇帝，在国家灭亡时选择自己的名声换百姓的命——你们管这叫庸才？扶不起的不是阿斗，是后世用演义小说给历史人物贴标签的偏见。',
      affirmThinking: [
        { icon: '📖', label: '翻阅古书', content: '查陈寿原文"任贤相则为循理之君"——人家蜀国旧臣都没骂他' },
        { icon: '💬', label: '看到弹幕', content: '弹幕刷"扶不起的阿斗"，但那是演义标签，不是正史定论' },
        { icon: '🔍', label: '整理论点', content: '三条：演义标签非正史、投降保民是慈悲、陈寿评价正面' },
      ],
      negate: '正方大人说得好听，"保全百姓"。但你知道吗？刘禅投降后，蜀国旧臣们是什么心情？姜维还在剑阁死守，刘禅已经在洛阳吃香喝辣了。姜维写密信说"愿陛下忍辱负重，臣必复国"——结果刘禅在干嘛？在参加司马昭的宴会说"此间乐"。这不是慈悲，这是背叛！你说陈寿没骂他？陈寿在《三国志》里写的是"然终制之主，虽负文学之姿，而无英拔之气"——翻译成大白话：有点文化，但没有英雄气概。这不就是变相说他平庸？再说投降保民，邓艾只带了三千人偷渡阴平，刘禅有成都守军数万，不战而降，这叫保民？',
      negateThinking: [
        { icon: '📖', label: '翻阅史书', content: '查姜维密信"愿陛下忍辱负重"——结果刘禅在赴宴说"此间乐"' },
        { icon: '💬', label: '看到弹幕', content: '观众说"投降就是背叛姜维"，这话说到点子上了' },
        { icon: '🔍', label: '整理论点', content: '三条：背叛旧臣、陈寿暗贬平庸、数万守军不战而降' },
      ],
      score: [9, 5],
      judgeReason: '正方这轮火力全开——"演义标签"和"投降保民"两个论点掷地有声；反方虽然引了姜维密信和陈寿评价，但"背叛"一词过重，反而削弱了说服力',
      highlightSide: 'affirm',
      highlightType: 'killer-analogy',
      highlightLabel: '一针见血',
      highlightQuote: '扶不起的不是阿斗，是后世用演义给历史贴标签的偏见',
    },
    {
      // 第4轮：反击
      affirm: '王大人笑我，我却觉得该笑的不是我。评判一个人是不是庸才，不能只看结果，要看处境。刘禅17岁继位，诸葛亮在世11年，他做了什么？没乱政、没乱杀人、没穷兵黩武——一个17岁到28岁的年轻人，能克制自己不去瞎指挥一个比你聪明百倍的人，这不叫平庸，这叫自知之明。你们知道历史上多少皇帝因为瞎指挥、瞎干预把国家搞垮的吗？刘禅最大的本事不是自己多厉害，而是他知道自己几斤几两，该放权时就放权。用现在的话说，他是个优秀的"甩手掌柜"——而甩手掌柜做得好，也是一种管理艺术。',
      affirmThinking: [
        { icon: '📖', label: '翻阅史料', content: '查刘禅17岁继位，诸葛亮在世11年，他没乱政没瞎指挥' },
        { icon: '💬', label: '看到嘲讽', content: '王朗笑我"为亡国之君辩护"，我偏要说说他的处境和自知之明' },
        { icon: '🔍', label: '整理论点', content: '两条：自知之明是难得的品质、放权也是一种管理艺术' },
      ],
      negate: '自知之明？好，我就说说他的"自知之明"。诸葛亮死后，他确实让蒋琬、费祎接班。但费祎被刺杀后呢？他开始重用陈祇，然后又转向黄皓。一个宦官，能左右朝政，这是自知之明？你说他不乱政，但他不作为本身就是最大的乱政！蜀国后期"民有菜色"——老百姓饿得面黄肌瘦——这不是他治国的结果？他17岁继位时确实年幼，但他41岁、51岁时呢？还是"甩手掌柜"？一个皇帝甩手甩了41年，这不叫管理艺术，这叫渎职。',
      negateThinking: [
        { icon: '📖', label: '翻阅史书', content: '查费祎被刺杀后，刘禅重用陈祇又转向黄皓，越来越乱' },
        { icon: '💬', label: '看到弹幕', content: '观众说"甩手掌柜41年就是渎职"，这话我赞同' },
        { icon: '🔍', label: '整理论点', content: '三条：用人越来越差、民有菜色、不作为就是乱政' },
      ],
      score: [8, 7],
      judgeReason: '正方"自知之明"角度新颖，但反方用费祎之后的政治走向和"民有菜色"的数据反击，非常有力。这轮双方都很精彩',
    },
    {
      // 第5轮：总结陈词
      affirm: '最后我说几句掏心窝子的话。阿斗不是雄主，这一点我不否认。但他也绝不是庸才。他是什么？他是乱世里的生存者。17岁继位，在三国那个吃人的时代，能活到65岁善终，在位41年——这本身就是一种本事。"乐不思蜀"是智慧——他活下来了，还活得不错。主动投降是慈悲——至少没让成都百姓陪葬。"扶不起的阿斗"这五个字，是小说给他的标签，不是历史给他的定论。我今天的辩论不是为了证明阿斗有多伟大，而是想告诉大家：历史不是非黑即白的。一个人被贴了标签，六百年都撕不下来——这才是真正可悲的事。所以，扶不起的不是阿斗，是我们脑子里那个被演义绑架的历史观。',
      affirmThinking: [
        { icon: '📖', label: '翻阅史料', content: '查刘禅生平：17岁继位，65岁善终，在位41年' },
        { icon: '💬', label: '看到弹幕', content: '观众说"六百年撕不下标签"，确实可悲，这就是我要说的' },
        { icon: '🔍', label: '整理论点', content: '总结三条：乱世生存者、智慧与慈悲、被演义绑架的历史观' },
      ],
      negate: '我最后也说几句。正方大人说了很多有道理的话，但我还是那句话：历史不会为弱者留情。阿斗若非庸才，何至于亡国？我承认他不是傻子，也承认他有自保的本事。但一个皇帝的职责是什么？是让国家强盛、百姓安居。刘禅做到了吗？蜀国在他手里灭亡了，这是事实。诸葛亮大人说"历史不是非黑即白"，我同意。但历史也不是"什么都能洗白"。阿斗有他的难处，有他的无奈，但无奈不等于有能。如果我今天为一碗水端平而说"他不是庸才"，那历史上那些真正励精图治却亡国的君主，他们又算什么？所以我的立场不变：阿斗是庸才。不是因为他蠢，而是因为他身在那个位置，却没有做到那个位置该做的事。',
      negateThinking: [
        { icon: '📖', label: '翻阅史书', content: '查蜀国灭亡事实——国家在他手里亡了，这是铁案' },
        { icon: '💬', label: '看到弹幕', content: '观众说"无奈不等于有能"，说到我心坎里了' },
        { icon: '🔍', label: '整理论点', content: '总结三条：亡国是事实、无奈≠有能、皇帝的职责没尽到' },
      ],
      score: [9, 8],
      judgeReason: '双方总结都很精彩。正方最后升华到"历史观"层面，格局更大；反方回归"皇帝的职责"这个根本，逻辑严密。最终判定：正方诸葛亮略胜',
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
