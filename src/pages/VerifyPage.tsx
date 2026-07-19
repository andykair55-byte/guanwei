import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, Star, Sparkles, FileText,
  Shield, BarChart3, Clock, Layers, Camera, Zap,
  Microscope, FileSearch, AlertTriangle, ScanEye,
} from 'lucide-react'
import { useVerificationStore } from '../stores/verificationStore'
import AgentProgress from '../components/AgentProgress'
import EvidenceTimeline from '../components/EvidenceTimeline'
import SmartInput from '../components/SmartInput'
import { useDeviceFrame } from '../contexts/DeviceFrameContext'
import type { LucideIcon } from 'lucide-react'

function CredibilityStars({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          className={i <= level ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
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
  gradient: string
  pixelColor: string
}

const tools: ToolItem[] = [
  { icon: Camera, label: '截图鉴定', desc: 'EXIF 元数据分析', route: '/tools/exif', gradient: 'from-blue-400 to-indigo-500', pixelColor: '#3b82f6' },
  { icon: Clock, label: '时间线重建', desc: '事件脉络梳理', route: '/tools/timeline', gradient: 'from-amber-400 to-orange-500', pixelColor: '#f59e0b' },
  { icon: Zap, label: '情绪操控检测', desc: '识别话术陷阱', route: '/tools/emotion', gradient: 'from-rose-400 to-red-500', pixelColor: '#f43f5e' },
  { icon: FileSearch, label: '多源验证', desc: '交叉比对信息', route: '/tools/multi-source', gradient: 'from-emerald-400 to-teal-500', pixelColor: '#10b981' },
  { icon: Microscope, label: '抄袭检测', desc: '文本相似度分析', route: '/tools/plagiarism', gradient: 'from-violet-400 to-purple-500', pixelColor: '#8b5cf6' },
  { icon: AlertTriangle, label: '以图搜图', desc: '反向图片检索', route: '/tools/reverse-image', gradient: 'from-cyan-400 to-blue-500', pixelColor: '#06b6d4' },
]

/* ═══════════════════════════════════════════════════════
   像素放大镜装饰组件
   ═══════════════════════════════════════════════════════ */
function PixelMagnifier() {
  return (
    <div className="hidden md:block relative w-36 h-32">
      {/* 放大镜主体 */}
      <div className="absolute top-2 left-4 w-20 h-20 rounded-full border-4 border-amber-500 bg-gradient-to-br from-amber-100/60 to-orange-200/60 backdrop-blur-sm shadow-lg"
        style={{
          boxShadow: `
            0 4px 0 #b45309,
            inset 0 2px 4px rgba(255,255,255,0.5),
            inset 0 -2px 4px rgba(0,0,0,0.1)
          `,
        }}
      >
        {/* 镜面反光 */}
        <div className="absolute top-2 left-3 w-6 h-3 rounded-full bg-white/50 rotate-[-20deg]" />
        {/* 像素化的"?" */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-amber-600" style={{ fontFamily: 'monospace', textShadow: '1px 1px 0 #fbbf24' }}>?</span>
        </div>
      </div>
      {/* 手柄 */}
      <div
        className="absolute bottom-4 right-4 w-4 h-10 rotate-[-45deg] rounded-sm"
        style={{
          background: 'linear-gradient(180deg, #b45309 0%, #92400e 100%)',
          boxShadow: '2px 2px 0 #78350f',
        }}
      />
      {/* 漂浮的证据碎片 */}
      <div className="absolute top-0 right-0 w-4 h-4 bg-rose-400/80 rotate-45 animate-bounce" style={{ animationDuration: '2s' }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 bg-cyan-400/80 rounded-full animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }} />
      <div className="absolute top-4 right-2 w-2 h-2 bg-violet-400/80 rounded-sm animate-pulse" />
    </div>
  )
}

function VerifyPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const { notchHeight } = useDeviceFrame()

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
    const headerPadding = notchHeight > 0 ? `${notchHeight + 8}px` : undefined
    return (
      <div className="flex flex-col min-h-full bg-white">
        <div
          className="px-6 pb-2 pt-4"
          style={{ paddingTop: headerPadding || '16px' }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-100 shadow-sm text-gray-500 text-[12px]">
            <Shield size={12} className="text-red-500" />
            <span>剩余 {remainingFree} 次免费</span>
          </div>
        </div>

        <AgentProgress phase={agentPhase} />

        <div className="flex-1 px-6 overflow-y-auto pb-4">
          <div className="flex flex-col gap-3 mb-4">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2.5 animate-fade-in-up">
                <div className="w-7 h-7 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles size={13} className="text-red-500" />
                </div>
                <div className="bg-white rounded-xl rounded-tl-md px-4 py-2.5 shadow-sm border border-gray-100 max-w-[85%]">
                  <p className="text-[13px] text-gray-700 leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-1 ml-9 h-4">
              <span className="w-0.5 h-3.5 bg-red-500 rounded-full animate-pulse" />
            </div>
          </div>

          <EvidenceTimeline items={evidenceTimeline} />
        </div>
      </div>
    )
  }

  // ===== 结果 =====
  if (result) {
    const headerPadding = notchHeight > 0 ? `${notchHeight + 8}px` : undefined
    return (
      <div className="flex flex-col min-h-full bg-white">
        <div
          className="px-6 pb-2 pt-4"
          style={{ paddingTop: headerPadding || '16px' }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-100 shadow-sm text-gray-500 text-[12px]">
            <Shield size={12} className="text-red-500" />
            <span>剩余 {remainingFree} 次免费</span>
          </div>
        </div>

        <div className="flex-1 px-6 overflow-y-auto pb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in-up">
            {/* 可信度 */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Star size={16} className="text-amber-500 fill-amber-500" />
                </div>
                <span className="text-[14px] font-semibold text-gray-700">可信度评估</span>
              </div>
              <CredibilityStars level={result.credibilityLevel} />
            </div>

            {/* 摘要 */}
            <div className="mb-5">
              <h3 className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-2">结果摘要</h3>
              <p className="text-[15px] text-gray-800 leading-relaxed">{result.summary}</p>
            </div>

            {/* 关键证据 */}
            {result.keyEvidence.length > 0 && (
              <div className="mb-5">
                <h3 className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">关键证据</h3>
                <ul className="flex flex-col gap-2.5">
                  {result.keyEvidence.map((ev, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-gray-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="leading-relaxed">{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 倾向性 */}
            <div className="p-4 rounded-xl bg-gray-50 mb-5">
              <h3 className="text-[12px] font-semibold text-gray-500 mb-1.5">倾向性判断</h3>
              <p className="text-[13px] text-gray-700 leading-relaxed">{result.tendency}</p>
            </div>

            {/* 操作 */}
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-[13px] text-gray-600 font-medium active:scale-[0.98] transition-transform hover:bg-gray-200"
              >
                重新求证
              </button>
              <button
                onClick={() => {}}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-[13px] font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5 shadow-sm shadow-red-200/50"
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
    <div className="flex flex-col min-h-full" style={{ background: 'linear-gradient(180deg, #FFFBEB 0%, #ffffff 320px)' }}>
      {/* ═══════ 顶部 Banner（社区风格）═══════ */}
      <div
        className="mx-6 mt-5 mb-5 rounded-2xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 30%, #FEF3C7 60%, #ECFDF5 100%)',
        }}
      >
        <div className="flex items-center justify-between px-8 py-6 relative z-10">
          {/* 左侧文字 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white rounded"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
                  letterSpacing: '0.05em',
                }}
              >
                <ScanEye size={12} />
                VERIFY
              </span>
            </div>
            <h1 className="text-[26px] font-bold text-gray-900 leading-tight tracking-tight">
              求证中心
            </h1>
            <p className="text-[14px] text-gray-500 leading-relaxed max-w-md">
              AI 辅助你判断，不替你做决定。用证据说话，让真相浮现
            </p>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                <Shield size={14} className="text-red-500" />
                <span>今日剩余 <span className="font-semibold text-gray-700">{remainingFree}</span> 次</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                <BarChart3 size={14} className="text-amber-500" />
                <span>已验证 <span className="font-semibold text-gray-700">12,847</span> 条</span>
              </div>
            </div>
          </div>

          {/* 右侧像素风放大镜 */}
          <PixelMagnifier />
        </div>

        {/* 装饰性光斑 */}
        <div className="absolute -top-6 right-10 w-24 h-24 rounded-full bg-amber-200/30 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-12 w-20 h-20 rounded-full bg-rose-200/30 blur-xl pointer-events-none" />
      </div>

      <div className="flex-1 px-6 pt-2 pb-6">
        {/* 额度提示 */}
        {quotaExhausted && (
          <div className="mb-5 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <p className="text-base text-gray-700 mb-3 font-medium">今日免费次数已用完</p>
            <button
              onClick={() => purchaseExtra()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[13px] font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5 shadow-sm shadow-amber-200/50"
            >
              <Sparkles size={14} />
              50 积分兑换 1 次
            </button>
          </div>
        )}

        {/* 输入区 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-800">智能求证</h3>
            <div className="flex items-center gap-1 text-[12px] text-gray-400">
              <Layers size={13} />
              <span>支持文字、链接、图片</span>
            </div>
          </div>
          <SmartInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            submitLabel="开始求证"
            submitIcon={Search}
            placeholder="粘贴文字、链接，或上传截图..."
            rows={4}
            disabled={quotaExhausted && remainingFree <= 0 && extraPurchased <= 0}
            accentBg="bg-gradient-to-r from-red-500 to-rose-600"
            showSubmit
          />
        </div>

        {/* ═══════ 分类 Tab 栏 ═══════ */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {['全部', '图片类', '文本类', '数据类'].map((tab, i) => (
              <button
                key={tab}
                className={`px-4 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  i === 0
                    ? 'text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                style={i === 0 ? {
                  background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                  boxShadow: '0 2px 10px -2px rgba(239, 68, 68, 0.45)',
                } : {}}
              >
                {tab}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-gray-400 font-mono flex-shrink-0">{tools.length} 个工具</span>
        </div>

        {/* 工具箱 */}
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {tools.map(tool => {
              const Icon = tool.icon
              return (
                <button
                  key={tool.label}
                  onClick={() => navigate(tool.route)}
                  className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-start gap-2.5 active:scale-[0.96] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
                >
                  {/* 顶部像素渐变条 */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tool.gradient}`} />

                  {/* 图标 */}
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110`}
                    style={{
                      boxShadow: `
                        0 3px 8px ${tool.pixelColor}25,
                        inset 0 2px 0 rgba(255,255,255,0.3)
                      `,
                    }}
                  >
                    <Icon size={20} className="text-white" strokeWidth={2} />
                  </div>

                  {/* 文字 */}
                  <div className="text-left">
                    <span className="text-[13px] font-bold text-gray-800 block">{tool.label}</span>
                    <span className="text-[11px] text-gray-400 mt-0.5 block leading-tight">{tool.desc}</span>
                  </div>

                  {/* 像素装饰点 */}
                  <div className="absolute bottom-2.5 right-2.5 flex gap-0.5 opacity-20">
                    <div className="w-1 h-1 rounded-sm" style={{ background: tool.pixelColor }} />
                    <div className="w-1 h-1 rounded-sm opacity-60" style={{ background: tool.pixelColor }} />
                    <div className="w-1 h-1 rounded-sm opacity-30" style={{ background: tool.pixelColor }} />
                  </div>
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
