// src/services/entertainmentDebateService.ts
// 娱乐辩论 Mock 服务：6人独立麦位

import {
  ENT_TOPICS, AI_NICKNAMES, AI_OPINIONS, AI_SPEECHES,
  DEMO_SPEAK_DURATION, calculateScore,
  type EntRoom, type MicSeat, type QueueEntry, type EntSpeech, type SpeechScore,
} from '../types/entertainmentDebate'

/** 延迟工具 */
function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms + Math.random() * 200))
}

/** 随机取数组元素 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 创建娱乐辩论房间：3个AI占位 + 3个空位 */
export function createEntRoom(topic?: string): EntRoom {
  const finalTopic = topic || pick(ENT_TOPICS)
  const seats: MicSeat[] = []

  // 前3个座位由AI占位
  for (let i = 0; i < 6; i++) {
    if (i < 3) {
      seats.push({
        index: i,
        status: i === 0 ? 'speaking' : 'idle',
        userId: `ai-${i}`,
        nickname: AI_NICKNAMES[i],
        avatar: `https://picsum.photos/seed/ent-ai-${i}/80/80`,
        isAI: true,
        score: Math.floor(Math.random() * 15) + 5,
        totalLikes: Math.floor(Math.random() * 50),
        speakCount: Math.floor(Math.random() * 3),
      })
    } else {
      seats.push({
        index: i,
        status: 'empty',
        isAI: false,
        score: 0,
        totalLikes: 0,
        speakCount: 0,
      })
    }
  }

  return {
    id: `ent-${Date.now()}`,
    topic: finalTopic,
    seats,
    speeches: [],
    queue: [],
    spectators: Math.floor(Math.random() * 60) + 20,
    currentSpeakerIndex: 0,
    speakTimer: DEMO_SPEAK_DURATION,
    status: 'live',
    highlights: [],
    createdAt: new Date().toISOString(),
  }
}

/** 生成 AI 发言 */
export async function generateAISpeech(): Promise<string> {
  await delay(600)
  return pick(AI_SPEECHES)
}

/** AI 审核观点（Demo：始终通过，模拟延迟） */
export async function reviewOpinion(opinion: string): Promise<{ passed: boolean; reason?: string }> {
  await delay(800)
  if (opinion.trim().length < 5) {
    return { passed: false, reason: '观点太短了，至少5个字哦' }
  }
  return { passed: true }
}

/** AI 评分发言（Mock：根据长度和关键词给分） */
export async function scoreSpeech(content: string): Promise<SpeechScore> {
  await delay(500)

  const length = content.length
  const hasLogic = /因为|所以|首先|其次|然而|但是|而且|因此/.test(content)
  const hasData = /数据|报告|调查显示|据统计|百分之|%\d/.test(content)
  const hasExample = /例如|比如|举个例子|我朋友|我室友|真实经历/.test(content)

  // 认真度：有逻辑词+有例子 → 高分
  let seriousness = 4
  if (hasLogic) seriousness += 2
  if (hasExample) seriousness += 2
  if (length > 100) seriousness += 1
  seriousness = Math.min(10, seriousness)

  // 信息量：有数据+长度 → 高分
  let information = 4
  if (hasData) information += 3
  if (length > 80) information += 2
  if (length > 150) information += 1
  information = Math.min(10, information)

  const total = calculateScore(seriousness, information)

  const comments = [
    '观点清晰，论证有层次。',
    '论据充分，逻辑推进到位。',
    '表达流畅，但论据可更扎实。',
    '有独立思考，角度新颖。',
    '发言偏短，可以展开论证。',
    '情绪表达到位，但理性不足。',
  ]

  return {
    seriousness,
    information,
    total,
    comment: comments[Math.floor(Math.random() * comments.length)],
  }
}

/** 生成 AI 排队条目 */
export function generateAIQueueEntry(): QueueEntry {
  const idx = Math.floor(Math.random() * AI_NICKNAMES.length)
  return {
    id: `ai-queue-${Date.now()}-${Math.random()}`,
    userId: `ai-queue-${idx}`,
    nickname: AI_NICKNAMES[idx],
    avatar: `https://picsum.photos/seed/ent-queue-${idx}/80/80`,
    opinion: pick(AI_OPINIONS),
    queuedAt: new Date().toISOString(),
    isAI: true,
  }
}

/** 创建发言记录 */
export function createSpeech(
  seatIndex: number,
  nickname: string,
  avatar: string,
  content: string,
  score: SpeechScore,
  isAI: boolean,
): EntSpeech {
  return {
    id: `speech-${Date.now()}-${Math.random()}`,
    seatIndex,
    nickname,
    avatar,
    content,
    duration: DEMO_SPEAK_DURATION,
    score,
    likes: 0,
    isAI,
    isHighlight: score.total >= 8,
    createdAt: new Date().toISOString(),
  }
}
