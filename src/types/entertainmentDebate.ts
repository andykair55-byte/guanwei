// src/types/entertainmentDebate.ts
// 娱乐辩论：6人独立麦位，无阵营对抗

/** 麦位状态 */
export type MicStatus = 'empty' | 'speaking' | 'idle'

/** 麦位（6个独立个体，无阵营） */
export interface MicSeat {
  index: number          // 0-5
  status: MicStatus
  userId?: string
  nickname?: string
  avatar?: string
  isAI: boolean
  score: number           // 认可度积分
  totalLikes: number      // 累计获赞
  speakCount: number      // 发言次数
}

/** 排队队列条目 */
export interface QueueEntry {
  id: string
  userId: string
  nickname: string
  avatar: string
  opinion: string         // 提交的观点
  queuedAt: string
  isAI: boolean
}

/** AI 评分结果 */
export interface SpeechScore {
  seriousness: number     // 认真度 0-10
  information: number     // 信息量 0-10
  total: number           // 加权总分
  comment: string         // AI 短评
}

/** 单条发言 */
export interface EntSpeech {
  id: string
  seatIndex: number
  nickname: string
  avatar: string
  content: string
  duration: number        // 发言时长(秒)
  score: SpeechScore
  likes: number
  isAI: boolean
  isHighlight: boolean    // 是否高光发言(score.total >= 8)
  createdAt: string
}

/** 娱乐辩论房间 */
export interface EntRoom {
  id: string
  topic: string
  seats: MicSeat[]        // 6个麦位
  speeches: EntSpeech[]
  queue: QueueEntry[]     // 排队队列
  spectators: number
  currentSpeakerIndex: number | null
  speakTimer: number      // 当前发言剩余秒数
  status: 'waiting' | 'live' | 'ended'
  highlights: EntSpeech[]
  createdAt: string
}

/** Demo 辩题 */
export const ENT_TOPICS = [
  '短视频让年轻人更聪明还是更笨？',
  '如果有一个按钮能知道对象所有过往，你按不按？',
  '大学生该不该在朋友圈屏蔽父母？',
  'AI对象算不算精神出轨？',
  '年轻人"躺平"是清醒还是懦弱？',
  '朋友圈三天可见是自我保护还是冷漠？',
]

/** AI 昵称池 */
export const AI_NICKNAMES = [
  '逻辑怪', '吃瓜达人', '理性派', '侦探小白', '硬核玩家', '围观群众',
]

/** AI 观点模板 */
export const AI_OPINIONS = [
  '我觉得这个问题不能一概而论，需要分情况讨论。',
  '从心理学角度看，这反映了当代年轻人的焦虑感。',
  '数据不会说谎，但数据的解读可以骗人。',
  '我反对主流观点，这里面有一个被忽略的维度。',
  '这不是对错的问题，而是价值观优先级的问题。',
]

/** AI 发言模板池 */
export const AI_SPEECHES = [
  '刚才那位朋友说得有道理，但我想补充一个不同角度。很多人只看到了表面现象，却忽略了背后的结构性原因。我们不能用个例代替整体，也不能用情绪代替论证。真正的问题在于，我们如何在这个信息爆炸的时代保持独立思考的能力。',
  '我不同意"一刀切"的做法。首先，每个人的情况不同，用同一标准衡量所有人本身就是不公平的。其次，历史经验告诉我们，任何极端化的立场最终都会走向反面。我们需要的是平衡，是理性讨论的空间，而不是非黑即白的站队。',
  '让我说一个真实经历。我室友就遇到过类似情况，当时他也觉得无所谓，但半年后发现影响远比想象的大。这让我意识到，很多事情短期看是小事，长期看却是大事。所以我的建议是：做决定之前，先想想三年后的自己会不会后悔。',
  '我觉得大家忽略了一个关键点：这不是个人选择的问题，而是环境压力的问题。当所有人都在内卷的时候，你"躺平"就会被淘汰；当所有人都在焦虑的时候，你"佛系"就会被边缘化。所以与其讨论该不该，不如讨论怎么改变这个环境。',
  '换个思路想：技术本身是中性的，关键在于使用方式。刀可以切菜也可以伤人，但我们不会因此禁用刀。同理，短视频、AI这些工具，问题不在于它们本身，而在于我们如何建立健康的使用的习惯。这需要个人自律，也需要平台担责。',
]

/** Demo 加速：实际45秒 → Demo 8秒 */
export const DEMO_SPEAK_DURATION = 8

/** 续麦分数阈值 */
export const CONTINUE_THRESHOLD = 7

/** 计算加权总分 */
export function calculateScore(seriousness: number, information: number): number {
  return Math.round(seriousness * 0.5 + information * 0.5)
}
