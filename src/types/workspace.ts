import type { CanonicalDraft } from './canonicalDraft'
import { createEmptyDraft } from './canonicalDraft'

export type WorkspaceStatus = 'active' | 'draft' | 'completed' | 'favorite' | 'archived'

export interface PlatformContent {
  content: string
  title: string
  generated: boolean
}

export interface Workspace {
  id: string
  title: string
  topic: string
  status: WorkspaceStatus
  createdAt: string
  updatedAt: string
  draft: CanonicalDraft
  platformContents: Record<string, PlatformContent>
  melonId?: string
}

export function createEmptyWorkspace(topic: string = ''): Workspace {
  const now = new Date().toISOString()
  return {
    id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: topic || '新工作空间',
    topic,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    draft: createEmptyDraft(topic),
    platformContents: {
      guanwei: { content: '', title: '', generated: false },
      douyin: { content: '', title: '', generated: false },
      weibo: { content: '', title: '', generated: false },
      zhihu: { content: '', title: '', generated: false },
      tieba: { content: '', title: '', generated: false },
      xiaohongshu: { content: '', title: '', generated: false },
    },
  }
}
