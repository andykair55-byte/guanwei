import type { CanonicalDraft } from './canonicalDraft'
import { createEmptyDraft } from './canonicalDraft'
import { getDefaultPlatforms } from '../config/platformTemplates'

export type WorkspaceStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'published'
  | 'tracking'
  | 'archived'
  | 'running'
  | 'partial'
  | 'failed'

export type WorkspaceTag = 'hotspot' | 'science' | 'meme' | 'opinion' | 'debunk' | string

export type WorkspaceSource =
  | { type: 'manual' }
  | { type: 'melon'; id: string }
  | { type: 'community'; id: string }
  | { type: 'template'; templateId: string }
  | { type: 'copy'; workspaceId: string }

export interface PlatformContent {
  title: string
  content: string
  generated: boolean
  overridden: boolean
  generatedAt?: string
  overriddenAt?: string
}

export interface WorkspaceSnapshot {
  id: string
  draft: CanonicalDraft
  platformContents: Record<string, PlatformContent>
  description: string
  createdAt: string
  locked: boolean
}

export interface Workspace {
  id: string
  title: string
  topic: string
  status: WorkspaceStatus
  isFavorite: boolean
  tags: WorkspaceTag[]
  source: WorkspaceSource
  platformOrder: string[]
  draft: CanonicalDraft
  platformContents: Record<string, PlatformContent>
  snapshots: WorkspaceSnapshot[]
  previousStatus?: WorkspaceStatus
  strategy?: string
  createdAt: string
  updatedAt: string
}

export function createEmptyWorkspace(
  topic: string = '',
  source: WorkspaceSource = { type: 'manual' },
  tags: WorkspaceTag[] = [],
  platformOrder?: string[],
): Workspace {
  const resolvedPlatformOrder = platformOrder || getDefaultPlatforms()
  const now = new Date().toISOString()
  const platformContents: Record<string, PlatformContent> = {}
  for (const p of resolvedPlatformOrder) {
    platformContents[p] = { title: '', content: '', generated: false, overridden: false }
  }
  return {
    id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: topic || '新工作空间',
    topic,
    status: 'draft',
    isFavorite: false,
    tags,
    source,
    platformOrder: resolvedPlatformOrder,
    draft: createEmptyDraft(topic),
    platformContents,
    snapshots: [],
    createdAt: now,
    updatedAt: now,
  }
}

export const ALL_PLATFORMS = ['guanwei', 'zhihu', 'xiaohongshu', 'weibo', 'douyin', 'tieba'] as const
