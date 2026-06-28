// ===== 全真人辩论场类型定义 =====

/** 房间状态 */
export type RoomStatus = 'waiting' | 'debating' | 'paused' | 'ended'

/** 辩论阶段 */
export type DebatePhase = 'early' | 'middle' | 'late' | 'final'

/** 发言类型 */
export type SpeechType = 'text' | 'voice'

/** 席位状态 */
export type SeatStatus = 'occupied' | 'vacant' | 'locked'

/** 辩论方 */
export type DebateSide = 'affirm' | 'negate'

/** 房间规则 */
export interface RoomRules {
  maxSeatsPerSide: number        // 每方最大人数，默认3
  earlyRoundCharLimit: number    // 前期字数限制 150
  middleRoundCharLimit: number   // 中期字数限制 300
  lateRoundCharLimit: number     // 后期字数限制 500
  earlyRounds: number            // 前N轮为early (2)
  middleRounds: number           // 中间N轮为middle (2)
  removalThreshold: number       // 抬走阈值 0.8 = 80%
  entryCostBase: number          // 基础入场费 30
  entryCostMultiplier: number    // 阶梯倍数 2
  roundTimeLimit: number         // 每轮限时秒数 (120)
}

/** 辩论席位 */
export interface DebateSeat {
  index: number                  // 0-5
  side: DebateSide
  status: SeatStatus
  userId?: string
  nickname?: string
  avatar?: string
  joinedAt?: string
  roundScore: number             // 个人累计得分
  removalVotes: number           // 被投抬走票数
}

/** 辩论房间 */
export interface DebateRoom {
  id: string
  topicId: string
  topic: string                  // 辩题文本
  affirmLabel: string            // e.g. "支持"
  negateLabel: string            // e.g. "反对"
  status: RoomStatus
  currentRound: number
  currentPhase: DebatePhase
  maxSeats: number               // 默认6 (3v3)
  seats: DebateSeat[]
  spectatorCount: number
  createdAt: string
  entryCostBase: number          // 基础入场费
  currentEntryCost: number       // 当前入场费（阶梯递增）
  substitutionCount: number      // 已替换次数
  rules: RoomRules
}

/** 单条发言 */
export interface DebateSpeech {
  id: string
  roomId: string
  round: number
  seatIndex: number
  userId: string
  nickname: string
  avatar: string
  side: DebateSide
  content: string                // 原始发言
  translatedContent?: string     // AI翻译后的标准中文
  speechType: SpeechType
  charLimit: number              // 当轮字数限制
  createdAt: string
}

/** 席位评分 */
export interface SeatScore {
  seatIndex: number
  userId: string
  nickname: string
  score: number                  // 0-10
  highlights: string[]
  weaknesses: string[]
}

/** 逻辑谬误检测 */
export interface FallacyDetection {
  seatIndex: number
  userId: string
  nickname: string
  fallacyType: string            // 滑坡论证/偷换概念/人身攻击/循环论证/稻草人谬误
  quote: string
  explanation: string
}

/** 回合评分 */
export interface RoundJudgment {
  round: number
  roomId: string
  seatScores: SeatScore[]
  fallacies: FallacyDetection[]
  roundWinner: DebateSide | 'draw'
  judgeComment: string
  judgedAt: string
}

/** 抬走投票 */
export interface RemovalVote {
  roomId: string
  targetSeatIndex: number
  voterUserId: string
  votedAt: string
}

/** 关键论点 */
export interface KeyArgument {
  side: DebateSide
  seatIndex: number
  nickname: string
  argument: string
}

/** 辩论总结 */
export interface DebateSummary {
  roomId: string
  topic: string
  totalRounds: number
  winner: DebateSide | 'draw'
  keyArguments: KeyArgument[]
  fallacySummary: FallacyDetection[]
  mvpUserId: string
  mvpNickname: string
  affirmTotalScore: number
  negateTotalScore: number
  generatedAt: string
}

/** 大厅房间卡片 */
export interface LobbyRoom {
  id: string
  topic: string
  affirmLabel: string
  negateLabel: string
  status: RoomStatus
  currentRound: number
  currentPhase: DebatePhase
  occupiedSeats: number
  maxSeats: number
  spectatorCount: number
  entryCost: number
  createdAt: string
}

/** AI Agent 类型 */
export type AIAgentType = 'judge' | 'translator' | 'summarizer'

// ===== 默认规则 =====
export const DEFAULT_ROOM_RULES: RoomRules = {
  maxSeatsPerSide: 3,
  earlyRoundCharLimit: 150,
  middleRoundCharLimit: 300,
  lateRoundCharLimit: 500,
  earlyRounds: 2,
  middleRounds: 2,
  removalThreshold: 0.8,
  entryCostBase: 30,
  entryCostMultiplier: 2,
  roundTimeLimit: 120,
}

// ===== 工具函数 =====

/** 计算当前入场费（阶梯递增） */
export function calculateEntryCost(baseCost: number, substitutionCount: number): number {
  return baseCost * Math.pow(2, substitutionCount)
}

/** 根据轮次获取辩论阶段 */
export function getDebatePhase(currentRound: number, rules: RoomRules): DebatePhase {
  if (currentRound <= rules.earlyRounds) return 'early'
  if (currentRound <= rules.earlyRounds + rules.middleRounds) return 'middle'
  return 'late'
}

/** 根据阶段获取字数限制 */
export function getCharLimit(phase: DebatePhase, rules: RoomRules): number {
  switch (phase) {
    case 'early': return rules.earlyRoundCharLimit
    case 'middle': return rules.middleRoundCharLimit
    case 'late':
    case 'final': return rules.lateRoundCharLimit
  }
}

/** 阶段中文名称 */
export function getPhaseLabel(phase: DebatePhase): string {
  switch (phase) {
    case 'early': return '开局阶段'
    case 'middle': return '中期阶段'
    case 'late': return '白热化'
    case 'final': return '最终回合'
  }
}

/** 房间状态中文 */
export function getRoomStatusLabel(status: RoomStatus): string {
  switch (status) {
    case 'waiting': return '等待中'
    case 'debating': return '激辩中'
    case 'paused': return '暂停'
    case 'ended': return '已结束'
  }
}
