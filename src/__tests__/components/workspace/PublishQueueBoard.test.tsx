// src/__tests__/components/workspace/PublishQueueBoard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PublishQueueBoard from '../../../components/workspace/PublishQueueBoard'

vi.mock('../../../services/workspaceApi', () => ({
  workspaceApi: {
    createPublishTasks: vi.fn().mockResolvedValue([
      { id: 1, workspace_id: 'ws-1', platform: 'guanwei', title: 't1', content: 'c1', publish_url: '/publish', status: 'pending', created_at: '', operated_at: null },
    ]),
    updatePublishStatus: vi.fn().mockResolvedValue({ success: true }),
  },
}))

vi.mock('../../../config/platformTemplates', () => ({
  PLATFORM_TEMPLATES: {
    guanwei: { name: '观微', icon: '🍉', maxLength: 1500 },
    zhihu: { name: '知乎', icon: '📖', maxLength: 2000 },
  },
}))

describe('PublishQueueBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('显示平台选择阶段', () => {
    render(
      <PublishQueueBoard
        workspaceId="ws-1"
        platformContents={{ guanwei: { title: 't', content: 'c', generated: true } }}
      />
    )
    expect(screen.getByText('发布队列')).toBeInTheDocument()
    expect(screen.getByText('观微')).toBeInTheDocument()
  })

  it('点击创建按钮应调用 API', async () => {
    const { workspaceApi } = await import('../../../services/workspaceApi')
    render(
      <PublishQueueBoard
        workspaceId="ws-1"
        platformContents={{ guanwei: { title: 't', content: 'c', generated: true } }}
      />
    )
    fireEvent.click(screen.getByText(/创建.*发布任务/))
    await waitFor(() => {
      expect(workspaceApi.createPublishTasks).toHaveBeenCalledWith('ws-1', ['guanwei'])
    })
  })

  it('降级内容应显示降级徽章', () => {
    render(
      <PublishQueueBoard
        workspaceId="ws-1"
        platformContents={{ guanwei: { title: 't', content: 'c', generated: true, degraded: true } }}
      />
    )
    expect(screen.getByText('降级')).toBeInTheDocument()
  })
})
