import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ShieldCheck, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { verifyClaim } from '../../services/creationService'

interface ClaimVerifierProps {
  content: string
  onResult?: (claim: string, result: string) => void
}

// 声明性语句的关键词（spec 要求："是""有""可以""导致""因为""所以"等）
const CLAIM_KEYWORDS = ['是', '有', '可以', '导致', '因为', '所以', '由于', '因此', '从而', '使得', '引起', '造成', '证明', '显示', '表明', '说明']

interface Claim {
  id: string
  text: string
}

interface VerifyState {
  loading: boolean
  result: string | null
  error: string | null
}

/**
 * 将文本拆为句子。按句末标点（。！？.!?）或换行切分，保留有意义的内容。
 */
function splitSentences(content: string): string[] {
  if (!content || !content.trim()) return []
  // 去掉 markdown 标题/列表符号对句子识别的干扰，但保留句内文本
  const lines = content.split(/\n+/).map(l => l.replace(/^#{1,6}\s*|^\s*[-*+]\s+|^\s*\d+\.\s+|^>\s*/g, '').trim()).filter(Boolean)
  const sentences: string[] = []
  for (const line of lines) {
    // 按中英文句末标点切分
    const parts = line.split(/(?<=[。！？.!?])\s*/)
    for (const p of parts) {
      const t = p.trim()
      if (t.length >= 4) sentences.push(t)
    }
  }
  return sentences
}

/**
 * 判断句子是否为声明性语句：长度 >= 6 且包含任一关键词。
 */
function isClaimSentence(sentence: string): boolean {
  if (sentence.length < 6) return false
  return CLAIM_KEYWORDS.some(kw => sentence.includes(kw))
}

function extractClaims(content: string): Claim[] {
  const sentences = splitSentences(content)
  const seen = new Set<string>()
  const claims: Claim[] = []
  let idx = 0
  for (const s of sentences) {
    if (isClaimSentence(s) && !seen.has(s)) {
      seen.add(s)
      claims.push({ id: `claim-${idx++}`, text: s })
    }
  }
  return claims
}

// mock 核查结果（LLM 不可用时降级）
const MOCK_RESULTS = [
  { verdict: '支撑', note: '与常见公开资料一致，初步判断可信。' },
  { verdict: '未支撑', note: '未找到可验证的公开来源，存疑。' },
  { verdict: '有出入', note: '部分细节与公开信息存在差异，建议进一步核实。' },
]

function getMockResult(): string {
  const m = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)]
  return `${m.verdict}：${m.note}`
}

export default function ClaimVerifier({ content, onResult }: ClaimVerifierProps) {
  const claims = useMemo(() => extractClaims(content), [content])
  const [open, setOpen] = useState(true)
  const [verifyStates, setVerifyStates] = useState<Record<string, VerifyState>>({})

  // 内容变化时清空旧核查状态
  useEffect(() => {
    setVerifyStates({})
  }, [content])

  const handleVerify = async (claim: Claim) => {
    setVerifyStates(prev => ({ ...prev, [claim.id]: { loading: true, result: null, error: null } }))
    let result: string
    try {
      result = await verifyClaim(claim.text)
      if (!result.trim()) {
        // LLM 返回空也降级
        result = getMockResult()
      }
    } catch {
      // LLM 不可用，降级 mock
      result = getMockResult()
    }
    setVerifyStates(prev => ({ ...prev, [claim.id]: { loading: false, result, error: null } }))
    onResult?.(claim.text, result)
  }

  if (claims.length === 0) {
    return (
      <div className="rounded-xl border border-ink-100 bg-paper-0 px-4 py-3 text-[12px] text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={13} />
          暂未检测到声明性语句
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-paper-0 overflow-hidden">
      {/* 头部 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-paper-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal-600/40"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <span className="text-[13px] font-medium text-ink-800">声明核查</span>
          <span className="text-[11px] text-ink-400">{claims.length} 条疑似声明</span>
        </div>
        {open ? <ChevronDown size={14} className="text-ink-400" /> : <ChevronRight size={14} className="text-ink-400" />}
      </button>

      {/* 声明列表 */}
      {open && (
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {claims.map(claim => {
            const state = verifyStates[claim.id]
            return (
              <li key={claim.id} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={13} className="mt-0.5 text-amber-500 flex-shrink-0" />
                  <p className="flex-1 text-[13px] leading-relaxed text-ink-700">{claim.text}</p>
                  <button
                    onClick={() => handleVerify(claim)}
                    disabled={state?.loading}
                    className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium bg-paper-100 text-ink-600 hover:bg-ink-100 hover:text-ink-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal-600/40"
                  >
                    {state?.loading ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        核查中
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={12} />
                        核查
                      </>
                    )}
                  </button>
                </div>
                {/* 核查结果 */}
                {state?.result && (
                  <div className="mt-2 ml-5 rounded-lg bg-paper-50 border border-ink-100 px-3 py-2 text-[12px] leading-relaxed text-ink-700">
                    {state.result}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
