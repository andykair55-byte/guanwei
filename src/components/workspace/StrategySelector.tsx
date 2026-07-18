// src/components/workspace/StrategySelector.tsx
import { useState } from 'react'

interface StrategyOption {
  value: string
  label: string
  description: string
  disabled?: boolean
}

const STRATEGIES: StrategyOption[] = [
  { value: 'dag', label: 'DAG 并行', description: '搜索+研究并行，推荐默认' },
  { value: 'serial', label: '串行管线', description: '顺序执行，调试用' },
  { value: 'dynamic', label: '动态调度', description: '指挥官决策路径（第二版）', disabled: true },
  { value: 'custom', label: '自定义', description: '可视化 DAG 编辑器（第三版）', disabled: true },
]

interface Props {
  value: string
  onChange: (strategy: string) => void
  recommended?: string
}

export default function StrategySelector({ value, onChange, recommended }: Props) {
  const [open, setOpen] = useState(false)
  const current = STRATEGIES.find(s => s.value === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-md border border-[#dadce0] hover:bg-[#f1f3f4] text-[#3c4043]"
        title="编排策略"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="12" cy="18" r="3" />
          <path d="M6 9v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V9" />
        </svg>
        <span>{current?.label || 'DAG'}</span>
        {recommended && recommended !== value && (
          <span className="px-1 py-0.5 text-[10px] bg-[#e8f0fe] text-[#1a73e8] rounded">
            推荐
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-lg border border-[#dadce0] shadow-lg py-1 min-w-[240px]">
            {STRATEGIES.map(s => (
              <button
                key={s.value}
                type="button"
                disabled={s.disabled}
                onClick={() => {
                  if (!s.disabled) {
                    onChange(s.value)
                    setOpen(false)
                  }
                }}
                className={`w-full text-left px-3 py-2 hover:bg-[#f1f3f4] disabled:opacity-40 disabled:cursor-not-allowed ${
                  value === s.value ? 'bg-[#e8f0fe]' : ''
                }`}
              >
                <div className="text-[13px] font-medium text-[#202124]">{s.label}</div>
                <div className="text-[11px] text-[#5f6368]">{s.description}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
