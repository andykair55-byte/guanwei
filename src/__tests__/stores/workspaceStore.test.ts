// src/__tests__/stores/workspaceStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/workspaceApi', () => ({
  workspaceApi: {
    create: vi.fn().mockResolvedValue({
      workspace_id: 'ws-1', topic: '测试', title: '测试', status: 'draft',
      strategy: 'dag', platform_order: ['guanwei'], draft: {}, platform_contents: {},
      duration_ms: 0, error_message: '', created_at: '', updated_at: '',
    }),
    list: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ success: true, workspace_id: 'ws-1', status: 'running' }),
  },
}))

describe('workspaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createWorkspace 应调用 API', async () => {
    const { useWorkspaceStore } = await import('../../stores/workspaceStore')
    const store = useWorkspaceStore.getState()
    await store.createWorkspace({ topic: '测试' })
    const { workspaceApi } = await import('../../services/workspaceApi')
    expect(workspaceApi.create).toHaveBeenCalled()
  })
})
