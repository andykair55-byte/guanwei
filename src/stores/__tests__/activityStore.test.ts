/**
 * activityStore 测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useActivityStore } from '../activityStore'
import { createEvent } from '../../types/activity'

describe('activityStore', () => {
  beforeEach(() => {
    useActivityStore.setState({
      eventsByWorkspace: {},
      filter: 'all',
    })
  })

  it('test_initial_state: 默认空 eventsByWorkspace 和 filter=all', () => {
    const state = useActivityStore.getState()
    expect(state.eventsByWorkspace).toEqual({})
    expect(state.filter).toBe('all')
  })

  it('test_addEvent_appends_to_workspace: 添加事件到指定 workspace', () => {
    const event = createEvent('info', 'orchestrator', '标题', '内容')
    useActivityStore.getState().addEvent('ws-1', event)

    const events = useActivityStore.getState().getEvents('ws-1')
    expect(events).toHaveLength(1)
    expect(events[0].id).toBe(event.id)
    expect(events[0].title).toBe('标题')
  })

  it('test_addEvent_isolates_workspaces: 不同 workspace 互不影响', () => {
    const e1 = createEvent('info', 'user', 'A', 'a')
    const e2 = createEvent('info', 'user', 'B', 'b')
    useActivityStore.getState().addEvent('ws-1', e1)
    useActivityStore.getState().addEvent('ws-2', e2)

    expect(useActivityStore.getState().getEvents('ws-1')).toHaveLength(1)
    expect(useActivityStore.getState().getEvents('ws-1')[0].title).toBe('A')
    expect(useActivityStore.getState().getEvents('ws-2')).toHaveLength(1)
    expect(useActivityStore.getState().getEvents('ws-2')[0].title).toBe('B')
  })

  it('test_addEvent_trims_to_max_200: 超过 200 条时裁剪到最近 200 条', () => {
    // 添加 210 条事件
    for (let i = 0; i < 210; i++) {
      useActivityStore.getState().addEvent('ws-trim', createEvent('info', 'user', `t-${i}`, `c-${i}`))
    }
    const events = useActivityStore.getState().getEvents('ws-trim')
    expect(events).toHaveLength(200)
    // 保留最近 200 条（即 t-10 到 t-209）
    expect(events[0].title).toBe('t-10')
    expect(events[199].title).toBe('t-209')
  })

  it('test_addEventSimple_creates_and_appends: 简化接口创建事件并追加', () => {
    const event = useActivityStore.getState().addEventSimple(
      'ws-1',
      'agent_started',
      'search',
      '搜索员启动',
      '正在搜集信息…',
      [{ id: 'go', label: '开始', style: 'primary' }],
    )

    expect(event.type).toBe('agent_started')
    expect(event.agentType).toBe('search')
    expect(event.title).toBe('搜索员启动')
    expect(event.actions).toHaveLength(1)
    expect(event.id).toMatch(/^evt-/)
    expect(event.timestamp).toBeGreaterThan(0)

    // 已追加到 workspace
    expect(useActivityStore.getState().getEvents('ws-1')[0].id).toBe(event.id)
  })

  it('test_clearEvents: 清空指定 workspace 事件', () => {
    useActivityStore.getState().addEvent('ws-1', createEvent('info', 'user', 'A', 'a'))
    useActivityStore.getState().addEvent('ws-1', createEvent('info', 'user', 'B', 'b'))
    expect(useActivityStore.getState().getEvents('ws-1')).toHaveLength(2)

    useActivityStore.getState().clearEvents('ws-1')
    expect(useActivityStore.getState().getEvents('ws-1')).toEqual([])
  })

  it('test_setFilter: 切换 filter', () => {
    expect(useActivityStore.getState().filter).toBe('all')
    useActivityStore.getState().setFilter('search')
    expect(useActivityStore.getState().filter).toBe('search')
    useActivityStore.getState().setFilter('orchestrator')
    expect(useActivityStore.getState().filter).toBe('orchestrator')
  })

  it('test_getEvents_unknown_workspace_returns_empty: 未知 workspace 返回空数组', () => {
    expect(useActivityStore.getState().getEvents('never-exists')).toEqual([])
  })

  it('test_getFilteredEvents_all: filter=all 返回全部', () => {
    useActivityStore.getState().addEvent('ws-1', createEvent('info', 'search', 'A', 'a'))
    useActivityStore.getState().addEvent('ws-1', createEvent('info', 'writing', 'B', 'b'))

    const filtered = useActivityStore.getState().getFilteredEvents('ws-1')
    expect(filtered).toHaveLength(2)
  })

  it('test_getFilteredEvents_by_agentType: 按 agentType 过滤', () => {
    useActivityStore.getState().addEvent('ws-1', createEvent('info', 'search', 'A', 'a'))
    useActivityStore.getState().addEvent('ws-1', createEvent('info', 'writing', 'B', 'b'))
    useActivityStore.getState().addEvent('ws-1', createEvent('info', 'search', 'C', 'c'))

    useActivityStore.getState().setFilter('search')
    const filtered = useActivityStore.getState().getFilteredEvents('ws-1')
    expect(filtered).toHaveLength(2)
    expect(filtered.every(e => e.agentType === 'search')).toBe(true)

    useActivityStore.getState().setFilter('writing')
    expect(useActivityStore.getState().getFilteredEvents('ws-1')).toHaveLength(1)
  })

  it('test_loadDemoEvents_loads_when_empty: 空 workspace 加载 demo 事件', () => {
    useActivityStore.getState().loadDemoEvents('ws-demo')
    const events = useActivityStore.getState().getEvents('ws-demo')
    // DEMO_EVENTS 共 12 条
    expect(events.length).toBeGreaterThan(0)
    expect(events[0].id).toMatch(/^demo-evt-/)
    // 第一条是 commander_welcome
    expect(events[0].type).toBe('commander_welcome')
    expect(events[0].agentType).toBe('orchestrator')
  })

  it('test_loadDemoEvents_skips_when_non_empty: 已有事件时不覆盖', () => {
    // 先放一条自定义事件
    const existing = createEvent('info', 'user', '已有', '存在')
    useActivityStore.getState().addEvent('ws-demo-2', existing)

    useActivityStore.getState().loadDemoEvents('ws-demo-2')

    const events = useActivityStore.getState().getEvents('ws-demo-2')
    // 仍是原有事件，未被 demo 覆盖
    expect(events).toHaveLength(1)
    expect(events[0].id).toBe(existing.id)
  })
})
