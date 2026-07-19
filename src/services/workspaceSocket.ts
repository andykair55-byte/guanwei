// src/services/workspaceSocket.ts
import type { ActivityEvent } from '../types/activity'

const BASE_WS = (import.meta.env.VITE_API_BASE_URL || '').replace(/^http/, 'ws')

type EventHandler = (event: ActivityEvent) => void

class WorkspaceSocket {
  private socket: WebSocket | null = null
  private workspaceId: string | null = null
  private handlers: Set<EventHandler> = new Set()
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0
  private maxReconnect = 5
  // 50ms debounce：连续 currentId 变化时只连接最后一个，避免 WS 抖动
  private connectTimer: number | null = null
  private pendingWorkspaceId: string | null = null
  private readonly connectDebounceMs = 50

  connect(workspaceId: string) {
    // 同 ID 守卫：已连接到相同 workspace 且 socket 处于 OPEN 时直接返回
    if (this.workspaceId === workspaceId && this.socket?.readyState === WebSocket.OPEN) return

    // debounce：记下 pending id，50ms 后再真正建立连接
    // 50ms 内若又收到新的 connect 调用，直接覆盖 pendingWorkspaceId
    this.pendingWorkspaceId = workspaceId
    if (this.connectTimer !== null) {
      clearTimeout(this.connectTimer)
    }
    this.connectTimer = window.setTimeout(() => {
      this.connectTimer = null
      const id = this.pendingWorkspaceId
      this.pendingWorkspaceId = null
      if (id === null) return
      this.doConnect(id)
    }, this.connectDebounceMs)
  }

  private doConnect(workspaceId: string) {
    // 取消可能挂起的 reconnect 定时器，我们要建立全新连接
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    // 关闭旧 socket（不调 disconnect，避免清掉 pendingWorkspaceId 相关状态）
    this.socket?.close()
    this.socket = null

    this.workspaceId = workspaceId
    this.reconnectAttempts = 0
    this.socket = new WebSocket(`${BASE_WS}/workspaces/${workspaceId}/ws`)

    this.socket.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as ActivityEvent
        this.handlers.forEach(h => h(event))
      } catch (err) {
        console.error('[WorkspaceSocket] 解析事件失败:', err)
      }
    }

    this.socket.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnect && this.workspaceId) {
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)
        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectAttempts++
          this.connect(this.workspaceId!)
        }, delay)
      }
    }

    this.socket.onopen = () => {
      this.reconnectAttempts = 0
    }
  }

  disconnect() {
    // 取消 pending 的 debounce 定时器
    if (this.connectTimer !== null) {
      clearTimeout(this.connectTimer)
      this.connectTimer = null
    }
    this.pendingWorkspaceId = null

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = this.maxReconnect
    this.socket?.close()
    this.socket = null
    this.workspaceId = null
  }

  onEvent(handler: EventHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  send(message: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(message)
    }
  }
}

export const workspaceSocket = new WorkspaceSocket()
