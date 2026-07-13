import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Key, Globe, Cpu, Check, X, Loader2, Eye, EyeOff, Search,
  Wifi, WifiOff, Zap, Sparkles, Settings, Shield,
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
    <div
      className="flex flex-col min-h-full relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #F0FDF4 0%, #ffffff 280px)' }}
    >
      {/* ═══════ 顶部 Banner（参考瓜田风格）═══════ */}
      <div className={`px-5 pt-5 pb-2 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 35%, #A7F3D0 70%, #6EE7B7 100%)',
            boxShadow: '0 1px 2px rgba(16, 185, 129, 0.08), 0 8px 24px -8px rgba(16, 185, 129, 0.2)',
          }}
        >
          <div className="flex items-center justify-between px-7 py-6 relative">
            {/* 左侧文字 */}
            <div className="flex flex-col gap-2.5 z-10">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 text-[10px] font-bold text-white rounded-full"
                  style={{
                    background: '#059669',
                    boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.15), 0 1px 2px rgba(5, 150, 105, 0.3)',
                    letterSpacing: '0.5px',
                  }}
                >
                  GUAN WEI · 设置
                </span>
              </div>
              <h1 className="text-[26px] font-bold text-emerald-900 leading-tight tracking-tight flex items-center gap-2.5">
                <Settings size={22} className="text-emerald-700" />
                配置中心
              </h1>
              <p className="text-[13px] text-emerald-700/80 leading-relaxed max-w-[360px]">
                配置 API 后即可使用工作间、小薇和 Agent 搜索
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                {/* 连接状态指示器 */}
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{
                    background: hasApiKey ? 'rgba(5, 150, 105, 0.15)' : 'rgba(255,255,255,0.5)',
                    color: hasApiKey ? '#059669' : '#6b7280',
                    backdropFilter: 'blur(8px)',
                    border: hasApiKey ? '1px solid rgba(5, 150, 105, 0.2)' : '1px solid rgba(255,255,255,0.6)',
                  }}
                >
                  {hasApiKey ? <Wifi size={12} /> : <WifiOff size={12} />}
                  <span>LLM {hasApiKey ? '已配置' : '未配置'}</span>
                </div>
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{
                    background: hasSearchKey ? 'rgba(5, 150, 105, 0.15)' : 'rgba(255,255,255,0.5)',
                    color: hasSearchKey ? '#059669' : '#6b7280',
                    backdropFilter: 'blur(8px)',
                    border: hasSearchKey ? '1px solid rgba(5, 150, 105, 0.2)' : '1px solid rgba(255,255,255,0.6)',
                  }}
                >
                  {hasSearchKey ? <Wifi size={12} /> : <WifiOff size={12} />}
                  <span>搜索 {hasSearchKey ? '已配置' : '未配置'}</span>
                </div>
              </div>
            </div>

            {/* 右侧装饰图标 */}
            <div className="hidden md:flex flex-col items-center gap-2 pr-2">
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  <Cpu size={28} className="text-white" strokeWidth={1.5} />
                </div>
                {/* 小装饰 */}
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-300 animate-pulse"
                  style={{ boxShadow: '0 0 10px #fde047' }}
                />
                <div className="absolute -bottom-1 -left-2 w-3 h-3 rounded-full bg-emerald-400 animate-pulse"
                  style={{ boxShadow: '0 0 8px #34d399', animationDelay: '0.5s' }}
                />
              </div>
              <div
                className="text-[10px] font-bold text-emerald-700 tracking-widest mt-1"
                style={{ fontFamily: 'monospace' }}
              >
                SETTINGS · v1.0
              </div>
            </div>
          </div>

          {/* 装饰光斑 */}
          <div className="absolute top-0 right-16 w-28 h-28 rounded-full bg-yellow-200/30 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full bg-emerald-300/40 blur-xl pointer-events-none" />
        </div>

        {/* 返回按钮 */}
        <button
          onClick={() => navigate(-1)}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-emerald-700 bg-white/70 backdrop-blur-sm border border-emerald-200/50 hover:bg-white hover:shadow-md transition-all active:scale-95"
        >
          <ArrowLeft size={14} />
          <span>返回</span>
        </button>
      </div>

      {/* ═══════ 主内容区 ═══════ */}
      <div className={`flex-1 px-5 pb-8 space-y-5 mt-3 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>

        {/* ===== LLM 配置卡片 ===== */}
        <div
          className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -6px rgba(16, 185, 129, 0.08)' }}
        >
          {/* 卡片标题 */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              <Cpu size={18} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">LLM 配置</h2>
              <p className="text-[11px] text-gray-500">工作间 Commander 和小薇使用此配置</p>
            </div>
          </div>

          {/* 服务商选择 */}
          <div className="mb-4">
            <label className="text-[12px] font-semibold text-gray-600 mb-2 block">服务商</label>
            <div className="grid grid-cols-4 gap-2.5">
              {PROVIDERS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setConfig({ provider: p.value })}
                  className="p-3.5 rounded-xl border text-center transition-all group"
                  style={
                    config.provider === p.value
                      ? {
                          borderColor: '#10b981',
                          background: 'linear-gradient(180deg, #ECFDF5 0%, #ffffff 100%)',
                          boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.2), 0 2px 8px -2px rgba(16, 185, 129, 0.15)',
                        }
                      : {
                          borderColor: 'rgba(0,0,0,0.06)',
                          background: '#fafafa',
                        }
                  }
                >
                  <span className="text-[20px] block mb-1.5">{p.icon}</span>
                  <p className={`text-[12px] font-semibold ${config.provider === p.value ? 'text-emerald-600' : 'text-gray-800'}`}>{p.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="mb-4">
            <label className="text-[12px] font-semibold text-gray-600 mb-2 block">API Key</label>
            <div className="relative">
              <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={e => setConfig({ apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* API 地址 + 模型 */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className="text-[12px] font-semibold text-gray-600 mb-2 block">API 地址</label>
              <div className="relative">
                <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={e => setConfig({ baseUrl: e.target.value })}
                  placeholder="https://api.groq.com/openai/v1"
                  className="w-full pl-9 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[12px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-gray-600 mb-2 block">模型</label>
              <input
                type="text"
                value={config.model}
                onChange={e => setConfig({ model: e.target.value })}
                placeholder="模型名称"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[12px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              />
            </div>
          </div>

          {/* 快捷模型 */}
          {QUICK_MODELS[config.provider]?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 mb-2">
              {QUICK_MODELS[config.provider].map(m => (
                <button
                  key={m}
                  onClick={() => setConfig({ model: m })}
                  className="px-3 py-1.5 rounded-lg text-[11px] transition-all font-medium"
                  style={
                    config.model === m
                      ? {
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          boxShadow: '0 2px 6px -2px rgba(16, 185, 129, 0.4)',
                        }
                      : {
                          background: '#f3f4f6',
                          color: '#6b7280',
                        }
                  }
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
            className="w-full mt-4 py-3 rounded-xl text-white text-[13px] font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 2px 8px -2px rgba(16, 185, 129, 0.4)',
            }}
          >
            {testing ? (
              <><Loader2 size={14} className="animate-spin" /> 测试连接中...</>
            ) : (
              <><Zap size={14} /> 测试连接</>
            )}
          </button>

          {/* 测试结果 */}
          {testResult && (
            <div
              className="mt-3 p-3.5 rounded-xl flex items-start gap-2.5"
              style={{
                background: testResult.success ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                border: testResult.success ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)',
              }}
            >
              {testResult.success ? (
                <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              ) : (
                <X size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              )}
              <p className={`text-[12px] leading-relaxed ${testResult.success ? 'text-emerald-600' : 'text-red-500'}`}>
                {testResult.message}
              </p>
            </div>
          )}
        </div>

        {/* ===== 搜索服务配置卡片 ===== */}
        <div
          className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -6px rgba(245, 158, 11, 0.1)' }}
        >
          {/* 卡片标题 */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' }}
            >
              <Search size={18} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">搜索服务配置</h2>
              <p className="text-[11px] text-gray-500">工作间 Agent 联网搜索时使用</p>
            </div>
          </div>

          {/* Search Provider 选择 */}
          <div className="mb-4">
            <label className="text-[12px] font-semibold text-gray-600 mb-2 block">服务商</label>
            <div className="grid grid-cols-3 gap-2.5">
              {SEARCH_PROVIDERS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setSearchConfig({ provider: p.value })}
                  className="p-3.5 rounded-xl border text-center transition-all"
                  style={
                    searchConfig.provider === p.value
                      ? {
                          borderColor: '#10b981',
                          background: 'linear-gradient(180deg, #ECFDF5 0%, #ffffff 100%)',
                          boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.2), 0 2px 8px -2px rgba(16, 185, 129, 0.15)',
                        }
                      : {
                          borderColor: 'rgba(0,0,0,0.06)',
                          background: '#fafafa',
                        }
                  }
                >
                  <span className="text-[18px] block mb-1.5">{p.icon}</span>
                  <p className={`text-[11px] font-semibold ${searchConfig.provider === p.value ? 'text-emerald-600' : 'text-gray-800'}`}>{p.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Search API Key */}
          {searchConfig.provider !== 'mock' && (
            <div className="mb-4">
              <label className="text-[12px] font-semibold text-gray-600 mb-2 block">搜索 API Key</label>
              <div className="relative">
                <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" />
                <input
                  type={showSearchKey ? 'text' : 'password'}
                  value={searchConfig.apiKey}
                  onChange={e => setSearchConfig({ apiKey: e.target.value })}
                  placeholder={searchConfig.provider === 'tavily' ? 'tvly-...' : 'serpapi key'}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                />
                <button
                  onClick={() => setShowSearchKey(!showSearchKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
            className="w-full py-3 rounded-xl text-white text-[13px] font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              boxShadow: '0 2px 8px -2px rgba(245, 158, 11, 0.4)',
            }}
          >
            {searchTesting ? (
              <><Loader2 size={14} className="animate-spin" /> 测试连接中...</>
            ) : (
              <><Search size={14} /> 测试搜索连接</>
            )}
          </button>

          {searchTestResult && (
            <div
              className="mt-3 p-3.5 rounded-xl flex items-start gap-2.5"
              style={{
                background: searchTestResult.success ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                border: searchTestResult.success ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)',
              }}
            >
              {searchTestResult.success ? <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" /> : <X size={14} className="text-red-500 mt-0.5 flex-shrink-0" />}
              <p className={`text-[12px] leading-relaxed ${searchTestResult.success ? 'text-emerald-600' : 'text-red-500'}`}>{searchTestResult.message}</p>
            </div>
          )}
        </div>

        {/* ===== 使用提示卡片 ===== */}
        <div
          className="rounded-2xl border p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #FEF3C7 100%)',
            borderColor: 'rgba(16, 185, 129, 0.15)',
          }}
        >
          {/* 装饰光斑 */}
          <div className="absolute top-0 right-8 w-20 h-20 rounded-full bg-emerald-200/30 blur-2xl pointer-events-none" />

          <div className="flex items-start gap-3 relative z-10">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16, 185, 129, 0.15)' }}
            >
              <Sparkles size={15} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-800 mb-2">配置完成后的使用方式</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2">
                  <Shield size={13} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-[12px] text-gray-600">
                    <span className="font-semibold text-gray-800">工作间</span> — 输入框 Commander 自动使用配置的 LLM
                  </span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2">
                  <Sparkles size={13} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-[12px] text-gray-600">
                    <span className="font-semibold text-gray-800">小薇</span> — 右下角悬浮球，随时对话、总结文章、检测情绪
                  </span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2">
                  <Search size={13} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-[12px] text-gray-600">
                    <span className="font-semibold text-gray-800">搜索服务</span> — Agent 搜索时自动调用配置的搜索引擎
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
