/**
 * xiaoWeiStore 测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useXiaoWeiStore } from '../xiaoWeiStore'

describe('xiaoWeiStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useXiaoWeiStore.setState({
      conversations: [],
      activeId: null,
      isOpen: false,
      showHistory: false,
      pageContext: null,
      isTyping: false,
      lastMessageTime: 0,
      messageCount: 0,
      minuteStart: Date.now(),
    })
  })

  it('test_canSendMessage_within_limit: 1 分钟内 3 条以内返回 true', () => {
    const store = useXiaoWeiStore.getState()

    expect(store.canSendMessage()).toBe(true)

    useXiaoWeiStore.setState({ messageCount: 1, minuteStart: Date.now() })
    expect(useXiaoWeiStore.getState().canSendMessage()).toBe(true)

    useXiaoWeiStore.setState({ messageCount: 2, minuteStart: Date.now() })
    expect(useXiaoWeiStore.getState().canSendMessage()).toBe(true)
  })

  it('test_canSendMessage_exceed_limit: 第 4 条返回 false', () => {
    useXiaoWeiStore.setState({ messageCount: 3, minuteStart: Date.now() })
    expect(useXiaoWeiStore.getState().canSendMessage()).toBe(false)
  })

  it('test_canSendMessage_resets_after_1_minute', () => {
    useXiaoWeiStore.setState({
      messageCount: 3,
      minuteStart: Date.now() - 61000,
    })

    expect(useXiaoWeiStore.getState().canSendMessage()).toBe(true)
    expect(useXiaoWeiStore.getState().messageCount).toBe(0)
  })

  it('test_addMessage_creates_conversation: 无活跃会话时自动创建', () => {
    expect(useXiaoWeiStore.getState().activeId).toBeNull()
    expect(useXiaoWeiStore.getState().conversations).toHaveLength(0)

    useXiaoWeiStore.getState().addMessage({
      role: 'user',
      content: '你好，帮我分析一下这个瓜',
    })

    const state = useXiaoWeiStore.getState()
    expect(state.activeId).not.toBeNull()
    expect(state.conversations).toHaveLength(1)
    expect(state.conversations[0].messages).toHaveLength(1)
    expect(state.conversations[0].messages[0].content).toBe('你好，帮我分析一下这个瓜')
    expect(state.conversations[0].messages[0].role).toBe('user')
    expect(state.conversations[0].title).toContain('你好，帮我分析')
    expect(state.messageCount).toBe(1)
    expect(state.lastMessageTime).toBeGreaterThan(0)
  })

  it('test_addMessage_appends_to_existing: 已有会话时追加', () => {
    useXiaoWeiStore.getState().addMessage({
      role: 'user',
      content: '第一条消息',
    })

    const activeId = useXiaoWeiStore.getState().activeId
    expect(activeId).not.toBeNull()

    useXiaoWeiStore.getState().addMessage({
      role: 'assistant',
      content: '这是回复',
    })

    const state = useXiaoWeiStore.getState()
    expect(state.conversations).toHaveLength(1)
    expect(state.conversations[0].messages).toHaveLength(2)
    expect(state.conversations[0].messages[1].content).toBe('这是回复')
    expect(state.conversations[0].messages[1].role).toBe('assistant')
    expect(state.activeId).toBe(activeId)
    expect(state.messageCount).toBe(2)
  })

  it('test_newConversation_resets_active: activeId 置 null', () => {
    useXiaoWeiStore.getState().addMessage({ role: 'user', content: 'hi' })
    expect(useXiaoWeiStore.getState().activeId).not.toBeNull()

    useXiaoWeiStore.getState().newConversation()

    const state = useXiaoWeiStore.getState()
    expect(state.activeId).toBeNull()
    expect(state.showHistory).toBe(false)
    expect(state.conversations.length).toBeGreaterThan(0)
  })

  it('test_toggleOpen_and_setOpen: 开关状态切换', () => {
    expect(useXiaoWeiStore.getState().isOpen).toBe(false)

    useXiaoWeiStore.getState().toggleOpen()
    expect(useXiaoWeiStore.getState().isOpen).toBe(true)

    useXiaoWeiStore.getState().toggleOpen()
    expect(useXiaoWeiStore.getState().isOpen).toBe(false)

    useXiaoWeiStore.getState().setOpen(true)
    expect(useXiaoWeiStore.getState().isOpen).toBe(true)
  })

  it('test_deleteConversation: 删除会话', () => {
    useXiaoWeiStore.getState().addMessage({ role: 'user', content: 'conv1' })
    const conv1Id = useXiaoWeiStore.getState().activeId!

    useXiaoWeiStore.getState().newConversation()
    useXiaoWeiStore.getState().addMessage({ role: 'user', content: 'conv2' })
    const conv2Id = useXiaoWeiStore.getState().activeId!

    expect(useXiaoWeiStore.getState().conversations).toHaveLength(2)

    useXiaoWeiStore.getState().deleteConversation(conv1Id)
    expect(useXiaoWeiStore.getState().conversations).toHaveLength(1)
    expect(useXiaoWeiStore.getState().conversations[0].id).toBe(conv2Id)

    useXiaoWeiStore.getState().deleteConversation(conv2Id)
    expect(useXiaoWeiStore.getState().activeId).toBeNull()
    expect(useXiaoWeiStore.getState().conversations).toHaveLength(0)
  })

  it('test_switchConversation: 切换活跃会话', () => {
    useXiaoWeiStore.getState().addMessage({ role: 'user', content: 'conv1' })
    const conv1Id = useXiaoWeiStore.getState().activeId!

    useXiaoWeiStore.getState().newConversation()
    useXiaoWeiStore.getState().addMessage({ role: 'user', content: 'conv2' })

    useXiaoWeiStore.getState().switchConversation(conv1Id)
    expect(useXiaoWeiStore.getState().activeId).toBe(conv1Id)
    expect(useXiaoWeiStore.getState().showHistory).toBe(false)

    const active = useXiaoWeiStore.getState().getActive()
    expect(active).not.toBeNull()
    expect(active?.id).toBe(conv1Id)
    expect(active?.messages[0].content).toBe('conv1')
  })
})
