/**
 * 辩论房间服务
 * 管理房间生命周期、入场/离场、发言、抬走投票等核心逻辑
 * Mock-first：无后端时完全可用
 */

import type {
  DebateRoom, DebateSeat, DebateSpeech, RoundJudgment, DebateSummary,
  LobbyRoom, DebateSide,
} from '../types/debate'
import { DEFAULT_ROOM_RULES, calculateEntryCost, getDebatePhase, getCharLimit } from '../types/debate'
import { judgeRound, type JudgeInput, type JudgeResult } from './aiJudgeService'
import { translateSpeech } from './aiTranslatorService'
import { generateSummary, type SummaryInput } from './aiSummaryService'

// ===== 延迟工具 =====
function delay(ms = 150): Promise<void> {
  return new Promise(r => setTimeout(r, ms + Math.random() * 100))
}

// ===== Mock 数据 =====

const MOCK_NICKNAMES = [
  '逻辑怪', '数据控', '真相猎人', '理性派', '吃瓜达人',
  '辩论新手', '老瓜农', '围观群众', '侦探小白', '硬核玩家',
]

const MOCK_TOPICS = [
  { id: 'melon-1', topic: '大学学历在AI时代还有价值吗？', affirm: '有', negate: '没有' },
  { id: 'melon-2', topic: '短视频正在摧毁深度思考能力', affirm: '是', negate: '否' },
  { id: 'melon-3', topic: '远程办公比坐班更高效', affirm: '支持', negate: '反对' },
  { id: 'melon-4', topic: '社交媒体让人更孤独', affirm: '同意', negate: '不同意' },
  { id: 'melon-5', topic: 'AI创作的作品算不算艺术', affirm: '算', negate: '不算' },
  { id: 'melon-6', topic: '网红带货是不是新型传销', affirm: '是', negate: '不是' },
  { id: 'melon-7', topic: '年轻人该不该躺平', affirm: '该', negate: '不该' },
  { id: 'melon-8', topic: '外卖平台该不该给骑手交社保', affirm: '该', negate: '不该' },
  { id: 'melon-9', topic: '明星代言翻车要不要担责', affirm: '要', negate: '不要' },
  { id: 'melon-10', topic: '算法推荐是不是在操控你的想法', affirm: '是', negate: '不是' },
]

// 通用话题模板，用于melon-10以上的动态房间
const GENERIC_TOPICS = [
  { topic: '这个瓜到底是真是假？', affirm: '真的', negate: '假的' },
  { topic: '这件事谁的责任更大？', affirm: '甲方', negate: '乙方' },
  { topic: '舆论方向对不对？', affirm: '对', negate: '不对' },
  { topic: '当事人该不该道歉？', affirm: '该', negate: '不该' },
]

const MOCK_SPEECHES_POOL = [
  '从数据来看，这个观点站不住脚。根据最新统计，超过70%的受访者持相反意见。',
  '对方辩友提到了效率问题，但忽略了质量维度。效率不等于效果。',
  '我用一个简单例子说明：如果这个论点成立，那我们是不是可以说所有传统都会被颠覆？',
  '请注意区分相关性和因果性。你提到的数据并不能直接证明你的观点。',
  '我完全不同意对方的逻辑链条。这里存在明显的滑坡论证。',
  '让我们回到问题本质。讨论这个议题的核心标准应该是什么？',
  '对方一直在回避关键问题。请问你如何解释这个反例？',
  '我的论点基于三个支柱：事实、逻辑和价值观。请逐一反驳。',
  '这个观点太片面了。你只看到了好处，完全忽视了代价。',
  '历史已经多次证明，类似的论断最终都被推翻了。',
  '我建议对方辩友先搞清楚定义再讨论。我们现在说的是一回事吗？',
  '从实践角度来看，理论再完美，落地才是关键。',
]

// ===== 内存状态 =====

let roomsCache: DebateRoom[] = []
let speechesCache: Map<string, DebateSpeech[]> = new Map()
let judgmentsCache: Map<string, RoundJudgment[]> = new Map()
let summaryCache: Map<string, DebateSummary> = new Map()
let initialized = false

function generateMockSeats(_topic: typeof MOCK_TOPICS[0], status: 'waiting' | 'debating' | 'ended'): DebateSeat[] {
  const seats: DebateSeat[] = []
  const sides: DebateSide[] = ['affirm', 'negate']

  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < 3; i++) {
      const idx = s * 3 + i
      const isOccupied = status === 'debating' || (status === 'waiting' && i < 2)
      seats.push({
        index: idx,
        side: sides[s],
        status: isOccupied ? 'occupied' : 'vacant',
        userId: isOccupied ? `mock-u-${idx}` : undefined,
        nickname: isOccupied ? MOCK_NICKNAMES[idx % MOCK_NICKNAMES.length] : undefined,
        avatar: isOccupied ? `https://picsum.photos/seed/debater-${idx}/80/80` : undefined,
        joinedAt: isOccupied ? new Date(Date.now() - Math.random() * 3600000).toISOString() : undefined,
        roundScore: status === 'debating' ? Math.floor(Math.random() * 20) + 5 : 0,
        removalVotes: 0,
      })
    }
  }
  return seats
}

function initMockRooms() {
  if (initialized) return
  initialized = true

  roomsCache = MOCK_TOPICS.map((t, i) => {
    const statuses: ('waiting' | 'debating' | 'ended')[] = ['debating', 'debating', 'waiting', 'debating', 'ended', 'debating', 'waiting', 'debating', 'debating', 'ended']
    const status = statuses[i] || (i % 3 === 0 ? 'debating' : 'waiting')
    const round = status === 'debating' ? (i % 3) + 2 : status === 'ended' ? 6 : 0
    const phase = getDebatePhase(round, DEFAULT_ROOM_RULES)

    return {
      id: `room-${t.id}`,
      topicId: t.id,
      topic: t.topic,
      affirmLabel: t.affirm,
      negateLabel: t.negate,
      status: status as DebateRoom['status'],
      currentRound: round,
      currentPhase: phase,
      maxSeats: 6,
      seats: generateMockSeats(t, status),
      spectatorCount: Math.floor(Math.random() * 500) + 50,
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
      entryCostBase: 30,
      currentEntryCost: status === 'debating' && i % 2 === 1 ? 60 : 30,
      substitutionCount: status === 'debating' && i % 2 === 1 ? 1 : 0,
      rules: { ...DEFAULT_ROOM_RULES },
    }
  })

  // 为debating状态的房间生成mock发言
  roomsCache.filter(r => r.status === 'debating').forEach(room => {
    generateMockSpeechesForRoom(room)
  })
}

function generateMockSpeechesForRoom(room: DebateRoom) {
  const speeches: DebateSpeech[] = []
  for (let round = 1; round <= room.currentRound; round++) {
    const phase = getDebatePhase(round, room.rules)
    const charLimit = getCharLimit(phase, room.rules)
    const occupiedSeats = room.seats.filter(s => s.status === 'occupied')

    occupiedSeats.forEach((seat, si) => {
      speeches.push({
        id: `${room.id}-r${round}-s${seat.index}`,
        roomId: room.id,
        round,
        seatIndex: seat.index,
        userId: seat.userId!,
        nickname: seat.nickname!,
        avatar: seat.avatar!,
        side: seat.side,
        content: MOCK_SPEECHES_POOL[(round * 3 + si) % MOCK_SPEECHES_POOL.length],
        translatedContent: null as any,
        speechType: 'text',
        charLimit,
        createdAt: new Date(Date.now() - (room.currentRound - round) * 300000 - si * 60000).toISOString(),
      })
    })
  }
  speechesCache.set(room.id, speeches)
}

/** 为未知melon ID动态创建房间 */
function createDynamicRoom(melonId: string, roomIdOverride?: string): DebateRoom {
  const num = parseInt(melonId.replace(/\D/g, '')) || 0
  const tpl = GENERIC_TOPICS[num % GENERIC_TOPICS.length]
  const topic = { id: melonId, topic: tpl.topic, affirm: tpl.affirm, negate: tpl.negate }

  // 根据melon ID的hash决定房间状态
  const statusRoll = num % 5
  const status: ('waiting' | 'debating' | 'ended') = statusRoll < 3 ? 'debating' : statusRoll === 3 ? 'waiting' : 'ended'
  const round = status === 'debating' ? (num % 3) + 1 : status === 'ended' ? 6 : 0
  const phase = getDebatePhase(round, DEFAULT_ROOM_RULES)

  const room: DebateRoom = {
    id: roomIdOverride || `room-${melonId}`,
    topicId: melonId,
    topic: tpl.topic,
    affirmLabel: tpl.affirm,
    negateLabel: tpl.negate,
    status,
    currentRound: round,
    currentPhase: phase,
    maxSeats: 6,
    seats: generateMockSeats(topic, status),
    spectatorCount: Math.floor(Math.random() * 300) + 20,
    createdAt: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(),
    entryCostBase: 30,
    currentEntryCost: 30,
    substitutionCount: 0,
    rules: { ...DEFAULT_ROOM_RULES },
  }

  roomsCache.push(room)
  if (status === 'debating') {
    generateMockSpeechesForRoom(room)
  } else {
    speechesCache.set(room.id, [])
  }
  judgmentsCache.set(room.id, [])

  return room
}

// ===== Mock API =====

function toLobbyRoom(room: DebateRoom): LobbyRoom {
  return {
    id: room.id,
    topic: room.topic,
    affirmLabel: room.affirmLabel,
    negateLabel: room.negateLabel,
    status: room.status,
    currentRound: room.currentRound,
    currentPhase: room.currentPhase,
    occupiedSeats: room.seats.filter(s => s.status === 'occupied').length,
    maxSeats: room.maxSeats,
    spectatorCount: room.spectatorCount,
    entryCost: room.currentEntryCost,
    createdAt: room.createdAt,
  }
}

export const debateRoomService = {
  /** 获取大厅房间列表 */
  async getRooms(): Promise<LobbyRoom[]> {
    initMockRooms()
    await delay(200)
    return roomsCache.map(toLobbyRoom)
  },

  /** 获取房间详情 — 不存在时动态创建 */
  async getRoom(roomId: string): Promise<DebateRoom | null> {
    initMockRooms()
    await delay(100)
    const existing = roomsCache.find(r => r.id === roomId)
    if (existing) return existing

    // 从 room-melon-X 中提取 melon-X，动态创建
    if (roomId.startsWith('room-melon-')) {
      const melonId = roomId.replace('room-', '')
      return createDynamicRoom(melonId)
    }

    // 从 room-X 中提取 X，动态创建（MelonFieldPage 导航用）
    if (roomId.startsWith('room-')) {
      const num = roomId.replace('room-', '')
      return createDynamicRoom(`melon-${num}`, roomId)
    }

    return null
  },

  /** 创建房间 */
  async createRoom(topic: string, affirmLabel: string, negateLabel: string): Promise<DebateRoom> {
    initMockRooms()
    await delay(400)
    const room: DebateRoom = {
      id: `room-new-${Date.now()}`,
      topicId: `custom-${Date.now()}`,
      topic,
      affirmLabel,
      negateLabel,
      status: 'waiting',
      currentRound: 0,
      currentPhase: 'early',
      maxSeats: 6,
      seats: Array.from({ length: 6 }, (_, i) => ({
        index: i,
        side: (i < 3 ? 'affirm' : 'negate') as DebateSide,
        status: 'vacant' as const,
        roundScore: 0,
        removalVotes: 0,
      })),
      spectatorCount: 0,
      createdAt: new Date().toISOString(),
      entryCostBase: 30,
      currentEntryCost: 30,
      substitutionCount: 0,
      rules: { ...DEFAULT_ROOM_RULES },
    }
    roomsCache.unshift(room)
    speechesCache.set(room.id, [])
    judgmentsCache.set(room.id, [])
    return room
  },

  /** 加入房间（占座） */
  async joinRoom(roomId: string, userId: string, nickname: string, avatar: string): Promise<{ room: DebateRoom; seatIndex: number } | null> {
    initMockRooms()
    await delay(300)
    const room = roomsCache.find(r => r.id === roomId)
    if (!room) return null

    // 找空位
    const vacantSeat = room.seats.find(s => s.status === 'vacant')
    if (!vacantSeat) return null

    // 更新席位
    vacantSeat.status = 'occupied'
    vacantSeat.userId = userId
    vacantSeat.nickname = nickname
    vacantSeat.avatar = avatar
    vacantSeat.joinedAt = new Date().toISOString()

    // 如果房间在等待且现在每方至少有1人，检查是否可以开始
    // (实际开始由前端控制)

    return { room: { ...room }, seatIndex: vacantSeat.index }
  },

  /** 离开房间 */
  async leaveRoom(roomId: string, userId: string): Promise<DebateRoom | null> {
    initMockRooms()
    await delay(200)
    const room = roomsCache.find(r => r.id === roomId)
    if (!room) return null

    const seat = room.seats.find(s => s.userId === userId)
    if (seat) {
      seat.status = 'vacant'
      seat.userId = undefined
      seat.nickname = undefined
      seat.avatar = undefined
      seat.joinedAt = undefined
      seat.roundScore = 0
    }

    return { ...room }
  },

  /** 提交发言 */
  async submitSpeech(
    roomId: string,
    userId: string,
    nickname: string,
    avatar: string,
    content: string,
  ): Promise<{ speech: DebateSpeech; translation: string | null } | null> {
    initMockRooms()
    await delay(200)
    const room = roomsCache.find(r => r.id === roomId)
    if (!room) return null

    const seat = room.seats.find(s => s.userId === userId)
    if (!seat) return null

    const charLimit = getCharLimit(room.currentPhase, room.rules)
    if (content.length > charLimit) return null

    const speech: DebateSpeech = {
      id: `sp-${Date.now()}`,
      roomId,
      round: room.currentRound,
      seatIndex: seat.index,
      userId,
      nickname,
      avatar,
      side: seat.side,
      content,
      speechType: 'text',
      charLimit,
      createdAt: new Date().toISOString(),
    }

    // 存储发言
    const speeches = speechesCache.get(roomId) || []
    speeches.push(speech)
    speechesCache.set(roomId, speeches)

    // AI翻译
    let translation: string | null = null
    try {
      translation = await translateSpeech(content)
      speech.translatedContent = translation || undefined
    } catch {
      // 翻译失败不影响发言
    }

    return { speech, translation }
  },

  /** 获取发言历史 */
  async getSpeeches(roomId: string): Promise<DebateSpeech[]> {
    initMockRooms()
    await delay(150)
    return speechesCache.get(roomId) || []
  },

  /** 开始新一轮 */
  async startNewRound(roomId: string): Promise<{ room: DebateRoom; judgment: RoundJudgment | null }> {
    initMockRooms()
    await delay(200)
    const room = roomsCache.find(r => r.id === roomId)
    if (!room) return { room: null as any, judgment: null }

    // 如果当前轮有发言，先评分
    let judgment: RoundJudgment | null = null
    const speeches = speechesCache.get(roomId) || []
    const currentRoundSpeeches = speeches.filter(s => s.round === room.currentRound)

    if (currentRoundSpeeches.length > 0 && room.currentRound > 0) {
      const judgeInput: JudgeInput = {
        topic: room.topic,
        affirmLabel: room.affirmLabel,
        negateLabel: room.negateLabel,
        round: room.currentRound,
        speeches: currentRoundSpeeches.map(s => ({
          seatIndex: s.seatIndex,
          nickname: s.nickname,
          side: s.side,
          content: s.content,
        })),
      }

      const result: JudgeResult = await judgeRound(judgeInput)

      judgment = {
        round: room.currentRound,
        roomId,
        seatScores: result.seatScores.map(ss => ({
          ...ss,
          userId: room.seats.find(s => s.index === ss.seatIndex)?.userId || '',
          nickname: room.seats.find(s => s.index === ss.seatIndex)?.nickname || '',
        })),
        fallacies: result.fallacies.map(f => ({
          ...f,
          userId: room.seats.find(s => s.index === f.seatIndex)?.userId || '',
          nickname: room.seats.find(s => s.index === f.seatIndex)?.nickname || '',
        })),
        roundWinner: result.roundWinner,
        judgeComment: result.judgeComment,
        judgedAt: new Date().toISOString(),
      }

      // 更新个人得分
      result.seatScores.forEach(ss => {
        const seat = room.seats.find(s => s.index === ss.seatIndex)
        if (seat) seat.roundScore += ss.score
      })

      // 存储评分
      const judgments = judgmentsCache.get(roomId) || []
      judgments.push(judgment!)
      judgmentsCache.set(roomId, judgments)
    }

    // 推进轮次
    room.currentRound++
    room.currentPhase = getDebatePhase(room.currentRound, room.rules)

    // 检查是否达到最大轮次（比如6轮结束）
    if (room.currentRound > 6) {
      room.status = 'ended'
    } else {
      room.status = 'debating'
    }

    return { room: { ...room }, judgment }
  },

  /** 投抬走票 */
  async castRemovalVote(roomId: string, _voterUserId: string, targetSeatIndex: number): Promise<{ removed: boolean; room: DebateRoom }> {
    initMockRooms()
    await delay(200)
    const room = roomsCache.find(r => r.id === roomId)
    if (!room) return { removed: false, room: null as any }

    const targetSeat = room.seats.find(s => s.index === targetSeatIndex)
    if (!targetSeat || targetSeat.status !== 'occupied') return { removed: false, room: { ...room } }

    targetSeat.removalVotes++

    // 计算阈值：80%的在场辩手
    const onStageCount = room.seats.filter(s => s.status === 'occupied').length
    const threshold = Math.ceil(onStageCount * room.rules.removalThreshold)

    if (targetSeat.removalVotes >= threshold) {
      // 抬走！
      targetSeat.status = 'vacant'
      targetSeat.userId = undefined
      targetSeat.nickname = undefined
      targetSeat.avatar = undefined
      targetSeat.removalVotes = 0

      // 阶梯递增入场费
      room.substitutionCount++
      room.currentEntryCost = calculateEntryCost(room.entryCostBase, room.substitutionCount)

      return { removed: true, room: { ...room } }
    }

    return { removed: false, room: { ...room } }
  },

  /** 请求辩论总结 */
  async requestSummary(roomId: string): Promise<DebateSummary | null> {
    initMockRooms()
    const room = roomsCache.find(r => r.id === roomId)
    if (!room) return null

    // 检查缓存
    if (summaryCache.has(roomId)) return summaryCache.get(roomId)!

    const speeches = speechesCache.get(roomId) || []
    const judgments = judgmentsCache.get(roomId) || []

    const input: SummaryInput = {
      topic: room.topic,
      affirmLabel: room.affirmLabel,
      negateLabel: room.negateLabel,
      totalRounds: room.currentRound,
      allSpeeches: speeches.map(s => ({
        round: s.round,
        seatIndex: s.seatIndex,
        nickname: s.nickname,
        side: s.side,
        content: s.content,
      })),
      allJudgments: judgments.map(j => ({
        round: j.round,
        seatScores: j.seatScores.map(ss => ({
          seatIndex: ss.seatIndex,
          nickname: ss.nickname,
          score: ss.score,
        })),
        roundWinner: j.roundWinner,
      })),
    }

    const result = await generateSummary(input)

    const summary: DebateSummary = {
      roomId,
      topic: room.topic,
      totalRounds: room.currentRound,
      winner: result.winner,
      keyArguments: result.keyArguments,
      fallacySummary: [],
      mvpUserId: result.mvpUserId,
      mvpNickname: result.mvpNickname,
      affirmTotalScore: result.affirmTotalScore,
      negateTotalScore: result.negateTotalScore,
      generatedAt: new Date().toISOString(),
    }

    summaryCache.set(roomId, summary)
    room.status = 'ended'

    return summary
  },

  /** 获取回合评分 */
  async getJudgments(roomId: string): Promise<RoundJudgment[]> {
    initMockRooms()
    await delay(100)
    return judgmentsCache.get(roomId) || []
  },
}
