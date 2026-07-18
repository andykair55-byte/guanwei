// src/__tests__/services/workspaceApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { workspaceApi } from '../../services/workspaceApi'

global.fetch = vi.fn()
global.localStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
} as any

describe('workspaceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('create 应 POST 到 /workspaces', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workspace_id: 'ws-1', topic: '测试', status: 'draft' }),
    })

    const result = await workspaceApi.create({ topic: '测试' })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/workspaces'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.workspace_id).toBe('ws-1')
  })

  it('get 应 GET 到 /workspaces/{id}', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workspace_id: 'ws-1' }),
    })

    await workspaceApi.get('ws-1')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/workspaces/ws-1'),
      expect.any(Object)
    )
  })

  it('请求失败应抛错', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'not found' }),
    })

    await expect(workspaceApi.get('bad-id')).rejects.toThrow('not found')
  })
})
