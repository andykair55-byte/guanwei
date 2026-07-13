// src/types/nationalDebate.ts

/** 国赛环节 */
export type NationalPhase =
  | 'opening'
  | 'attack'
  | 'attack-summary'
  | 'free'
  | 'closing'
  | 'scoring'
  | 'summary'
  | 'ended'

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

/** 评分维度 */
export interface ScoreDimension {
  logic: number
  evidence: number
  rebuttal: number
  expression: number
}

/** 辩手评分 */
export interface DebaterScore {
  seatId: SeatId
  nickname: string
  position: DebatePosition
  side: DebateSide
  scores: ScoreDimension
  totalScore: number
  comment: string
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
  scores: DebaterScore[]
  winner: DebateSide | 'draw' | null
  mvpSeatId: SeatId | null
  createdAt: string
}

/** 环节配置 */
export interface PhaseConfig {
  phase: NationalPhase
  label: string
  duration: number
  charLimit: number
  order: SeatId[]
  description: string
}

/** 国赛流程配置 */
export const NATIONAL_PHASES: PhaseConfig[] = [
  {
    phase: 'opening',
    label: '开篇立论',
    duration: 180,
    charLimit: 400,
    order: ['affirm-1', 'negate-1'],
    description: '正方一辩 → 反方一辩，各 3 分钟',
  },
  {
    phase: 'attack',
    label: '攻辩环节',
    duration: 90,
    charLimit: 200,
    order: ['negate-2', 'affirm-2', 'negate-3', 'affirm-3'],
    description: '反方二辩质询正方一辩 → 正方二辩质询反方一辩 → 反方三辩质询正方二辩 → 正方三辩质询反方二辩',
  },
  {
    phase: 'attack-summary',
    label: '攻辩小结',
    duration: 90,
    charLimit: 200,
    order: ['negate-1', 'affirm-1'],
    description: '反方一辩 → 正方一辩，各 1.5 分钟',
  },
  {
    phase: 'free',
    label: '自由辩论',
    duration: 240,
    charLimit: 150,
    order: ['affirm-1', 'negate-1', 'affirm-2', 'negate-2', 'affirm-3', 'negate-3', 'affirm-4', 'negate-4'],
    description: '正方先发言，双方交替，各 4 分钟',
  },
  {
    phase: 'closing',
    label: '总结陈词',
    duration: 210,
    charLimit: 500,
    order: ['negate-4', 'affirm-4'],
    description: '反方四辩 → 正方四辩，各 3.5 分钟',
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
    'scoring': '评分中',
    'summary': '总结展示',
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
