/**
 * creationStore 测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useCreationStore, type SkeletonSection } from '../creationStore'

describe('creationStore', () => {
  beforeEach(() => {
    localStorage.clear()
    // 重置为初始 state（与模块顶部 emptyDraft 对齐）
    useCreationStore.setState({
      draft: {
        topic: '',
        stance: '',
        targetReader: '',
        title: '',
        content: '',
        skeleton: null,
        melonId: '',
        lastSaved: 0,
      },
      isGenerating: false,
      generateError: null,
    })
  })

  it('test_initial_state: 默认空 draft + isGenerating=false + generateError=null', () => {
    const state = useCreationStore.getState()
    expect(state.draft.topic).toBe('')
    expect(state.draft.stance).toBe('')
    expect(state.draft.targetReader).toBe('')
    expect(state.draft.title).toBe('')
    expect(state.draft.content).toBe('')
    expect(state.draft.skeleton).toBeNull()
    expect(state.draft.melonId).toBe('')
    expect(state.draft.lastSaved).toBe(0)
    expect(state.isGenerating).toBe(false)
    expect(state.generateError).toBeNull()
  })

  it('test_setDraft_merges_partial_and_updates_lastSaved: 部分字段更新并刷新 lastSaved', () => {
    const before = useCreationStore.getState().draft.lastSaved
    // 确保 before 为 0 时 lastSaved 一定变化
    useCreationStore.setState({ draft: { ...useCreationStore.getState().draft, lastSaved: 0 } })

    useCreationStore.getState().setDraft({ topic: 'AI 换脸诈骗', stance: 'affirm' })

    const { draft } = useCreationStore.getState()
    expect(draft.topic).toBe('AI 换脸诈骗')
    expect(draft.stance).toBe('affirm')
    // 未传入字段保持
    expect(draft.title).toBe('')
    expect(draft.content).toBe('')
    // lastSaved 被更新为当前时间戳
    expect(draft.lastSaved).toBeGreaterThan(0)
    expect(draft.lastSaved).not.toBe(before)
  })

  it('test_setSkeleton: 设置 skeleton 并更新 lastSaved', () => {
    expect(useCreationStore.getState().draft.skeleton).toBeNull()

    const sections: SkeletonSection[] = [
      { id: 's1', title: '背景', points: ['点1', '点2'], needsVerification: false, accepted: false },
      { id: 's2', title: '争议', points: ['点3'], needsVerification: true, accepted: false },
    ]

    useCreationStore.getState().setSkeleton(sections)

    const { draft } = useCreationStore.getState()
    expect(draft.skeleton).toEqual(sections)
    expect(draft.skeleton).toHaveLength(2)
    expect(draft.lastSaved).toBeGreaterThan(0)
  })

  it('test_removeSection: 按 id 删除 section', () => {
    const sections: SkeletonSection[] = [
      { id: 's1', title: 'A', points: [], needsVerification: false, accepted: false },
      { id: 's2', title: 'B', points: [], needsVerification: false, accepted: false },
    ]
    useCreationStore.getState().setSkeleton(sections)

    useCreationStore.getState().removeSection('s1')

    const skeleton = useCreationStore.getState().draft.skeleton
    expect(skeleton).toHaveLength(1)
    expect(skeleton?.[0].id).toBe('s2')
  })

  it('test_removeSection_no_skeleton_returns_unchanged: skeleton=null 时不报错', () => {
    expect(() => useCreationStore.getState().removeSection('non-existent')).not.toThrow()
    expect(useCreationStore.getState().draft.skeleton).toBeNull()
  })

  it('test_updateSection: 更新指定 section 的字段', () => {
    const sections: SkeletonSection[] = [
      { id: 's1', title: 'A', points: ['x'], needsVerification: false, accepted: false },
      { id: 's2', title: 'B', points: ['y'], needsVerification: false, accepted: false },
    ]
    useCreationStore.getState().setSkeleton(sections)

    useCreationStore.getState().updateSection('s1', { title: 'A 修订', points: ['x', 'z'] })

    const skeleton = useCreationStore.getState().draft.skeleton
    expect(skeleton?.[0].title).toBe('A 修订')
    expect(skeleton?.[0].points).toEqual(['x', 'z'])
    // 其他 section 保持不变
    expect(skeleton?.[1].title).toBe('B')
    expect(skeleton?.[1].points).toEqual(['y'])
  })

  it('test_toggleSectionAccepted: 切换 accepted 状态', () => {
    const sections: SkeletonSection[] = [
      { id: 's1', title: 'A', points: [], needsVerification: false, accepted: false },
      { id: 's2', title: 'B', points: [], needsVerification: false, accepted: false },
    ]
    useCreationStore.getState().setSkeleton(sections)

    useCreationStore.getState().toggleSectionAccepted('s1')
    expect(useCreationStore.getState().draft.skeleton?.[0].accepted).toBe(true)
    expect(useCreationStore.getState().draft.skeleton?.[1].accepted).toBe(false)

    // 再切一次回到 false
    useCreationStore.getState().toggleSectionAccepted('s1')
    expect(useCreationStore.getState().draft.skeleton?.[0].accepted).toBe(false)
  })

  it('test_setGenerating: 设置生成中状态', () => {
    expect(useCreationStore.getState().isGenerating).toBe(false)
    useCreationStore.getState().setGenerating(true)
    expect(useCreationStore.getState().isGenerating).toBe(true)
    useCreationStore.getState().setGenerating(false)
    expect(useCreationStore.getState().isGenerating).toBe(false)
  })

  it('test_setGenerateError: 设置错误消息', () => {
    expect(useCreationStore.getState().generateError).toBeNull()
    useCreationStore.getState().setGenerateError('生成失败：网络错误')
    expect(useCreationStore.getState().generateError).toBe('生成失败：网络错误')
    useCreationStore.getState().setGenerateError(null)
    expect(useCreationStore.getState().generateError).toBeNull()
  })

  it('test_reset: 重置到空 draft 并清空错误状态', () => {
    // 先填充一些数据
    useCreationStore.getState().setDraft({ topic: '某话题', title: '某标题', content: '某内容' })
    useCreationStore.getState().setSkeleton([
      { id: 's1', title: 'A', points: [], needsVerification: false, accepted: false },
    ])
    useCreationStore.getState().setGenerating(true)
    useCreationStore.getState().setGenerateError('某错误')

    // 再 reset
    useCreationStore.getState().reset()

    const state = useCreationStore.getState()
    expect(state.draft.topic).toBe('')
    expect(state.draft.title).toBe('')
    expect(state.draft.content).toBe('')
    expect(state.draft.skeleton).toBeNull()
    expect(state.draft.lastSaved).toBe(0)
    expect(state.isGenerating).toBe(false)
    expect(state.generateError).toBeNull()
  })

  it('test_full_creation_flow: 模拟完整创建流程状态变更', () => {
    // 1. 初始状态
    expect(useCreationStore.getState().draft.topic).toBe('')

    // 2. 用户输入主题和立场
    useCreationStore.getState().setDraft({ topic: 'AI 监管', stance: 'affirm', targetReader: '政策制定者' })
    expect(useCreationStore.getState().draft.topic).toBe('AI 监管')
    expect(useCreationStore.getState().draft.stance).toBe('affirm')

    // 3. 设置生成中
    useCreationStore.getState().setGenerating(true)
    expect(useCreationStore.getState().isGenerating).toBe(true)

    // 4. 生成完成，设置 skeleton
    useCreationStore.getState().setSkeleton([
      { id: 's1', title: '现状', points: ['点1'], needsVerification: false, accepted: false },
      { id: 's2', title: '建议', points: ['点2'], needsVerification: true, accepted: false },
    ])
    useCreationStore.getState().setGenerating(false)
    useCreationStore.getState().setGenerateError(null)

    expect(useCreationStore.getState().isGenerating).toBe(false)
    expect(useCreationStore.getState().draft.skeleton).toHaveLength(2)

    // 5. 用户修改并接受 section
    useCreationStore.getState().updateSection('s1', { title: '现状分析' })
    useCreationStore.getState().toggleSectionAccepted('s1')
    expect(useCreationStore.getState().draft.skeleton?.[0].title).toBe('现状分析')
    expect(useCreationStore.getState().draft.skeleton?.[0].accepted).toBe(true)

    // 6. 删除一个 section
    useCreationStore.getState().removeSection('s2')
    expect(useCreationStore.getState().draft.skeleton).toHaveLength(1)

    // 7. 重置
    useCreationStore.getState().reset()
    expect(useCreationStore.getState().draft.topic).toBe('')
    expect(useCreationStore.getState().draft.skeleton).toBeNull()
  })
})
