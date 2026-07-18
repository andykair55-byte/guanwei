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

  connect(workspaceId: string) {
    if (this.workspaceId === workspaceId && this.socket?.readyState === WebSocket.OPEN) return

    this.disconnect()

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
