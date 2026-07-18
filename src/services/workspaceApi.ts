// src/services/workspaceApi.ts
const BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface WorkspaceDTO {
  workspace_id: string
  topic: string
  title: string
  status: string
  strategy: string
  platform_order: string[]
  draft: Record<string, unknown>
  platform_contents: Record<string, { title: string; content: string; generated: boolean; degraded?: boolean }>
  duration_ms: number
  error_message: string
  created_at: string
  updated_at: string
}

export interface PublishTaskDTO {
  id: number
  workspace_id: string
  platform: string
  title: string
  content: string
  publish_url: string
  status: 'pending' | 'copied' | 'published' | 'skipped'
  created_at: string
  operated_at: string | null
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `${res.status}` }))
    throw new Error(err.detail || err.message || `请求失败 ${res.status}`)
  }
  return res.json()
}

export const workspaceApi = {
  create: (data: { topic: string; platform_order?: string[]; title?: string }) =>
    request<WorkspaceDTO>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),

  list: (params?: { page?: number; size?: number; status?: string }) => {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.size) qs.set('size', String(params.size))
    if (params?.status) qs.set('status', params.status)
    return request<WorkspaceDTO[]>(`/workspaces?${qs}`)
  },

  get: (id: string) => request<WorkspaceDTO>(`/workspaces/${id}`),
  delete: (id: string) => request<{ success: boolean }>(`/workspaces/${id}`, { method: 'DELETE' }),

  run: (id: string, params: { strategy?: string; custom_dag?: Record<string, unknown> }) =>
    request<{ success: boolean; workspace_id: string; status: string }>(
      `/workspaces/${id}/run`,
      { method: 'POST', body: JSON.stringify({ strategy: 'dag', ...params }) }
    ),

  getRuns: (id: string) => request<Record<string, unknown>[]>(`/workspaces/${id}/runs`),

  createPublishTasks: (workspaceId: string, platforms: string[]) =>
    request<PublishTaskDTO[]>('/publish/queue', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId, platforms }),
    }),

  listPublishTasks: (status?: string) => {
    const qs = status ? `?status=${status}` : ''
    return request<PublishTaskDTO[]>(`/publish/tasks${qs}`)
  },

  updatePublishStatus: (taskId: number, status: 'copied' | 'published' | 'skipped') =>
    request<{ success: boolean; status: string }>(
      `/publish/tasks/${taskId}/status?status=${status}`,
      { method: 'PUT' }
    ),
}
