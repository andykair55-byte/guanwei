// src/components/debate/DebateOnboarding.tsx
// 辩论大厅新用户使用指南

import { useState, useEffect } from 'react'
import { Swords, Search, Mic, Trophy, X, ArrowRight } from 'lucide-react'

const STORAGE_KEY = 'debate-onboarding-done'

interface Step {
  icon: typeof Swords
  title: string
  desc: string
}

const STEPS: Step[] = [
  {
    icon: Swords,
    title: '选择模式',
    desc: '娱乐辩论是6人独立麦位，人人发言；国赛辩论是4v4严格赛制，有评委打分。',
  },
  {
    icon: Search,
    title: '搜索或匹配',
    desc: '输入房间号搜索指定房间，或点击「快速匹配」随机加入一场辩论。',
  },
  {
    icon: Mic,
    title: '上麦发言',
    desc: '娱乐模式：提交观点排队上麦，AI审核后按序发言；国赛模式：按辩位顺序依次发言。',
  },
  {
    icon: Trophy,
    title: '获得评分',
    desc: '娱乐模式按认真度和信息量评分，高分上高光榜；国赛模式由3位评委四维度打分。',
  },
]

export default function DebateOnboarding({ mode }: { mode: 'entertainment' | 'national' }) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem(`${STORAGE_KEY}-${mode}`)
    if (!done) setVisible(true)
  }, [mode])

  const handleClose = () => {
    localStorage.setItem(`${STORAGE_KEY}-${mode}`, '1')
    setVisible(false)
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      handleClose()
    }
  }

  if (!visible) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 引导卡片 */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[340px] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* 顶部色带 */}
        <div className={`h-1.5 ${mode === 'entertainment' ? 'bg-seal' : 'bg-ink-900'}`} />

        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 rounded-lg text-ink-300 hover:text-ink-600 hover:bg-paper-dark transition-colors"
        >
          <X size={16} />
        </button>

        <div className="p-6">
          {/* 步骤指示器 */}
          <div className="flex items-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'flex-1 bg-seal'
                    : i < step
                    ? 'w-4 bg-seal/40'
                    : 'w-4 bg-line/40'
                }`}
              />
            ))}
          </div>

          {/* 图标 */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
            mode === 'entertainment' ? 'bg-seal/10' : 'bg-ink-900/5'
          }`}>
            <Icon
              size={28}
              className={mode === 'entertainment' ? 'text-seal' : 'text-ink-700'}
            />
          </div>

          {/* 标题+描述 */}
          <h3 className="text-[16px] font-bold text-ink-900 mb-2">
            {current.title}
          </h3>
          <p className="text-[13px] text-ink-500 leading-relaxed mb-6">
            {current.desc}
          </p>

          {/* 底部操作 */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleClose}
              className="text-[12px] text-ink-400 hover:text-ink-600 transition-colors"
            >
              跳过
            </button>
            <button
              onClick={handleNext}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-transform active:scale-95 ${
                mode === 'entertainment' ? 'bg-seal' : 'bg-ink-900'
              }`}
            >
              {isLast ? '开始体验' : '下一步'}
              <ArrowRight size={14} />
            </button>
          </div>

          {/* 步骤计数 */}
          <p className="text-center text-[10px] text-ink-faint mt-3">
            {step + 1} / {STEPS.length}
          </p>
        </div>
      </div>
    </>
  )
}
