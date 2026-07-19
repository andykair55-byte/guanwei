/**
 * sidebarStore 测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useSidebarStore, ALL_NAV_ITEMS } from '../sidebarStore'

describe('sidebarStore', () => {
  beforeEach(() => {
    localStorage.clear()
    // 重置为默认 state：仅 isDefault=true 的项
    const DEFAULT_ENABLED = ALL_NAV_ITEMS.filter(item => item.isDefault).map(item => item.id)
    useSidebarStore.setState({ enabledItems: DEFAULT_ENABLED })
  })

  it('test_initial_state: 默认启用所有 isDefault=true 的项', () => {
    const { enabledItems } = useSidebarStore.getState()
    // ALL_NAV_ITEMS 中 isDefault=true 的项：melon, community, hot, verify, agent-world, entertainment, settings
    expect(enabledItems).toEqual([
      'melon',
      'community',
      'hot',
      'verify',
      'agent-world',
      'entertainment',
      'settings',
    ])
  })

  it('test_addItem_new: 添加新项到末尾', () => {
    const before = useSidebarStore.getState().enabledItems.length
    useSidebarStore.getState().addItem('notes')

    const { enabledItems } = useSidebarStore.getState()
    expect(enabledItems).toHaveLength(before + 1)
    expect(enabledItems).toContain('notes')
    // 新项加在末尾
    expect(enabledItems[enabledItems.length - 1]).toBe('notes')
  })

  it('test_addItem_duplicate: 已存在的项不重复添加', () => {
    const before = useSidebarStore.getState().enabledItems.length
    // 'melon' 是默认项，已在列表中
    useSidebarStore.getState().addItem('melon')
    expect(useSidebarStore.getState().enabledItems).toHaveLength(before)
    // 只有一个 melon
    expect(useSidebarStore.getState().enabledItems.filter(id => id === 'melon')).toHaveLength(1)
  })

  it('test_removeItem: 移除已存在的项', () => {
    // 先添加非默认项
    useSidebarStore.getState().addItem('tools/exif')
    expect(useSidebarStore.getState().enabledItems).toContain('tools/exif')

    useSidebarStore.getState().removeItem('tools/exif')
    expect(useSidebarStore.getState().enabledItems).not.toContain('tools/exif')
  })

  it('test_removeItem_default: 默认项也可移除', () => {
    useSidebarStore.getState().removeItem('settings')
    expect(useSidebarStore.getState().enabledItems).not.toContain('settings')
  })

  it('test_removeItem_keeps_at_least_one: 移除到最后一项时保留', () => {
    // 重置为只剩一个项
    useSidebarStore.setState({ enabledItems: ['melon'] })

    // 尝试移除最后一项
    useSidebarStore.getState().removeItem('melon')
    // 保底：仍保留 1 个
    expect(useSidebarStore.getState().enabledItems).toHaveLength(1)
    expect(useSidebarStore.getState().enabledItems).toEqual(['melon'])
  })

  it('test_add_then_remove_roundtrip: 添加后移除回到原长度', () => {
    const before = useSidebarStore.getState().enabledItems.length

    useSidebarStore.getState().addItem('admin')
    expect(useSidebarStore.getState().enabledItems).toHaveLength(before + 1)

    useSidebarStore.getState().removeItem('admin')
    expect(useSidebarStore.getState().enabledItems).toHaveLength(before)
  })

  it('test_ALL_NAV_ITEMS_structure: 所有项都有必需字段', () => {
    for (const item of ALL_NAV_ITEMS) {
      expect(typeof item.id).toBe('string')
      expect(item.id.length).toBeGreaterThan(0)
      expect(item.path.startsWith('/')).toBe(true)
      expect(typeof item.label).toBe('string')
      expect(typeof item.icon).toBe('string')
      expect([1, 2, 3]).toContain(item.group)
      expect(typeof item.isDefault).toBe('boolean')
    }
  })
})
