// src/types/nationalDebate.ts
// 真实 4v4 国赛辩论机制类型定义

/** 国赛环节：严格按华语辩论世锦赛赛制 */
export type NationalPhase =
  | 'opening'       // 开篇立论
  | 'attack'        // 攻辩环节（质询）
  | 'attack-summary'// 攻辩小结
  | 'free'          // 自由辩论
  | 'closing'       // 总结陈词
  | 'judging'       // 评委评议
  | 'ended'         // 已结束

/** 辩位 */
export type DebatePosition = 1 | 2 | 3 | 4

/** 辩论方 */
export type DebateSide = 'affirm' | 'negate'

/** 席位标识 */
export type SeatId = `${DebateSide}-${DebatePosition}`

/** 席位状态 */
export type SeatStatus = 'human' | 'ai' | 'empty'

/** 国赛席位 */
export interface NationalSeat {
  seatId: SeatId
  side: DebateSide
  position: DebatePosition
  status: SeatStatus
  userId?: string
  nickname?: string
  avatar?: string
  isOwner?: boolean
}

/** 国赛发言 */
export interface NationalSpeech {
  id: string
  seatId: SeatId
  side: DebateSide
  position: DebatePosition
  nickname: string
  avatar: string
  phase: NationalPhase
  content: string
  charLimit: number
  duration: number
  isAI: boolean
  createdAt: string
}

/** 评分维度：真实辩论赛四维度 */
export interface ScoreDimension {
  logic: number      // 逻辑论证 30%
  evidence: number   // 论据资料 25%
  rebuttal: number   // 反驳攻防 25%
  expression: number // 语言表达 20%
}

/** 单评委对某位辩手的评分 */
export interface JudgeSeatScore {
  judgeId: string
  seatId: SeatId
  side: DebateSide
  position: DebatePosition
  nickname: string
  scores: ScoreDimension
  totalScore: number
  comment: string
}

/** 评委 */
export interface Judge {
  id: string
  name: string
  title: string
  avatar: string
  bio: string
}

/** 辩手评分汇总 */
export interface DebaterScore {
  seatId: SeatId
  nickname: string
  position: DebatePosition
  side: DebateSide
  avgScores: ScoreDimension
  totalScore: number
  judgeComments: { judgeId: string; judgeName: string; comment: string }[]
}

/** 国赛房间 */
export interface NationalDebateRoom {
  id: string
  topic: string
  affirmLabel: string
  negateLabel: string
  status: NationalPhase
  seats: NationalSeat[]
  speeches: NationalSpeech[]
  judges: Judge[]
  judgeScores: JudgeSeatScore[]
  finalScores: DebaterScore[]
  winner: DebateSide | 'draw' | null
  mvpSeatId: SeatId | null
  spectators: number
  waitingPlayers: number
  createdAt: string
}

/** 环节配置 */
export interface PhaseConfig {
  phase: NationalPhase
  label: string
  duration: number      // 单位：秒
  charLimit: number
  order: SeatId[]
  description: string
  rules: string
}

/** 国赛流程配置：华语辩论世锦赛标准 4v4 赛制 */
export const NATIONAL_PHASES: PhaseConfig[] = [
  {
    phase: 'opening',
    label: '开篇立论',
    duration: 180,
    charLimit: 400,
    order: ['affirm-1', 'negate-1'],
    description: '正反方一辩依次进行开篇立论',
    rules: '各 3 分钟，需清晰阐述我方立场、标准及核心论点',
  },
  {
    phase: 'attack',
    label: '攻辩环节',
    duration: 90,
    charLimit: 200,
    order: ['negate-2', 'affirm-1', 'affirm-2', 'negate-1', 'negate-3', 'affirm-2', 'affirm-3', 'negate-2'],
    description: '反方二辩 → 正方一辩；正方二辩 → 反方一辩；反方三辩 → 正方二辩；正方三辩 → 反方二辩',
    rules: '提问方时间 30 秒，回答方时间 60 秒。提问方有权打断，回答方只能回答',
  },
  {
    phase: 'attack-summary',
    label: '攻辩小结',
    duration: 90,
    charLimit: 250,
    order: ['negate-1', 'affirm-1'],
    description: '反方一辩 → 正方一辩',
    rules: '各 1.5 分钟，总结攻辩阶段交锋结果，不可引入新论点',
  },
  {
    phase: 'free',
    label: '自由辩论',
    duration: 240,
    charLimit: 150,
    order: [
      'affirm-1', 'negate-1', 'affirm-2', 'negate-2',
      'affirm-3', 'negate-3', 'affirm-4', 'negate-4',
      'affirm-1', 'negate-1', 'affirm-2', 'negate-2',
      'affirm-3', 'negate-3', 'affirm-4', 'negate-4',
    ],
    description: '正方先发言，双方交替，各 4 分钟',
    rules: '发言时间 30 秒，被打断或超时即止。一方时间耗尽后由另一方单独发言至结束',
  },
  {
    phase: 'closing',
    label: '总结陈词',
    duration: 210,
    charLimit: 500,
    order: ['negate-4', 'affirm-4'],
    description: '反方四辩 → 正方四辩',
    rules: '各 3.5 分钟，总结全场交锋，指出对方漏洞，升华我方立场',
  },
  {
    phase: 'judging',
    label: '评委评议',
    duration: 120,
    charLimit: 0,
    order: [],
    description: '三位评委独立打分并给出短评',
    rules: '评分维度：逻辑 30%、论据 25%、反驳 25%、表达 20%',
  },
]

/** 评委席 */
export const DEFAULT_JUDGES: Judge[] = [
  {
    id: 'judge-1',
    name: '陈铭',
    title: '世锦赛冠军辩手 · 武汉大学',
    avatar: 'https://picsum.photos/seed/judge-chen/80/80',
    bio: '注重逻辑链完整性与攻防推进',
  },
  {
    id: 'judge-2',
    name: '詹青云',
    title: '哈佛博士 · 华语辩论世界杯冠军',
    avatar: 'https://picsum.photos/seed/judge-zhan/80/80',
    bio: '重视价值升华与论点亮度',
  },
  {
    id: 'judge-3',
    name: '周玄毅',
    title: '哲学博士 · 国际辩论赛评委',
    avatar: 'https://picsum.photos/seed/judge-zhou/80/80',
    bio: '关注论证密度与反驳精准度',
  },
]

/** Demo 模式加速倍率 */
export const DEMO_SPEED_MULTIPLIER = 0.15

/** 获取环节中文名 */
export function getPhaseLabel(phase: NationalPhase): string {
  const map: Record<NationalPhase, string> = {
    'opening': '开篇立论',
    'attack': '攻辩环节',
    'attack-summary': '攻辩小结',
    'free': '自由辩论',
    'closing': '总结陈词',
    'judging': '评委评议',
    'ended': '已结束',
  }
  return map[phase]
}

/** 获取辩位中文名 */
export function getPositionLabel(position: DebatePosition): string {
  return `${['一', '二', '三', '四'][position - 1]}辩`
}

/** 计算总分 */
export function calculateTotalScore(scores: ScoreDimension): number {
  return Math.round(
    scores.logic * 0.3 +
    scores.evidence * 0.25 +
    scores.rebuttal * 0.25 +
    scores.expression * 0.2
  )
}

/** 汇总三位评委分数为最终辩手分数 */
export function aggregateScores(
  judgeScores: JudgeSeatScore[],
  seats: NationalSeat[],
): DebaterScore[] {
  const grouped = new Map<SeatId, JudgeSeatScore[]>()
  for (const js of judgeScores) {
    const arr = grouped.get(js.seatId) || []
    arr.push(js)
    grouped.set(js.seatId, arr)
  }

  return seats
    .filter(s => s.status !== 'empty')
    .map(seat => {
      const scores = grouped.get(seat.seatId) || []
      const avg: ScoreDimension = scores.length
        ? {
            logic: Math.round(scores.reduce((s, x) => s + x.scores.logic, 0) / scores.length),
            evidence: Math.round(scores.reduce((s, x) => s + x.scores.evidence, 0) / scores.length),
            rebuttal: Math.round(scores.reduce((s, x) => s + x.scores.rebuttal, 0) / scores.length),
            expression: Math.round(scores.reduce((s, x) => s + x.scores.expression, 0) / scores.length),
          }
        : { logic: 0, evidence: 0, rebuttal: 0, expression: 0 }

      return {
        seatId: seat.seatId,
        nickname: seat.nickname || '未知辩手',
        position: seat.position,
        side: seat.side,
        avgScores: avg,
        totalScore: calculateTotalScore(avg),
        judgeComments: scores.map(s => ({
          judgeId: s.judgeId,
          judgeName: DEFAULT_JUDGES.find(j => j.id === s.judgeId)?.name || '评委',
          comment: s.comment,
        })),
      }
    })
}

/** 计算双方总分 */
export function calculateSideTotal(scores: DebaterScore[], side: DebateSide): number {
  return scores.filter(s => s.side === side).reduce((sum, s) => sum + s.totalScore, 0)
}

/** 判定胜负 */
export function determineWinner(scores: DebaterScore[]): DebateSide | 'draw' {
  const affirm = calculateSideTotal(scores, 'affirm')
  const negate = calculateSideTotal(scores, 'negate')
  if (affirm > negate) return 'affirm'
  if (negate > affirm) return 'negate'
  return 'draw'
}

/** 判定 MVP */
export function determineMVP(scores: DebaterScore[]): SeatId | null {
  if (scores.length === 0) return null
  return scores.reduce((max, s) => (s.totalScore > max.totalScore ? s : max), scores[0]).seatId
}
