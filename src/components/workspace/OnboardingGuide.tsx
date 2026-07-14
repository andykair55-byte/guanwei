import { useState, useEffect, useRef, useCallback } from 'react'

interface OnboardingGuideProps {
  onComplete: () => void
}

type Placement = 'center' | 'right' | 'bottom' | 'left'

interface StepConfig {
  target: string | null
  title: string
  description: string
  placement: Placement
}

const STEPS: StepConfig[] = [
  {
    target: null,
    title: '欢迎来到工作间',
    description: '这里是你的创作工作台。把一个话题变成多平台内容，AI Agent 全程协助你。',
    placement: 'center',
  },
  {
    target: '.ws-sidebar',
    title: '工作空间列表',
    description: '每个话题一个工作空间。点这里切换、创建、收藏你的项目。',
    placement: 'right',
  },
  {
    target: '.ws-center',
    title: '多平台适配',
    description: '写好主稿后，一键生成知乎、小红书、微博等多平台版本。上方平台标签可自由增减。',
    placement: 'bottom',
  },
  {
    target: '.ws-activity',
    title: 'Agent 协作流',
    description: '搜索、研究、核查、写作 Agent 在这里汇报进展。点击事件卡片可以采纳结果或重新执行。',
    placement: 'left',
  },
]

const PAD = 8
const GAP = 20
const TOOLTIP_W = 320

export default function OnboardingGuide({ onComplete }: OnboardingGuideProps) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const rafRef = useRef(0)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const hasTarget = !!current.target && !!rect

  const measure = useCallback(() => {
    if (!current.target) {
      setRect(null)
      return
    }
    const el = document.querySelector(current.target)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [current.target])

  useEffect(() => {
    measure()
  }, [step, measure])

  useEffect(() => {
    const handler = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(measure)
    }
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler, true)
      cancelAnimationFrame(rafRef.current)
    }
  }, [measure])

  const handleNext = () => {
    if (isLast) onComplete()
    else setStep(s => s + 1)
  }

  // ── Tooltip wrapper positioning ──
  let wrapperStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    maxWidth: 'calc(100vw - 40px)',
  }
  if (!hasTarget) {
    wrapperStyle = { ...wrapperStyle, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  } else if (current.placement === 'right') {
    wrapperStyle = { ...wrapperStyle, left: rect!.right + GAP, top: rect!.top + rect!.height / 2, transform: 'translateY(-50%)', width: TOOLTIP_W }
  } else if (current.placement === 'left') {
    wrapperStyle = { ...wrapperStyle, left: rect!.left - GAP - TOOLTIP_W, top: rect!.top + rect!.height / 2, transform: 'translateY(-50%)', width: TOOLTIP_W }
  } else if (current.placement === 'bottom') {
    wrapperStyle = { ...wrapperStyle, left: rect!.left + rect!.width / 2, bottom: 72, transform: 'translateX(-50%)', width: TOOLTIP_W }
  }

  // ── Highlight box (always rendered; 0×0 at center for step 1) ──
  const highlightStyle: React.CSSProperties = hasTarget
    ? {
        position: 'fixed',
        top: rect!.top - PAD,
        left: rect!.left - PAD,
        width: rect!.width + PAD * 2,
        height: rect!.height + PAD * 2,
        borderRadius: 10,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
        border: '2px solid rgba(16,185,129,0.55)',
        transition: 'all 0.25s ease',
        zIndex: 9998,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        borderRadius: 10,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
        border: '2px solid transparent',
        transition: 'all 0.25s ease',
        zIndex: 9998,
      }

  const arrowPlacement = hasTarget ? current.placement : ''

  return (
    <>
      <style>{`
        @keyframes og-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes og-fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .og-overlay { animation: og-fade-in 0.2s ease both; }
        .og-tip { animation: og-fade-in-up 0.3s ease both; }
        .og-arrow-l {
          position: absolute; left: -8px; top: 50%;
          transform: translateY(-50%);
          width: 0; height: 0;
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-right: 8px solid #1a1a1a;
        }
        .og-arrow-r {
          position: absolute; right: -8px; top: 50%;
          transform: translateY(-50%);
          width: 0; height: 0;
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-left: 8px solid #1a1a1a;
        }
        .og-arrow-t {
          position: absolute; top: -8px; left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 8px solid #1a1a1a;
        }
        @media (prefers-reduced-motion: reduce) {
          .og-overlay, .og-tip {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* Full-screen click capture (prevents workspace interaction during onboarding) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9997 }} />

      {/* Highlight box — provides dimming via box-shadow spread */}
      <div className="og-overlay" style={highlightStyle} />

      {/* Tooltip */}
      <div style={wrapperStyle}>
        <div
          key={step}
          className="og-tip bg-ink-800 text-white rounded-xl px-5 py-4"
          style={{ position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        >
          {arrowPlacement === 'right' && <div className="og-arrow-l" />}
          {arrowPlacement === 'left' && <div className="og-arrow-r" />}
          {arrowPlacement === 'bottom' && <div className="og-arrow-t" />}

          <h3 className="text-[15px] font-semibold mb-1.5 tracking-tight">
            {current.title}
          </h3>
          <p className="text-[13px] leading-[1.65] text-white/75">
            {current.description}
          </p>

          {/* Footer: step indicator + buttons */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: i === step ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === step ? '#10b981' : 'rgba(255,255,255,0.3)',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
              <span className="text-[11px] text-white/50 ml-1.5 tabular-nums">
                {step + 1}/{STEPS.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onComplete}
                className="text-[12px] text-white/55 hover:text-white/90 transition-colors px-2 py-1"
              >
                跳过
              </button>
              <button
                onClick={handleNext}
                className="text-[12px] font-medium bg-ws-500 hover:bg-ws-600 text-white rounded-lg px-3.5 py-1.5 transition-colors"
              >
                {isLast ? '开始使用' : '下一步'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
