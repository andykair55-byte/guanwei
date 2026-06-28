/**
 * 完整 Mock 服务层
 * 当后端不可用时，api.ts 自动 fallback 到本模块
 * 所有方法返回与真实 API 相同结构的数据
 */

import {
  generateMelons,
  generateMockEvidence,
  generateMockReport,
  generateVerificationResult,
} from './mockData'

// 延迟模拟网络请求
function delay(ms = 150): Promise<void> {
  return new Promise(r => setTimeout(r, ms + Math.random() * 100))
}

// ===== 内存状态（模拟数据库） =====

let melonsCache = generateMelons()
// 让部分瓜变成已开奖状态（前4个 pending，后面的交替 revealed）
melonsCache = melonsCache.map((m, i) => {
  if (i >= 4 && i % 2 === 0) {
    const result = i % 4 === 0
    return {
      ...m,
      status: 'revealed' as const,
      result,
      revealTime: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    }
  }
  return m
})

// 模拟用户猜测记录
const guessesMap = new Map<string, { choice: boolean; evidence?: string }>()

// 模拟评论数据
const commentsMap = new Map<number, any[]>()
const likedMelons = new Set<number>()
const likedComments = new Set<number>()

// 为每个瓜生成随机评论数
const melonCommentCounts = new Map<string, number>()
const melonLikeCounts = new Map<string, number>()
const melonEvidenceCounts = new Map<string, number>()
for (const m of melonsCache) {
  melonCommentCounts.set(m.id, Math.floor(Math.random() * 30) + 2)
  melonLikeCounts.set(m.id, Math.floor(Math.random() * 200) + 10)
  melonEvidenceCounts.set(m.id, Math.floor(Math.random() * 15) + 1)
}

// 模拟用户
const mockUser = {
  id: 1,
  username: 'demo',
  nickname: '见微侦探',
  avatar: 'https://picsum.photos/seed/demo-user/80/80',
  points: 1280,
  rank: '鉴瓜达人',
  total_guesses: 47,
  correct_guesses: 31,
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
}

// ===== Mock API 实现 =====

export const mockApi = {
  // 用户
  async login(_username: string, _password: string) {
    await delay()
    return {
      access_token: 'mock-jwt-token-' + Date.now(),
      user: mockUser,
    }
  },

  async register(_username: string, _nickname: string, _password: string) {
    await delay()
    return { access_token: 'mock-jwt-token-' + Date.now(), user: mockUser }
  },

  async getMe() {
    await delay(100)
    return mockUser
  },

  async getMyStats() {
    await delay(100)
    return {
      rank: mockUser.rank,
      points: mockUser.points,
      total_guesses: mockUser.total_guesses,
      correct_guesses: mockUser.correct_guesses,
      accuracy: Math.round((mockUser.correct_guesses / mockUser.total_guesses) * 100),
    }
  },

  async getMyPoints() {
    await delay(100)
    return [
      { id: 1, amount: 20, type: 'daily_login', description: '每日登录奖励', created_at: new Date().toISOString() },
      { id: 2, amount: 10, type: 'guess_correct', description: '猜对奖励', created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 3, amount: 30, type: 'content_quality', description: '优质佐证奖励', created_at: new Date(Date.now() - 7200000).toISOString() },
      { id: 4, amount: -50, type: 'exchange', description: '兑换求证次数', created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: 5, amount: 10, type: 'invite', description: '邀请好友奖励', created_at: new Date(Date.now() - 172800000).toISOString() },
    ]
  },

  async dailyLogin() {
    await delay()
    return { claimed: true, points: 20 }
  },

  // 瓜田
  async getMelons(category?: string, _status?: string, _skip = 0, _limit = 20) {
    await delay(80)
    let items = melonsCache
    if (category && category !== '全部') {
      items = items.filter(m => m.category === category)
    }
    return {
      total: items.length,
      items: items.map(m => ({
        id: parseInt(m.id.replace('melon-', '')) || 1,
        title: m.title,
        description: m.description,
        cover_image: m.coverImage,
        category: m.category,
        creator_id: 1,
        result: m.result ?? null,
        status: m.status,
        reveal_time: m.revealTime,
        participant_count: m.totalParticipants,
        true_count: m.trueCount,
        false_count: m.falseCount,
        like_count: melonLikeCounts.get(m.id) || 0,
        comment_count: melonCommentCounts.get(m.id) || 0,
        evidence_count: melonEvidenceCounts.get(m.id) || 0,
        is_liked: likedMelons.has(parseInt(m.id.replace('melon-', '')) || 0),
        created_at: m.createdAt,
      })),
    }
  },

  async getMelon(id: number) {
    await delay(150)
    const m = melonsCache.find(x => x.id === `melon-${id}`) || melonsCache[0]
    return {
      id: parseInt(m.id.replace('melon-', '')) || id,
      title: m.title,
      description: m.description,
      cover_image: m.coverImage,
      category: m.category,
      creator_id: 1,
      result: m.result ?? null,
      status: m.status,
      reveal_time: m.revealTime,
      participant_count: m.totalParticipants,
      true_count: m.trueCount,
      false_count: m.falseCount,
      like_count: melonLikeCounts.get(m.id) || 0,
      comment_count: melonCommentCounts.get(m.id) || 0,
      evidence_count: melonEvidenceCounts.get(m.id) || 0,
      is_liked: likedMelons.has(id),
      created_at: m.createdAt,
    }
  },

  async submitGuess(melonId: number, choice: boolean, evidenceContent?: string) {
    await delay(400)
    const key = String(melonId)
    guessesMap.set(key, { choice, evidence: evidenceContent })
    return {
      id: Date.now(),
      melon_id: melonId,
      choice,
      is_correct: null,
      points_earned: 0,
      guessed_at: new Date().toISOString(),
    }
  },

  async getMyGuess(melonId: number) {
    await delay(100)
    const key = String(melonId)
    const guess = guessesMap.get(key)
    if (!guess) return { guess: null, evidence: null }
    return {
      guess: {
        id: Date.now(),
        melon_id: melonId,
        choice: guess.choice,
        is_correct: null,
        points_earned: 0,
        guessed_at: new Date().toISOString(),
      },
      evidence: guess.evidence ? {
        id: Date.now() + 1,
        user_id: 1,
        user_nickname: mockUser.nickname,
        user_avatar: mockUser.avatar,
        melon_id: melonId,
        content: guess.evidence,
        upvotes: 0,
        downvotes: 0,
        is_best: false,
        direction: guess.choice,
        created_at: new Date().toISOString(),
      } : null,
    }
  },

  async getEvidences(melonId: number) {
    await delay(200)
    const mockEvidence = generateMockEvidence(String(melonId))
    const list = mockEvidence.map((ev, i) => ({
      id: i + 1,
      user_id: parseInt(ev.userId.replace('u', '')) || 1,
      user_nickname: ev.userNickname,
      user_avatar: ev.userAvatar,
      melon_id: melonId,
      content: ev.content,
      upvotes: ev.upvotes,
      downvotes: ev.downvotes,
      is_best: i === 0,
      direction: ev.direction,
      created_at: ev.createdAt,
    }))
    return {
      best: list[0] || null,
      list,
    }
  },

  async upvoteEvidence(_evidenceId: number) {
    await delay(100)
    return { success: true }
  },

  async downvoteEvidence(_evidenceId: number) {
    await delay(100)
    return { success: true }
  },

  async getReport(melonId: number) {
    await delay(300)
    const m = melonsCache.find(x => x.id === `melon-${melonId}`)
    const result = m?.result ?? true
    const report = generateMockReport(String(melonId), result)
    return {
      melon_id: melonId,
      timeline: report.timeline,
      evidence_chain: report.evidenceChain.map(e => ({
        description: e.description,
        source: e.source,
        credibility: e.credibility,
      })),
      key_doubts: report.keyDoubts,
      tendency: report.tendency,
      tendency_direction: report.tendencyDirection,
      disclaimer: report.disclaimer,
    }
  },

  async createMelon(data: { title: string; description: string; category: string; cover_image?: string }) {
    await delay(400)
    return {
      id: melonsCache.length + 1,
      title: data.title,
      description: data.description,
      cover_image: data.cover_image || `https://picsum.photos/seed/new${Date.now()}/400/200`,
      category: data.category,
      creator_id: 1,
      result: null,
      status: 'pending',
      reveal_time: null,
      participant_count: 0,
      true_count: 0,
      false_count: 0,
      like_count: 0,
      comment_count: 0,
      evidence_count: 0,
      is_liked: false,
      created_at: new Date().toISOString(),
    }
  },

  // 求证
  async verify(content: string, _type = 'text') {
    const result = await generateVerificationResult(content)
    return { success: true, result }
  },

  async moderate(text: string) {
    await delay(500)
    // 简单模拟：包含特定关键词则不通过
    const sensitive = ['暴力', '色情', '赌博', '毒品']
    const hasSensitive = sensitive.some(kw => text.includes(kw))
    return {
      passed: !hasSensitive,
      safe: !hasSensitive,
      message: hasSensitive ? '内容可能包含敏感信息，建议修改后发布' : '内容审核通过',
    }
  },

  async getProviders() {
    return ['deepseek', 'openai', 'groq']
  },

  async setProvider(_provider: string) {
    return { success: true }
  },

  // 点赞瓜
  async likeMelon(melonId: number) {
    await delay(100)
    const mid = parseInt(String(melonId))
    const m = melonsCache.find(x => x.id === `melon-${mid}`)
    if (likedMelons.has(mid)) {
      likedMelons.delete(mid)
      if (m) melonLikeCounts.set(m.id, (melonLikeCounts.get(m.id) || 1) - 1)
      return { liked: false, count: melonLikeCounts.get(m?.id || '') || 0 }
    }
    likedMelons.add(mid)
    if (m) melonLikeCounts.set(m.id, (melonLikeCounts.get(m.id) || 0) + 1)
    return { liked: true, count: melonLikeCounts.get(m?.id || '') || 0 }
  },

  // 获取评论列表
  async getComments(melonId: number, _skip = 0, _limit = 20) {
    await delay(200)
    let comments = commentsMap.get(melonId)
    if (!comments) {
      // 首次加载时生成 mock 评论
      const count = melonCommentCounts.get(`melon-${melonId}`) || 5
      const nicknames = ['吃瓜达人', '真相猎人', '理性派', '逻辑怪', '数据控', '围观群众', '侦探新手', '老瓜农']
      comments = Array.from({ length: Math.min(count, 12) }, (_, i) => ({
        id: melonId * 1000 + i + 1,
        user_id: i + 2,
        user_nickname: nicknames[i % nicknames.length],
        user_avatar: `https://picsum.photos/seed/cmt-${melonId}-${i}/80/80`,
        melon_id: melonId,
        content: [
          '这个瓜保熟吗？等一个实锤',
          '之前看到过类似的新闻，感觉有几分可信',
          '坐等反转，每次都有反转',
          '从逻辑上看，这个说法站不住脚',
          '我有朋友在相关行业，说确实如此',
          '别急着下结论，等官方回应',
          '这个时间线对不上啊',
          '有一说一，证据链还算完整',
          '上次类似的瓜最后证实是假的',
          '求大佬分析下关键证据',
          '这个反转再反转，比电视剧还精彩',
          '已经求证过了，详见求证频道',
        ][i % 12],
        parent_id: null,
        reply_to_user: '',
        likes: Math.floor(Math.random() * 50),
        is_liked: likedComments.has(melonId * 1000 + i + 1),
        created_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
      }))

      // 给前3条评论添加回复
      if (comments.length > 3) {
        const replyTexts = ['同意楼上', '不敢苟同', '确实如此', '有道理', '+1', '反转了']
        for (let p = 0; p < 3 && p < comments.length; p++) {
          const parentId = comments[p].id
          comments.push({
            id: melonId * 1000 + 100 + p,
            user_id: 10 + p,
            user_nickname: nicknames[(p + 3) % nicknames.length],
            user_avatar: `https://picsum.photos/seed/rpy-${melonId}-${p}/80/80`,
            melon_id: melonId,
            content: replyTexts[p % replyTexts.length],
            parent_id: parentId,
            reply_to_user: comments[p].user_nickname,
            likes: Math.floor(Math.random() * 10),
            is_liked: false,
            created_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          })
        }
      }
      commentsMap.set(melonId, comments)
    }

    // 分离顶级评论和回复
    const topLevel = comments.filter(c => !c.parent_id)
    const replies = comments.filter(c => c.parent_id)

    // 给顶级评论附加回复
    const items = topLevel.map(c => ({
      ...c,
      replies: replies.filter(r => r.parent_id === c.id),
    }))

    return { total: comments.length, items }
  },

  // 发表评论
  async postComment(melonId: number, content: string, parentId: number | null = null, replyToUser = '') {
    await delay(300)
    const comments = commentsMap.get(melonId) || []
    const newComment = {
      id: Date.now(),
      user_id: mockUser.id,
      user_nickname: mockUser.nickname,
      user_avatar: mockUser.avatar,
      melon_id: melonId,
      content,
      parent_id: parentId,
      reply_to_user: replyToUser,
      likes: 0,
      is_liked: false,
      created_at: new Date().toISOString(),
      replies: [],
    }
    comments.unshift(newComment)
    commentsMap.set(melonId, comments)

    // 更新评论计数
    const m = melonsCache.find(x => x.id === `melon-${melonId}`)
    if (m) {
      const cur = melonCommentCounts.get(m.id) || 0
      melonCommentCounts.set(m.id, cur + 1)
    }

    return newComment
  },

  // 点赞评论
  async likeComment(commentId: number) {
    await delay(100)
    if (likedComments.has(commentId)) {
      likedComments.delete(commentId)
      return { liked: false }
    }
    likedComments.add(commentId)
    return { liked: true }
  },
}
