// src/components/workspace/PublishQueueBoard.tsx
import { useState, useEffect } from 'react'
import { workspaceApi, type PublishTaskDTO } from '../../services/workspaceApi'
import { PLATFORM_TEMPLATES } from '../../config/platformTemplates'

interface Props {
  workspaceId: string
  platformContents: Record<string, { title: string; content: string; generated: boolean; degraded?: boolean }>
}

export default function PublishQueueBoard({ workspaceId, platformContents }: Props) {
  const [tasks, setTasks] = useState<PublishTaskDTO[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const generated = Object.entries(platformContents)
      .filter(([_, c]) => c.generated)
      .map(([p]) => p)
    setSelectedPlatforms(new Set(generated))
  }, [platformContents])

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev)
      if (next.has(platform)) next.delete(platform)
      else next.add(platform)
      return next
    })
  }

  const handleCreateTasks = async () => {
    setLoading(true)
    try {
      const created = await workspaceApi.createPublishTasks(
        workspaceId,
        Array.from(selectedPlatforms)
      )
      setTasks(created)
    } catch (err) {
      console.error('创建发布任务失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (task: PublishTaskDTO) => {
    try {
      await navigator.clipboard.writeText(`${task.title}\n\n${task.content}`)
      await workspaceApi.updatePublishStatus(task.id, 'copied')
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'copied' } : t))
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  const handleOpenPublish = (task: PublishTaskDTO) => {
    if (task.publish_url) window.open(task.publish_url, '_blank')
  }

  const handleSkip = async (task: PublishTaskDTO) => {
    await workspaceApi.updatePublishStatus(task.id, 'skipped')
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'skipped' } : t))
  }

  // 阶段 1：选择平台
  if (tasks.length === 0) {
    return (
      <div className="mt-6 p-5 bg-white rounded-xl border border-[#dadce0]">
        <h3 className="text-[15px] font-semibold text-[#202124] mb-1">发布队列</h3>
        <p className="text-[12px] text-[#5f6368] mb-4">选择要发布的平台，生成发布任务</p>

        <div className="space-y-2 mb-4">
          {Object.entries(platformContents).map(([platform, content]) => {
            const template = PLATFORM_TEMPLATES[platform as keyof typeof PLATFORM_TEMPLATES]
            if (!template) return null
            return (
              <label key={platform} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#f8f9fa] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.has(platform)}
                  onChange={() => togglePlatform(platform)}
                  className="w-4 h-4"
                />
                <span className="text-[18px]">{template.icon}</span>
                <span className="text-[13px] font-medium text-[#202124]">{template.name}</span>
                {content.degraded && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-[#fef7e0] text-[#b06000] rounded">
                    降级
                  </span>
                )}
                <span className="ml-auto text-[11px] text-[#80868b]">
                  {content.content.length} / {template.maxLength}
                </span>
              </label>
            )
          })}
        </div>

        <button
          onClick={handleCreateTasks}
          disabled={selectedPlatforms.size === 0 || loading}
          className="px-4 py-2 bg-[#1a73e8] text-white text-[13px] font-medium rounded-lg hover:bg-[#1557b0] disabled:opacity-50"
        >
          {loading ? '创建中...' : `创建 ${selectedPlatforms.size} 个发布任务`}
        </button>
      </div>
    )
  }

  // 阶段 2：任务列表
  return (
    <div className="mt-6 p-5 bg-white rounded-xl border border-[#dadce0]">
      <h3 className="text-[15px] font-semibold text-[#202124] mb-4">发布队列</h3>
      <div className="space-y-3">
        {tasks.map(task => {
          const template = PLATFORM_TEMPLATES[task.platform as keyof typeof PLATFORM_TEMPLATES]
          const statusLabel = {
            pending: '待发布',
            copied: '已复制',
            published: '已发布',
            skipped: '已跳过',
          }[task.status]
          return (
            <div key={task.id} className={`p-3 rounded-lg border ${task.status === 'pending' ? 'border-[#dadce0]' : 'border-[#e8eaed] opacity-70'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[16px]">{template?.icon}</span>
                <span className="text-[13px] font-medium text-[#202124]">{template?.name}</span>
                <span className="ml-auto text-[11px] text-[#5f6368]">{statusLabel}</span>
              </div>
              <div className="text-[12px] text-[#3c4043] mb-1 truncate">{task.title}</div>
              <div className="text-[11px] text-[#5f6368] mb-3 line-clamp-2">{task.content}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(task)}
                  className="px-2.5 py-1 text-[11px] bg-[#f1f3f4] text-[#3c4043] rounded hover:bg-[#e8eaed]"
                >
                  复制内容
                </button>
                {task.publish_url && (
                  <button
                    onClick={() => handleOpenPublish(task)}
                    className="px-2.5 py-1 text-[11px] bg-[#f1f3f4] text-[#3c4043] rounded hover:bg-[#e8eaed]"
                  >
                    打开发布页
                  </button>
                )}
                <button
                  onClick={() => handleSkip(task)}
                  className="px-2.5 py-1 text-[11px] text-[#5f6368] hover:text-[#d93025]"
                >
                  跳过
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
