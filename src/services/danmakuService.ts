/**
 * 弹幕系统 — 数据池 + 触发逻辑
 * 预写弹幕按事件类型分类，部分绑定角色增加辨识度
 */

// ===== Types =====

export type DanmakuTrigger = 'speech' | 'highlight' | 'taunt' | 'score-upset' | 'closing'

export interface DanmakuTemplate {
  text: string
  emoji?: string
  side?: 'affirm' | 'negate' | 'neutral'
  intensity: 1 | 2 | 3
  /** 绑定特定角色才出现（undefined = 通用） */
  characterBind?: string
}

export interface DanmakuQueueItem {
  id: string
  text: string
  emoji?: string
  side: 'affirm' | 'negate' | 'neutral'
  intensity: 1 | 2 | 3
  track: number       // 0-3 轨道
  delay: number       // 发射延迟 ms
  duration: number    // 飞行时长 s
}

// ===== 弹幕数据池 =====

const SPEECH_POOL: DanmakuTemplate[] = [
  // 通用反应
  { text: '说得有道理', intensity: 1 },
  { text: '这逻辑有点东西', intensity: 1 },
  { text: '不太信服', intensity: 1 },
  { text: '有点意思', intensity: 1 },
  { text: '继续说', intensity: 1 },
  { text: '嗯？这个角度没想到', intensity: 1 },
  { text: '说服力一般', side: 'neutral', intensity: 1 },
  { text: '我倾向于正方', side: 'affirm', intensity: 1 },
  { text: '反方加油', side: 'negate', intensity: 1 },
  { text: '双方都有道理', intensity: 1 },
  { text: '这轮我站正方', side: 'affirm', intensity: 2 },
  { text: '反方这波可以', side: 'negate', intensity: 2 },
  { text: '等等让我想想', intensity: 1 },
  { text: '好家伙', intensity: 2 },
  { text: '有点狠', intensity: 2 },
  // 白泽数据梗
  { text: '白泽又甩数据了', characterBind: 'baize', intensity: 1 },
  { text: '数据党上线', characterBind: 'baize', intensity: 1 },
  // 獬豸逻辑梗
  { text: '獬豸开始拆逻辑了', characterBind: 'xiezhi', intensity: 1 },
  { text: '逻辑猎手名不虚传', characterBind: 'xiezhi', intensity: 2 },
  // 烛龙故事梗
  { text: '烛龙又要讲故事了', characterBind: 'zhulong', intensity: 1 },
  { text: '这比喻绝了', characterBind: 'zhulong', intensity: 2 },
  // 穷奇毒舌梗
  { text: '穷奇开始毒舌了', characterBind: 'qiongqi', intensity: 1 },
  { text: '这嘴太损了', characterBind: 'qiongqi', intensity: 2 },
]

const HIGHLIGHT_POOL: DanmakuTemplate[] = [
  { text: '卧槽绝了', intensity: 3 },
  { text: '逻辑炸弹', intensity: 3 },
  { text: '这波封神', intensity: 3 },
  { text: '太强了', intensity: 2 },
  { text: '全场最佳', intensity: 3 },
  { text: '我鸡皮疙瘩起来了', intensity: 2 },
  { text: '这段可以反复看', intensity: 2 },
  { text: '名场面！', intensity: 3 },
  { text: '直接封神', intensity: 3 },
  { text: '绝杀', intensity: 3 },
  { text: '这谁顶得住', intensity: 2 },
  { text: '太炸了', intensity: 3 },
  { text: '数据碾压', characterBind: 'baize', intensity: 3 },
  { text: '逻辑链完美', characterBind: 'xiezhi', intensity: 3 },
  { text: '故事杀', characterBind: 'zhulong', intensity: 3 },
]

const TAUNT_POOL: DanmakuTemplate[] = [
  { text: '哈哈哈太损了', intensity: 2 },
  { text: '这脸打的', intensity: 2 },
  { text: '嘲讽拉满', intensity: 2 },
  { text: '火药味来了', intensity: 2 },
  { text: '开始人身攻击了（bushi', intensity: 2 },
  { text: '好家伙不留情面', intensity: 2 },
  { text: '这嘴比刀快', intensity: 3 },
  { text: '对面沉默了', intensity: 2 },
  { text: '杀人诛心', intensity: 3 },
  { text: '毒舌本舌', characterBind: 'qiongqi', intensity: 3 },
]

const SCORE_UPSET_POOL: DanmakuTemplate[] = [
  { text: '翻盘了！', intensity: 3 },
  { text: '裁判有眼力', intensity: 2 },
  { text: '这分给的我服', intensity: 2 },
  { text: '居然反转了', intensity: 3 },
  { text: '比分咬住了', intensity: 2 },
  { text: '悬念来了', intensity: 2 },
  { text: '紧张起来了', intensity: 2 },
  { text: '谁赢真不好说', intensity: 2 },
  { text: '五五开了', intensity: 2 },
  { text: '绝处逢生', intensity: 3 },
]

const CLOSING_POOL: DanmakuTemplate[] = [
  { text: '服了服了', intensity: 2 },
  { text: '再来一局', intensity: 2 },
  { text: '太精彩了', intensity: 2 },
  { text: '意犹未尽', intensity: 2 },
  { text: '这场值得回放', intensity: 2 },
  { text: '双方都强', intensity: 2 },
  { text: '看完舒服了', intensity: 1 },
  { text: '下次还来', intensity: 1 },
  { text: '神仙打架', intensity: 3 },
  { text: '这辩题太好了', intensity: 1 },
]

const POOLS: Record<DanmakuTrigger, DanmakuTemplate[]> = {
  speech: SPEECH_POOL,
  highlight: HIGHLIGHT_POOL,
  taunt: TAUNT_POOL,
  'score-upset': SCORE_UPSET_POOL,
  closing: CLOSING_POOL,
}

// ===== 选取逻辑 =====

let _idCounter = 0

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * 从池中选取弹幕，支持角色过滤
 * @param trigger 事件类型
 * @param count 选取数量
 * @param characterId 当前发言角色（用于角色绑定弹幕权重提升）
 */
export function pickDanmaku(
  trigger: DanmakuTrigger,
  count: number,
  characterId?: string,
): DanmakuTemplate[] {
  const pool = POOLS[trigger]
  if (!pool || pool.length === 0) return []

  // 分两组：通用 + 角色绑定
  const generic = pool.filter(d => !d.characterBind)
  const bound = pool.filter(d => d.characterBind === characterId)

  // 角色绑定弹幕有 40% 概率替换一条通用弹幕
  const result: DanmakuTemplate[] = []
  const genericCount = bound.length > 0 && Math.random() < 0.4
    ? count - 1
    : count

  for (let i = 0; i < genericCount && generic.length > 0; i++) {
    result.push(pickRandom(generic))
  }
  if (bound.length > 0 && result.length < count) {
    result.push(pickRandom(bound))
  }

  return result
}

/**
 * 将弹幕模板转为队列项（带轨道、延迟、速度）
 */
export function toQueueItems(
  templates: DanmakuTemplate[],
  baseDelay: number = 0,
): DanmakuQueueItem[] {
  const TRACKS = 4
  const usedTracks: number[] = []

  return templates.map((tpl, i) => {
    // 避免同轨道连续：选一个不同于上一个的轨道
    let track: number
    do {
      track = Math.floor(Math.random() * TRACKS)
    } while (usedTracks.length > 0 && track === usedTracks[usedTracks.length - 1])
    usedTracks.push(track)

    const durationMap = { 1: 12, 2: 8, 3: 5 }
    const delay = baseDelay + i * (300 + Math.random() * 500)

    return {
      id: `dm-${++_idCounter}`,
      text: tpl.text,
      emoji: tpl.emoji,
      side: tpl.side ?? 'neutral',
      intensity: tpl.intensity,
      track,
      delay,
      duration: durationMap[tpl.intensity],
    }
  })
}
