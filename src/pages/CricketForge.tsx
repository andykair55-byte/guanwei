/**
 * CricketForge — 蛐蛐锻造工坊
 *
 * 用户自定义 AI 蛐蛐：写一段人设描述，系统自动生成完整的辩论 prompt。
 * 核心交互：输入人设 → 预览蛐蛐性格 → 命名 → 开始斗蛐蛐。
 */
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Send, Sparkles, Shuffle, Palette, Zap,
  ChevronRight, Swords, Eye,
} from 'lucide-react'
import { usePlatform } from '../hooks/usePlatform'

// ===== 预设模板 =====

interface Preset {
  id: string
  name: string
  description: string
  prompt: string
  color: string
  emoji: string
}

const PRESETS: Preset[] = [
  {
    id: 'dongbei-dama',
    name: '东北大妈',
    description: '用生活经验辩论，说话直来直去',
    prompt: '你是一个东北大妈，说话直来直去，喜欢用生活经验来论证。口头禅是"我跟你说"和"你听我的没错"。辩论风格是过来人的语重心长，偶尔带点幽默的嘲讽。',
    color: 'from-red-500 to-orange-500',
    emoji: '🧧',
  },
  {
    id: 'liGong-nan',
    name: '理工直男',
    description: '只认数据不认人，逻辑至上',
    prompt: '你是一个典型的理工科男生，只相信数据和逻辑，对感性论证天然免疫。喜欢说"从统计学角度来看"和"你这个样本量不够"。不会用修辞，但论证链条极其严密。',
    color: 'from-blue-500 to-cyan-500',
    emoji: '🔬',
  },
  {
    id: 'wenyi-qingnian',
    name: '文艺青年',
    description: '万物皆可引用电影和书籍',
    prompt: '你是一个文艺青年，每句话都想引用电影、小说或诗歌。辩论风格是感性的、浪漫的，喜欢用"就像某某电影里说的"来佐证观点。对数据不敏感，但共情能力极强。',
    color: 'from-violet-500 to-purple-500',
    emoji: '🎬',
  },
  {
    id: 'laoshi',
    name: '高中班主任',
    description: '说教型选手，擅长道德论证',
    prompt: '你是一个高中班主任，辩论时习惯性地用教育口吻。喜欢说"同学们想一想"和"这个事情的本质是什么"。擅长从道德和责任的角度论证，偶尔会不自觉地说教。',
    color: 'from-amber-500 to-yellow-600',
    emoji: '📚',
  },
  {
    id: 'chuangye-zhe',
    name: '创业大佬',
    description: '满嘴商业术语，喜欢降维打击',
    prompt: '你是一个连续创业者，习惯用商业思维分析一切问题。口头禅是"底层逻辑"、"第一性原理"和"这个赛道的天花板"。喜欢把任何问题都转化为商业模型来分析。',
    color: 'from-emerald-500 to-teal-600',
    emoji: '💼',
  },
  {
    id: 'xiaohai',
    name: '十岁小孩',
    description: '用童真视角拆解复杂问题',
    prompt: '你是一个十岁的小孩，对世界充满好奇但理解有限。喜欢问"为什么"，用简单的逻辑挑战复杂的论证。有时候会说出大人想不到的天真观点。口头禅是"但是为什么呢"和"我妈妈说"。',
    color: 'from-pink-400 to-rose-500',
    emoji: '🧒',
  },
]

// ===== 颜色选项 =====
const COLOR_OPTIONS = [
  { id: 'red', from: 'from-red-500', to: 'to-orange-500', label: '烈焰' },
  { id: 'blue', from: 'from-blue-500', to: 'to-cyan-500', label: '寒冰' },
  { id: 'violet', from: 'from-violet-500', to: 'to-purple-500', label: '幻影' },
  { id: 'amber', from: 'from-amber-500', to: 'to-yellow-600', label: '金光' },
  { id: 'emerald', from: 'from-emerald-500', to: 'to-teal-600', label: '翡翠' },
  { id: 'rose', from: 'from-rose-500', to: 'to-pink-600', label: '桃花' },
  { id: 'slate', from: 'from-slate-600', to: 'to-slate-800', label: '暗影' },
  { id: 'indigo', from: 'from-indigo-500', to: 'to-blue-700', label: '星空' },
]

const STORAGE_KEY = 'cricket-forges'

export default function CricketForge() {
  const navigate = useNavigate()
  const { isWeb } = usePlatform()

  const [step, setStep] = useState<'preset' | 'customize' | 'preview'>('preset')
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0])
  const [isGenerating, setIsGenerating] = useState(false)

  // 从预设开始
  const handlePresetSelect = useCallback((preset: Preset) => {
    setName(preset.name)
    setPrompt(preset.prompt)
    const color = COLOR_OPTIONS.find(c => c.from === preset.color) || COLOR_OPTIONS[0]
    setSelectedColor(color)
    setStep('customize')
  }, [])

  // 随机预设
  const handleRandomPreset = useCallback(() => {
    const random = PRESETS[Math.floor(Math.random() * PRESETS.length)]
    handlePresetSelect(random)
  }, [handlePresetSelect])

  // AI 润色 prompt（调用 Groq）
  const handleEnhancePrompt = useCallback(async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)

    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey) {
      setIsGenerating(false)
      return
    }

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `你是一个辩论选手人设优化师。用户会给你一段蛐蛐的人设描述，你需要把它扩展成完整的辩论 system prompt。

要求：
- 保留用户描述的核心人格和说话风格
- 补充辩论策略（开场/中场/白热化各阶段的风格）
- 补充语言特征（常用句式、嘲讽方式）
- 添加底线规则（不人身攻击、尊重对手）
- 添加辩论节奏规则（每轮必须回应对手上一轮论点）
- 总长度 200-400 字
- 直接输出 prompt，不要加任何前缀说明`,
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 600,
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (res.ok) {
        const data = await res.json()
        const enhanced = data.choices?.[0]?.message?.content?.trim()
        if (enhanced) setPrompt(enhanced)
      }
    } catch {
      // fallback: 保持原 prompt 不变
    } finally {
      setIsGenerating(false)
    }
  }, [prompt])

  // 开始斗蛐蛐：保存到 localStorage 后跳转对战页
  const handleStartBattle = useCallback(() => {
    if (!name.trim() || !prompt.trim()) return
    const forge = {
      id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      name: name.trim(),
      prompt: prompt.trim(),
      avatar: `${selectedColor.from} ${selectedColor.to}`,
      createdAt: Date.now(),
    }
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as typeof forge[]
      list.push(forge)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    } catch {
      // localStorage 不可用时忽略，仅跳转
    }
    navigate(`/ai-battle?forgeId=${forge.id}`)
  }, [name, prompt, selectedColor, navigate])

  return (
    <div className={`flex flex-col min-h-full bg-paper-texture ${isWeb ? 'max-w-4xl mx-auto' : ''}`}>
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-ink-900">蛐蛐锻造</h1>
          <p className="text-[11px] text-ink-400">设计你的 AI 蛐蛐，送上擂台</p>
        </div>
        {step !== 'preset' && (
          <button
            onClick={() => setStep(step === 'preview' ? 'customize' : 'preset')}
            className="text-[12px] text-ink-500 hover:text-ink-700 transition-colors"
          >
            返回
          </button>
        )}
      </div>

      <div className="flex-1 px-5 pb-4 overflow-y-auto">
        {/* ===== Step 1: 选择预设 ===== */}
        {step === 'preset' && (
          <div className="space-y-4 animate-fade-in-up">
            {/* 快捷入口 */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleRandomPreset}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-seal to-gold text-white font-semibold text-[13px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Shuffle size={16} />
                随机一只
              </button>
              <button
                onClick={() => { setName(''); setPrompt(''); setStep('customize') }}
                className="flex-1 py-3 rounded-xl bg-surface border border-line/30 text-ink-700 font-semibold text-[13px] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                从零开始
              </button>
            </div>

            {/* 预设列表 */}
            <div className="space-y-2">
              <p className="text-[12px] text-ink-500 font-medium">或者选一只现成的：</p>
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-line/20 hover:border-line/40 hover:shadow-card transition-all active:scale-[0.99] text-left"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${preset.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <span className="text-lg">{preset.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-ink-900">{preset.name}</p>
                    <p className="text-[11px] text-ink-400 truncate">{preset.description}</p>
                  </div>
                  <ChevronRight size={16} className="text-ink-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== Step 2: 自定义 ===== */}
        {step === 'customize' && (
          <div className="space-y-4 animate-fade-in-up">
            {/* 名称 */}
            <div>
              <label className="text-[12px] text-ink-500 font-medium mb-1.5 block">给你的蛐蛐起个名</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="比如：杠精小王、逻辑怪、嘴炮大师..."
                maxLength={12}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-line/30 text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-seal/30 focus:border-seal/30 transition-all"
              />
            </div>

            {/* 人设描述 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] text-ink-500 font-medium">蛐蛐性格</label>
                <button
                  onClick={handleEnhancePrompt}
                  disabled={!prompt.trim() || isGenerating}
                  className="text-[11px] text-seal hover:text-seal/80 transition-colors flex items-center gap-1 disabled:opacity-40"
                >
                  <Zap size={12} />
                  {isGenerating ? '润色中...' : 'AI 润色'}
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="描述你的蛐蛐是什么性格、怎么说话、怎么辩论...&#10;&#10;比如：你是一个东北大妈，说话直来直去，喜欢用生活经验来论证..."
                rows={6}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-line/30 text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-seal/30 focus:border-seal/30 resize-none transition-all leading-relaxed"
              />
              <p className="text-[10px] text-ink-300 mt-1">
                写得越具体，蛐蛐越有个性。点「AI 润色」可以自动扩展成完整的辩论人设。
              </p>
            </div>

            {/* 颜色选择 */}
            <div>
              <label className="text-[12px] text-ink-500 font-medium mb-2 block">
                <Palette size={12} className="inline mr-1" />
                战袍颜色
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color.from} ${color.to} transition-all ${
                      selectedColor.id === color.id
                        ? 'ring-2 ring-offset-2 ring-offset-paper ring-seal scale-110'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* 预览 / 开始按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('preview')}
                disabled={!name.trim() || !prompt.trim()}
                className="flex-1 py-3.5 rounded-xl bg-surface border border-line/30 text-ink-700 font-semibold text-[13px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Eye size={16} />
                预览
              </button>
              <button
                onClick={handleStartBattle}
                disabled={!name.trim() || !prompt.trim()}
                className="flex-1 py-3.5 rounded-xl bg-seal text-white font-semibold text-[13px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-seal-glow disabled:opacity-40"
              >
                <Swords size={16} />
                上擂台
              </button>
            </div>
          </div>
        )}

        {/* ===== Step 3: 预览 ===== */}
        {step === 'preview' && (
          <div className="space-y-4 animate-fade-in-up">
            {/* 蛐蛐卡片 */}
            <div className="bg-surface rounded-2xl shadow-card border border-line/20 p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedColor.from} ${selectedColor.to} flex items-center justify-center shadow-lg`}>
                  <span className="text-white text-2xl font-bold">{name.charAt(0)}</span>
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-ink-900">{name}</h2>
                  <p className="text-[12px] text-ink-400">你的蛐蛐</p>
                </div>
              </div>

              <div className="bg-paper-dark/50 rounded-xl p-4">
                <p className="text-[11px] text-ink-500 font-medium mb-2">性格设定</p>
                <p className="text-[13px] text-ink-700 leading-relaxed whitespace-pre-wrap">{prompt}</p>
              </div>
            </div>

            {/* 对战配置 */}
            <div className="bg-surface rounded-2xl shadow-card border border-line/20 p-5">
              <h3 className="text-[14px] font-bold text-ink-900 mb-3">对战设置</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-ink-500">辩题</span>
                  <span className="text-[12px] text-ink-700">随机</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-ink-500">对手</span>
                  <span className="text-[12px] text-ink-700">随机蛐蛐</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-ink-500">裁判</span>
                  <span className="text-[12px] text-ink-700">骰子随机</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-ink-500">回合数</span>
                  <span className="text-[12px] text-ink-700">4 回合</span>
                </div>
              </div>
            </div>

            {/* 开始 */}
            <button
              onClick={handleStartBattle}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-seal to-gold text-white font-bold text-[15px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Swords size={18} />
              开斗！
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
