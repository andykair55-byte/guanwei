/**
 * 圆桌局 Service v2 — 房间模式
 * 5 辩席 + 10 观战席，人 AI 混搭，自定义辩题 + AI 审核
 */

import { ALL_CHARACTERS, getCharacter } from './characters'

// ===== Types =====

export type SeatType = 'human' | 'ai' | 'empty'

export interface DebateSeat {
  index: number          // 0-4
  type: SeatType
  characterId?: string   // AI 角色 id（type=ai 时）
  playerName?: string    // 人类玩家名（type=human 时）
  isOwner?: boolean      // 房主
}

export interface SpectatorSeat {
  index: number          // 0-9
  name: string
  isUser?: boolean       // 当前用户（观战中）
}

export interface DebateRoom {
  roomId: string
  topic: string
  topicStatus: 'pending' | 'approved' | 'rejected'
  topicRejectReason?: string
  debateSeats: DebateSeat[]
  spectatorSeats: SpectatorSeat[]
  maxDebaters: 5
  maxSpectators: 10
  status: 'waiting' | 'debating' | 'ended'
}

// ===== Topic Moderation (mock) =====

const RED_LINES = [
  '国家领导人', '分裂', '台独', '港独', '暴恐',
  '种族歧视', '性别歧视', '宗教极端',
]

export function moderateTopic(topic: string): { approved: boolean; reason?: string } {
  const lower = topic.toLowerCase()
  for (const line of RED_LINES) {
    if (lower.includes(line.toLowerCase())) {
      return { approved: false, reason: `涉及敏感话题「${line}」，请修改辩题` }
    }
  }
  if (topic.length < 4) {
    return { approved: false, reason: '辩题太短了，至少 4 个字' }
  }
  if (topic.length > 50) {
    return { approved: false, reason: '辩题太长了，最多 50 字' }
  }
  return { approved: true }
}

// ===== Mock Room Data =====

export function createMockRoom(): DebateRoom {
  return {
    roomId: 'room-001',
    topic: '短视频正在毁掉年轻人的深度思考能力',
    topicStatus: 'approved',
    debateSeats: [
      { index: 0, type: 'ai', characterId: 'baize', playerName: undefined, isOwner: true },
      { index: 1, type: 'ai', characterId: 'xiezhi' },
      { index: 2, type: 'human', playerName: '你', isOwner: false },
      { index: 3, type: 'ai', characterId: 'zhulong' },
      { index: 4, type: 'ai', characterId: 'qiongqi' },
    ],
    spectatorSeats: [
      { index: 0, name: '吃瓜群众A' },
      { index: 1, name: '逻辑怪' },
      { index: 2, name: '吃瓜群众B' },
      { index: 3, name: '你', isUser: true },
      { index: 4, name: '潜水员' },
    ],
    maxDebaters: 5,
    maxSpectators: 10,
    status: 'waiting',
  }
}

// ===== Seat Helpers =====

export function getSeatDisplayName(seat: DebateSeat): string {
  if (seat.type === 'human') return seat.playerName || '玩家'
  if (seat.type === 'ai' && seat.characterId) return getCharacter(seat.characterId).name
  return '空位'
}

export function getSeatDisplayEmoji(seat: DebateSeat): string {
  if (seat.type === 'human') return '你'
  if (seat.type === 'ai' && seat.characterId) return getCharacter(seat.characterId).name
  return '空'
}

export function canStartDebate(room: DebateRoom): boolean {
  const activeDebaters = room.debateSeats.filter(s => s.type !== 'empty')
  return activeDebaters.length >= 2 && room.topicStatus === 'approved'
}

export { ALL_CHARACTERS }
