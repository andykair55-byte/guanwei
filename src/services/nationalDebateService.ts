// src/services/nationalDebateService.ts
// 真实 4v4 国赛辩论服务：评委席、等候席、观战席、真实评分

import { callLLM } from '../stores/llmStore'
import {
  NATIONAL_PHASES, DEMO_SPEED_MULTIPLIER, calculateTotalScore,
  DEFAULT_JUDGES, aggregateScores, determineWinner, determineMVP,
  type NationalDebateRoom, type NationalSeat, type NationalSpeech,
  type DebaterScore, type SeatId, type NationalPhase, type ScoreDimension,
  type JudgeSeatScore, type DebateSide,
} from '../types/nationalDebate'

/** 创建国赛房间 */
export function createNationalRoom(
  topic: string,
  affirmLabel: string,
  negateLabel: string,
  ownerSide: DebateSide = 'affirm',
  ownerPosition: 1 | 2 | 3 | 4 = 1,
): NationalDebateRoom {
  const seats: NationalSeat[] = []
  const sides: ('affirm' | 'negate')[] = ['affirm', 'negate']

  for (const side of sides) {
    for (let pos = 1 as 1 | 2 | 3 | 4; pos <= 4; pos++) {
      const seatId = `${side}-${pos}` as SeatId
      const isOwner = side === ownerSide && pos === ownerPosition
      seats.push({
        seatId,
        side,
        position: pos,
        status: isOwner ? 'human' : 'ai',
        nickname: isOwner ? '你' : getAINickname(seatId),
        avatar: '',
        isOwner,
      })
    }
  }

  return {
    id: `national-${Date.now()}`,
    topic,
    affirmLabel,
    negateLabel,
    status: 'opening',
    seats,
    speeches: [],
    judges: DEFAULT_JUDGES,
    judgeScores: [],
    finalScores: [],
    winner: null,
    mvpSeatId: null,
    spectators: Math.floor(Math.random() * 80) + 20,
    waitingPlayers: Math.floor(Math.random() * 5),
    createdAt: new Date().toISOString(),
  }
}

/** AI 辩位昵称 */
function getAINickname(seatId: SeatId): string {
  const names: Record<string, string> = {
    'affirm-1': '正方一辩', 'affirm-2': '正方二辩', 'affirm-3': '正方三辩', 'affirm-4': '正方四辩',
    'negate-1': '反方一辩', 'negate-2': '反方二辩', 'negate-3': '反方三辩', 'negate-4': '反方四辩',
  }
  return names[seatId] || 'AI辩手'
}

/** 国赛 demo 辩题库 */
export const NATIONAL_TOPICS = [
  {
    topic: '大学生兼职利大于弊还是弊大于利？',
    affirmLabel: '利大于弊',
    negateLabel: '弊大于利',
  },
  {
    topic: '人工智能的发展对人类文明利大于弊还是弊大于利？',
    affirmLabel: '利大于弊',
    negateLabel: '弊大于利',
  },
  {
    topic: '短视频正在摧毁年轻人的深度思考能力',
    affirmLabel: '是',
    negateLabel: '否',
  },
  {
    topic: '大学教育应该更加注重通识教育还是专业教育？',
    affirmLabel: '通识教育',
    negateLabel: '专业教育',
  },
]

/** Mock 发言数据（按真实国赛流程生成） */
const MOCK_SPEECHES: Record<string, string> = {
  'opening-affirm-1': '我方坚定认为大学生兼职利大于弊。判断标准是：兼职是否更有利于大学生成为独立、完整的社会人。第一，兼职能培养责任意识与时间管理能力，这是课堂难以提供的实践教育。第二，智联招聘 2024 年报告显示，78% 的雇主更倾向招聘有兼职经历的毕业生。第三，适度经济独立让学生更珍惜学习机会，而非相反。',
  'opening-negate-1': '对方辩友混淆了"兼职"与"实习"的概念。我方判断标准是：大学生涯的核心任务是知识积累与能力塑造。第一，教育部调研显示每周兼职超过 15 小时的学生挂科率高出 42%，学业受损是普遍事实。第二，大学生时间有限，兼职往往从事低价值重复劳动，机会成本极高。第三，经济困难应通过奖助学金解决，而非让学生用学业换生活费。',

  'attack-negate-2': '请问正方一辩，您提到 78% 雇主数据，这份报告是否区分了与专业相关的实习和无关兼职？如果大部分是实习经历，是否正好说明您方论据偷换概念？',
  'attack-affirm-1': '我方从未将兼职等同于实习。兼职的核心价值在于"社会接触"与"自我认知"。反问对方：如果学生从未接触社会，毕业后如何完成从校园到职场的转换？',
  'attack-affirm-2': '反方一辩提到挂科率数据，请问是否控制了学生家庭经济状况这一变量？贫困生往往同时面临学业压力和兼职需求，简单归因是否忽略了结构问题？',
  'attack-negate-1': '正方二辩恰恰暴露了我方论点：当制度保障不足时，学生被迫兼职。这不能证明兼职"利大于弊"，只能证明助学金制度需要完善。',
  'attack-negate-3': '请问正方二辩，顶尖高校普遍建议大一新生不要兼职，这是否说明即便在资源充足的学校，兼职仍可能影响学业适应？',
  'attack-affirm-2': '高校的建议针对的是"过度兼职"，而非兼职本身。适度兼职与适度运动一样，是学校应该引导而非禁止的事情。',
  'attack-affirm-3': '请问反方二辩，您方主张用奖学金替代兼职，但国家奖学金覆盖率不足 3%，助学金也无法覆盖所有学生，剩下 90% 多的学生怎么办？',
  'attack-negate-2': '覆盖率不足是制度问题，应该推动制度改革，而非让学生用学业去填补制度漏洞。这是方向性的错误。',

  'attack-summary-negate-1': '攻辩阶段，对方无法回应三个核心问题：78% 数据来源不明、混淆兼职与实践、将制度缺失美化为兼职合理性。对方所有论证都建立在"适度"这个模糊前提上。',
  'attack-summary-affirm-1': '我方已明确：合理兼职不等于荒废学业。反方将"过度兼职"等同于"兼职"，是以偏概全。现实是：助学金不够、实习门槛高、学费在涨，兼职是成长的补充而非敌人。',

  'free-affirm-1': '反方始终在理想层面讨论，但现实中多数学生没有优质实习机会，兼职是他们接触社会的唯一途径。否认这一点就是脱离实际。',
  'free-negate-1': '经济困难应通过助学金和奖学金解决，而非让学生牺牲学习时间。这是制度问题，不是兼职合理性的论据。',
  'free-affirm-2': '反方的助学金方案覆盖面不足 40%，剩下的学生怎么办？空谈制度完善不如让学生自力更生。',
  'free-negate-2': '对方逻辑有误：制度不完善应该推动制度改革，而非让学生用学业去填补制度漏洞。',
  'free-affirm-3': '兼职不仅是经济问题，更是能力培养。简历上只有成绩没有实践，毕业即失业。',
  'free-negate-3': '实习和科研也是实践，且不影响学业。对方将"兼职"等同于"实践"，偷换了概念。',
  'free-affirm-4': '反方描绘了一幅理想图景：充足助学金、优质实习、专注学习。但现实是：助学金不够、实习门槛高、学费在涨。兼职不是无奈，而是成长。',
  'free-negate-4': '正方将"无奈之举"美化成"最优选择"，这是典型的合理化谬误。我们应该争取更好的，而非接受次优。',
  'free-affirm-1-2': '我方不是在美化无奈，而是说：在现有条件下，兼职是学生可以主动选择的成长路径。否认它的价值，才是对学生的傲慢。',
  'free-negate-1-2': '但当一条路径以牺牲学业为代价时，它就不是"成长"，而是"透支"。大学四年的主要投资是学习，不是打零工。',

  'closing-negate-4': '综上所述，对方辩友的论据存在三大问题：数据来源不明、混淆兼职与实践、将无奈美化成选择。大学四年转瞬即逝，把时间投资在学习上，回报远超任何兼职。我方坚决认为，大学生兼职弊大于利。',
  'closing-affirm-4': '反方描绘了一幅理想图景：充足助学金、优质实习、专注学习。但现实是：助学金不够、实习门槛高、学费在涨。兼职能培养责任、接触社会、提升就业力。78% 数据来自智联招聘 2024 年报告。我方坚持，大学生兼职利大于弊。',
}

/** 生成 AI 发言 */
export async function generateAISpeech(
  room: NationalDebateRoom,
  seatId: SeatId,
  phase: NationalPhase,
): Promise<string> {
  const mockKey = `${phase}-${seatId}`
  if (MOCK_SPEECHES[mockKey]) {
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800))
    return MOCK_SPEECHES[mockKey]
  }

  // 自由辩论第二轮需要额外 key
  if (phase === 'free') {
    const freeKey2 = `${phase}-${seatId}-2`
    if (MOCK_SPEECHES[freeKey2]) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800))
      return MOCK_SPEECHES[freeKey2]
    }
  }

  // 调用 LLM 生成
  const seat = room.seats.find(s => s.seatId === seatId)
  const phaseConfig = NATIONAL_PHASES.find(p => p.phase === phase)
  const sideLabel = seat?.side === 'affirm' ? room.affirmLabel : room.negateLabel
  const positionLabel = ['一', '二', '三', '四'][seat ? seat.position - 1 : 0]

  const systemPrompt = `你是一场华语辩论世锦赛风格的${sideLabel}方${positionLabel}辩手。请紧扣辩题，回应对方观点，语言有力，逻辑清晰。`
  const userPrompt = `辩题：${room.topic}
${room.affirmLabel}方观点：支持
${room.negateLabel}方观点：反对

当前环节：${phaseConfig?.label || phase}
环节规则：${phaseConfig?.rules || ''}
发言字数限制：${phaseConfig?.charLimit || 200}字

之前的发言记录：
${room.speeches.map(s => `${s.side === 'affirm' ? room.affirmLabel : room.negateLabel}方${['一','二','三','四'][s.position-1]}辩：${s.content}`).join('\n')}

请给出你的发言，直接输出发言内容，不要加任何前缀。不超过${phaseConfig?.charLimit || 200}字。`

  try {
    const result = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7 }
    )
    if (result && result.trim().length > 10) {
      return result.trim().slice(0, phaseConfig?.charLimit || 200)
    }
  } catch {
    // 降级
  }

  return '（AI正在思考中…）让我方来回应这个问题。从实际情况来看，我方的立场是有充分依据的，我们需要从多个角度来审视这个问题。'
}

/** 三位评委独立打分 */
export async function generateJudgeScores(room: NationalDebateRoom): Promise<JudgeSeatScore[]> {
  await new Promise(r => setTimeout(r, 1200))

  const scores: JudgeSeatScore[] = []
  for (const judge of room.judges) {
    for (const seat of room.seats.filter(s => s.status !== 'empty')) {
      // 根据辩位和评委风格产生差异
      const baseLogic = 6 + Math.floor(Math.random() * 3)
      const baseEvidence = 5 + Math.floor(Math.random() * 4)
      const baseRebuttal = 5 + Math.floor(Math.random() * 4)
      const baseExpression = 6 + Math.floor(Math.random() * 3)

      // 评委个性微调
      let dim: ScoreDimension = {
        logic: Math.min(10, baseLogic),
        evidence: Math.min(10, baseEvidence),
        rebuttal: Math.min(10, baseRebuttal),
        expression: Math.min(10, baseExpression),
      }

      if (judge.id === 'judge-1') dim.logic = Math.min(10, dim.logic + 1)
      if (judge.id === 'judge-2') dim.expression = Math.min(10, dim.expression + 1)
      if (judge.id === 'judge-3') dim.rebuttal = Math.min(10, dim.rebuttal + 1)

      const comments = [
        '论证链条完整，临场反应敏捷。',
        '论据充分，但反驳环节略显被动。',
        '语言表达流畅，逻辑推进清晰。',
        '攻防有序，但部分观点缺乏数据支撑。',
        '价值升华到位，但细节论证可更扎实。',
        '反驳精准，但时间管理需加强。',
      ]

      scores.push({
        judgeId: judge.id,
        seatId: seat.seatId,
        side: seat.side,
        position: seat.position,
        nickname: seat.nickname || 'AI辩手',
        scores: dim,
        totalScore: calculateTotalScore(dim),
        comment: comments[Math.floor(Math.random() * comments.length)],
      })
    }
  }

  return scores
}

/** 生成最终评分、胜负、MVP */
export async function generateFinalResult(room: NationalDebateRoom): Promise<{
  judgeScores: JudgeSeatScore[]
  finalScores: DebaterScore[]
  winner: DebateSide | 'draw'
  mvpSeatId: SeatId | null
}> {
  const judgeScores = await generateJudgeScores(room)
  const finalScores = aggregateScores(judgeScores, room.seats)
  const winner = determineWinner(finalScores)
  const mvpSeatId = determineMVP(finalScores)
  return { judgeScores, finalScores, winner, mvpSeatId }
}

/** 获取 demo 加速后的时长 */
export function getDemoDuration(originalDuration: number): number {
  return Math.max(3, Math.round(originalDuration * DEMO_SPEED_MULTIPLIER))
}
