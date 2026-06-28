import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, Star, Sparkles, FileText,
  Shield, BarChart3, Clock, Link2, Layers, Camera, Zap, Swords,
} from 'lucide-react'
import { useVerificationStore } from '../stores/verificationStore'
import AgentProgress from '../components/AgentProgress'
import EvidenceTimeline from '../components/EvidenceTimeline'
import SmartInput from '../components/SmartInput'
import type { LucideIcon } from 'lucide-react'

function CredibilityStars({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          className={i <= level ? 'text-gold fill-gold' : 'text-ink-faint'}
        />
      ))}
    </div>
  )
}

interface ToolItem {
  icon: LucideIcon
  label: string
  desc: string
  route: string
  accent: string
}

const tools: ToolItem[] = [
  { icon: Search, label: '一键求证', desc: '文字/链接核查', route: '', accent: 'text-seal bg-seal/8' },
  { icon: Camera, label: '截图鉴定', desc: 'EXIF 元数据分析', route: '/tools/exif', accent: 'text-blue-600 bg-blue-50' },
  { icon: BarChart3, label: '洗稿检测', desc: '语义相似度比对', route: '/tools/plagiarism', accent: 'text-violet-600 bg-violet-50' },
  { icon: Clock, label: '时间线重建', desc: '事件脉络梳理', route: '/tools/timeline', accent: 'text-amber-600 bg-amber-50' },
  { icon: Link2, label: '反向搜图', desc: '图片源头追溯', route: '/tools/reverse-image', accent: 'text-emerald-600 bg-emerald-50' },
  { icon: Layers, label: '多源验证', desc: '交叉对比分析', route: '/tools/multi-source', accent: 'text-cyan-600 bg-cyan-50' },
]

function VerifyPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [input, setInput] = useState('')

  const {
    dailyFreeUsed,
    extraPurchased,
    maxFreePerDay,
    isAnalyzing,
    agentPhase,
    chatMessages,
    evidenceTimeline,
    result,
    submitVerification,
    purchaseExtra,
    resetDaily,
    resetState,
  } = useVerificationStore()

  const remainingFree = maxFreePerDay - dailyFreeUsed
  const quotaExhausted = remainingFree <= 0 && extraPurchased <= 0

  useEffect(() => { resetDaily() }, [resetDaily])

  useEffect(() => {
    const state = location.state as { query?: string; shared?: boolean } | null
    if (state?.query) setInput(state.query)
  }, [location.state])

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isAnalyzing) return
    const isLink = /^https?:\/\//i.test(trimmed)
    await submitVerification(trimmed, isLink ? 'link' : 'text')
  }, [input, isAnalyzing, submitVerification])

  const handleClear = useCallback(() => {
    setInput('')
    resetState()
  }, [resetState])

  // ===== 分析中 =====
  if (isAnalyzing) {
    return (
      <div className="flex flex-col min-h-full bg-paper-texture">
        <div className="px-5 pt-4 pb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface shadow-card text-ink-500 text-[12px]">
            <Shield size={12} className="text-seal" />
            <span>剩余 {remainingFree} 次免费</span>
          </div>
        </div>

        <AgentProgress phase={agentPhase} />

        <div className="flex-1 px-5 overflow-y-auto pb-4">
          <div className="flex flex-col gap-3 mb-4">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2.5 animate-fade-in-up">
                <div className="w-7 h-7 rounded-xl bg-seal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles size={13} className="text-seal" />
                </div>
                <div className="bg-surface rounded-xl rounded-tl-md px-4 py-2.5 shadow-card max-w-[85%]">
                  <p className="text-[13px] text-ink-700 leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-1 ml-9 h-4">
              <span className="w-0.5 h-3.5 bg-seal rounded-full animate-pulse" />
            </div>
          </div>

          <EvidenceTimeline items={evidenceTimeline} />
        </div>
      </div>
    )
  }

  // ===== 结果 =====
  if (result) {
    return (
      <div className="flex flex-col min-h-full bg-paper-texture">
        <div className="px-5 pt-4 pb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface shadow-card text-ink-500 text-[12px]">
            <Shield size={12} className="text-seal" />
            <span>剩余 {remainingFree} 次免费</span>
          </div>
        </div>

        <div className="flex-1 px-5 overflow-y-auto pb-6">
          <div className="bg-surface rounded-xl shadow-card p-5 animate-fade-in-up">
            {/* 可信度 */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] text-ink-500 font-medium">可信度评估</span>
              <CredibilityStars level={result.credibilityLevel} />
            </div>

            {/* 摘要 */}
            <div className="mb-4">
              <h3 className="text-[12px] font-semibold text-ink-500 uppercase tracking-wider mb-2">结果摘要</h3>
              <p className="text-[14px] text-ink-900 leading-relaxed">{result.summary}</p>
            </div>

            {/* 关键证据 */}
            {result.keyEvidence.length > 0 && (
              <div className="mb-4">
                <h3 className="text-[12px] font-semibold text-ink-500 uppercase tracking-wider mb-2">关键证据</h3>
                <ul className="flex flex-col gap-2">
                  {result.keyEvidence.map((ev, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-ink-900">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-bamboo flex-shrink-0" />
                      <span className="leading-relaxed">{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 倾向性 */}
            <div className="p-4 rounded-xl bg-paper-dark/80 mb-5">
              <h3 className="text-[12px] font-semibold text-ink-500 mb-1.5">倾向性判断</h3>
              <p className="text-[13px] text-ink-900 leading-relaxed">{result.tendency}</p>
            </div>

            {/* 操作 */}
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                className="flex-1 py-3 rounded-xl bg-paper-dark text-[13px] text-ink-500 font-medium active:scale-[0.98] transition-transform"
              >
                重新求证
              </button>
              <button
                onClick={() => {}}
                className="flex-1 py-3 rounded-xl bg-seal text-white text-[13px] font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5 shadow-seal-glow"
              >
                <FileText size={15} />
                完整报告
              </button>
            </div>
          </div>

          {result.evidenceTimeline && result.evidenceTimeline.length > 0 && (
            <div className="mt-4">
              <EvidenceTimeline items={result.evidenceTimeline} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===== 默认输入 =====
  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 顶部 */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">求证</h1>
          <p className="text-[11px] text-ink-400 mt-0.5">AI 辅助你判断，不替你做决定</p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface shadow-card text-ink-500 text-[12px]">
          <Shield size={12} className="text-seal" />
          <span>{remainingFree} 次</span>
        </div>
      </div>

      <div className="flex-1 px-5 pt-4 pb-4">
        {/* 额度提示 */}
        {quotaExhausted && (
          <div className="mb-4 p-4 rounded-xl bg-surface shadow-card">
            <p className="text-[13px] text-ink-700 mb-3 font-medium">今日免费次数已用完</p>
            <button
              onClick={() => purchaseExtra()}
              className="w-full py-3 rounded-xl bg-gold text-white text-[13px] font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
            >
              <Sparkles size={14} />
              50 积分兑换 1 次
            </button>
          </div>
        )}

        {/* 输入区 */}
        <SmartInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          submitLabel="开始求证"
          submitIcon={Search}
          placeholder="粘贴文字、链接，或上传截图..."
          rows={4}
          disabled={quotaExhausted && remainingFree <= 0 && extraPurchased <= 0}
          accentBg="bg-seal"
          showSubmit
        />

        {/* 工具箱 */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-ink-700">求证工具箱</h3>
            <span className="text-[11px] text-ink-400">7 个工具</span>
          </div>

          {/* 旗舰工具：情绪操控检测 */}
          <button
            onClick={() => navigate('/tools/emotion')}
            className="w-full flex items-center gap-3 p-4 bg-surface rounded-xl shadow-card active:scale-[0.98] transition-all duration-200 mb-2.5"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-seal to-seal-light flex items-center justify-center shadow-seal-glow">
              <Zap size={20} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-[13px] text-ink-900 font-semibold block">情绪操控检测</span>
              <span className="text-[11px] text-ink-400">拆解话术结构，识别修辞陷阱</span>
            </div>
            <span className="text-[10px] text-seal font-medium bg-seal/8 px-2 py-1 rounded-lg">NEW</span>
          </button>

          {/* AI 斗蛐蛐 */}
          <button
            onClick={() => navigate('/debates')}
            className="w-full flex items-center gap-3 p-4 bg-surface rounded-xl shadow-card active:scale-[0.98] transition-all duration-200 mb-2.5"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Swords size={20} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-[13px] text-ink-900 font-semibold block">AI 斗蛐蛐</span>
              <span className="text-[11px] text-ink-400">白泽 vs 獬豸，看 AI 吵架学逻辑</span>
            </div>
            <span className="text-[10px] text-gold font-medium bg-gold/8 px-2 py-1 rounded-lg">HOT</span>
          </button>

          <div className="grid grid-cols-3 gap-2.5">
            {tools.map(tool => {
              const Icon = tool.icon
              return (
                <button
                  key={tool.label}
                  onClick={() => { if (tool.route) navigate(tool.route) }}
                  className="flex flex-col items-center gap-2 p-4 bg-surface rounded-xl shadow-card active:scale-[0.96] transition-all duration-200"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tool.accent}`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-[12px] text-ink-900 font-semibold">{tool.label}</span>
                  <span className="text-[10px] text-ink-400 text-center leading-tight">{tool.desc}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyPage
