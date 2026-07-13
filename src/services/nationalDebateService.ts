// src/services/nationalDebateService.ts
import { callLLM } from '../stores/llmStore'
import {
  NATIONAL_PHASES, DEMO_SPEED_MULTIPLIER, calculateTotalScore,
  type NationalDebateRoom, type NationalSeat, type NationalSpeech,
  type DebaterScore, type SeatId, type NationalPhase, type ScoreDimension,
} from '../types/nationalDebate'

/** 创建默认 demo 房间 */
export function createDemoRoom(topic: string, affirmLabel: string, negateLabel: string): NationalDebateRoom {
  const seats: NationalSeat[] = []
  const sides: ('affirm' | 'negate')[] = ['affirm', 'negate']
  for (const side of sides) {
    for (let pos = 1 as 1 | 2 | 3 | 4; pos <= 4; pos++) {
      const seatId = `${side}-${pos}` as SeatId
      seats.push({
        seatId,
        side,
        position: pos as 1 | 2 | 3 | 4,
        status: seatId === 'affirm-1' ? 'human' : 'ai',
        nickname: seatId === 'affirm-1' ? '你' : getAINickname(seatId),
        avatar: '',
        isOwner: seatId === 'affirm-1',
      })
    }
  }

  return {
    id: `demo-${Date.now()}`,
    topic,
    affirmLabel,
    negateLabel,
    status: 'opening',
    seats,
    speeches: [],
    scores: [],
    winner: null,
    mvpSeatId: null,
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

/** Mock 发言数据 */
const MOCK_SPEECHES: Record<string, string> = {
  'opening-affirm-1': '我方认为，大学生兼职利大于弊。首先，兼职能培养独立性和责任感，这是课堂教育无法替代的。其次，据统计，78%的雇主更倾向于招聘有兼职经验的毕业生。最后，适度的经济独立能让学生更珍惜学习机会。',
  'opening-negate-1': '对方辩友忽略了核心问题：大学生的首要任务是学习。兼职分散精力，导致学业成绩下滑。教育部数据显示，每周兼职超过15小时的学生，挂科率高出42%。我们不应为短期收益牺牲长远发展。',
  'attack-negate-2': '请问对方一辩，您提到的78%雇主数据来源何处？是否区分了与专业相关的实习和无关的兼职？',
  'attack-affirm-2': '反方一辩的数据是否考虑了兼职类型？娱乐业兼职和助教兼职的影响截然不同，您能说明吗？',
  'attack-negate-3': '正方二辩回避了我方问题。请问，如果兼职如此有益，为何顶尖高校普遍不建议大一新生兼职？',
  'attack-affirm-3': '反方二辩的质询恰恰说明：不是兼职本身有问题，而是兼职类型的选择问题。这正需要学校引导而非禁止。',
  'attack-summary-negate-1': '攻辩阶段，对方始终无法回应"兼职影响学业"的核心问题。所谓78%数据来源不明，说明对方的论据缺乏说服力。',
  'attack-summary-affirm-1': '我方已明确：合理兼职有益成长。反方将"过度兼职"等同于"兼职"，是以偏概全。关键在于合理安排而非因噎废食。',
  'free-affirm-1': '反方始终回避一个事实：很多学生因经济原因必须兼职。禁止兼职等于剥夺他们的生存权利。',
  'free-negate-1': '经济困难应通过助学金和奖学金解决，而非让学生牺牲学习时间。这是制度问题，不是兼职合理性的论据。',
  'free-affirm-2': '反方的助学金方案覆盖面不足40%，剩下的学生怎么办？空谈制度完善不如让学生自力更生。',
  'free-negate-2': '对方逻辑有误：制度不完善应该推动制度改革，而非让学生用学业去填补制度漏洞。',
  'free-affirm-3': '兼职不仅是经济问题，更是能力培养。简历上只有成绩没有实践，毕业即失业。',
  'free-negate-3': '实习和科研也是实践，且不影响学业。对方将"兼职"等同于"实践"，偷换了概念。',
  'free-affirm-4': '反方始终在理想层面讨论，但现实中多数学生没有好的实习机会，兼职是他们唯一的实践途径。',
  'free-negate-4': '正方将"无奈之举"美化成"最优选择"，这是典型的合理化谬误。我们应该争取更好的，而非接受次优。',
  'closing-negate-4': '综上所述，对方辩友的论据存在三大问题：数据来源不明、混淆兼职与实践、将无奈美化成选择。大学四年转瞬即逝，把时间投资在学习上，回报远超任何兼职。我方坚决认为，大学生兼职弊大于利。',
  'closing-affirm-4': '反方描绘了一幅理想图景：充足助学金、优质实习、专注学习。但现实是：助学金不够、实习门槛高、学费在涨。兼职不是无奈，而是成长。78%的雇主数据来自智联招聘2024年报告。我方坚持，大学生兼职利大于弊。',
}

/** 生成 AI 发言 */
export async function generateAISpeech(
  room: NationalDebateRoom,
  seatId: SeatId,
  phase: NationalPhase,
): Promise<string> {
  // 优先使用 mock 数据
  const mockKey = `${phase}-${seatId}`
  if (MOCK_SPEECHES[mockKey]) {
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))
    return MOCK_SPEECHES[mockKey]
  }

  // 调用 LLM 生成
  const seat = room.seats.find(s => s.seatId === seatId)
  const phaseConfig = NATIONAL_PHASES.find(p => p.phase === phase)
  const sideLabel = seat?.side === 'affirm' ? room.affirmLabel : room.negateLabel
  const positionLabel = ['一', '二', '三', '四'][seat ? seat.position - 1 : 0]

  const systemPrompt = `你是一场辩论赛的${sideLabel}方${positionLabel}辩手。请紧扣辩题，回应对方观点，语言有力，逻辑清晰。`
  const userPrompt = `辩题：${room.topic}
${room.affirmLabel}方观点：支持
${room.negateLabel}方观点：反对

当前环节：${phaseConfig?.label || phase}
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
    // 降级到 mock
  }

  return '（AI正在思考中…）让我方来回应这个问题。从实际情况来看，我方的立场是有充分依据的，我们需要从多个角度来审视这个问题。'
}

/** 生成评分 */
export async function generateScores(room: NationalDebateRoom): Promise<DebaterScore[]> {
  await new Promise(r => setTimeout(r, 1500))

  const scores: DebaterScore[] = room.seats.map(seat => {
    const mockScores: ScoreDimension = {
      logic: 6 + Math.floor(Math.random() * 4),
      evidence: 5 + Math.floor(Math.random() * 4),
      rebuttal: 6 + Math.floor(Math.random() * 4),
      expression: 7 + Math.floor(Math.random() * 3),
    }
    return {
      seatId: seat.seatId,
      nickname: seat.nickname || 'AI辩手',
      position: seat.position,
      side: seat.side,
      scores: mockScores,
      totalScore: calculateTotalScore(mockScores),
      comment: '论证完整，表达清晰，有较好的临场应变能力。',
    }
  })

  return scores
}

/** 获取 demo 加速后的时长 */
export function getDemoDuration(originalDuration: number): number {
  return Math.round(originalDuration * DEMO_SPEED_MULTIPLIER)
}
