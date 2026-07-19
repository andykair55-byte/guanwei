/**
 * userStore 测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useUserStore } from '../userStore'

describe('userStore', () => {
  beforeEach(() => {
    // 重置为初始 state（与模块顶部 mockUser/mockPointsRecords 对齐）
    useUserStore.setState({
      user: {
        id: 'u1',
        nickname: '小明同学',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
        rank: '瓜田侦探',
        points: 2850,
        totalGuesses: 120,
        correctGuesses: 72,
        badges: [
          { id: 'b1', name: '初出茅庐', description: '完成首次猜瓜', icon: 'Sprout' },
          { id: 'b2', name: '连胜之星', description: '连续猜对 5 次', icon: 'Star' },
        ],
        createdAt: '2024-01-01T00:00:00Z',
      },
      pointsRecords: [
        { id: 'p1', userId: 'u1', amount: 10, type: 'daily_login', description: '每日登录奖励', createdAt: '2024-01-15T08:00:00Z' },
      ],
      creations: [],
    })
  })

  it('test_initial_state: 默认 mockUser + mockPointsRecords', () => {
    const state = useUserStore.getState()
    expect(state.user.id).toBe('u1')
    expect(state.user.nickname).toBe('小明同学')
    expect(state.user.rank).toBe('瓜田侦探')
    expect(state.user.points).toBe(2850)
    expect(state.user.badges).toHaveLength(2)
    expect(state.creations).toEqual([])
    expect(state.pointsRecords).toHaveLength(1)
  })

  it('test_addPoints_positive: 增加积分，记录插入到最前', () => {
    const before = useUserStore.getState().user.points
    const recordsBefore = useUserStore.getState().pointsRecords.length

    useUserStore.getState().addPoints(50, 'guess_correct', '猜对瓜奖励')

    const state = useUserStore.getState()
    expect(state.user.points).toBe(before + 50)
    expect(state.pointsRecords).toHaveLength(recordsBefore + 1)
    // 新记录插入到最前
    expect(state.pointsRecords[0].amount).toBe(50)
    expect(state.pointsRecords[0].type).toBe('guess_correct')
    expect(state.pointsRecords[0].description).toBe('猜对瓜奖励')
    expect(state.pointsRecords[0].userId).toBe('u1')
    // id 形如 p<timestamp>
    expect(state.pointsRecords[0].id).toMatch(/^p\d+$/)
    // createdAt 是 ISO 字符串
    expect(state.pointsRecords[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('test_addPoints_negative: 负积分扣减', () => {
    const before = useUserStore.getState().user.points
    useUserStore.getState().addPoints(-30, 'exchange', '兑换礼包')
    expect(useUserStore.getState().user.points).toBe(before - 30)
    expect(useUserStore.getState().pointsRecords[0].amount).toBe(-30)
  })

  it('test_addPoints_records_userId_from_current_user: userId 跟随当前 user.id', () => {
    // 修改 user.id 后再 addPoints
    useUserStore.setState({
      user: { ...useUserStore.getState().user, id: 'custom-uid' },
    })
    useUserStore.getState().addPoints(10, 'daily_login', '签到')
    expect(useUserStore.getState().pointsRecords[0].userId).toBe('custom-uid')
  })

  it('test_publishCreation_evidence: 发布佐证，creations 入列、publishedCount+1、加 5 积分', () => {
    const before = useUserStore.getState().user.points
    expect(useUserStore.getState().user.publishedCount ?? 0).toBe(0)

    const creation = useUserStore.getState().publishCreation({
      title: 'AI 换脸证据',
      type: 'evidence',
      melonId: 'melon-1',
      content: '某某某图片存在 AI 合成痕迹',
    })

    // 返回值正确
    expect(creation.title).toBe('AI 换脸证据')
    expect(creation.type).toBe('evidence')
    expect(creation.melonId).toBe('melon-1')
    expect(creation.views).toBe(0)
    expect(creation.likes).toBe(0)
    expect(creation.impactCount).toBe(0)
    expect(creation.id).toMatch(/^creation-\d+$/)
    expect(creation.publishedAt).toBeGreaterThan(0)

    const state = useUserStore.getState()
    // creations 列表更新，新创作在最前
    expect(state.creations).toHaveLength(1)
    expect(state.creations[0].id).toBe(creation.id)
    // publishedCount +1
    expect(state.user.publishedCount).toBe(1)
    // 加 5 积分
    expect(state.user.points).toBe(before + 5)
    // 新积分记录类型为 creation，描述包含"佐证"
    expect(state.pointsRecords[0].type).toBe('creation')
    expect(state.pointsRecords[0].description).toContain('佐证')
    expect(state.pointsRecords[0].amount).toBe(5)
  })

  it('test_publishCreation_post: 发布帖子描述包含"帖子"', () => {
    useUserStore.getState().publishCreation({
      title: '我的第一篇帖子',
      type: 'post',
      content: '今天天气不错',
    })
    expect(useUserStore.getState().pointsRecords[0].description).toContain('帖子')
  })

  it('test_publishCreation_multiple: 多次发布累积 publishedCount', () => {
    useUserStore.getState().publishCreation({ title: 'A', type: 'evidence', content: 'a' })
    useUserStore.getState().publishCreation({ title: 'B', type: 'post', content: 'b' })
    useUserStore.getState().publishCreation({ title: 'C', type: 'evidence', content: 'c' })

    const state = useUserStore.getState()
    expect(state.creations).toHaveLength(3)
    // 最新发布的排在最前
    expect(state.creations[0].title).toBe('C')
    expect(state.creations[2].title).toBe('A')
    expect(state.user.publishedCount).toBe(3)
    // 三次发布 = 3 * 5 = 15 积分
    const creationRecords = state.pointsRecords.filter(r => r.type === 'creation')
    expect(creationRecords).toHaveLength(3)
    expect(creationRecords.reduce((s, r) => s + r.amount, 0)).toBe(15)
  })
})
