// src/__tests__/services/workspaceSocket.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { workspaceSocket } from '../../services/workspaceSocket'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  readyState = WebSocket.OPEN
  onmessage: ((e: any) => void) | null = null
  onclose: (() => void) | null = null
  onopen: (() => void) | null = null
  send = vi.fn()
  close = vi.fn()
  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }
}

describe('workspaceSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    global.WebSocket = MockWebSocket as any
    workspaceSocket.disconnect()
  })

  it('connect 应创建 WebSocket', () => {
    workspaceSocket.connect('ws-1')
    expect(MockWebSocket.instances.length).toBe(1)
    expect(MockWebSocket.instances[0].url).toContain('ws-1')
  })

  it('onEvent handler 应收到解析后的事件', () => {
    const handler = vi.fn()
    workspaceSocket.onEvent(handler)
    workspaceSocket.connect('ws-1')

    const event = { id: 'evt-1', type: 'agent_started', agentType: 'search', title: 't', content: 'c', timestamp: 0 }
    MockWebSocket.instances[0].onmessage!({ data: JSON.stringify(event) })

    expect(handler).toHaveBeenCalledWith(event)
  })

  it('disconnect 应关闭 socket', () => {
    workspaceSocket.connect('ws-1')
    const socket = MockWebSocket.instances[0]
    workspaceSocket.disconnect()
    expect(socket.close).toHaveBeenCalled()
  })
})
