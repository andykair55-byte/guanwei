import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Key, Globe, Cpu, Check, X, Loader2, Eye, EyeOff, Search,
  Wifi, WifiOff, Zap, ChevronRight, Sparkles,
} from 'lucide-react'
import { useLLMStore } from '../stores/llmStore'
import { useIsDesktop } from '../hooks/useIsDesktop'

const PROVIDERS = [
  { value: 'groq', label: 'Groq', desc: '免费、速度快、模型丰富', icon: '⚡' },
  { value: 'openai', label: 'OpenAI', desc: 'GPT 系列，能力最强', icon: '🧠' },
  { value: 'deepseek', label: 'DeepSeek', desc: '国产大模型，性价比高', icon: '🇨🇳' },
  { value: 'custom', label: '自定义', desc: '兼容 OpenAI 格式的任意 API', icon: '🔧' },
] as const

const QUICK_MODELS: Record<string, string[]> = {
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'o1-mini'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  custom: [],
}

const SEARCH_PROVIDERS = [
  { value: 'mock', label: 'Mock 示例数据', desc: '内置示例数据，无需 API Key', icon: '📦' },
  { value: 'tavily', label: 'Tavily', desc: 'AI 搜索优化，适合 Agent 场景', icon: '🔍' },
  { value: 'serpapi', label: 'SerpAPI', desc: 'Google 搜索结果 API', icon: '🌐' },
] as const

export default function LLMSettingsPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const { config, setConfig, testConnection, searchConfig, setSearchConfig, testSearchConnection } = useLLMStore()
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showSearchKey, setShowSearchKey] = useState(false)
  const [searchTesting, setSearchTesting] = useState(false)
  const [searchTestResult, setSearchTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testConnection()
    setTestResult(result)
    setTesting(false)
  }

  const handleSearchTest = async () => {
    setSearchTesting(true)
    setSearchTestResult(null)
    const result = await testSearchConnection()
    setSearchTestResult(result)
    setSearchTesting(false)
  }

  const hasApiKey = !!config.apiKey
  const hasSearchKey = searchConfig.provider === 'mock' || !!searchConfig.apiKey

  return (
    <div className="flex flex-col min-h-full bg-gradient-to-b from-paper-50 to-paper-100">
      {/* Header */}
      <div className={`px-5 pt-4 pb-2 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95"
          >
            <ArrowLeft size={20} className="text-ink-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-[17px] font-bold text-ink-900">设置</h1>
            <p className="text-[10px] text-ink-400">配置 API 后即可使用工作间和小薇</p>
          </div>
          {/* 连接状态 */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
            hasApiKey ? 'bg-bamboo/10 text-bamboo' : 'bg-ink-50 text-ink-400'
          }`}>
            {hasApiKey ? <Wifi size={12} /> : <WifiOff size={12} />}
            {hasApiKey ? '已配置' : '未配置'}
          </div>
        </div>
      </div>

      <div className={`flex-1 px-4 pb-6 space-y-3 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        {/* ===== LLM 配置区 ===== */}
        <div className="rounded-2xl bg-white border border-line/20 shadow-sm p-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-seal to-seal-light flex items-center justify-center shadow-sm">
              <Cpu size={15} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-ink-900">LLM 配置</h2>
              <p className="text-[10px] text-ink-400">工作间 Commander 和小薇使用此配置</p>
            </div>
          </div>

          {/* 服务商选择 */}
          <div className="mb-3">
            <label className="text-[11px] font-medium text-ink-500 mb-1.5 block">服务商</label>
            <div className="grid grid-cols-4 gap-2">
              {PROVIDERS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setConfig({ provider: p.value })}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    config.provider === p.value
                      ? 'border-seal bg-seal/5 shadow-sm ring-1 ring-seal/20'
                      : 'border-line/20 bg-paper-50 hover:border-line/40 hover:bg-paper-100'
                  }`}
                >
                  <span className="text-[18px] block mb-1">{p.icon}</span>
                  <p className={`text-[12px] font-semibold ${config.provider === p.value ? 'text-seal' : 'text-ink-800'}`}>{p.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="mb-3">
            <label className="text-[11px] font-medium text-ink-500 mb-1.5 block">API Key</label>
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={e => setConfig({ apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-paper-50 border border-line/20 text-[13px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-seal/20 focus:border-seal/40 transition-all"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* API 地址 + 模型 */}
          <div className="grid grid-cols-2 gap-3 mb-1">
            <div>
              <label className="text-[11px] font-medium text-ink-500 mb-1.5 block">API 地址</label>
              <div className="relative">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={e => setConfig({ baseUrl: e.target.value })}
                  placeholder="https://api.groq.com/openai/v1"
                  className="w-full pl-9 py-2.5 rounded-xl bg-paper-50 border border-line/20 text-[12px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-seal/20 focus:border-seal/40 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-ink-500 mb-1.5 block">模型</label>
              <input
                type="text"
                value={config.model}
                onChange={e => setConfig({ model: e.target.value })}
                placeholder="模型名称"
                className="w-full px-3 py-2.5 rounded-xl bg-paper-50 border border-line/20 text-[12px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-seal/20 focus:border-seal/40 transition-all"
              />
            </div>
          </div>

          {/* 快捷模型 */}
          {QUICK_MODELS[config.provider]?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
              {QUICK_MODELS[config.provider].map(m => (
                <button
                  key={m}
                  onClick={() => setConfig({ model: m })}
                  className={`px-2.5 py-1 rounded-lg text-[10px] transition-all ${
                    config.model === m
                      ? 'bg-seal text-white font-medium'
                      : 'bg-paper-50 text-ink-500 hover:bg-ink-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* 测试连接 */}
          <button
            onClick={handleTest}
            disabled={testing || !config.apiKey}
            className="w-full mt-3 py-2.5 rounded-xl bg-seal text-white text-[12px] font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {testing ? (
              <><Loader2 size={14} className="animate-spin" /> 测试连接中...</>
            ) : (
              <><Zap size={14} /> 测试连接</>
            )}
          </button>

          {/* 测试结果 */}
          {testResult && (
            <div className={`mt-2 p-3 rounded-xl flex items-start gap-2 ${
              testResult.success ? 'bg-bamboo/5 border border-bamboo/15' : 'bg-seal/5 border border-seal/15'
            }`}>
              {testResult.success ? (
                <Check size={14} className="text-bamboo mt-0.5 flex-shrink-0" />
              ) : (
                <X size={14} className="text-seal mt-0.5 flex-shrink-0" />
              )}
              <p className={`text-[11px] leading-relaxed ${testResult.success ? 'text-bamboo' : 'text-seal'}`}>
                {testResult.message}
              </p>
            </div>
          )}
        </div>

        {/* ===== 搜索服务配置区 ===== */}
        <div className="rounded-2xl bg-white border border-line/20 shadow-sm p-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <Search size={15} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-ink-900">搜索服务配置</h2>
              <p className="text-[10px] text-ink-400">工作间 Agent 联网搜索时使用</p>
            </div>
          </div>

          {/* Search Provider 选择 */}
          <div className="mb-3">
            <label className="text-[11px] font-medium text-ink-500 mb-1.5 block">服务商</label>
            <div className="grid grid-cols-3 gap-2">
              {SEARCH_PROVIDERS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setSearchConfig({ provider: p.value })}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    searchConfig.provider === p.value
                      ? 'border-seal bg-seal/5 shadow-sm ring-1 ring-seal/20'
                      : 'border-line/20 bg-paper-50 hover:border-line/40 hover:bg-paper-100'
                  }`}
                >
                  <span className="text-[16px] block mb-1">{p.icon}</span>
                  <p className={`text-[11px] font-semibold ${searchConfig.provider === p.value ? 'text-seal' : 'text-ink-800'}`}>{p.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Search API Key */}
          {searchConfig.provider !== 'mock' && (
            <div className="mb-3">
              <label className="text-[11px] font-medium text-ink-500 mb-1.5 block">搜索 API Key</label>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type={showSearchKey ? 'text' : 'password'}
                  value={searchConfig.apiKey}
                  onChange={e => setSearchConfig({ apiKey: e.target.value })}
                  placeholder={searchConfig.provider === 'tavily' ? 'tvly-...' : 'serpapi key'}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-paper-50 border border-line/20 text-[13px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-seal/20 focus:border-seal/40 transition-all"
                />
                <button
                  onClick={() => setShowSearchKey(!showSearchKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showSearchKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* 测试搜索连接 */}
          <button
            onClick={handleSearchTest}
            disabled={searchTesting || (!hasSearchKey && searchConfig.provider !== 'mock')}
            className="w-full py-2.5 rounded-xl bg-seal text-white text-[12px] font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {searchTesting ? (
              <><Loader2 size={14} className="animate-spin" /> 测试连接中...</>
            ) : (
              <><Search size={14} /> 测试搜索连接</>
            )}
          </button>

          {searchTestResult && (
            <div className={`mt-2 p-3 rounded-xl flex items-start gap-2 ${
              searchTestResult.success ? 'bg-bamboo/5 border border-bamboo/15' : 'bg-seal/5 border border-seal/15'
            }`}>
              {searchTestResult.success ? <Check size={14} className="text-bamboo mt-0.5 flex-shrink-0" /> : <X size={14} className="text-seal mt-0.5 flex-shrink-0" />}
              <p className={`text-[11px] leading-relaxed ${searchTestResult.success ? 'text-bamboo' : 'text-seal'}`}>{searchTestResult.message}</p>
            </div>
          )}
        </div>

        {/* ===== 使用提示 ===== */}
        <div className="rounded-2xl bg-gradient-to-br from-seal/5 to-amber-500/5 border border-seal/10 p-4">
          <div className="flex items-start gap-3">
            <Sparkles size={16} className="text-seal mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[12px] font-semibold text-ink-800 mb-1">配置完成后的使用方式</p>
              <ul className="space-y-1">
                <li className="text-[11px] text-ink-500 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-seal" />
                  工作间 — 输入框 Commander 自动使用配置的 LLM
                </li>
                <li className="text-[11px] text-ink-500 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-seal" />
                  小薇 — 右下角悬浮球，随时对话、总结文章、检测情绪
                </li>
                <li className="text-[11px] text-ink-500 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-seal" />
                  搜索服务 — Agent 搜索时自动调用配置的搜索引擎
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}