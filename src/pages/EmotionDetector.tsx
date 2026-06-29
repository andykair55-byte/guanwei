import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Shield, AlertTriangle, CheckCircle, XCircle,
  Zap, RefreshCw, Eye, ChevronDown, ChevronUp, Target,
} from 'lucide-react'
import { analyzeEmotion, type EmotionAnalysisResult, type RiskLevel } from '../services/emotionAnalysis'
import SmartInput from '../components/SmartInput'
import { useDeviceFrame } from '../contexts/DeviceFrameContext'

function useIsDesktop() {
  const { inDeviceFrame } = useDeviceFrame()
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)
  useEffect(() => {
    if (inDeviceFrame) return
    const handler = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [inDeviceFrame])
  return inDeviceFrame ? false : isDesktop
}

type AnalysisState = 'idle' | 'analyzing' | 'done'

const EXAMPLE_TEXTS = [
  '震惊！这种常见食物竟然致癌，99%的人每天都在吃！专家提醒：再不吃就来不及了，赶紧告诉家人！',
  '某明星被曝出轨，网友纷纷表示"再也不相信爱情了"。所有人都知道娱乐圈就是个大染缸，没有一个人是干净的。如果不彻底整治，整个行业迟早会崩溃。',
  '据权威机构最新研究表明，每天喝一杯咖啡可以延长寿命5年。这项研究调查了10万人，结论毋庸置疑。不喝咖啡的人真的要好好反思一下自己的生活方式了。',
]

const riskColors: Record<RiskLevel, { bg: string; text: string; border: string; label: string }> = {
  high: { bg: 'bg-seal/10', text: 'text-seal', border: 'border-seal/25', label: '高风险' },
  medium: { bg: 'bg-gold/10', text: 'text-gold', border: 'border-gold/25', label: '中风险' },
  low: { bg: 'bg-bamboo/10', text: 'text-bamboo', border: 'border-bamboo/25', label: '低风险' },
  none: { bg: 'bg-paper-dark/50', text: 'text-ink-500', border: 'border-line/30', label: '客观' },
}

export default function EmotionDetector() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [input, setInput] = useState('')
  const [result, setResult] = useState<EmotionAnalysisResult | null>(null)
  const [state, setState] = useState<AnalysisState>('idle')
  const [expandedSections, setExpandedSections] = useState({ analysis: true, techniques: true, objective: true })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleAnalyze = useCallback(async () => {
    if (!input.trim() || state === 'analyzing') return
    setState('analyzing')
    setResult(null)
    try {
      const res = await analyzeEmotion(input.trim())
      setResult(res)
      setState('done')
    } catch (e) {
      console.error('分析失败:', e)
      setState('idle')
    }
  }, [input, state])

  const handleReset = () => {
    setInput('')
    setResult(null)
    setState('idle')
  }

  const handleExample = (text: string) => {
    setInput(text)
    handleReset()
    setInput(text)
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 顶部导航 */}
      <div className={`px-5 pt-4 pb-2 flex items-center gap-3 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className={`${isDesktop ? 'text-xl' : 'text-[16px]'} font-bold text-ink-900`}>情绪操控检测</h1>
          <p className="text-[11px] text-ink-400">拆解话术结构，识别修辞陷阱</p>
        </div>
        {state === 'done' && (
          <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
            <RefreshCw size={16} className="text-ink-500" />
          </button>
        )}
      </div>

      <div className={`flex-1 px-5 pb-6 overflow-y-auto ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        {/* ===== 输入状态 ===== */}
        {state === 'idle' && (
          <div className="animate-fade-in-up space-y-4">
            {/* 输入区 */}
            <SmartInput
              value={input}
              onChange={setInput}
              onSubmit={handleAnalyze}
              submitLabel="开始检测"
              submitIcon={Zap}
              placeholder="粘贴一段文字，检测其中是否包含情绪操控话术...&#10;&#10;支持：新闻标题、营销文案、社交媒体帖子、聊天记录等"
              rows={6}
              accentBg="bg-seal"
              showSubmit
            />

            {/* 示例文本 */}
            <div>
              <p className="text-[12px] text-ink-400 font-medium mb-2">试试这些例子：</p>
              <div className="space-y-2">
                {EXAMPLE_TEXTS.map((text, i) => (
                  <button
                    key={i}
                    onClick={() => handleExample(text)}
                    className="w-full text-left p-3 bg-surface rounded-xl shadow-card text-[12px] text-ink-500 leading-relaxed line-clamp-2 hover:shadow-card-hover transition-shadow active:scale-[0.99]"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            {/* 检测说明 */}
            <div className="space-y-2">
              <p className="text-[12px] text-ink-400 font-medium">可识别的操控手法：</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: '恐惧诉求', desc: '用夸张的危险恐吓' },
                  { name: '虚假两难', desc: '只给两个极端选项' },
                  { name: '人身攻击', desc: '攻击人而非论点' },
                  { name: '诉诸权威', desc: '用模糊权威增信' },
                  { name: '情绪绑架', desc: '道德/情感压力' },
                  { name: '滑坡谬误', desc: '夸大因果必然性' },
                ].map(item => (
                  <div key={item.name} className="flex items-center gap-2 p-2.5 bg-surface rounded-xl border border-line/30">
                    <Target size={12} className="text-seal/50 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] text-ink-700 font-medium">{item.name}</p>
                      <p className="text-[10px] text-ink-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== 分析中 ===== */}
        {state === 'analyzing' && (
          <div className="animate-fade-in-up">
            <div className="bg-surface rounded-2xl shadow-card p-4 mb-4">
              <p className="text-[13px] text-ink-700 leading-relaxed mb-4">{input}</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-seal/30 border-t-seal animate-spin" />
                <div>
                  <p className="text-[13px] text-ink-700 font-medium">正在分析话术结构...</p>
                  <p className="text-[11px] text-ink-400">逐句拆解 · 识别修辞手法 · 生成客观重述</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== 结果 ===== */}
        {state === 'done' && result && (
          <div className="space-y-3 animate-fade-in-up">
            {/* 总分 */}
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-ink-500" />
                  <span className="text-[13px] text-ink-700 font-semibold">操控指数</span>
                </div>
                <span className={`text-[20px] font-bold ${
                  result.level === 'high' ? 'text-seal' : result.level === 'medium' ? 'text-gold' : 'text-bamboo'
                }`}>
                  {result.score}
                </span>
              </div>
              <div className="h-2.5 bg-paper-dark rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    result.level === 'high' ? 'bg-seal' : result.level === 'medium' ? 'bg-gold' : 'bg-bamboo'
                  }`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
              <p className={`text-[11px] ${
                result.level === 'high' ? 'text-seal' : result.level === 'medium' ? 'text-gold' : 'text-bamboo'
              }`}>
                {result.level === 'high' ? '检测到大量情绪操控手法，请保持高度警惕' :
                 result.level === 'medium' ? '存在一定操控倾向，建议批判性阅读' :
                 '文本表述基本客观，未发现明显操控手法'}
              </p>
            </div>

            {/* 逐句分析 */}
            <SectionCard
              title="逐句分析"
              icon={Eye}
              expanded={expandedSections.analysis}
              onToggle={() => toggleSection('analysis')}
              badge={{
                text: `${result.sentences.filter(s => s.riskLevel === 'high').length} 高风险`,
                color: result.sentences.some(s => s.riskLevel === 'high')
                  ? 'text-seal bg-seal/10' : 'text-bamboo bg-bamboo/10',
              }}
            >
              <div className="space-y-2">
                {result.sentences.map((s, i) => {
                  const colors = riskColors[s.riskLevel]
                  return (
                    <div key={i} className={`p-3 rounded-xl border ${colors.bg} ${colors.border}`}>
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex-shrink-0">
                          {s.riskLevel === 'high' ? <XCircle size={14} className={colors.text} /> :
                           s.riskLevel === 'medium' ? <AlertTriangle size={14} className={colors.text} /> :
                           s.riskLevel === 'low' ? <AlertTriangle size={14} className={colors.text} /> :
                           <CheckCircle size={14} className={colors.text} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-ink-900 leading-relaxed">{s.text}</p>
                          {s.technique && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${colors.bg} ${colors.text}`}>
                                {s.technique}
                              </span>
                              <span className="text-[10px] text-ink-400">{colors.label}</span>
                            </div>
                          )}
                          {s.explanation && (
                            <p className="text-[11px] text-ink-500 mt-1 leading-relaxed">{s.explanation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionCard>

            {/* 检测到的手法 */}
            {result.techniques.length > 0 && (
              <SectionCard
                title="操控手法统计"
                icon={Target}
                expanded={expandedSections.techniques}
                onToggle={() => toggleSection('techniques')}
              >
                <div className="space-y-2">
                  {result.techniques.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-paper-dark/60 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-seal/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[12px] text-seal font-bold">{t.count}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-ink-900 font-semibold">{t.name}</p>
                        <p className="text-[10px] text-ink-400">{t.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* 关键操控词组 */}
            {result.keyPhrases.length > 0 && (
              <div className="bg-surface rounded-2xl shadow-card p-4">
                <p className="text-[12px] text-ink-500 font-semibold mb-2">关键操控词组</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.keyPhrases.map((phrase, i) => (
                    <span key={i} className="px-2 py-1 bg-seal/8 text-seal text-[11px] rounded-lg font-medium">
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 客观重述 */}
            <SectionCard
              title="客观重述"
              icon={CheckCircle}
              expanded={expandedSections.objective}
              onToggle={() => toggleSection('objective')}
            >
              <div className="p-3 bg-bamboo/5 border border-bamboo/20 rounded-xl">
                <p className="text-[13px] text-ink-900 leading-relaxed">{result.objectiveSummary}</p>
              </div>
              <p className="text-[10px] text-ink-400 mt-2">
                去掉情绪操控话术后的事实版本。如果原文信息量不足以重述，说明该文本主要靠情绪而非事实驱动。
              </p>
            </SectionCard>

            {/* 免责声明 */}
            <div className="text-center py-3">
              <p className="text-[9px] text-ink-400 leading-relaxed">
                本工具仅分析文本的修辞手法和话术结构<br />
                检测结果不构成对信息真假的判断
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 子组件 =====

function SectionCard({
  title, icon: Icon, expanded, onToggle, badge, children,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  expanded: boolean
  onToggle: () => void
  badge?: { text: string; color: string }
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-ink-500" />
          <span className="text-[13px] text-ink-700 font-semibold">{title}</span>
          {badge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${badge.color}`}>
              {badge.text}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-ink-400" /> : <ChevronDown size={14} className="text-ink-400" />}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}
