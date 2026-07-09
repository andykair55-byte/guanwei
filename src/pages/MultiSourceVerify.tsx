import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Search, Shield, Globe, Users,
  GraduationCap, FileCheck, ChevronDown, ChevronUp,
  ExternalLink, AlertTriangle, CheckCircle, XCircle, Clock,
} from 'lucide-react'
import { useDeviceFrame } from '../contexts/DeviceFrameContext'
import { useIsDesktop } from '../hooks/useIsDesktop'



// ===== 类型 =====

interface SourceResult {
  id: string
  type: 'official' | 'social' | 'expert' | 'factcheck' | 'media'
  name: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  credibility: number       // 1-5
  stance: 'confirm' | 'deny' | 'neutral' | 'unrelated' | 'mixed'
  summary: string
  quote: string
  url: string
  timestamp: string
}

interface MultiSourceResult {
  claim: string
  sources: SourceResult[]
  consensus: 'confirmed' | 'disputed' | 'unverified' | 'mixed'
  consensusScore: number    // 0-100
  summary: string
}

type AnalysisState = 'idle' | 'analyzing' | 'done'

// ===== 示例 =====

const EXAMPLE_CLAIMS = [
  '某知名品牌手机电池存在爆炸风险，已有多起事故发生',
  '研究发现每天喝咖啡可以延长寿命10年',
  '某地政府将取消所有线下政务服务窗口',
]

// ===== Mock 数据生成 =====

const SOURCE_TEMPLATES: Array<{
  type: SourceResult['type']
  names: string[]
  urls: string[]
  stances: SourceResult['stance'][]
  summaries: Record<string, string[]>
}> = [
  {
    type: 'official',
    names: ['新华社', '央视新闻', '人民日报', '中国政府网'],
    urls: ['xinhuanet.com', 'news.cctv.com', 'people.com.cn', 'gov.cn'],
    stances: ['confirm', 'neutral', 'deny'],
    summaries: {
      confirm: ['已发布相关通报，确认事件属实，相关部门正在跟进处理。', '经核实，该消息基本属实，具体情况以官方通报为准。'],
      neutral: ['目前尚未发布正式通报，建议关注后续官方消息。', '已关注到相关报道，正在核实中。'],
      deny: ['经核实，该说法与事实不符，请以官方发布为准。', '此为不实信息，官方已予以澄清。'],
    },
  },
  {
    type: 'media',
    names: ['澎湃新闻', '财新网', '界面新闻', '新京报'],
    urls: ['thepaper.cn', 'caixin.com', 'jiemian.com', 'bjnews.com.cn'],
    stances: ['confirm', 'neutral', 'mixed'],
    summaries: {
      confirm: ['记者多方求证后确认该消息属实，相关证据链完整。', '据本报记者调查，此事确有发生，已联系相关方求证。'],
      neutral: ['该消息尚未得到官方证实，本报记者正在跟进调查。', '事件仍在发展中，目前各方说法不一，有待进一步核实。'],
      mixed: ['部分信息得到证实，但关键细节仍有待核实。', '已联系相关方，截至发稿时未获回应。'],
    },
  },
  {
    type: 'social',
    names: ['微博热搜', '知乎热榜', '抖音热点', '微信公众号'],
    urls: ['weibo.com', 'zhihu.com', 'douyin.com', 'mp.weixin.qq.com'],
    stances: ['confirm', 'deny', 'neutral', 'unrelated'],
    summaries: {
      confirm: ['大量用户分享了类似经历，话题阅读量超过5000万。', '多位知情人在社交平台发声佐证，引发广泛讨论。'],
      deny: ['有网友指出该信息来源不可靠，疑似为旧闻翻炒。', '评论区大量质疑声，多人指出信息中存在明显漏洞。'],
      neutral: ['话题引发热议，网友观点两极分化。', '讨论热度较高，但目前缺乏实质性证据。'],
      unrelated: ['相关话题下讨论内容与该声明关联度较低。', '社交平台未见大规模讨论，热度有限。'],
    },
  },
  {
    type: 'expert',
    names: ['中国社科院', '清华大学研究院', '知名科普博主', '行业分析师'],
    urls: ['cssn.cn', 'tsinghua.edu.cn', '#', '#'],
    stances: ['confirm', 'deny', 'neutral'],
    summaries: {
      confirm: ['从专业角度分析，该说法有充分的数据和事实支撑。', '基于现有证据，该信息的可信度较高，但部分细节需进一步验证。'],
      deny: ['该说法缺乏科学依据，与已知事实存在明显矛盾。', '经专业分析，信息中的关键论据站不住脚，建议不要轻信。'],
      neutral: ['该问题较为复杂，需要更多数据才能做出准确判断。', '目前证据不足以得出明确结论，建议持续关注。'],
    },
  },
  {
    type: 'factcheck',
    names: ['中国互联网联合辟谣平台', '腾讯较真', '丁香医生', '事实查核中心'],
    urls: ['piyao.org.cn', 'fact.qq.com', 'dxy.com', 'factcheck.org.cn'],
    stances: ['confirm', 'deny', 'neutral'],
    summaries: {
      confirm: ['经核查，该信息基本属实，关键事实点均已验证。', '多条证据链交叉验证，判定为真实信息。'],
      deny: ['经核查，该信息为谣言，已被多次辟谣。', '判定为不实信息，存在明显编造痕迹。'],
      neutral: ['该信息部分属实、部分存疑，暂无法给出明确判定。', '已收录待核查，目前证据不足以定论。'],
    },
  },
]

function generateSources(claim: string): SourceResult[] {
  // 基于 claim 的 hash 决定每个来源的立场
  let hash = 0
  for (let i = 0; i < claim.length; i++) {
    hash = ((hash << 5) - hash + claim.charCodeAt(i)) | 0
  }

  const sources: SourceResult[] = []

  SOURCE_TEMPLATES.forEach((template, typeIdx) => {
    const nameIdx = Math.abs(hash + typeIdx * 7) % template.names.length
    const stanceIdx = Math.abs(hash + typeIdx * 13) % template.stances.length
    const stance = template.stances[stanceIdx]
    const summaryList = template.summaries[stance] || template.summaries.neutral
    const summaryIdx = Math.abs(hash + typeIdx * 3) % summaryList.length

    const credibility =
      template.type === 'official' ? (stance === 'neutral' ? 3 : 4 + (Math.abs(hash) % 2)) :
      template.type === 'factcheck' ? 4 + (Math.abs(hash + 1) % 2) :
      template.type === 'expert' ? 3 + (Math.abs(hash + 2) % 2) :
      template.type === 'media' ? 3 + (Math.abs(hash + 3) % 2) :
      1 + (Math.abs(hash + 4) % 3)

    const hoursAgo = 1 + Math.abs(hash + typeIdx * 5) % 48

    sources.push({
      id: `src-${typeIdx}`,
      type: template.type,
      name: template.names[nameIdx],
      icon: template.type === 'official' ? Shield :
            template.type === 'media' ? Globe :
            template.type === 'social' ? Users :
            template.type === 'expert' ? GraduationCap :
            FileCheck,
      credibility,
      stance,
      summary: summaryList[summaryIdx],
      quote: `"${claim.slice(0, 30)}..."`,
      url: `https://${template.urls[nameIdx]}`,
      timestamp: `${hoursAgo}小时前`,
    })
  })

  return sources
}

function determineConsensus(sources: SourceResult[]): { consensus: MultiSourceResult['consensus']; score: number; summary: string } {
  const confirms = sources.filter(s => s.stance === 'confirm').length
  const denies = sources.filter(s => s.stance === 'deny').length
  const total = sources.length

  if (confirms >= total * 0.7) {
    return {
      consensus: 'confirmed',
      score: Math.round((confirms / total) * 100),
      summary: '多数信源确认该信息属实，可信度较高。建议关注权威媒体的详细报道。',
    }
  }
  if (denies >= total * 0.5) {
    return {
      consensus: 'disputed',
      score: Math.round((denies / total) * 100),
      summary: '多个信源对该信息提出质疑或否认，可信度较低。建议不要轻信和传播。',
    }
  }
  if (confirms > 0 && denies > 0 && Math.abs(confirms - denies) <= 1) {
    return {
      consensus: 'mixed',
      score: 50,
      summary: '各方说法不一，信息存在争议。建议等待更多权威信源的报道再做判断。',
    }
  }
  return {
    consensus: 'unverified',
    score: 30,
    summary: '目前可获取的信源不足以判断该信息的真伪，建议持续关注后续报道。',
  }
}

// ===== 颜色映射 =====

const typeConfig: Record<SourceResult['type'], { label: string; color: string; bg: string }> = {
  official: { label: '官方', color: 'text-blue-600', bg: 'bg-blue-50' },
  media: { label: '媒体', color: 'text-violet-600', bg: 'bg-violet-50' },
  social: { label: '社交', color: 'text-amber-600', bg: 'bg-amber-50' },
  expert: { label: '专家', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  factcheck: { label: '辟谣', color: 'text-cyan-600', bg: 'bg-cyan-50' },
}

const stanceConfig: Record<SourceResult['stance'], { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  confirm: { label: '证实', icon: CheckCircle, color: 'text-bamboo' },
  deny: { label: '否认', icon: XCircle, color: 'text-seal' },
  neutral: { label: '待定', icon: Clock, color: 'text-gold' },
  unrelated: { label: '无关', icon: AlertTriangle, color: 'text-ink-400' },
  mixed: { label: '混合', icon: Globe, color: 'text-gold' },
}

const consensusConfig: Record<MultiSourceResult['consensus'], { label: string; color: string; bg: string; border: string }> = {
  confirmed: { label: '基本属实', color: 'text-bamboo', bg: 'bg-bamboo/10', border: 'border-bamboo/25' },
  disputed: { label: '疑似不实', color: 'text-seal', bg: 'bg-seal/10', border: 'border-seal/25' },
  mixed: { label: '说法不一', color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/25' },
  unverified: { label: '待核实', color: 'text-ink-500', bg: 'bg-paper-dark/50', border: 'border-line/20' },
}

// ===== 组件 =====

export default function MultiSourceVerify() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [input, setInput] = useState('')
  const [result, setResult] = useState<MultiSourceResult | null>(null)
  const [state, setState] = useState<AnalysisState>('idle')
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())

  const toggleSource = (id: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAnalyze = useCallback(() => {
    if (!input.trim() || state === 'analyzing') return
    setState('analyzing')
    setResult(null)

    setTimeout(() => {
      const sources = generateSources(input)
      const { consensus, score, summary } = determineConsensus(sources)
      setResult({ claim: input, sources, consensus, consensusScore: score, summary })
      setState('done')
    }, 1200)
  }, [input, state])

  const handleReset = () => {
    setInput('')
    setResult(null)
    setState('idle')
    setExpandedSources(new Set())
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 顶部导航 */}
      <div className={`px-5 pt-4 pb-2 flex items-center gap-3 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className={`${isDesktop ? 'text-xl' : 'text-[16px]'} font-bold text-ink-900`}>多源验证</h1>
          <p className="text-[11px] text-ink-400">交叉对比多个信源，判断信息可信度</p>
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
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入一条声明或传闻，工具将从多个信源类型进行交叉验证...&#10;&#10;信源类型：官方媒体 · 行业媒体 · 社交平台 · 领域专家 · 辟谣平台"
                rows={5}
                className="w-full text-[14px] text-ink-900 placeholder:text-ink-400 resize-none leading-relaxed"
              />
              <button
                onClick={handleAnalyze}
                disabled={!input.trim()}
                className="w-full py-3.5 rounded-xl bg-cyan-600 text-white font-semibold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                <Search size={16} />
                多源交叉验证
              </button>
            </div>

            {/* 示例 */}
            <div>
              <p className="text-[12px] text-ink-400 font-medium mb-2">试试这些例子：</p>
              <div className="space-y-2">
                {EXAMPLE_CLAIMS.map((text, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(text)}
                    className="w-full text-left p-3 bg-surface rounded-xl shadow-card text-[12px] text-ink-500 leading-relaxed hover:shadow-card-hover transition-shadow active:scale-[0.99]"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            {/* 说明 */}
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <p className="text-[12px] text-ink-500 font-semibold mb-3">验证逻辑</p>
              <div className="space-y-2.5">
                {[
                  { icon: Globe, text: '检索官方媒体、行业报道、社交平台等多类信源' },
                  { icon: Users, text: '对比不同信源的报道立场和证据强度' },
                  { icon: FileCheck, text: '综合评估信息一致性，给出交叉验证结论' },
                ].map((step, i) => {
                  const StepIcon = step.icon
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                        <StepIcon size={13} className="text-cyan-600" />
                      </div>
                      <p className="text-[12px] text-ink-700">{step.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== 分析中 ===== */}
        {state === 'analyzing' && (
          <div className="animate-fade-in-up space-y-3">
            <div className="bg-surface rounded-2xl shadow-card p-4 mb-4">
              <p className="text-[13px] text-ink-700 leading-relaxed mb-4">{input}</p>
              <div className="space-y-3">
                {['官方', '媒体', '社交', '专家', '辟谣'].map((label, i) => (
                  <div key={label} className="flex items-center gap-3" style={{ animationDelay: `${i * 200}ms` }}>
                    <div className="w-16 text-[11px] text-ink-400 font-medium">{label}信源</div>
                    <div className="flex-1 h-2 bg-paper-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full animate-pulse"
                        style={{ width: `${40 + i * 12}%`, animationDelay: `${i * 150}ms` }}
                      />
                    </div>
                    <span className="text-[10px] text-ink-400">检索中</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== 结果 ===== */}
        {state === 'done' && result && (
          <div className="space-y-3 animate-fade-in-up">
            {/* 综合结论 */}
            <div className={`rounded-2xl border p-4 ${consensusConfig[result.consensus].bg} ${consensusConfig[result.consensus].border}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[14px] font-bold ${consensusConfig[result.consensus].color}`}>
                  {consensusConfig[result.consensus].label}
                </span>
                <span className={`text-[18px] font-bold ${consensusConfig[result.consensus].color}`}>
                  {result.consensusScore}%
                </span>
              </div>
              <p className={`text-[12px] ${consensusConfig[result.consensus].color} leading-relaxed`}>
                {result.summary}
              </p>
            </div>

            {/* 信源统计 */}
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] text-ink-500 font-semibold">信源分布</span>
                <span className="text-[11px] text-ink-400">{result.sources.length} 个信源</span>
              </div>
              <div className="flex gap-2">
                {Object.entries(typeConfig).map(([type, config]) => {
                  const count = result.sources.filter(s => s.type === type).length
                  if (count === 0) return null
                  return (
                    <div key={type} className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl ${config.bg}`}>
                      <span className={`text-[14px] font-bold ${config.color}`}>{count}</span>
                      <span className={`text-[10px] ${config.color}`}>{config.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 各信源详情 */}
            <div>
              <p className="text-[12px] text-ink-400 font-medium mb-2">各信源详情：</p>
              <div className="space-y-2">
                {result.sources.map((source) => {
                  const tConfig = typeConfig[source.type]
                  const sConfig = stanceConfig[source.stance]
                  const StanceIcon = sConfig.icon
                  const SourceIcon = source.icon
                  const isExpanded = expandedSources.has(source.id)

                  return (
                    <div key={source.id} className="bg-surface rounded-2xl shadow-card overflow-hidden">
                      <button
                        onClick={() => toggleSource(source.id)}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left"
                      >
                        <div className={`w-9 h-9 rounded-xl ${tConfig.bg} flex items-center justify-center flex-shrink-0`}>
                          <SourceIcon size={16} className={tConfig.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-ink-900 font-semibold">{source.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${tConfig.bg} ${tConfig.color} font-medium`}>
                              {tConfig.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StanceIcon size={11} className={sConfig.color} />
                            <span className={`text-[10px] ${sConfig.color}`}>{sConfig.label}</span>
                            <span className="text-[10px] text-ink-300">·</span>
                            <span className="text-[10px] text-ink-400">{source.timestamp}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* 可信度星级 */}
                          <div className="flex gap-px">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  i <= source.credibility ? 'bg-gold' : 'bg-ink-200'
                                }`}
                              />
                            ))}
                          </div>
                          {isExpanded
                            ? <ChevronUp size={13} className="text-ink-400" />
                            : <ChevronDown size={13} className="text-ink-400" />
                          }
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-3 border-t border-line/20">
                          <p className="text-[12px] text-ink-700 leading-relaxed mt-2">{source.summary}</p>
                          {source.url !== '#' && (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-[11px] text-cyan-600 hover:underline"
                            >
                              <ExternalLink size={10} />
                              查看原文
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 免责声明 */}
            <div className="text-center py-3">
              <p className="text-[9px] text-ink-400 leading-relaxed">
                多源验证结果基于模拟信源数据，仅供演示<br />
                实际使用需接入真实信源 API
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
