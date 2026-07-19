/**
 * evidenceStore 测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEvidenceStore } from '../evidenceStore'
import type { Evidence } from '../../types'

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: 'ev-1',
    userId: 'u1',
    userNickname: '用户A',
    userAvatar: 'https://example.com/a.png',
    melonId: 'm1',
    guessId: 'g1',
    direction: true,
    content: '这是一条佐证',
    upvotes: 0,
    downvotes: 0,
    isBest: false,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('evidenceStore', () => {
  beforeEach(() => {
    useEvidenceStore.setState({
      evidenceByMelon: {},
      userEvidence: {},
    })
  })

  it('test_initial_state: 默认空 evidenceByMelon + userEvidence', () => {
    const state = useEvidenceStore.getState()
    expect(state.evidenceByMelon).toEqual({})
    expect(state.userEvidence).toEqual({})
  })

  it('test_addEvidence_appends_to_list: 添加佐证追加到 melonId 列表', () => {
    const ev = makeEvidence({ id: 'ev-1' })
    useEvidenceStore.getState().addEvidence('m1', ev)

    const list = useEvidenceStore.getState().getEvidenceList('m1')
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('ev-1')
  })

  it('test_addEvidence_multiple_appends: 多条佐证按顺序追加', () => {
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-1' }))
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-2' }))
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-3' }))

    const list = useEvidenceStore.getState().getEvidenceList('m1')
    expect(list).toHaveLength(3)
    expect(list.map(e => e.id)).toEqual(['ev-1', 'ev-2', 'ev-3'])
  })

  it('test_addEvidence_sets_userEvidence: 添加时同时记录到 userEvidence（覆盖最新）', () => {
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-1' }))
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-2' }))

    const state = useEvidenceStore.getState()
    // userEvidence[m1] 是最新那条
    expect(state.userEvidence['m1'].id).toBe('ev-2')
  })

  it('test_addEvidence_isolates_melons: 不同 melonId 互不影响', () => {
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-1', melonId: 'm1' }))
    useEvidenceStore.getState().addEvidence('m2', makeEvidence({ id: 'ev-2', melonId: 'm2' }))

    expect(useEvidenceStore.getState().getEvidenceList('m1')).toHaveLength(1)
    expect(useEvidenceStore.getState().getEvidenceList('m2')).toHaveLength(1)
    expect(useEvidenceStore.getState().getEvidenceList('m1')[0].id).toBe('ev-1')
    expect(useEvidenceStore.getState().getEvidenceList('m2')[0].id).toBe('ev-2')
  })

  it('test_getEvidenceList_unknown_melon_returns_empty: 未知 melonId 返回空数组', () => {
    expect(useEvidenceStore.getState().getEvidenceList('never-exists')).toEqual([])
  })

  it('test_upvote_increments: 点赞 +1', () => {
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-1', upvotes: 5 }))
    useEvidenceStore.getState().upvote('ev-1', 'm1')

    const ev = useEvidenceStore.getState().getEvidenceList('m1')[0]
    expect(ev.upvotes).toBe(6)
    expect(ev.downvotes).toBe(0)
  })

  it('test_downvote_increments: 踩 +1', () => {
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-1', downvotes: 2 }))
    useEvidenceStore.getState().downvote('ev-1', 'm1')

    const ev = useEvidenceStore.getState().getEvidenceList('m1')[0]
    expect(ev.downvotes).toBe(3)
    expect(ev.upvotes).toBe(0)
  })

  it('test_upvote_only_targets_matching_id: 只对匹配 id 的佐证生效', () => {
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-1', upvotes: 10 }))
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-2', upvotes: 20 }))

    useEvidenceStore.getState().upvote('ev-2', 'm1')

    const list = useEvidenceStore.getState().getEvidenceList('m1')
    expect(list.find(e => e.id === 'ev-1')?.upvotes).toBe(10)
    expect(list.find(e => e.id === 'ev-2')?.upvotes).toBe(21)
  })

  it('test_upvote_unknown_id_safe: 不存在的 id 不报错也不影响列表', () => {
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-1', upvotes: 1 }))
    expect(() => useEvidenceStore.getState().upvote('non-existent', 'm1')).not.toThrow()
    expect(useEvidenceStore.getState().getEvidenceList('m1')[0].upvotes).toBe(1)
  })

  it('test_selectBestEvidence_picks_highest_score: 选最高 upvotes-downvotes 为 best', () => {
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-1', upvotes: 10, downvotes: 2 }))
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-2', upvotes: 30, downvotes: 5 }))
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-3', upvotes: 5, downvotes: 0 }))

    useEvidenceStore.getState().selectBestEvidence('m1')

    const list = useEvidenceStore.getState().getEvidenceList('m1')
    // ev-2: 30-5=25 最高
    const best = list.find(e => e.isBest === true)
    expect(best).toBeDefined()
    expect(best?.id).toBe('ev-2')
    // 只有一条是 best
    expect(list.filter(e => e.isBest)).toHaveLength(1)
  })

  it('test_selectBestEvidence_clears_previous_best: 重新评选时清除旧的 best 标记', () => {
    // 先手动设置一条为 best
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-1', upvotes: 5, isBest: true }))
    useEvidenceStore.getState().addEvidence('m1', makeEvidence({ id: 'ev-2', upvotes: 20, isBest: false }))

    useEvidenceStore.getState().selectBestEvidence('m1')

    const list = useEvidenceStore.getState().getEvidenceList('m1')
    // ev-1 旧的 best 被清除
    expect(list.find(e => e.id === 'ev-1')?.isBest).toBe(false)
    // ev-2 新的 best
    expect(list.find(e => e.id === 'ev-2')?.isBest).toBe(true)
  })

  it('test_selectBestEvidence_empty_list_safe: 空 melonId 列表不报错', () => {
    expect(() => useEvidenceStore.getState().selectBestEvidence('empty-melon')).not.toThrow()
    expect(useEvidenceStore.getState().getEvidenceList('empty-melon')).toEqual([])
  })

  it('test_selectBestEvidence_unknown_melon_safe: 未知的 melonId 不报错', () => {
    expect(() => useEvidenceStore.getState().selectBestEvidence('never-exists')).not.toThrow()
  })

  it('test_loadMockEvidence_loads_data_and_selects_best: 加载 mock 数据并自动评选 best', async () => {
    // mock 动态 import 的 mockData 模块
    vi.doMock('../../services/mockData', () => ({
      generateMockEvidence: (melonId: string) => [
        makeEvidence({ id: `mock-1-${melonId}`, upvotes: 5, downvotes: 1 }),
        makeEvidence({ id: `mock-2-${melonId}`, upvotes: 20, downvotes: 2 }),
        makeEvidence({ id: `mock-3-${melonId}`, upvotes: 1, downvotes: 0 }),
      ],
    }))

    useEvidenceStore.getState().loadMockEvidence('m-mock')

    // loadMockEvidence 内部使用动态 import，是异步的，等待 microtask 完成
    await vi.dynamicImportSettled()

    const list = useEvidenceStore.getState().getEvidenceList('m-mock')
    expect(list).toHaveLength(3)
    // 自动评选 best：mock-2 的 upvotes-downvotes=18 最高
    const best = list.find(e => e.isBest === true)
    expect(best).toBeDefined()
    expect(best?.id).toBe('mock-2-m-mock')

    vi.doUnmock('../../services/mockData')
  })
})
