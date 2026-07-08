import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users as UsersIcon, FileText, Zap, Cpu,
  ArrowLeft, Search, Trash2, Eye, Edit3, CheckCircle2, XCircle,
  Clock, AlertTriangle, RefreshCw, Shield, BarChart3, Activity,
  ChevronRight, ChevronLeft, Plus, Minus, Loader2, Download,
  ScrollText, Server, History, LogOut, Lock
} from 'lucide-react'

const BASE = import.meta.env.VITE_API_BASE_URL || ''

// === Auth ===

function getToken(): string | null { return localStorage.getItem('admin_token') }
function setToken(t: string) { localStorage.setItem('admin_token', t) }
function clearToken() { localStorage.removeItem('admin_token') }

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...opts, headers, signal: AbortSignal.timeout(30000) })
  if (res.status === 401 || res.status === 403) {
    clearToken()
    throw new Error('认证失败，请重新登录')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `${res.status}` }))
    throw new Error(err.detail || err.message || `请求失败 ${res.status}`)
  }
  return res.json()
}

// === Types ===

type TabKey = 'dashboard' | 'melons' | 'users' | 'pipeline' | 'llm' | 'audit' | 'ops'

interface MelonItem {
  id: number; title: string; description: string; category: string
  creator_name: string; result: boolean | null; status: string
  participant_count: number; true_count: number; false_count: number
  created_at: string; reveal_time: string | null
}

interface UserItem {
  id: number; username: string; nickname: string; avatar: string
  points: number; rank: string; is_admin: boolean
  total_guesses: number; correct_guesses: number; created_at: string
}

interface ProviderItem { name: string; display_name: string; available: boolean; default_model: string }

interface AuditLogItem {
  id: number; admin_name: string; action: string; target_type: string
  target_id: number | null; detail: Record<string, any>; ip_address: string; created_at: string
}

interface PipelineRunItem {
  id: number; pipeline_id: string; input_content: string; status: string
  duration_ms: number; error_message: string; node_results: Record<string, string>; created_at: string
}

interface PaginatedResponse<T> {
  total: number; page: number; size: number; pages: number; items: T[]
}

// ================================================================
//  Main Component
// ================================================================

export default function AdminPage() {
  const [token, setTokenState] = useState(getToken())
  const [tab, setTab] = useState<TabKey>('dashboard')
  const navigate = useNavigate()

  // 未登录 → 显示登录页
  if (!token) return <LoginScreen onSuccess={(t) => { setToken(t); setTokenState(t) }} />

  const tabs: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
    { key: 'dashboard', label: '数据概览', icon: LayoutDashboard },
    { key: 'melons', label: '瓜管理', icon: FileText },
    { key: 'users', label: '用户管理', icon: UsersIcon },
    { key: 'pipeline', label: 'Pipeline', icon: Zap },
    { key: 'llm', label: 'LLM', icon: Cpu },
    { key: 'audit', label: '审计日志', icon: ScrollText },
    { key: 'ops', label: '运维监控', icon: Server },
  ]

  const logout = () => { clearToken(); setTokenState(null) }

  return (
    <div className="flex h-dvh bg-[#f8f9fa] text-[#202124]" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, "Noto Sans SC", sans-serif' }}>
      <aside className="w-56 bg-white border-r border-[#dadce0] flex flex-col flex-shrink-0">
        <div className="px-5 h-14 flex items-center gap-2.5 border-b border-[#dadce0]">
          <button onClick={() => navigate('/melon')} className="p-1 rounded hover:bg-[#f1f3f4] text-[#5f6368]" title="返回前台">
            <ArrowLeft size={16} />
          </button>
          <Shield size={18} className="text-[#1a73e8]" />
          <span className="text-[14px] font-semibold">观微管理后台</span>
        </div>
        <nav className="flex-1 py-3 px-2">
          {tabs.map(t => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition-colors ${
                  active ? 'bg-[#e8f0fe] text-[#1a73e8] font-medium' : 'text-[#5f6368] hover:bg-[#f1f3f4]'
                }`}>
                <Icon size={16} />{t.label}
              </button>
            )
          })}
        </nav>
        <div className="px-3 py-3 border-t border-[#dadce0]">
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-[#5f6368] hover:bg-[#fce8e6] hover:text-[#d93025] transition-colors">
            <LogOut size={14} />退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'melons' && <MelonsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'pipeline' && <PipelineTab />}
        {tab === 'llm' && <LLMTab />}
        {tab === 'audit' && <AuditTab />}
        {tab === 'ops' && <OpsTab />}
      </main>
    </div>
  )
}

// ================================================================
//  Login Screen
// ================================================================

function LoginScreen({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async () => {
    if (!username || !password) return
    setLoading(true); setError('')
    try {
      const data = await api<{ access_token: string; user: { is_admin?: boolean } }>('/users/login', {
        method: 'POST', body: JSON.stringify({ username, password }),
      })
      if (!data.user?.is_admin) { setError('该账号没有管理员权限'); return }
      onSuccess(data.access_token)
    } catch (e: any) {
      setError(e.message || '登录失败')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex items-center justify-center h-dvh bg-[#f8f9fa]"
      style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, "Noto Sans SC", sans-serif' }}>
      <div className="bg-white rounded-2xl border border-[#dadce0] p-8 w-96 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Shield size={24} className="text-[#1a73e8]" />
          <div>
            <h1 className="text-[18px] font-semibold">观微管理后台</h1>
            <p className="text-[12px] text-[#5f6368]">请使用管理员账号登录</p>
          </div>
        </div>
        <div className="space-y-3 mb-4">
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名"
            className="w-full h-10 px-3 rounded-lg border border-[#dadce0] text-[13px] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]/20"
            onKeyDown={e => e.key === 'Enter' && login()} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码"
            className="w-full h-10 px-3 rounded-lg border border-[#dadce0] text-[13px] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]/20"
            onKeyDown={e => e.key === 'Enter' && login()} />
        </div>
        {error && <p className="text-[12px] text-[#d93025] mb-3 flex items-center gap-1"><AlertTriangle size={12} />{error}</p>}
        <button onClick={login} disabled={loading}
          className="w-full h-10 rounded-lg bg-[#1a73e8] text-white text-[13px] font-medium hover:bg-[#1557b0] disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          {loading ? '登录中...' : '登录'}
        </button>
        <p className="text-[11px] text-[#80868b] mt-4 text-center">默认管理员：admin / 123</p>
      </div>
    </div>
  )
}

// ================================================================
//  Dashboard
// ================================================================

function DashboardTab() {
  const [sysMetrics, setSysMetrics] = useState<any>(null)
  const [bizMetrics, setBizMetrics] = useState<any>(null)
  const [rankDist, setRankDist] = useState<Record<string, number> | null>(null)
  const [opsHealth, setOpsHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api('/metrics/system'), api('/metrics/business'),
      api('/metrics/rank-distribution'), api('/admin/ops/health'),
    ]).then(([sys, biz, rank, ops]) => {
      setSysMetrics(sys); setBizMetrics(biz); setRankDist(rank as Record<string, number>); setOpsHealth(ops)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />

  const users = sysMetrics?.users || {}
  const melons = sysMetrics?.melons || {}
  const guess = bizMetrics?.guess || {}
  const evidence = bizMetrics?.evidence || {}
  const points = bizMetrics?.points || {}
  const rankOrder = ['吃瓜群众', '瓜田新手', '鉴瓜学徒', '瓜田侦探', '鉴瓜达人', '鉴瓜大师', '见微先知']

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-[20px] font-semibold mb-1">数据概览</h1>
      <p className="text-[13px] text-[#5f6368] mb-6">系统运行状态与核心业务指标</p>

      {/* 系统状态条 */}
      {opsHealth && (
        <div className="flex items-center gap-4 mb-6 px-4 py-2.5 bg-white rounded-xl border border-[#dadce0] text-[12px]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1e8e3e]" />运行中</span>
          <span className="text-[#80868b]">已运行 {opsHealth.uptime_display}</span>
          <span className="text-[#80868b]">CPU {opsHealth.system.cpu_percent >= 0 ? `${opsHealth.system.cpu_percent}%` : 'N/A'}</span>
          <span className="text-[#80868b]">内存 {opsHealth.system.memory_mb >= 0 ? `${opsHealth.system.memory_mb}MB` : 'N/A'}</span>
          <span className="text-[#80868b]">QPS {opsHealth.requests_5min?.qps || 0}</span>
          <span className="text-[#80868b]">5min 错误率 {((opsHealth.requests_5min?.error_rate || 0) * 100).toFixed(1)}%</span>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: '总用户', value: users.total || 0, sub: `今日活跃 ${users.active_today || 0}`, color: '#1a73e8', icon: UsersIcon },
          { label: '总瓜数', value: melons.total || 0, sub: `待揭 ${melons.pending || 0} / 已揭 ${melons.revealed || 0}`, color: '#e8710a', icon: FileText },
          { label: '总猜测', value: guess.total || 0, sub: `今日 ${guess.today || 0}`, color: '#1e8e3e', icon: Activity },
          { label: '正确率', value: `${((guess.accuracy_rate || 0) * 100).toFixed(1)}%`, sub: `${guess.correct || 0} / ${guess.total || 0}`, color: '#a142f4', icon: BarChart3 },
        ].map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-xl border border-[#dadce0] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] text-[#5f6368] font-medium">{card.label}</span>
                <Icon size={16} style={{ color: card.color }} />
              </div>
              <div className="text-[24px] font-semibold" style={{ color: card.color }}>{card.value}</div>
              {card.sub && <div className="text-[11px] text-[#80868b] mt-1">{card.sub}</div>}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-[#dadce0] p-5">
          <h3 className="text-[13px] font-semibold mb-4">佐证与积分</h3>
          <div className="space-y-3">
            <MetricRow label="佐证总数" value={evidence.total || 0} />
            <MetricRow label="佐证提交率" value={`${((evidence.submission_rate || 0) * 100).toFixed(1)}%`} />
            <MetricRow label="今日积分发放" value={points.earned_today || 0} />
            <MetricRow label="积分消耗率" value={`${((points.consumption_rate || 0) * 100).toFixed(1)}%`} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#dadce0] p-5">
          <h3 className="text-[13px] font-semibold mb-4">段位分布</h3>
          {rankDist && (
            <div className="space-y-2">
              {rankOrder.map(rank => {
                const count = (rankDist as Record<string, number>)[rank] || 0
                const maxCount = Math.max(...Object.values(rankDist as Record<string, number>), 1)
                return (
                  <div key={rank} className="flex items-center gap-3">
                    <span className="text-[11px] text-[#5f6368] w-16 text-right">{rank}</span>
                    <div className="flex-1 h-4 bg-[#f1f3f4] rounded-full overflow-hidden">
                      <div className="h-full bg-[#1a73e8] rounded-full" style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? '4px' : '0' }} />
                    </div>
                    <span className="text-[11px] text-[#5f6368] w-6">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-center justify-between"><span className="text-[12px] text-[#5f6368]">{label}</span><span className="text-[13px] font-medium">{value}</span></div>
}

// ================================================================
//  Pagination Component
// ================================================================

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#dadce0]">
      <span className="text-[12px] text-[#5f6368]">第 {page} / {pages} 页</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="p-1.5 rounded hover:bg-[#f1f3f4] disabled:opacity-30"><ChevronLeft size={14} /></button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          const p = pages <= 7 ? i + 1 : (page <= 4 ? i + 1 : (page >= pages - 3 ? pages - 6 + i : page - 3 + i))
          return (
            <button key={p} onClick={() => onPage(p)}
              className={`w-7 h-7 rounded text-[12px] ${p === page ? 'bg-[#1a73e8] text-white' : 'hover:bg-[#f1f3f4] text-[#5f6368]'}`}>
              {p}
            </button>
          )
        })}
        <button onClick={() => onPage(page + 1)} disabled={page >= pages}
          className="p-1.5 rounded hover:bg-[#f1f3f4] disabled:opacity-30"><ChevronRight size={14} /></button>
      </div>
    </div>
  )
}

// ================================================================
//  Melons Tab
// ================================================================

function MelonsTab() {
  const [data, setData] = useState<PaginatedResponse<MelonItem>>({ total: 0, page: 1, size: 20, pages: 0, items: [] })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', category: '' })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [revealId, setRevealId] = useState<number | null>(null)
  const [revealResult, setRevealResult] = useState(true)

  const load = useCallback((page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), size: '20', sort_by: sortBy, sort_order: sortOrder })
    if (filter.status) params.set('status', filter.status)
    if (filter.category) params.set('category', filter.category)
    api<PaginatedResponse<MelonItem>>(`/admin/melons?${params}`)
      .then(setData).catch(console.error).finally(() => setLoading(false))
  }, [filter, sortBy, sortOrder])

  useEffect(() => { load() }, [load])

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortOrder('desc') }
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  const toggleAll = () => {
    if (selected.size === data.items.length) setSelected(new Set())
    else setSelected(new Set(data.items.map(m => m.id)))
  }

  const doReveal = (id: number) => {
    api(`/admin/melons/${id}/reveal`, { method: 'PUT', body: JSON.stringify({ result: revealResult }) })
      .then(() => { setRevealId(null); load(data.page) }).catch(console.error)
  }
  const doDelete = (id: number) => {
    if (!confirm(`确认删除瓜 #${id}？`)) return
    api(`/admin/melons/${id}`, { method: 'DELETE' }).then(() => load(data.page)).catch(console.error)
  }
  const doBatchReveal = () => {
    if (!selected.size) return
    api('/admin/melons/batch-reveal', { method: 'POST', body: JSON.stringify({ melon_ids: [...selected], result: true }) })
      .then(() => { setSelected(new Set()); load(data.page) }).catch(console.error)
  }
  const doBatchDelete = () => {
    if (!selected.size || !confirm(`确认删除 ${selected.size} 个瓜？`)) return
    api('/admin/melons/batch-delete', { method: 'POST', body: JSON.stringify({ melon_ids: [...selected] }) })
      .then(() => { setSelected(new Set()); load(data.page) }).catch(console.error)
  }

  const exportCsv = () => { window.open(`${BASE}/admin/melons/export?token=${getToken()}`, '_blank') }

  const sortIcon = (col: string) => sortBy === col ? (sortOrder === 'asc' ? '↑' : '↓') : ''
  const statusBadge = (s: string) => ({ pending: 'bg-[#fef7e0] text-[#e8710a]', verified: 'bg-[#e6f4ea] text-[#1e8e3e]', revealed: 'bg-[#e8f0fe] text-[#1a73e8]' }[s] || 'bg-[#f1f3f4] text-[#5f6368]')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold">瓜管理</h1>
          <p className="text-[13px] text-[#5f6368]">共 {data.total} 条 {selected.size > 0 && `· 已选 ${selected.size}`}</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <button onClick={doBatchReveal} className="h-8 px-3 rounded-lg text-[12px] bg-[#e8f0fe] text-[#1a73e8] hover:bg-[#d2e3fc]">批量揭瓜</button>
              <button onClick={doBatchDelete} className="h-8 px-3 rounded-lg text-[12px] bg-[#fce8e6] text-[#d93025] hover:bg-[#f8d7da]">批量删除</button>
            </>
          )}
          <button onClick={exportCsv} className="h-8 px-3 rounded-lg text-[12px] border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] flex items-center gap-1.5">
            <Download size={12} />导出 CSV
          </button>
          <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            className="h-8 px-3 rounded-lg border border-[#dadce0] text-[12px] bg-white text-[#5f6368]">
            <option value="">全部状态</option><option value="pending">待揭</option><option value="verified">已验证</option><option value="revealed">已揭</option>
          </select>
          <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
            className="h-8 px-3 rounded-lg border border-[#dadce0] text-[12px] bg-white text-[#5f6368]">
            <option value="">全部分类</option>
            {['科技', '健康', '社会', '财经', '娱乐', '国际', '历史', '生活科普', '社会热点'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? <LoadingState /> : (
        <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#dadce0] bg-[#f8f9fa]">
                <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={selected.size === data.items.length && data.items.length > 0} onChange={toggleAll} /></th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368] cursor-pointer hover:text-[#202124]" onClick={() => toggleSort('id')}>ID {sortIcon('id')}</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368]">标题</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368] cursor-pointer hover:text-[#202124]" onClick={() => toggleSort('category')}>分类 {sortIcon('category')}</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368]">状态</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368] cursor-pointer hover:text-[#202124]" onClick={() => toggleSort('participant_count')}>参与 {sortIcon('participant_count')}</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368]">真/假</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368] cursor-pointer hover:text-[#202124]" onClick={() => toggleSort('created_at')}>创建时间 {sortIcon('created_at')}</th>
                <th className="px-3 py-2.5 text-right font-medium text-[#5f6368]">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(m => (
                <tr key={m.id} className={`border-b border-[#f1f3f4] hover:bg-[#f8f9fa] ${selected.has(m.id) ? 'bg-[#e8f0fe]/30' : ''}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} /></td>
                  <td className="px-3 py-2.5 text-[#5f6368]">#{m.id}</td>
                  <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">{m.title}</td>
                  <td className="px-3 py-2.5 text-[#5f6368]">{m.category}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusBadge(m.status)}`}>{m.status}</span></td>
                  <td className="px-3 py-2.5 text-[#5f6368]">{m.participant_count}</td>
                  <td className="px-3 py-2.5 text-[#5f6368]">
                    {m.result === null ? '-' : m.result ? <CheckCircle2 size={13} className="text-[#1e8e3e] inline" /> : <XCircle size={13} className="text-[#d93025] inline" />} {m.true_count}/{m.false_count}
                  </td>
                  <td className="px-3 py-2.5 text-[#5f6368]">{new Date(m.created_at).toLocaleDateString('zh-CN')}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {m.status !== 'revealed' && (
                        <button onClick={() => { setRevealId(m.id); setRevealResult(true) }} className="p-1 rounded hover:bg-[#e8f0fe] text-[#1a73e8]" title="揭瓜"><Eye size={13} /></button>
                      )}
                      <button onClick={() => doDelete(m.id)} className="p-1 rounded hover:bg-[#fce8e6] text-[#d93025]" title="删除"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <div className="py-12 text-center text-[13px] text-[#5f6368]">暂无数据</div>}
          <Pagination page={data.page} pages={data.pages} onPage={p => load(p)} />
        </div>
      )}

      {revealId !== null && (
        <Modal onClose={() => setRevealId(null)}>
          <h3 className="text-[14px] font-semibold mb-4">揭瓜 #{revealId}</h3>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setRevealResult(true)} className={`flex-1 py-2 rounded-lg text-[13px] border ${revealResult ? 'bg-[#e6f4ea] border-[#1e8e3e] text-[#1e8e3e] font-medium' : 'border-[#dadce0] text-[#5f6368]'}`}>属实</button>
            <button onClick={() => setRevealResult(false)} className={`flex-1 py-2 rounded-lg text-[13px] border ${!revealResult ? 'bg-[#fce8e6] border-[#d93025] text-[#d93025] font-medium' : 'border-[#dadce0] text-[#5f6368]'}`}>虚假</button>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setRevealId(null)} className="px-3 py-1.5 rounded-lg text-[12px] text-[#5f6368] hover:bg-[#f1f3f4]">取消</button>
            <button onClick={() => doReveal(revealId)} className="px-3 py-1.5 rounded-lg text-[12px] bg-[#1a73e8] text-white">确认揭瓜</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ================================================================
//  Users Tab
// ================================================================

function UsersTab() {
  const [data, setData] = useState<PaginatedResponse<UserItem>>({ total: 0, page: 1, size: 20, pages: 0, items: [] })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [adjustUser, setAdjustUser] = useState<UserItem | null>(null)
  const [adjustAmount, setAdjustAmount] = useState(10)
  const [adjustReason, setAdjustReason] = useState('')

  const load = useCallback((page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), size: '20', sort_by: sortBy, sort_order: sortOrder })
    if (search) params.set('search', search)
    api<PaginatedResponse<UserItem>>(`/admin/users?${params}`)
      .then(setData).catch(console.error).finally(() => setLoading(false))
  }, [search, sortBy, sortOrder])

  useEffect(() => { load() }, [load])

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortOrder('desc') }
  }

  const doDelete = (id: number) => {
    if (!confirm(`确认注销用户 #${id}？`)) return
    api(`/admin/users/${id}`, { method: 'DELETE' }).then(() => load(data.page)).catch(console.error)
  }
  const doAdjust = () => {
    if (!adjustUser || adjustAmount === 0) return
    api(`/admin/users/${adjustUser.id}/points`, { method: 'PUT', body: JSON.stringify({ amount: adjustAmount, reason: adjustReason || '管理员调整' }) })
      .then(() => { setAdjustUser(null); load(data.page) }).catch(console.error)
  }
  const doSetAdmin = (userId: number, isAdmin: boolean) => {
    api(`/admin/users/${userId}/set-admin`, { method: 'PUT', body: JSON.stringify({ user_id: userId, is_admin: isAdmin }) })
      .then(() => load(data.page)).catch(console.error)
  }

  const exportCsv = () => { window.open(`${BASE}/admin/users/export?token=${getToken()}`, '_blank') }
  const sortIcon = (col: string) => sortBy === col ? (sortOrder === 'asc' ? '↑' : '↓') : ''

  const rankColors: Record<string, string> = {
    '吃瓜群众': 'bg-[#f1f3f4] text-[#5f6368]', '瓜田新手': 'bg-[#e6f4ea] text-[#1e8e3e]',
    '鉴瓜学徒': 'bg-[#e8f0fe] text-[#1a73e8]', '瓜田侦探': 'bg-[#fef7e0] text-[#e8710a]',
    '鉴瓜达人': 'bg-[#fce8e6] text-[#d93025]', '鉴瓜大师': 'bg-[#f3e8fd] text-[#a142f4]',
    '见微先知': 'bg-[#fef7e0] text-[#c78c20]',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold">用户管理</h1>
          <p className="text-[13px] text-[#5f6368]">共 {data.total} 位用户</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="h-8 px-3 rounded-lg text-[12px] border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] flex items-center gap-1.5">
            <Download size={12} />导出
          </button>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索用户名或昵称..."
              className="h-8 pl-8 pr-3 rounded-lg border border-[#dadce0] text-[12px] bg-white w-56 focus:outline-none focus:border-[#1a73e8]" />
          </div>
        </div>
      </div>

      {loading ? <LoadingState /> : (
        <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#dadce0] bg-[#f8f9fa]">
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368] cursor-pointer hover:text-[#202124]" onClick={() => toggleSort('id')}>ID {sortIcon('id')}</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368]">用户</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368]">段位</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368]">管理员</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368] cursor-pointer hover:text-[#202124]" onClick={() => toggleSort('points')}>积分 {sortIcon('points')}</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368]">猜测</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368]">正确率</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#5f6368] cursor-pointer hover:text-[#202124]" onClick={() => toggleSort('created_at')}>注册 {sortIcon('created_at')}</th>
                <th className="px-3 py-2.5 text-right font-medium text-[#5f6368]">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(u => {
                const accuracy = u.total_guesses > 0 ? ((u.correct_guesses / u.total_guesses) * 100).toFixed(1) : '-'
                return (
                  <tr key={u.id} className="border-b border-[#f1f3f4] hover:bg-[#f8f9fa]">
                    <td className="px-3 py-2.5 text-[#5f6368]">#{u.id}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <img src={u.avatar} alt="" className="w-6 h-6 rounded-full bg-[#f1f3f4]" />
                        <div><div className="font-medium">{u.nickname}</div><div className="text-[11px] text-[#80868b]">@{u.username}</div></div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded text-[11px] font-medium ${rankColors[u.rank] || 'bg-[#f1f3f4] text-[#5f6368]'}`}>{u.rank}</span></td>
                    <td className="px-3 py-2.5">
                      {u.is_admin ? <span className="px-2 py-0.5 rounded text-[11px] bg-[#1a73e8] text-white font-medium">Admin</span> : <span className="text-[11px] text-[#80868b]">-</span>}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{u.points}</td>
                    <td className="px-3 py-2.5 text-[#5f6368]">{u.total_guesses}</td>
                    <td className="px-3 py-2.5 text-[#5f6368]">{accuracy}%</td>
                    <td className="px-3 py-2.5 text-[#5f6368]">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!u.is_admin && (
                          <button onClick={() => doSetAdmin(u.id, true)} className="p-1 rounded hover:bg-[#e8f0fe] text-[#1a73e8]" title="设为管理员"><Shield size={13} /></button>
                        )}
                        <button onClick={() => { setAdjustUser(u); setAdjustAmount(10); setAdjustReason('') }} className="p-1 rounded hover:bg-[#e8f0fe] text-[#1a73e8]" title="调整积分"><Edit3 size={13} /></button>
                        <button onClick={() => doDelete(u.id)} className="p-1 rounded hover:bg-[#fce8e6] text-[#d93025]" title="注销"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {data.items.length === 0 && <div className="py-12 text-center text-[13px] text-[#5f6368]">暂无数据</div>}
          <Pagination page={data.page} pages={data.pages} onPage={p => load(p)} />
        </div>
      )}

      {adjustUser && (
        <Modal onClose={() => setAdjustUser(null)}>
          <h3 className="text-[14px] font-semibold mb-1">调整积分</h3>
          <p className="text-[12px] text-[#5f6368] mb-4">{adjustUser.nickname} (当前 {adjustUser.points} 分)</p>
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setAdjustAmount(a => a - 10)} className="p-1.5 rounded-lg border border-[#dadce0] hover:bg-[#f1f3f4]"><Minus size={14} /></button>
            <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(Number(e.target.value))}
              className="flex-1 h-8 px-3 rounded-lg border border-[#dadce0] text-[13px] text-center focus:outline-none focus:border-[#1a73e8]" />
            <button onClick={() => setAdjustAmount(a => a + 10)} className="p-1.5 rounded-lg border border-[#dadce0] hover:bg-[#f1f3f4]"><Plus size={14} /></button>
          </div>
          <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="调整原因（可选）"
            className="w-full h-8 px-3 rounded-lg border border-[#dadce0] text-[12px] mb-4 focus:outline-none focus:border-[#1a73e8]" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdjustUser(null)} className="px-3 py-1.5 rounded-lg text-[12px] text-[#5f6368] hover:bg-[#f1f3f4]">取消</button>
            <button onClick={doAdjust} className="px-3 py-1.5 rounded-lg text-[12px] bg-[#1a73e8] text-white">确认</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ================================================================
//  Pipeline Tab (with history)
// ================================================================

const PIPELINE_NODES = [
  { id: 'moderation', label: '内容审核' },
  { id: 'collector', label: '信息搜集' },
  { id: 'verifier', label: '来源验证' },
  { id: 'analyzer', label: '深度分析' },
]

function PipelineTab() {
  const [view, setView] = useState<'test' | 'history'>('test')
  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold">Pipeline</h1>
          <p className="text-[13px] text-[#5f6368]">信息验证 Pipeline 测试与运行历史</p>
        </div>
        <div className="flex bg-[#f1f3f4] rounded-lg p-0.5">
          <button onClick={() => setView('test')} className={`px-3 py-1.5 rounded-md text-[12px] ${view === 'test' ? 'bg-white shadow-sm font-medium' : 'text-[#5f6368]'}`}>
            <Zap size={12} className="inline mr-1" />测试
          </button>
          <button onClick={() => setView('history')} className={`px-3 py-1.5 rounded-md text-[12px] ${view === 'history' ? 'bg-white shadow-sm font-medium' : 'text-[#5f6368]'}`}>
            <History size={12} className="inline mr-1" />历史
          </button>
        </div>
      </div>
      {view === 'test' ? <PipelineTester /> : <PipelineHistory />}
    </div>
  )
}

function PipelineTester() {
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [nodeStatus, setNodeStatus] = useState<Record<string, string>>({ moderation: 'idle', collector: 'idle', verifier: 'idle', analyzer: 'idle' })
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const eventsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [events])

  const runPipeline = async () => {
    if (!input.trim() || running) return
    setRunning(true); setEvents([]); setResult(null); setError(null); setDuration(null)
    setNodeStatus({ moderation: 'idle', collector: 'idle', verifier: 'idle', analyzer: 'idle' })
    const t0 = Date.now()

    try {
      const res = await fetch(`${BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
        body: JSON.stringify({ content: input.trim(), type: 'text' }),
        signal: AbortSignal.timeout(130000),
      })
      const data = await res.json()
      setDuration(Date.now() - t0)
      if (data.pipeline_id) {
        const wsUrl = BASE.replace('http', 'ws') + `/ws/${data.pipeline_id}`
        const ws = new WebSocket(wsUrl)
        ws.onmessage = (msg) => {
          try {
            const ev = JSON.parse(msg.data)
            setEvents(prev => [...prev, ev])
            if (ev.node || ev.node_name) {
              const node = ev.node || ev.node_name
              if (ev.type === 'NODE_START') setNodeStatus(p => ({ ...p, [node]: 'running' }))
              else if (['NODE_SUCCESS', 'NODE_COMPLETE'].includes(ev.type)) setNodeStatus(p => ({ ...p, [node]: 'success' }))
              else if (['NODE_FAILURE', 'CRITICAL_FAILURE'].includes(ev.type)) setNodeStatus(p => ({ ...p, [node]: 'error' }))
            }
          } catch {}
        }
      }
      if (data.success) {
        setResult(data.result)
        setNodeStatus({ moderation: 'success', collector: 'success', verifier: 'success', analyzer: 'success' })
      } else {
        setError(data.error || 'Pipeline 执行失败')
      }
    } catch (e: any) { setError(e.message || '网络错误') }
    finally { setRunning(false) }
  }

  const nodeColor = (s: string) => ({ running: 'border-[#1a73e8] bg-[#e8f0fe]', success: 'border-[#1e8e3e] bg-[#e6f4ea]', error: 'border-[#d93025] bg-[#fce8e6]' }[s] || 'border-[#dadce0] bg-white')
  const nodeIcon = (s: string) => ({ running: <RefreshCw size={14} className="text-[#1a73e8] animate-spin" />, success: <CheckCircle2 size={14} className="text-[#1e8e3e]" />, error: <XCircle size={14} className="text-[#d93025]" /> }[s] || <Clock size={14} className="text-[#80868b]" />)

  return (
    <>
      <div className="bg-white rounded-xl border border-[#dadce0] p-4 mb-6">
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="输入待验证的信息..."
          className="w-full h-20 resize-none text-[13px] focus:outline-none border-0 p-0" disabled={running} />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f1f3f4]">
          <span className="text-[11px] text-[#80868b]">{running ? '运行中...' : `${input.length} 字`}{duration !== null && ` · 耗时 ${(duration / 1000).toFixed(1)}s`}</span>
          <button onClick={runPipeline} disabled={running || !input.trim()}
            className="px-4 py-1.5 rounded-lg text-[12px] bg-[#1a73e8] text-white font-medium hover:bg-[#1557b0] disabled:opacity-50 flex items-center gap-1.5">
            {running && <Loader2 size={12} className="animate-spin" />}{running ? '运行中' : '执行验证'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#dadce0] p-5 mb-6">
        <h3 className="text-[13px] font-semibold mb-4">执行流程</h3>
        <div className="flex items-center justify-between">
          {PIPELINE_NODES.map((node, i) => (
            <div key={node.id} className="flex items-center">
              <div className={`w-28 rounded-lg border-2 p-3 text-center transition-all ${nodeColor(nodeStatus[node.id])}`}>
                <div className="flex items-center justify-center gap-1.5 mb-1">{nodeIcon(nodeStatus[node.id])}<span className="text-[12px] font-medium">{node.label}</span></div>
              </div>
              {i < 3 && <ChevronRight size={16} className="mx-2 text-[#dadce0]" />}
            </div>
          ))}
        </div>
      </div>

      {events.length > 0 && (
        <div className="bg-white rounded-xl border border-[#dadce0] mb-6">
          <div className="px-4 py-2.5 border-b border-[#dadce0] flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">事件日志</h3>
            <span className="text-[11px] text-[#80868b]">{events.length} 条</span>
          </div>
          <div className="max-h-48 overflow-y-auto p-3 font-mono text-[11px]">
            {events.map((ev, i) => (
              <div key={i} className="py-0.5 flex items-start gap-2">
                <span className="text-[#80868b]">{String(i + 1).padStart(3, '0')}</span>
                <span className={`font-medium ${ev.type?.includes('FAIL') || ev.type?.includes('ERROR') ? 'text-[#d93025]' : ev.type?.includes('SUCCESS') ? 'text-[#1e8e3e]' : 'text-[#5f6368]'}`}>[{ev.type}]</span>
                {ev.node_name && <span className="text-[#1a73e8]">{ev.node_name}</span>}
                {ev.message && <span className="text-[#5f6368] truncate">{ev.message}</span>}
              </div>
            ))}
            <div ref={eventsEndRef} />
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border border-[#dadce0] p-5">
          <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2"><CheckCircle2 size={14} className="text-[#1e8e3e]" />验证结果</h3>
          <pre className="text-[11px] text-[#5f6368] font-mono overflow-auto max-h-80 bg-[#f8f9fa] rounded-lg p-4">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      {error && (
        <div className="bg-white rounded-xl border border-[#d93025]/30 p-5">
          <h3 className="text-[13px] font-semibold mb-2 flex items-center gap-2 text-[#d93025]"><AlertTriangle size={14} />执行失败</h3>
          <p className="text-[12px] text-[#5f6368]">{error}</p>
        </div>
      )}
    </>
  )
}

function PipelineHistory() {
  const [data, setData] = useState<PaginatedResponse<PipelineRunItem>>({ total: 0, page: 1, size: 20, pages: 0, items: [] })
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<any>(null)

  const load = useCallback((page = 1) => {
    setLoading(true)
    api<PaginatedResponse<PipelineRunItem>>(`/admin/pipeline/runs?page=${page}&size=20`)
      .then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const viewDetail = async (pid: string) => {
    try {
      const d = await api<any>(`/admin/pipeline/runs/${pid}`)
      setDetail(d)
    } catch { console.error }
  }

  const statusBadge = (s: string) => ({
    success: 'bg-[#e6f4ea] text-[#1e8e3e]', failed: 'bg-[#fce8e6] text-[#d93025]',
    running: 'bg-[#e8f0fe] text-[#1a73e8]', timeout: 'bg-[#fef7e0] text-[#e8710a]',
    pending: 'bg-[#f1f3f4] text-[#5f6368]',
  }[s] || 'bg-[#f1f3f4] text-[#5f6368]')

  if (loading) return <LoadingState />

  return (
    <>
      <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[#dadce0] bg-[#f8f9fa]">
              <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">Pipeline ID</th>
              <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">输入</th>
              <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">状态</th>
              <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">耗时</th>
              <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">错误</th>
              <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">时间</th>
              <th className="px-4 py-2.5 text-right font-medium text-[#5f6368]">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map(r => (
              <tr key={r.id} className="border-b border-[#f1f3f4] hover:bg-[#f8f9fa]">
                <td className="px-4 py-2.5 font-mono text-[11px] text-[#5f6368]">{r.pipeline_id.slice(0, 8)}...</td>
                <td className="px-4 py-2.5 max-w-[200px] truncate">{r.input_content}</td>
                <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusBadge(r.status)}`}>{r.status}</span></td>
                <td className="px-4 py-2.5 text-[#5f6368]">{r.duration_ms > 0 ? `${(r.duration_ms / 1000).toFixed(1)}s` : '-'}</td>
                <td className="px-4 py-2.5 text-[#d93025] max-w-[150px] truncate">{r.error_message || '-'}</td>
                <td className="px-4 py-2.5 text-[#5f6368]">{new Date(r.created_at).toLocaleString('zh-CN')}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => viewDetail(r.pipeline_id)} className="p-1 rounded hover:bg-[#e8f0fe] text-[#1a73e8]"><Eye size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <div className="py-12 text-center text-[13px] text-[#5f6368]">暂无运行记录</div>}
        <Pagination page={data.page} pages={data.pages} onPage={p => load(p)} />
      </div>

      {detail && (
        <Modal onClose={() => setDetail(null)} wide>
          <h3 className="text-[14px] font-semibold mb-1">Pipeline 详情</h3>
          <p className="text-[11px] text-[#80868b] mb-4 font-mono">{detail.pipeline_id}</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-[12px] font-medium mb-2">输入</h4>
              <p className="text-[12px] text-[#5f6368] bg-[#f8f9fa] rounded-lg p-3">{detail.input_content}</p>
            </div>
            <div>
              <h4 className="text-[12px] font-medium mb-2">状态: <span className={statusBadge(detail.status).split(' ').pop()}>{detail.status}</span> · 耗时 {(detail.duration_ms / 1000).toFixed(1)}s</h4>
              {detail.error_message && <p className="text-[12px] text-[#d93025] bg-[#fce8e6] rounded-lg p-3">{detail.error_message}</p>}
            </div>
          </div>
          {detail.event_log?.length > 0 && (
            <div>
              <h4 className="text-[12px] font-medium mb-2">事件日志 ({detail.event_log.length})</h4>
              <div className="max-h-60 overflow-y-auto bg-[#f8f9fa] rounded-lg p-3 font-mono text-[11px]">
                {detail.event_log.map((ev: any, i: number) => (
                  <div key={i} className="py-0.5">
                    <span className="text-[#80868b]">{String(i + 1).padStart(3, '0')}</span>
                    <span className={`ml-2 ${ev.type?.includes('FAIL') ? 'text-[#d93025]' : 'text-[#5f6368]'}`}>[{ev.type}] {ev.node_name || ''} {ev.message || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}

// ================================================================
//  LLM Tab
// ================================================================

function LLMTab() {
  const [current, setCurrent] = useState('')
  const [providers, setProviders] = useState<ProviderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api<{ current: string; providers: ProviderItem[] }>('/admin/llm/providers')
      .then(d => { setCurrent(d.current); setProviders(d.providers) })
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  const doSwitch = (name: string) => {
    setSwitching(name)
    api('/admin/llm/set-provider?provider=' + name, { method: 'POST' })
      .then(() => { setCurrent(name); setSwitching(null) })
      .catch(console.error).finally(() => setSwitching(null))
  }

  if (loading) return <LoadingState />

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-[20px] font-semibold mb-1">LLM 管理</h1>
      <p className="text-[13px] text-[#5f6368] mb-6">当前: <span className="font-medium text-[#1a73e8]">{current}</span></p>
      <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden">
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-[#dadce0] bg-[#f8f9fa]">
            <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">提供商</th>
            <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">默认模型</th>
            <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">状态</th>
            <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">当前</th>
            <th className="px-4 py-2.5 text-right font-medium text-[#5f6368]">操作</th>
          </tr></thead>
          <tbody>
            {providers.map(p => (
              <tr key={p.name} className={`border-b border-[#f1f3f4] hover:bg-[#f8f9fa] ${current === p.name ? 'bg-[#e8f0fe]/50' : ''}`}>
                <td className="px-4 py-2.5"><div className="font-medium">{p.display_name}</div><div className="text-[11px] text-[#80868b]">{p.name}</div></td>
                <td className="px-4 py-2.5 text-[#5f6368] font-mono text-[11px]">{p.default_model}</td>
                <td className="px-4 py-2.5"><span className={`inline-flex items-center gap-1 text-[11px] ${p.available ? 'text-[#1e8e3e]' : 'text-[#80868b]'}`}><span className={`w-1.5 h-1.5 rounded-full ${p.available ? 'bg-[#1e8e3e]' : 'bg-[#dadce0]'}`} />{p.available ? '可用' : '未配置'}</span></td>
                <td className="px-4 py-2.5">{current === p.name && <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#1a73e8] text-white">当前</span>}</td>
                <td className="px-4 py-2.5 text-right">
                  {p.available && current !== p.name && (
                    <button onClick={() => doSwitch(p.name)} disabled={switching === p.name}
                      className="px-2.5 py-1 rounded-lg text-[11px] text-[#1a73e8] border border-[#dadce0] hover:bg-[#e8f0fe] disabled:opacity-50 flex items-center gap-1 ml-auto">
                      {switching === p.name && <Loader2 size={10} className="animate-spin" />}切换
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ================================================================
//  Audit Log Tab
// ================================================================

function AuditTab() {
  const [data, setData] = useState<PaginatedResponse<AuditLogItem>>({ total: 0, page: 1, size: 20, pages: 0, items: [] })
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('')

  const load = useCallback((page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), size: '30' })
    if (filterAction) params.set('action', filterAction)
    api<PaginatedResponse<AuditLogItem>>(`/admin/audit-logs?${params}`)
      .then(setData).catch(console.error).finally(() => setLoading(false))
  }, [filterAction])

  useEffect(() => { load() }, [load])

  const actionColors: Record<string, string> = {
    reveal_melon: 'bg-[#e8f0fe] text-[#1a73e8]', delete_melon: 'bg-[#fce8e6] text-[#d93025]',
    delete_user: 'bg-[#fce8e6] text-[#d93025]', adjust_points: 'bg-[#fef7e0] text-[#e8710a]',
    batch_reveal: 'bg-[#e8f0fe] text-[#1a73e8]', batch_delete: 'bg-[#fce8e6] text-[#d93025]',
    set_admin: 'bg-[#f3e8fd] text-[#a142f4]', set_llm_provider: 'bg-[#e6f4ea] text-[#1e8e3e]',
    update_melon: 'bg-[#e8f0fe] text-[#1a73e8]',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-[20px] font-semibold">审计日志</h1><p className="text-[13px] text-[#5f6368]">共 {data.total} 条操作记录</p></div>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
          className="h-8 px-3 rounded-lg border border-[#dadce0] text-[12px] bg-white text-[#5f6368]">
          <option value="">全部操作</option>
          <option value="reveal_melon">揭瓜</option><option value="delete_melon">删瓜</option>
          <option value="delete_user">注销用户</option><option value="adjust_points">调积分</option>
          <option value="batch_reveal">批量揭瓜</option><option value="batch_delete">批量删除</option>
          <option value="set_admin">设管理员</option><option value="set_llm_provider">切LLM</option>
        </select>
      </div>
      {loading ? <LoadingState /> : (
        <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-[#dadce0] bg-[#f8f9fa]">
              <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">时间</th>
              <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">管理员</th>
              <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">操作</th>
              <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">目标</th>
              <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">详情</th>
              <th className="px-4 py-2.5 text-left font-medium text-[#5f6368]">IP</th>
            </tr></thead>
            <tbody>
              {data.items.map(log => (
                <tr key={log.id} className="border-b border-[#f1f3f4] hover:bg-[#f8f9fa]">
                  <td className="px-4 py-2.5 text-[#5f6368] whitespace-nowrap">{new Date(log.created_at).toLocaleString('zh-CN')}</td>
                  <td className="px-4 py-2.5 font-medium">{log.admin_name}</td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-[11px] font-medium ${actionColors[log.action] || 'bg-[#f1f3f4] text-[#5f6368]'}`}>{log.action}</span></td>
                  <td className="px-4 py-2.5 text-[#5f6368]">{log.target_type} {log.target_id ? `#${log.target_id}` : ''}</td>
                  <td className="px-4 py-2.5 text-[#5f6368] max-w-[250px] truncate font-mono text-[11px]">{JSON.stringify(log.detail)}</td>
                  <td className="px-4 py-2.5 text-[#5f6368] font-mono text-[11px]">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <div className="py-12 text-center text-[13px] text-[#5f6368]">暂无审计记录</div>}
          <Pagination page={data.page} pages={data.pages} onPage={p => load(p)} />
        </div>
      )}
    </div>
  )
}

// ================================================================
//  Ops Tab
// ================================================================

function OpsTab() {
  const [health, setHealth] = useState<any>(null)
  const [reqLog, setReqLog] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([api('/admin/ops/health'), api<{ items: any[] }>('/admin/ops/request-log')])
      .then(([h, r]) => { setHealth(h); setReqLog(r.items) })
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingState />

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-[20px] font-semibold">运维监控</h1><p className="text-[13px] text-[#5f6368]">系统运行状态与请求日志</p></div>
        <button onClick={load} className="h-8 px-3 rounded-lg text-[12px] border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] flex items-center gap-1.5">
          <RefreshCw size={12} />刷新
        </button>
      </div>

      {health && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="运行时间" value={health.uptime_display} />
            <StatCard label="CPU" value={health.system.cpu_percent >= 0 ? `${health.system.cpu_percent}%` : 'N/A'} />
            <StatCard label="内存" value={health.system.memory_mb >= 0 ? `${health.system.memory_mb} MB` : '需安装 psutil'} />
            <StatCard label="Python" value={health.system.python_version} />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-[#dadce0] p-5">
              <h3 className="text-[13px] font-semibold mb-3">请求统计 (5min)</h3>
              <div className="space-y-2">
                <MetricRow label="总请求" value={health.requests_5min?.total_requests || 0} />
                <MetricRow label="QPS" value={health.requests_5min?.qps || 0} />
                <MetricRow label="错误数" value={health.requests_5min?.error_count || 0} />
                <MetricRow label="错误率" value={`${((health.requests_5min?.error_rate || 0) * 100).toFixed(1)}%`} />
                <MetricRow label="平均延迟" value={`${health.requests_5min?.avg_latency_ms || 0}ms`} />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#dadce0] p-5">
              <h3 className="text-[13px] font-semibold mb-3">数据库表</h3>
              <div className="space-y-2">
                {Object.entries(health.database || {}).map(([k, v]) => <MetricRow key={k} label={k} value={v as number} />)}
              </div>
            </div>
          </div>
          {health.requests_5min?.top_paths && Object.keys(health.requests_5min.top_paths).length > 0 && (
            <div className="bg-white rounded-xl border border-[#dadce0] p-5 mb-6">
              <h3 className="text-[13px] font-semibold mb-3">热门路径 (5min)</h3>
              <div className="space-y-1">
                {Object.entries(health.requests_5min.top_paths).map(([path, count]) => (
                  <div key={path} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#5f6368] font-mono truncate max-w-[400px]">{path}</span>
                    <span className="text-[#202124] font-medium">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#dadce0]">
          <h3 className="text-[13px] font-semibold">最近请求日志</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-[11px] font-mono">
            <thead><tr className="border-b border-[#f1f3f4] bg-[#f8f9fa] sticky top-0">
              <th className="px-3 py-2 text-left font-medium text-[#5f6368]">时间</th>
              <th className="px-3 py-2 text-left font-medium text-[#5f6368]">状态</th>
              <th className="px-3 py-2 text-left font-medium text-[#5f6368]">路径</th>
              <th className="px-3 py-2 text-right font-medium text-[#5f6368]">耗时</th>
            </tr></thead>
            <tbody>
              {reqLog.map((r, i) => (
                <tr key={i} className="border-b border-[#f8f9fa]">
                  <td className="px-3 py-1.5 text-[#80868b]">{new Date(r.timestamp).toLocaleTimeString('zh-CN')}</td>
                  <td className="px-3 py-1.5">
                    <span className={r.status_code >= 400 ? 'text-[#d93025]' : r.status_code >= 300 ? 'text-[#e8710a]' : 'text-[#1e8e3e]'}>{r.status_code}</span>
                  </td>
                  <td className="px-3 py-1.5 text-[#5f6368] truncate max-w-[400px]">{r.path}</td>
                  <td className="px-3 py-1.5 text-right text-[#5f6368]">{r.duration_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
          {reqLog.length === 0 && <div className="py-8 text-center text-[12px] text-[#5f6368]">暂无请求记录</div>}
        </div>
      </div>
    </div>
  )
}

// ================================================================
//  Shared Components
// ================================================================

function LoadingState() {
  return <div className="flex items-center justify-center h-40"><RefreshCw size={20} className="text-[#dadce0] animate-spin" /></div>
}

function Modal({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`bg-white rounded-xl p-6 ${wide ? 'w-[640px]' : 'w-80'} shadow-lg max-h-[80vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-[#dadce0] p-4">
      <div className="text-[12px] text-[#5f6368] mb-1">{label}</div>
      <div className="text-[18px] font-semibold text-[#202124]">{value}</div>
    </div>
  )
}
