/**
 * transform.ts 工具函数测试
 */
import { describe, it, expect } from 'vitest'
import {
  transformUser,
  transformMelon,
  transformMelonList,
  transformEvidence,
  transformEvidenceList,
  transformReport,
  transformComment,
  transformCommentList,
  transformGuess,
  transformPointsRecord,
  transformPointsRecords,
  buildCommentTree,
  applyStatsToUser,
} from '../transform'
import type { ApiUser, ApiMelon, ApiComment, ApiEvidence, ApiReport, ApiGuess, ApiPointsRecord, User, UserStats } from '../../types'

describe('transformUser', () => {
  it('正常输入：后端 User 格式 → 前端 User 格式', () => {
    const apiUser: ApiUser = {
      id: 42,
      username: 'testuser',
      nickname: '测试用户',
      avatar: 'https://example.com/avatar.png',
      points: 1280,
      rank: '鉴瓜达人',
      total_guesses: 47,
      correct_guesses: 31,
      created_at: '2024-01-15T08:00:00Z',
    }

    const user = transformUser(apiUser)

    expect(user.id).toBe('42')
    expect(user.nickname).toBe('测试用户')
    expect(user.avatar).toBe('https://example.com/avatar.png')
    expect(user.rank).toBe('鉴瓜达人')
    expect(user.points).toBe(1280)
    expect(user.totalGuesses).toBe(47)
    expect(user.correctGuesses).toBe(31)
    expect(user.createdAt).toBe('2024-01-15T08:00:00Z')
    expect(user.badges).toEqual([])
  })

  it('字段映射：snake_case → camelCase', () => {
    const apiUser: ApiUser = {
      id: 1,
      username: 'demo',
      nickname: '见微侦探',
      avatar: 'https://picsum.photos/seed/demo/80/80',
      points: 100,
      rank: '吃瓜群众',
      total_guesses: 10,
      correct_guesses: 3,
      created_at: '2024-06-01T00:00:00Z',
    }

    const user = transformUser(apiUser)

    expect(user.totalGuesses).toBe(apiUser.total_guesses)
    expect(user.correctGuesses).toBe(apiUser.correct_guesses)
    expect(user.createdAt).toBe(apiUser.created_at)
  })

  it('边界：id 为 0 时转为字符串 "0"', () => {
    const apiUser: ApiUser = {
      id: 0,
      username: 'zero',
      nickname: '零号',
      avatar: '',
      points: 0,
      rank: '吃瓜群众',
      total_guesses: 0,
      correct_guesses: 0,
      created_at: '2024-01-01T00:00:00Z',
    }

    const user = transformUser(apiUser)

    expect(user.id).toBe('0')
    expect(user.points).toBe(0)
    expect(user.totalGuesses).toBe(0)
  })

  it('边界：大数字 id 正确转换', () => {
    const apiUser: ApiUser = {
      id: 999999999,
      username: 'big',
      nickname: '大号',
      avatar: 'https://example.com/big.png',
      points: 99999,
      rank: '见微先知',
      total_guesses: 600,
      correct_guesses: 500,
      created_at: '2024-12-31T23:59:59Z',
    }

    const user = transformUser(apiUser)

    expect(user.id).toBe('999999999')
    expect(user.rank).toBe('见微先知')
  })

  it('rank 字段直接透传（类型断言）', () => {
    const ranks = ['吃瓜群众', '瓜田新手', '鉴瓜学徒', '瓜田侦探', '鉴瓜达人', '鉴瓜大师', '见微先知']
    for (const rank of ranks) {
      const user = transformUser({
        id: 1, username: 'u', nickname: 'n', avatar: 'a',
        points: 0, rank, total_guesses: 0, correct_guesses: 0,
        created_at: '2024-01-01',
      })
      expect(user.rank).toBe(rank)
    }
  })
})

describe('transformMelon', () => {
  it('正常转换瓜数据', () => {
    const apiMelon: ApiMelon = {
      id: 10,
      title: '测试瓜',
      description: '这是一个测试瓜',
      category: '科技',
      cover_image: 'https://example.com/cover.png',
      creator_id: 1,
      creator_nickname: '作者',
      creator_avatar: 'https://example.com/avatar.png',
      creator_rank: '鉴瓜达人',
      result: null,
      status: 'pending',
      reveal_time: '2024-12-31T00:00:00Z',
      participant_count: 100,
      true_count: 60,
      false_count: 40,
      like_count: 50,
      comment_count: 20,
      evidence_count: 5,
      is_liked: false,
      created_at: '2024-06-01T00:00:00Z',
    }

    const melon = transformMelon(apiMelon)

    expect(melon.id).toBe('10')
    expect(melon.title).toBe('测试瓜')
    expect(melon.coverImage).toBe('https://example.com/cover.png')
    expect(melon.status).toBe('pending')
    expect(melon.trueCount).toBe(60)
    expect(melon.falseCount).toBe(40)
    expect(melon.author?.nickname).toBe('作者')
  })

  it('cover_image 为空时回退为空字符串', () => {
    const melon = transformMelon({
      id: 1, title: 't', description: 'd', category: '科技', cover_image: '',
      creator_id: 1, result: null, status: 'pending', reveal_time: null,
      participant_count: 0, true_count: 0, false_count: 0,
      like_count: 0, comment_count: 0, evidence_count: 0, is_liked: false,
      created_at: '2024-01-01',
    })
    expect(melon.coverImage).toBe('')
  })

  it('status 为 revealed 时正确映射', () => {
    const melon = transformMelon({
      id: 1, title: 't', description: 'd', category: '科技', cover_image: '',
      creator_id: 1, result: true, status: 'revealed', reveal_time: '2024-01-01',
      participant_count: 0, true_count: 0, false_count: 0,
      like_count: 0, comment_count: 0, evidence_count: 0, is_liked: false,
      created_at: '2024-01-01',
    })
    expect(melon.status).toBe('revealed')
    expect(melon.result).toBe(true)
  })
})

describe('transformComment', () => {
  it('正常转换评论', () => {
    const apiComment: ApiComment = {
      id: 5,
      user_id: 10,
      user_nickname: '评论者',
      user_avatar: 'https://example.com/c.png',
      melon_id: 3,
      content: '好瓜',
      parent_id: null,
      reply_to_user: '',
      likes: 5,
      is_liked: false,
      created_at: '2024-06-01T00:00:00Z',
    }

    const comment = transformComment(apiComment)

    expect(comment.id).toBe('5')
    expect(comment.userId).toBe('10')
    expect(comment.melonId).toBe('3')
    expect(comment.parentId).toBeNull()
    expect(comment.content).toBe('好瓜')
  })

  it('parent_id 有值时转为字符串', () => {
    const comment = transformComment({
      id: 6, user_id: 1, user_nickname: 'n', user_avatar: 'a', melon_id: 1,
      content: 'c', parent_id: 99, reply_to_user: 'someone', likes: 0,
      is_liked: false, created_at: '2024-01-01',
    })
    expect(comment.parentId).toBe('99')
    expect(comment.replyToUser).toBe('someone')
  })
})

describe('buildCommentTree', () => {
  it('扁平评论列表构建为树结构', () => {
    const comments = [
      { id: '1', userId: '1', userNickname: 'A', userAvatar: '', melonId: '1', content: '顶级1', parentId: null, replyToUser: '', likes: 0, isLiked: false, createdAt: '2024-01-01' },
      { id: '2', userId: '2', userNickname: 'B', userAvatar: '', melonId: '1', content: '回复1', parentId: '1', replyToUser: 'A', likes: 0, isLiked: false, createdAt: '2024-01-01' },
      { id: '3', userId: '3', userNickname: 'C', userAvatar: '', melonId: '1', content: '顶级2', parentId: null, replyToUser: '', likes: 0, isLiked: false, createdAt: '2024-01-01' },
    ]

    const tree = buildCommentTree(comments)

    expect(tree).toHaveLength(2)
    expect(tree[0].id).toBe('1')
    expect(tree[0].replies).toHaveLength(1)
    expect(tree[0].replies![0].id).toBe('2')
    expect(tree[1].id).toBe('3')
  })

  it('空列表返回空数组', () => {
    expect(buildCommentTree([])).toEqual([])
  })
})

describe('applyStatsToUser', () => {
  it('将统计数据合并到用户对象', () => {
    const user: User = {
      id: '1', nickname: '测试', avatar: '', rank: '吃瓜群众',
      points: 0, totalGuesses: 0, correctGuesses: 0, badges: [],
      createdAt: '2024-01-01',
    }

    const stats: UserStats = {
      rank: '鉴瓜达人',
      points: 500,
      total_guesses: 50,
      correct_guesses: 30,
      accuracy: 60,
    }

    const updated = applyStatsToUser(user, stats)

    expect(updated.rank).toBe('鉴瓜达人')
    expect(updated.points).toBe(500)
    expect(updated.totalGuesses).toBe(50)
    expect(updated.correctGuesses).toBe(30)
    expect(updated.id).toBe('1')
    expect(updated.nickname).toBe('测试')
  })
})

describe('transformMelonList', () => {
  it('批量转换瓜列表', () => {
    const items: ApiMelon[] = [
      {
        id: 1, title: '瓜1', description: 'd1', category: '科技', cover_image: '',
        creator_id: 1, result: null, status: 'pending', reveal_time: null,
        participant_count: 0, true_count: 0, false_count: 0,
        like_count: 0, comment_count: 0, evidence_count: 0, is_liked: false,
        created_at: '2024-01-01',
      },
      {
        id: 2, title: '瓜2', description: 'd2', category: '娱乐', cover_image: '',
        creator_id: 2, result: true, status: 'revealed', reveal_time: '2024-02-01',
        participant_count: 10, true_count: 6, false_count: 4,
        like_count: 1, comment_count: 2, evidence_count: 3, is_liked: true,
        created_at: '2024-02-01',
      },
    ]

    const list = transformMelonList(items)
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe('1')
    expect(list[0].title).toBe('瓜1')
    expect(list[1].id).toBe('2')
    expect(list[1].status).toBe('revealed')
  })

  it('空列表返回空数组', () => {
    expect(transformMelonList([])).toEqual([])
  })
})

describe('transformMelon - 边界场景', () => {
  it('creator_avatar 缺失时回退到 picsum 头像', () => {
    const melon = transformMelon({
      id: 1, title: 't', description: 'd', category: '科技', cover_image: '',
      creator_id: 42, creator_nickname: '作者', creator_avatar: '', creator_rank: '鉴瓜达人',
      result: null, status: 'pending', reveal_time: null,
      participant_count: 0, true_count: 0, false_count: 0,
      like_count: 0, comment_count: 0, evidence_count: 0, is_liked: false,
      created_at: '2024-01-01',
    })
    expect(melon.author).toBeDefined()
    expect(melon.author?.avatar).toBe('https://picsum.photos/seed/u42/80/80')
    expect(melon.author?.nickname).toBe('作者')
    expect(melon.author?.rank).toBe('鉴瓜达人')
  })

  it('creator_nickname 缺失时 author 为 undefined', () => {
    const melon = transformMelon({
      id: 1, title: 't', description: 'd', category: '科技', cover_image: '',
      creator_id: 1, result: null, status: 'pending', reveal_time: null,
      participant_count: 0, true_count: 0, false_count: 0,
      like_count: 0, comment_count: 0, evidence_count: 0, is_liked: false,
      created_at: '2024-01-01',
    })
    expect(melon.author).toBeUndefined()
  })

  it('reveal_time 为 null 时回退到当前时间 +24h', () => {
    const before = Date.now() + 23 * 60 * 60 * 1000
    const melon = transformMelon({
      id: 1, title: 't', description: 'd', category: '科技', cover_image: '',
      creator_id: 1, result: null, status: 'pending', reveal_time: null,
      participant_count: 0, true_count: 0, false_count: 0,
      like_count: 0, comment_count: 0, evidence_count: 0, is_liked: false,
      created_at: '2024-01-01',
    })
    const after = Date.now() + 25 * 60 * 60 * 1000
    const revealTime = new Date(melon.revealTime).getTime()
    expect(revealTime).toBeGreaterThan(before)
    expect(revealTime).toBeLessThan(after)
  })

  it('result=null 时 result 为 undefined', () => {
    const melon = transformMelon({
      id: 1, title: 't', description: 'd', category: '科技', cover_image: '',
      creator_id: 1, result: null, status: 'pending', reveal_time: '2024-01-01',
      participant_count: 0, true_count: 0, false_count: 0,
      like_count: 0, comment_count: 0, evidence_count: 0, is_liked: false,
      created_at: '2024-01-01',
    })
    expect(melon.result).toBeUndefined()
  })

  it('status 非 "revealed" 时一律映射为 "pending"', () => {
    const melon = transformMelon({
      id: 1, title: 't', description: 'd', category: '科技', cover_image: '',
      creator_id: 1, result: null, status: 'something_else', reveal_time: null,
      participant_count: 0, true_count: 0, false_count: 0,
      like_count: 0, comment_count: 0, evidence_count: 0, is_liked: false,
      created_at: '2024-01-01',
    })
    expect(melon.status).toBe('pending')
  })
})

describe('transformEvidence', () => {
  it('正常转换佐证', () => {
    const apiEvidence: ApiEvidence = {
      id: 5,
      user_id: 10,
      user_nickname: '佐证人',
      user_avatar: 'https://example.com/u.png',
      melon_id: 3,
      content: '佐证内容',
      upvotes: 8,
      downvotes: 2,
      is_best: true,
      direction: true,
      created_at: '2024-06-01T00:00:00Z',
    }

    const ev = transformEvidence(apiEvidence)
    expect(ev.id).toBe('5')
    expect(ev.userId).toBe('10')
    expect(ev.melonId).toBe('3')
    expect(ev.userNickname).toBe('佐证人')
    expect(ev.content).toBe('佐证内容')
    expect(ev.upvotes).toBe(8)
    expect(ev.downvotes).toBe(2)
    expect(ev.isBest).toBe(true)
    expect(ev.direction).toBe(true)
    expect(ev.guessId).toBe('')  // transformEvidence 固定 guessId 为空字符串
    expect(ev.createdAt).toBe('2024-06-01T00:00:00Z')
  })

  it('direction=false 时正确保留', () => {
    const ev = transformEvidence({
      id: 1, user_id: 1, user_nickname: 'n', user_avatar: 'a', melon_id: 1,
      content: 'c', upvotes: 0, downvotes: 1, is_best: false, direction: false,
      created_at: '2024-01-01',
    })
    expect(ev.direction).toBe(false)
  })
})

describe('transformEvidenceList', () => {
  it('批量转换佐证列表', () => {
    const items: ApiEvidence[] = [
      {
        id: 1, user_id: 1, user_nickname: 'A', user_avatar: 'a1', melon_id: 1,
        content: 'c1', upvotes: 1, downvotes: 0, is_best: false, direction: true,
        created_at: '2024-01-01',
      },
      {
        id: 2, user_id: 2, user_nickname: 'B', user_avatar: 'a2', melon_id: 1,
        content: 'c2', upvotes: 5, downvotes: 1, is_best: true, direction: false,
        created_at: '2024-01-02',
      },
    ]

    const list = transformEvidenceList(items)
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe('1')
    expect(list[1].id).toBe('2')
    expect(list[1].isBest).toBe(true)
  })

  it('空列表返回空数组', () => {
    expect(transformEvidenceList([])).toEqual([])
  })
})

describe('transformReport', () => {
  it('正常转换实锤报告', () => {
    const apiReport: ApiReport = {
      melon_id: 7,
      timeline: [
        { time: '2024-01-01', event: '事件发生', source: '某媒体' },
        { time: '2024-01-02', event: '官方回应', source: '官方公告' },
      ],
      evidence_chain: [
        { description: '证据1', source: '来源1', credibility: 5 },
        { description: '证据2', source: '来源2', credibility: 3 },
      ],
      key_doubts: ['疑点1', '疑点2'],
      tendency: '倾向真实',
      tendency_direction: true,
      disclaimer: '本报告仅供参考',
    }

    const report = transformReport(apiReport)
    expect(report.id).toBe('7')
    expect(report.melonId).toBe('7')
    expect(report.timeline).toHaveLength(2)
    expect(report.timeline[0].time).toBe('2024-01-01')
    expect(report.timeline[0].event).toBe('事件发生')
    expect(report.timeline[0].source).toBe('某媒体')
    expect(report.evidenceChain).toHaveLength(2)
    expect(report.evidenceChain[0].description).toBe('证据1')
    expect(report.evidenceChain[0].source).toBe('来源1')
    expect(report.evidenceChain[0].sourceUrl).toBe('')  // 固定为空字符串
    expect(report.evidenceChain[0].credibility).toBe(5)
    expect(report.evidenceChain[1].credibility).toBe(3)
    expect(report.keyDoubts).toEqual(['疑点1', '疑点2'])
    expect(report.tendency).toBe('倾向真实')
    expect(report.tendencyDirection).toBe(true)
    expect(report.disclaimer).toBe('本报告仅供参考')
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)  // 当前时间 ISO
  })

  it('空数组的 timeline/evidence_chain/key_doubts 也正确处理', () => {
    const report = transformReport({
      melon_id: 1, timeline: [], evidence_chain: [], key_doubts: [],
      tendency: '', tendency_direction: false, disclaimer: '',
    })
    expect(report.timeline).toEqual([])
    expect(report.evidenceChain).toEqual([])
    expect(report.keyDoubts).toEqual([])
    expect(report.tendencyDirection).toBe(false)
  })
})

describe('transformGuess', () => {
  it('正常转换猜瓜记录（is_correct 有值）', () => {
    const apiGuess: ApiGuess = {
      id: 100,
      melon_id: 5,
      choice: true,
      is_correct: true,
      points_earned: 10,
      guessed_at: '2024-06-01T00:00:00Z',
    }

    const guess = transformGuess(apiGuess)
    expect(guess.id).toBe('100')
    expect(guess.userId).toBe('')  // 固定为空字符串
    expect(guess.melonId).toBe('5')
    expect(guess.choice).toBe(true)
    expect(guess.isCorrect).toBe(true)
    expect(guess.pointsEarned).toBe(10)
    expect(guess.guessedAt).toBe('2024-06-01T00:00:00Z')
  })

  it('is_correct=null 时转为 undefined', () => {
    const guess = transformGuess({
      id: 1, melon_id: 1, choice: false, is_correct: null,
      points_earned: 0, guessed_at: '2024-01-01',
    })
    expect(guess.isCorrect).toBeUndefined()
    expect(guess.choice).toBe(false)
  })

  it('choice=false 时正确保留', () => {
    const guess = transformGuess({
      id: 2, melon_id: 2, choice: false, is_correct: false,
      points_earned: -5, guessed_at: '2024-02-01',
    })
    expect(guess.choice).toBe(false)
    expect(guess.isCorrect).toBe(false)
    expect(guess.pointsEarned).toBe(-5)
  })
})

describe('transformPointsRecord', () => {
  it('正常转换积分记录', () => {
    const apiRecord: ApiPointsRecord = {
      id: 42,
      amount: 15,
      type: 'guess_correct',
      description: '猜对瓜奖励',
      created_at: '2024-06-01T08:00:00Z',
    }

    const record = transformPointsRecord(apiRecord)
    expect(record.id).toBe('42')
    expect(record.userId).toBe('')  // 固定为空字符串
    expect(record.amount).toBe(15)
    expect(record.type).toBe('guess_correct')
    expect(record.description).toBe('猜对瓜奖励')
    expect(record.createdAt).toBe('2024-06-01T08:00:00Z')
  })

  it('负数积分也正确转换', () => {
    const record = transformPointsRecord({
      id: 1, amount: -20, type: 'exchange', description: '兑换',
      created_at: '2024-01-01',
    })
    expect(record.amount).toBe(-20)
    expect(record.type).toBe('exchange')
  })
})

describe('transformPointsRecords', () => {
  it('批量转换积分记录列表', () => {
    const items: ApiPointsRecord[] = [
      { id: 1, amount: 10, type: 'daily_login', description: '签到', created_at: '2024-01-01' },
      { id: 2, amount: 20, type: 'guess_correct', description: '猜对', created_at: '2024-01-02' },
      { id: 3, amount: -5, type: 'exchange', description: '兑换', created_at: '2024-01-03' },
    ]

    const records = transformPointsRecords(items)
    expect(records).toHaveLength(3)
    expect(records[0].id).toBe('1')
    expect(records[2].amount).toBe(-5)
  })

  it('空列表返回空数组', () => {
    expect(transformPointsRecords([])).toEqual([])
  })
})

describe('transformCommentList', () => {
  it('批量转换评论列表', () => {
    const items: ApiComment[] = [
      {
        id: 1, user_id: 10, user_nickname: 'A', user_avatar: 'a', melon_id: 1,
        content: 'c1', parent_id: null, reply_to_user: '', likes: 0,
        is_liked: false, created_at: '2024-01-01',
      },
      {
        id: 2, user_id: 20, user_nickname: 'B', user_avatar: 'b', melon_id: 1,
        content: 'c2', parent_id: 1, reply_to_user: 'A', likes: 5,
        is_liked: true, created_at: '2024-01-02',
      },
    ]

    const list = transformCommentList(items)
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe('1')
    expect(list[0].parentId).toBeNull()
    expect(list[1].id).toBe('2')
    expect(list[1].parentId).toBe('1')
    expect(list[1].likes).toBe(5)
    expect(list[1].isLiked).toBe(true)
  })

  it('空列表返回空数组', () => {
    expect(transformCommentList([])).toEqual([])
  })
})

describe('buildCommentTree - 边界场景', () => {
  it('parent_id 指向不存在评论时归为顶级', () => {
    const comments = [
      { id: '1', userId: '1', userNickname: 'A', userAvatar: '', melonId: '1', content: '顶级', parentId: null, replyToUser: '', likes: 0, isLiked: false, createdAt: '2024-01-01' },
      // parentId 指向不存在的 '999'
      { id: '2', userId: '2', userNickname: 'B', userAvatar: '', melonId: '1', content: '孤儿', parentId: '999', replyToUser: '', likes: 0, isLiked: false, createdAt: '2024-01-01' },
    ]

    const tree = buildCommentTree(comments)
    // 两条都作为顶级（因为 '999' 不存在）
    expect(tree).toHaveLength(2)
  })

  it('每个节点都有 replies 数组（即使为空）', () => {
    const comments = [
      { id: '1', userId: '1', userNickname: 'A', userAvatar: '', melonId: '1', content: 'x', parentId: null, replyToUser: '', likes: 0, isLiked: false, createdAt: '2024-01-01' },
    ]

    const tree = buildCommentTree(comments)
    expect(tree[0].replies).toEqual([])
  })

  it('多层嵌套：祖 → 父 → 子 都正确组织', () => {
    const comments = [
      { id: '1', userId: '1', userNickname: 'A', userAvatar: '', melonId: '1', content: '祖', parentId: null, replyToUser: '', likes: 0, isLiked: false, createdAt: '2024-01-01' },
      { id: '2', userId: '2', userNickname: 'B', userAvatar: '', melonId: '1', content: '父', parentId: '1', replyToUser: 'A', likes: 0, isLiked: false, createdAt: '2024-01-01' },
      { id: '3', userId: '3', userNickname: 'C', userAvatar: '', melonId: '1', content: '子', parentId: '2', replyToUser: 'B', likes: 0, isLiked: false, createdAt: '2024-01-01' },
    ]

    const tree = buildCommentTree(comments)
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('1')
    expect(tree[0].replies).toHaveLength(1)
    expect(tree[0].replies![0].id).toBe('2')
    expect(tree[0].replies![0].replies).toHaveLength(1)
    expect(tree[0].replies![0].replies![0].id).toBe('3')
  })
})
