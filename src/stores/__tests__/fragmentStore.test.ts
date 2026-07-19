/**
 * fragmentStore 测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useFragmentStore, type Fragment, type MelonContext } from '../fragmentStore'

describe('fragmentStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useFragmentStore.setState({
      fragments: [],
      melonContext: null,
    })
  })

  it('test_initial_state: 默认空 fragments + melonContext=null', () => {
    const state = useFragmentStore.getState()
    expect(state.fragments).toEqual([])
    expect(state.melonContext).toBeNull()
  })

  it('test_addFragment_prepends: 新碎片插入到最前', () => {
    useFragmentStore.getState().addFragment({ type: 'note', content: '第一条' })
    useFragmentStore.getState().addFragment({ type: 'note', content: '第二条' })

    const { fragments } = useFragmentStore.getState()
    expect(fragments).toHaveLength(2)
    // 最新的在最前
    expect(fragments[0].content).toBe('第二条')
    expect(fragments[1].content).toBe('第一条')
    // id 自动生成
    expect(fragments[0].id).toMatch(/^frag-/)
    expect(fragments[1].id).toMatch(/^frag-/)
    // 两个 id 不相同
    expect(fragments[0].id).not.toBe(fragments[1].id)
  })

  it('test_addFragment_all_types: link/quote/note 三种类型都支持', () => {
    useFragmentStore.getState().addFragment({ type: 'link', content: 'https://example.com', source: 'example' })
    useFragmentStore.getState().addFragment({ type: 'quote', content: '一段引文', sourceTitle: '某文章' })
    useFragmentStore.getState().addFragment({ type: 'note', content: '随手笔记' })

    const { fragments } = useFragmentStore.getState()
    expect(fragments).toHaveLength(3)
    expect(fragments.map(f => f.type).sort()).toEqual(['link', 'note', 'quote'])
  })

  it('test_removeFragment: 按 id 删除碎片', () => {
    useFragmentStore.getState().addFragment({ type: 'note', content: 'A' })
    useFragmentStore.getState().addFragment({ type: 'note', content: 'B' })
    const target = useFragmentStore.getState().fragments[0]

    useFragmentStore.getState().removeFragment(target.id)

    const { fragments } = useFragmentStore.getState()
    expect(fragments).toHaveLength(1)
    expect(fragments.find(f => f.id === target.id)).toBeUndefined()
  })

  it('test_removeFragment_unknown_id: 不存在的 id 不报错也不影响列表', () => {
    useFragmentStore.getState().addFragment({ type: 'note', content: 'A' })
    const before = useFragmentStore.getState().fragments.length

    useFragmentStore.getState().removeFragment('non-existent-id')

    expect(useFragmentStore.getState().fragments).toHaveLength(before)
  })

  it('test_addContextFragments_prepends_batch: 批量上下文碎片插入到最前', () => {
    useFragmentStore.getState().addFragment({ type: 'note', content: '原有' })

    const batch: Fragment[] = [
      { id: 'ctx-1', type: 'quote', content: '上下文1' },
      { id: 'ctx-2', type: 'quote', content: '上下文2' },
    ]
    useFragmentStore.getState().addContextFragments(batch)

    const { fragments } = useFragmentStore.getState()
    expect(fragments).toHaveLength(3)
    // batch 整体插入到原 fragments 之前，顺序保持 batch 的顺序
    expect(fragments[0].id).toBe('ctx-1')
    expect(fragments[1].id).toBe('ctx-2')
    expect(fragments[2].content).toBe('原有')
  })

  it('test_setMelonContext: 设置瓜上下文', () => {
    const ctx: MelonContext = {
      melonId: 'melon-42',
      title: '某事件真相',
      description: '事件描述',
      evidenceCount: 3,
      evidences: [
        { id: 'ev-1', content: '证据1', userNickname: '用户A', direction: true },
      ],
    }
    useFragmentStore.getState().setMelonContext(ctx)
    expect(useFragmentStore.getState().melonContext).toEqual(ctx)
  })

  it('test_setMelonContext_null: 清空上下文', () => {
    useFragmentStore.getState().setMelonContext({
      melonId: 'm-1', title: 't', description: 'd', evidenceCount: 0, evidences: [],
    })
    useFragmentStore.getState().setMelonContext(null)
    expect(useFragmentStore.getState().melonContext).toBeNull()
  })

  it('test_clear: 清空 fragments 和 melonContext', () => {
    useFragmentStore.getState().addFragment({ type: 'note', content: 'A' })
    useFragmentStore.getState().addFragment({ type: 'note', content: 'B' })
    useFragmentStore.getState().setMelonContext({
      melonId: 'm-1', title: 't', description: 'd', evidenceCount: 0, evidences: [],
    })

    useFragmentStore.getState().clear()

    const state = useFragmentStore.getState()
    expect(state.fragments).toEqual([])
    expect(state.melonContext).toBeNull()
  })
})
