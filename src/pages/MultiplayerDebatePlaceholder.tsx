/**
 * MultiplayerDebatePlaceholder — 多人辩论占位页
 *
 * 显示"即将开放"友好提示，提供返回大厅入口。
 * 风格与娱乐大厅一致（像素风 + 暖色渐变）。
 */
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Sparkles, Clock, Bell } from 'lucide-react'
import { usePlatform } from '../hooks/usePlatform'

const COMING_FEATURES = [
  { icon: '🎤', label: '6 人独立麦位', desc: '正反各 3 席，实时语音辩论' },
  { icon: '⚖️', label: 'AI 裁判评分', desc: '逐回合打分，识别逻辑谬误' },
  { icon: '🏆', label: '段位积分赛', desc: '认可度积分，赛季排行' },
  { icon: '🔥', label: '观众弹幕助威', desc: '实时弹幕，名场面回放' },
]

export default function MultiplayerDebatePlaceholder() {
  const navigate = useNavigate()
  const { isWeb } = usePlatform()

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-line/50">
        <div className={`flex items-center h-14 px-4 ${isWeb ? '' : 'max-w-[480px] mx-auto'}`}>
          <button
            onClick={() => navigate('/entertainment')}
            className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60 press-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/30 rounded-lg px-1"
            aria-label="返回娱乐大厅"
          >
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users size={16} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-ink-900 leading-tight">多人辩论</h1>
              <p className="text-[10px] text-ink-400">6 人实时对战 · 即将开放</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 flex flex-col items-center justify-center px-6 py-10 ${isWeb ? 'max-w-2xl mx-auto' : 'max-w-[480px] mx-auto'}`}>
        {/* ═══════ 主视觉：像素风"即将开放"卡片 ═══════ */}
        <div
          className="relative w-full rounded-3xl overflow-hidden animate-fade-in-up motion-reduce:animate-none"
          style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 40%, #a7f3d0 100%)',
            boxShadow: '0 8px 32px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          {/* 装饰光斑 */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-200/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-teal-200/40 blur-2xl pointer-events-none" />

          {/* 像素星星装饰 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-pulse motion-reduce:animate-none"
                style={{
                  left: `${(i * 17 + 8) % 85 + 8}%`,
                  top: `${(i * 29 + 12) % 60 + 10}%`,
                  width: '3px',
                  height: '3px',
                  background: '#10b981',
                  animationDelay: `${i * 0.4}s`,
                  animationDuration: '2s',
                  imageRendering: 'pixelated',
                }}
              />
            ))}
          </div>

          <div className="relative px-8 py-10 text-center">
            {/* 像素风图标 */}
            <div
              className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg animate-fade-in-up motion-reduce:animate-none"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 8px 24px rgba(16,185,129,0.35), inset 0 2px 0 rgba(255,255,255,0.3)',
                animationDelay: '100ms',
              }}
            >
              <Users size={36} className="text-white" strokeWidth={2} />
            </div>

            {/* 即将开放徽章 */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4 animate-fade-in-up motion-reduce:animate-none"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                animationDelay: '200ms',
              }}
            >
              <Clock size={12} className="text-white" />
              <span className="text-[11px] font-bold text-white tracking-wider font-mono">COMING SOON</span>
            </div>

            <h2
              className="text-[24px] font-black text-ink-900 mb-2 animate-fade-in-up motion-reduce:animate-none"
              style={{ animationDelay: '300ms' }}
            >
              多人辩论 · 即将开放
            </h2>
            <p
              className="text-[13px] text-ink-600 leading-relaxed mb-6 animate-fade-in-up motion-reduce:animate-none"
              style={{ animationDelay: '400ms' }}
            >
              正在打磨 6 人实时语音辩论体验，敬请期待。
              <br />
              上线后可亲自上阵，与真人辩友唇枪舌剑。
            </p>

            {/* 功能预览 */}
            <div className="grid grid-cols-2 gap-3 text-left animate-fade-in-up motion-reduce:animate-none" style={{ animationDelay: '500ms' }}>
              {COMING_FEATURES.map(f => (
                <div
                  key={f.label}
                  className="flex items-start gap-2 p-3 rounded-xl bg-white/70 backdrop-blur-sm border border-emerald-100"
                >
                  <span className="text-lg flex-shrink-0">{f.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-ink-900">{f.label}</p>
                    <p className="text-[10px] text-ink-500 leading-tight mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════ 操作按钮 ═══════ */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 w-full animate-fade-in-up motion-reduce:animate-none" style={{ animationDelay: '600ms' }}>
          <button
            onClick={() => navigate('/entertainment')}
            className="flex-1 py-3 rounded-xl bg-ink-900 text-white text-[13px] font-semibold active:scale-[0.98] motion-reduce:active:scale-100 transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/40 focus-visible:ring-offset-2"
          >
            <ArrowLeft size={14} />
            返回大厅
          </button>
          <button
            onClick={() => navigate('/entertainment/debate')}
            className="flex-1 py-3 rounded-xl bg-surface border border-line/30 text-ink-700 text-[13px] font-semibold active:scale-[0.98] motion-reduce:active:scale-100 transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/40 focus-visible:ring-offset-2"
          >
            <Sparkles size={14} className="text-emerald-500" />
            试试娱乐辩论
          </button>
        </div>

        {/* 通知预约提示 */}
        <div className="flex items-center gap-1.5 mt-5 text-[11px] text-ink-400">
          <Bell size={11} />
          <span>上线后将通过消息通知你</span>
        </div>
      </div>

      {/* 全局像素动画 keyframes（与大厅一致） */}
      <style>{`
        @keyframes pixelBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
