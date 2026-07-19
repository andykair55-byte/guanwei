/**
 * notificationStore 测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useNotificationStore, MOCK_NOTIFICATIONS } from '../notificationStore'

describe('notificationStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useNotificationStore.setState({
      notifications: MOCK_NOTIFICATIONS,
      activeTab: 'all',
    })
  })

  it('test_initial_unread_count: 初始未读数正确', () => {
    const count = useNotificationStore.getState().unreadCount()
    // MOCK_NOTIFICATIONS 中 read=false 的有: n1, n2, n3, n5 = 4 条
    expect(count).toBe(4)
    expect(useNotificationStore.getState().notifications).toHaveLength(8)
    expect(useNotificationStore.getState().activeTab).toBe('all')
  })

  it('test_mark_all_read: 全部标记已读后未读数为 0', () => {
    useNotificationStore.getState().markAllRead()

    const state = useNotificationStore.getState()
    expect(state.unreadCount()).toBe(0)
    for (const n of state.notifications) {
      expect(n.read).toBe(true)
    }
  })

  it('test_mark_one_read: 单条标记已读', () => {
    const n1 = useNotificationStore.getState().notifications.find(n => n.id === 'n1')
    expect(n1?.read).toBe(false)

    useNotificationStore.getState().markRead('n1')

    const state = useNotificationStore.getState()
    const updated = state.notifications.find(n => n.id === 'n1')
    expect(updated?.read).toBe(true)
    expect(state.unreadCount()).toBe(3)
  })

  it('test_mark_unread: 将已读标记为未读', () => {
    const n4 = useNotificationStore.getState().notifications.find(n => n.id === 'n4')
    expect(n4?.read).toBe(true)

    useNotificationStore.getState().markUnread('n4')

    const state = useNotificationStore.getState()
    const updated = state.notifications.find(n => n.id === 'n4')
    expect(updated?.read).toBe(false)
    expect(state.unreadCount()).toBe(5)
  })

  it('test_persistence: persist 中间件配置正确', () => {
    useNotificationStore.getState().addNotification({
      id: 'test-new',
      type: 'system',
      username: '测试用户',
      avatar: '测',
      action: '测试通知',
      content: '这是一条测试通知',
      time: '刚刚',
      read: false,
    })

    const persisted = localStorage.getItem('guanwei-notifications')
    expect(persisted).toBeTruthy()

    const parsed = JSON.parse(persisted!)
    expect(parsed.state.notifications).toBeDefined()
    const hasNew = parsed.state.notifications.some((n: any) => n.id === 'test-new')
    expect(hasNew).toBe(true)
  })

  it('test_delete_notification: 删除单条通知', () => {
    const initialCount = useNotificationStore.getState().notifications.length

    useNotificationStore.getState().deleteNotification('n1')

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(initialCount - 1)
    expect(state.notifications.find(n => n.id === 'n1')).toBeUndefined()
  })

  it('test_clear_all: 清空所有通知', () => {
    useNotificationStore.getState().clearAll()

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(0)
    expect(state.unreadCount()).toBe(0)
  })

  it('test_set_active_tab: 切换通知标签', () => {
    useNotificationStore.getState().setActiveTab('like')
    expect(useNotificationStore.getState().activeTab).toBe('like')

    useNotificationStore.getState().setActiveTab('comment')
    expect(useNotificationStore.getState().activeTab).toBe('comment')

    useNotificationStore.getState().setActiveTab('all')
    expect(useNotificationStore.getState().activeTab).toBe('all')
  })
})
