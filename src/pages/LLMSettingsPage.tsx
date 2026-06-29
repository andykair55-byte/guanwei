import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Key, Globe, Cpu, Check, X, Loader2, Eye, EyeOff,
} from 'lucide-react'
import { useLLMStore } from '../stores/llmStore'

const PROVIDERS = [
  { value: 'groq', label: 'Groq', desc: '免费，速度快，模型丰富' },
  { value: 'openai', label: 'OpenAI', desc: 'GPT 系列，能力最强' },
  { value: 'deepseek', label: 'DeepSeek', desc: '国产大模型，性价比高' },
  { value: 'custom', label: '自定义', desc: '兼容 OpenAI 格式的任意 API' },
] as const

const QUICK_MODELS: Record<string, string[]> = {
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'o1-mini'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  custom: [],
}

export default function LLMSettingsPage() {
  const navigate = useNavigate()
  const { config, setConfig, testConnection } = useLLMStore()
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testConnection()
    setTestResult(result)
    setTesting(false)
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-line/50">
        <div className="flex items-center h-12 px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60">
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <div className="flex items-center gap-2 ml-3">
            <Cpu size={18} className="text-seal" />
            <span className="text-[15px] font-semibold text-ink-900">LLM 设置</span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* Provider 选择 */}
        <div>
          <label className="text-xs font-medium text-ink-500 mb-2 block">服务商</label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map(p => (
              <button
                key={p.value}
                onClick={() => setConfig({ provider: p.value })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  config.provider === p.value
                    ? 'border-seal bg-seal/5 shadow-sm'
                    : 'border-line/30 bg-surface hover:border-line/50'
                }`}
              >
                <p className={`text-sm font-semibold ${config.provider === p.value ? 'text-seal' : 'text-ink-900'}`}>{p.label}</p>
                <p className="text-xs text-ink-400 mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="text-xs font-medium text-ink-500 mb-2 block">API Key</label>
          <div className="relative">
            <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type={showKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={e => setConfig({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface border border-line/30 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-seal/20 focus:border-seal/40 transition-all"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* API 地址 */}
        <div>
          <label className="text-xs font-medium text-ink-500 mb-2 block">API 地址</label>
          <div className="relative">
            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={config.baseUrl}
              onChange={e => setConfig({ baseUrl: e.target.value })}
              placeholder="https://api.groq.com/openai/v1"
              className="w-full pl-10 py-2.5 rounded-xl bg-surface border border-line/30 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-seal/20 focus:border-seal/40 transition-all"
            />
          </div>
        </div>

        {/* 模型选择 */}
        <div>
          <label className="text-xs font-medium text-ink-500 mb-2 block">模型</label>
          <input
            type="text"
            value={config.model}
            onChange={e => setConfig({ model: e.target.value })}
            placeholder="模型名称"
            className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line/30 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-seal/20 focus:border-seal/40 transition-all mb-2"
          />
          {/* 快捷模型列表 */}
          {QUICK_MODELS[config.provider]?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_MODELS[config.provider].map(m => (
                <button
                  key={m}
                  onClick={() => setConfig({ model: m })}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                    config.model === m
                      ? 'bg-seal text-white font-medium'
                      : 'bg-paper-dark text-ink-500 hover:bg-ink-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 测试连接 */}
        <div>
          <button
            onClick={handleTest}
            disabled={testing}
            className="w-full py-3 rounded-xl bg-seal text-white text-sm font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-seal-glow disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                测试连接中...
              </>
            ) : (
              '测试连接'
            )}
          </button>

          {/* 测试结果 */}
          {testResult && (
            <div className={`mt-3 p-3 rounded-xl flex items-start gap-2 ${
              testResult.success ? 'bg-bamboo/10 border border-bamboo/20' : 'bg-seal/10 border border-seal/20'
            }`}>
              {testResult.success ? (
                <Check size={16} className="text-bamboo mt-0.5 flex-shrink-0" />
              ) : (
                <X size={16} className="text-seal mt-0.5 flex-shrink-0" />
              )}
              <p className={`text-xs leading-relaxed ${testResult.success ? 'text-bamboo' : 'text-seal'}`}>
                {testResult.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
