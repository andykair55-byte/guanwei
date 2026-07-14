import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Search, Shield, Clock, ChevronDown, ChevronUp,
  CheckCircle, XCircle, AlertTriangle, Newspaper, Users, User, Ghost,
} from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'



// ===== 类型定义 =====

type Stance = 'official' | 'party' | 'public' | 'anonymous'
type Credibility = 'high' | 'medium' | 'low'
type AnalysisState = 'idle' | 'analyzing' | 'done'
type Consistency = 'consistent' | 'conflict' | 'single'

interface Source {
  name: string
  stance: Stance
  credibility: Credibility
  timestamp: string
  excerpt: string
}

interface ConsistencyItem {
  detail: string
  status: Consistency
  note: string
}

// ===== mock 数据（硬编码） =====

const MOCK_SOURCES: Source[] = [
  {
    name: '新华社',
    stance: 'official',
    credibility: 'high',
    timestamp: '2026-07-13 18:24',
    excerpt: '据中国地震台网正式测定：7月13日18时21分在X市（北纬31.4度，东经104.7度）发生4.5级地震，震源深度12千米，暂无人员伤亡报告。',
  },
  {
    name: '当事人微博 @蓉城老李',
    stance: 'party',
    credibility: 'medium',
    timestamp: '2026-07-13 18:23',
    excerpt: '我家住X市高新区，刚才有明显震感，灯晃了几下，震了大概三四秒，吓死人！邻居都跑下楼了。',
  },
  {
    name: '知乎讨论《X市地震是怎么回事？》',
    stance: 'public',
    credibility: 'medium',
    timestamp: '2026-07-13 19:05',
    excerpt: '多位本地网友证实震感明显，主要集中在高新区与天府新区。中国地震台网数据与网友反馈一致，震级约 4.5 级，属浅源地震。',
  },
  {
    name: '匿名论坛 / 板块「未解之谜」',
    stance: 'anonymous',
    credibility: 'low',
    timestamp: '2026-07-13 20:11',
    excerpt: '据"内部消息"这次根本不是自然地震，震源深度数据被改过，实际是地下核试验引发的，官方在封锁消息。仅一家之言。',
  },
  {
    name: '央视新闻',
    stance: 'official',
    credibility: 'high',
    timestamp: '2026-07-13 19:30',
    excerpt: '应急管理局已启动四级响应，派出工作组赶赴震中。截至目前未接到人员伤亡和重大财产损失报告，震区交通电力正常。',
  },
]

const MOCK_CONSISTENCY: ConsistencyItem[] = [
  {
    detail: '地震震级 4.5 级',
    status: 'consistent',
    note: '4 个信源（新华社、央视、知乎、当事人）数据一致',
  },
  {
    detail: '发生时间 18:21',
    status: 'consistent',
    note: '官方台网与多名网友反馈时间吻合',
  },
  {
    detail: '震中位置（高新区一带）',
    status: 'conflict',
    note: '匿名论坛声称震中在郊区山地，与台网数据不符',
  },
  {
    detail: '"地下核试验"说法',
    status: 'single',
    note: '仅匿名论坛单源发布，无任何官方或交叉证据支持',
  },
  {
    detail: '无人员伤亡',
    status: 'consistent',
    note: '新华社、央视一致确认',
  },
]

const OVERALL_SCORE = 72

const STANCE_META: Record<Stance, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  official: { label: '官方', icon: Newspaper, color: 'text-bamboo bg-bamboo/10' },
  party: { label: '当事方', icon: User, color: 'text-seal bg-seal/10' },
  public: { label: '公众', icon: Users, color: 'text-gold bg-gold/10' },
  anonymous: { label: '匿名', icon: Ghost, color: 'text-ink-500 bg-ink-100/60' },
}

const CREDIBILITY_META: Record<Credibility, { label: string; color: string; dot: string }> = {
  high: { label: '高可信', color: 'text-bamboo', dot: 'bg-bamboo' },
  medium: { label: '中可信', color: 'text-gold', dot: 'bg-gold' },
  low: { label: '低可信', color: 'text-seal', dot: 'bg-seal' },
}

const CONSISTENCY_META: Record<Consistency, { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  consistent: { label: '多源一致', color: 'text-bamboo', bg: 'bg-bamboo/5 border-bamboo/20', icon: CheckCircle },
  conflict: { label: '存在矛盾', color: 'text-gold', bg: 'bg-gold/5 border-gold/20', icon: AlertTriangle },
  single: { label: '单源未证实', color: 'text-seal', bg: 'bg-seal/5 border-seal/20', icon: XCircle },
}

const EXAMPLE_CLAIMS = [
  'X市昨日发生4.5级地震，网传与地下核试验有关',
  '某新能源车夜间自燃，厂家疑似隐瞒电池缺陷',
  '网红景点门票将涨价三倍，文旅局已批复',
]

// ===== 组件 =====

export default function MultiSourceVerify() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [input, setInput] = useState('')
  const [claim, setClaim] = useState('')
  const [state, setState] = useState<AnalysisState>('idle')
  const [showMatrix, setShowMatrix] = useState(true)

  const handleVerify = useCallback(async () => {
    if (!input.trim() || state === 'analyzing') return
    setState('analyzing')
    setClaim(input.trim())
    await new Promise(r => setTimeout(r, 2000))
    setState('done')
  }, [input, state])

  const handleReset = () => {
    setInput('')
    setClaim('')
    setState('idle')
    setShowMatrix(true)
  }

  const handleExample = (text: string) => {
    setInput(text)
    setState('idle')
  }

  // ===== 渲染 =====

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-paper-texture">
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
          <div className="animate-fade-in-up space-y-4 mt-2">
            <div className="bg-surface rounded-2xl border border-line/60 p-4 space-y-3">
              <label className="text-[12px] text-ink-700 font-medium flex items-center gap-1.5">
                <Search size={12} className="text-seal/70" />
                输入新闻事件或声明
              </label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="粘贴一段新闻链接、声明文本或事件描述...&#10;&#10;例如：X市昨日发生4.5级地震，网传与地下核试验有关"
                rows={4}
                className="w-full bg-paper-dark/40 rounded-xl p-3 text-[13px] text-ink-900 placeholder:text-ink-faint outline-none border border-line/40 focus:border-seal/40 focus:bg-paper-dark/20 resize-none transition-all"
              />
              <button
                onClick={handleVerify}
                disabled={!input.trim()}
                className="w-full py-2.5 rounded-xl bg-seal text-white text-[13px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-seal-light transition-colors active:scale-[0.98]"
              >
                <Search size={14} />
                开始验证
              </button>
            </div>

            {/* 示例 */}
            <div>
              <p className="text-[12px] text-ink-400 font-medium mb-2">试试这些例子：</p>
              <div className="space-y-2">
                {EXAMPLE_CLAIMS.map((text, i) => (
                  <button
                    key={i}
                    onClick={() => handleExample(text)}
                    className="w-full text-left p-3 bg-surface rounded-xl border border-line/60 text-[12px] text-ink-500 leading-relaxed hover:border-seal/30 hover:bg-paper-dark/30 transition-all active:scale-[0.99]"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            {/* 说明 */}
            <div className="bg-paper-dark/40 rounded-xl p-3 border border-line/40">
              <p className="text-[11px] text-ink-500 leading-relaxed flex items-start gap-1.5">
                <Shield size={12} className="text-seal/60 flex-shrink-0 mt-0.5" />
                <span>本工具会从官方媒体、当事人、公众讨论、匿名社区等多个信源交叉比对，给出综合可信度评分与细节一致性矩阵。<br/><span className="text-ink-faint">（演示版本：使用硬编码 mock 数据，不进行真实网络请求）</span></span>
              </p>
            </div>
          </div>
        )}

        {/* ===== 分析中状态 ===== */}
        {state === 'analyzing' && (
          <div className="mt-4 animate-fade-in-up">
            <div className="bg-surface rounded-2xl border border-line p-6 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-seal/30 border-t-seal animate-spin" />
              <p className="text-sm text-ink-700 font-medium">正在交叉验证多个信源...</p>
              <p className="text-[10px] text-ink-faint">抓取官方报道 · 比对当事人陈述 · 扫描公众讨论 · 评估匿名来源</p>
              <div className="mt-2 px-3 py-2 bg-paper-dark/40 rounded-lg max-w-full">
                <p className="text-[11px] text-ink-500 truncate">声明：{claim}</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== 结果状态 ===== */}
        {state === 'done' && (
          <div className="mt-2 space-y-3 animate-fade-in-up">
            {/* 综合可信度评分 */}
            <div className="bg-surface rounded-2xl border border-line overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Shield size={14} className="text-ink-500" />
                    <span className="text-xs text-ink-700 font-medium">综合可信度评分</span>
                  </div>
                  <span className={`text-lg font-bold ${
                    OVERALL_SCORE >= 70 ? 'text-bamboo' : OVERALL_SCORE >= 40 ? 'text-gold' : 'text-seal'
                  }`}>
                    {OVERALL_SCORE}<span className="text-[10px] text-ink-faint font-normal">/100</span>
                  </span>
                </div>
                <div className="h-2 bg-paper-dark rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      OVERALL_SCORE >= 70 ? 'bg-bamboo' : OVERALL_SCORE >= 40 ? 'bg-gold' : 'bg-seal'
                    }`}
                    style={{ width: `${OVERALL_SCORE}%` }}
                  />
                </div>
                <p className={`text-[10px] mt-1.5 ${
                  OVERALL_SCORE >= 70 ? 'text-bamboo' : OVERALL_SCORE >= 40 ? 'text-gold' : 'text-seal'
                }`}>
                  {OVERALL_SCORE >= 70 ? '主体事实可信，个别细节存疑' :
                   OVERALL_SCORE >= 40 ? '核心事实有据，但部分关键信息缺乏多源印证' :
                   '关键事实缺乏可靠信源支撑，需谨慎对待'}
                </p>
              </div>
              <div className="px-4 pb-3 pt-1 border-t border-line/40">
                <p className="text-[10px] text-ink-faint leading-relaxed">验证声明</p>
                <p className="text-[11px] text-ink-700 leading-relaxed mt-0.5">{claim}</p>
              </div>
            </div>

            {/* 信源列表 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs text-ink-700 font-medium flex items-center gap-1.5">
                  <Newspaper size={12} className="text-seal/70" />
                  信源列表（{MOCK_SOURCES.length}）
                </h3>
                <span className="text-[10px] text-ink-faint">按时间排序</span>
              </div>
              {MOCK_SOURCES.map((src, i) => {
                const stance = STANCE_META[src.stance]
                const cred = CREDIBILITY_META[src.credibility]
                const StanceIcon = stance.icon
                return (
                  <div key={i} className="bg-surface rounded-xl border border-line/60 p-3 space-y-2">
                    {/* 头部 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-paper-dark flex items-center justify-center flex-shrink-0">
                          <StanceIcon size={13} className="text-seal/70" />
                        </div>
                        <span className="text-[12px] text-ink-900 font-medium truncate">{src.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${stance.color}`}>
                          <StanceIcon size={9} />
                          {stance.label}
                        </span>
                      </div>
                    </div>
                    {/* 可信度 + 时间 */}
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${cred.dot}`} />
                        <span className={`${cred.color} font-medium`}>{cred.label}</span>
                      </div>
                      <div className="flex items-center gap-1 text-ink-faint">
                        <Clock size={10} />
                        {src.timestamp}
                      </div>
                    </div>
                    {/* 摘要 */}
                    <p className="text-[11px] text-ink-500 leading-relaxed bg-paper-dark/30 rounded-lg p-2">
                      {src.excerpt}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* 一致性矩阵 */}
            <div className="bg-surface rounded-xl border border-line/60 overflow-hidden">
              <button
                onClick={() => setShowMatrix(!showMatrix)}
                className="w-full px-3 py-2.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-ink-500" />
                  <span className="text-xs text-ink-700 font-medium">细节一致性矩阵</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-ink-500 bg-ink-100/60">
                    {MOCK_CONSISTENCY.length} 项
                  </span>
                </div>
                {showMatrix ? <ChevronUp size={14} className="text-ink-faint" /> : <ChevronDown size={14} className="text-ink-faint" />}
              </button>
              {showMatrix && (
                <div className="px-3 pb-3 space-y-2">
                  {MOCK_CONSISTENCY.map((item, i) => {
                    const meta = CONSISTENCY_META[item.status]
                    const Icon = meta.icon
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${meta.bg}`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          <Icon size={14} className={meta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-ink-900 font-medium">{item.detail}</p>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${meta.color} bg-white/50`}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-ink-500 mt-0.5 leading-relaxed">{item.note}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 免责声明 */}
            <div className="text-center py-3">
              <p className="text-[9px] text-ink-faint leading-relaxed">
                演示版本使用硬编码 mock 数据，不代表真实信源验证结果<br />
                评分与一致性结论仅供参考，不构成事实判断
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
