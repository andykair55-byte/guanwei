import { useNavigate } from 'react-router-dom'
import { usePlatform } from '../hooks/usePlatform'

function NotFoundPage() {
  const navigate = useNavigate()
  const { isWeb } = usePlatform()

  return (
    <div className="min-h-full flex items-center justify-center bg-paper-warm relative overflow-hidden">
      <div className="absolute inset-0 noise-overlay pointer-events-none" />

      <div className={`relative z-10 flex flex-col items-center text-center ${isWeb ? 'px-8' : 'px-6'}`}>
        <div className="w-full max-w-md">
          <div className="brush-divider mb-10" />
        </div>

        <div className="relative mb-6">
          <h1
            className="brand-serif font-black text-seal leading-none tracking-tight animate-blur-up"
            style={{ fontSize: isWeb ? '140px' : '88px' }}
          >
            404
          </h1>
          <div
            className="absolute top-0 -right-4 md:-right-8 bg-seal text-white brand-serif font-bold flex items-center justify-center shadow-seal-glow"
            style={{
              width: isWeb ? '64px' : '48px',
              height: isWeb ? '64px' : '48px',
              fontSize: isWeb ? '18px' : '14px',
              borderRadius: '6px',
              transform: 'rotate(-6deg)',
              letterSpacing: '0.1em',
            }}
          >
            观微
          </div>
        </div>

        <h2
          className="brand-serif font-bold text-ink-900 mb-3 animate-fade-in-up"
          style={{ fontSize: isWeb ? '32px' : '24px', animationDelay: '100ms' }}
        >
          此页已散佚
        </h2>

        <p
          className="text-ink-500 mb-10 animate-fade-in-up"
          style={{ fontSize: isWeb ? '15px' : '13px', animationDelay: '160ms' }}
        >
          你找的内容可能已消逝在历史长河中
        </p>

        <div
          className="flex flex-col sm:flex-row items-center gap-3 animate-fade-in-up"
          style={{ animationDelay: '220ms' }}
        >
          <button
            onClick={() => navigate('/community')}
            className="w-full sm:w-auto px-8 py-3 bg-seal text-white rounded-xl font-semibold shadow-seal-glow hover:bg-seal-dark active:scale-95 transition-all press-pop"
            style={{ fontSize: isWeb ? '15px' : '14px' }}
          >
            回到首页
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-8 py-3 border-2 border-ink-200 text-ink-700 rounded-xl font-semibold hover:border-seal hover:text-seal active:scale-95 transition-all press-pop"
            style={{ fontSize: isWeb ? '15px' : '14px' }}
          >
            返回上页
          </button>
        </div>

        <div className="w-full max-w-md mt-12">
          <div className="brush-divider" style={{ flexDirection: 'row-reverse' }} />
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
