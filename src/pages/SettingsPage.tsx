import { useState, useMemo } from 'react'
import {
  User, Lock, Bell, Mail, Eye, MessageSquare,
  Info, Shield, FileText, Monitor, Sun, Moon,
  Palette, Type, LayoutGrid, Keyboard, Database,
  Globe, Accessibility, Download, Upload, Trash2,
  HelpCircle, LogOut, ChevronRight, Check, Gauge,
  Layers, PanelLeft, Sparkles, Settings as SettingsIcon,
  Gamepad2, Star, Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

/* ═══════════════════════════════════════════════════════
   Toggle Switch（像素风）
   ═══════════════════════════════════════════════════════ */
function Toggle({ checked, onChange, size = 'md' }: { checked: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }) {
  const dims = size === 'sm'
    ? { w: 38, h: 22, knob: 16, travel: 18 }
    : { w: 46, h: 26, knob: 22, travel: 22 }
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 transition-all focus:outline-none"
      style={{
        width: dims.w,
        height: dims.h,
        background: checked ? '#ef4444' : '#d1d5db',
        borderRadius: '4px',
        boxShadow: checked
          ? 'inset 0 -2px 0 rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.2)'
          : 'inset 0 -2px 0 rgba(0,0,0,0.1), inset 0 2px 0 rgba(255,255,255,0.5)',
      }}
    >
      <span
        className="absolute top-[3px] left-[3px] bg-white rounded-sm transition-transform"
        style={{
          width: dims.knob,
          height: dims.knob - 6,
          transform: checked ? `translateX(${dims.travel}px)` : 'translateX(0)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

/* ═══════════════════════════════════════════════════════
   分段控件
   ═══════════════════════════════════════════════════════ */
function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: LucideIcon }[]
}) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-gray-100">
      {options.map((opt) => {
        const active = value === opt.value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
              active ? '' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={active ? { background: 'white', color: '#111', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : {}}
          >
            {Icon && <Icon size={15} />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   设置行组件
   ═══════════════════════════════════════════════════════ */
interface SettingRowProps {
  icon?: LucideIcon
  iconColor?: string
  iconBg?: string
  label: string
  description?: string
  value?: string
  onClick?: () => void
  toggle?: boolean
  toggleValue?: boolean
  onToggleChange?: (v: boolean) => void
  last?: boolean
  danger?: boolean
  rightElement?: React.ReactNode
}

function SettingRow({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  description,
  value,
  onClick,
  toggle,
  toggleValue,
  onToggleChange,
  last,
  danger,
  rightElement,
}: SettingRowProps) {
  const hasAction = toggle || rightElement || value
  return (
    <div
      className={`flex items-start gap-3.5 py-3.5 px-4 transition-colors ${
        !hasAction ? 'cursor-pointer hover:bg-gray-50' : ''
      }`}
      style={{ borderBottom: last ? 'none' : '1px solid #f5f5f5' }}
      onClick={!hasAction ? onClick : undefined}
    >
      {Icon && (
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: iconBg || '#f5f5f5',
            color: iconColor || '#737373',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <Icon size={17} strokeWidth={2} />
        </div>
      )}
      <div className="flex-1 min-w-0 pt-0.5">
        <p
          className="text-[14px] font-medium leading-tight"
          style={{ color: danger ? '#dc2626' : '#171717' }}
        >
          {label}
        </p>
        {description && (
          <p className="text-[12px] mt-1 leading-relaxed text-gray-400">
            {description}
          </p>
        )}
      </div>
      {toggle && onToggleChange !== undefined && toggleValue !== undefined && (
        <div className="pt-0.5">
          <Toggle checked={toggleValue} onChange={onToggleChange} size="sm" />
        </div>
      )}
      {rightElement}
      {value && !toggle && !rightElement && (
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <span className="text-[13px] text-gray-400">{value}</span>
        </div>
      )}
      {!hasAction && (
        <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   设置分组
   ═══════════════════════════════════════════════════════ */
function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7 last:mb-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2.5 px-1 text-gray-400">
        {title}
      </p>
      <div
        className="rounded-2xl overflow-hidden bg-white"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}
      >
        {children}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   侧边栏导航项
   ═══════════════════════════════════════════════════════ */
interface NavSection {
  title: string
  items: { id: string; label: string; icon: LucideIcon; accent: string; gradient: string }[]
}

const navSections: NavSection[] = [
  {
    title: '个人',
    items: [
      { id: 'account',      label: '账号与安全', icon: User,      accent: '#ef4444', gradient: 'from-red-400 to-rose-500' },
      { id: 'notifications',label: '通知设置',   icon: Bell,      accent: '#3b82f6', gradient: 'from-blue-400 to-indigo-500' },
      { id: 'privacy',      label: '隐私设置',   icon: Eye,       accent: '#8b5cf6', gradient: 'from-violet-400 to-purple-500' },
    ],
  },
  {
    title: '偏好',
    items: [
      { id: 'appearance',   label: '外观与主题', icon: Palette,   accent: '#f59e0b', gradient: 'from-amber-400 to-orange-500' },
      { id: 'language',     label: '语言与地区', icon: Globe,     accent: '#10b981', gradient: 'from-emerald-400 to-teal-500' },
      { id: 'sidebar',      label: '侧边栏',     icon: PanelLeft, accent: '#64748b', gradient: 'from-slate-400 to-gray-500' },
      { id: 'accessibility',label: '无障碍',     icon: Accessibility, accent: '#f97316', gradient: 'from-orange-400 to-red-500' },
    ],
  },
  {
    title: '系统',
    items: [
      { id: 'shortcuts',    label: '快捷键',     icon: Keyboard,  accent: '#0891b2', gradient: 'from-cyan-400 to-blue-500' },
      { id: 'data',         label: '数据与存储', icon: Database,  accent: '#059669', gradient: 'from-emerald-500 to-green-600' },
      { id: 'advanced',     label: '高级设置',   icon: Gauge,     accent: '#7c3aed', gradient: 'from-violet-500 to-purple-600' },
      { id: 'about',        label: '关于观微',   icon: Info,      accent: '#a3a3a3', gradient: 'from-gray-400 to-slate-500' },
    ],
  },
]

/* ═══════════════════════════════════════════════════════
   像素齿轮装饰
   ═══════════════════════════════════════════════════════ */
function PixelGear() {
  return (
    <div className="hidden md:block relative w-32 h-32">
      {/* 主齿轮 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-400 animate-spin"
          style={{
            animationDuration: '8s',
            animationTimingFunction: 'steps(8)',
            clipPath: 'polygon(50% 0%, 61% 5%, 70% 15%, 80% 25%, 90% 35%, 95% 50%, 90% 65%, 80% 75%, 70% 85%, 61% 95%, 50% 100%, 39% 95%, 30% 85%, 20% 75%, 10% 65%, 5% 50%, 10% 35%, 20% 25%, 30% 15%, 39% 5%)',
          }}
        >
          <div className="absolute inset-1/3 bg-white rounded-sm" />
        </div>
      </div>
      {/* 小齿轮 */}
      <div
        className="absolute top-2 right-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 animate-spin"
        style={{
          animationDuration: '4s',
          animationTimingFunction: 'steps(6)',
          animationDirection: 'reverse',
          clipPath: 'polygon(50% 0%, 65% 10%, 80% 20%, 90% 35%, 95% 50%, 90% 65%, 80% 80%, 65% 90%, 50% 100%, 35% 90%, 20% 80%, 10% 65%, 5% 50%, 10% 35%, 20% 20%, 35% 10%)',
        }}
      >
        <div className="absolute inset-1/3 bg-white rounded-sm" />
      </div>
      {/* 星星装饰 */}
      <Star size={12} className="absolute bottom-4 left-2 text-amber-400 fill-amber-400 animate-pulse" />
      <Zap size={10} className="absolute top-4 left-4 text-cyan-400 fill-cyan-400/50" />
      <Sparkles size={14} className="absolute bottom-2 right-4 text-rose-400 fill-rose-400/50" />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   设置页面主体
   ═══════════════════════════════════════════════════════ */
export default function SettingsPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('account')

  // ── 状态 ──
  const [pushNotify, setPushNotify] = useState(true)
  const [emailNotify, setEmailNotify] = useState(false)
  const [melonNotify, setMelonNotify] = useState(true)
  const [debateNotify, setDebateNotify] = useState(false)
  const [publicProfile, setPublicProfile] = useState(true)
  const [allowDM, setAllowDM] = useState(true)
  const [showActivity, setShowActivity] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
  const [density, setDensity] = useState<'comfortable' | 'compact' | 'spacious'>('comfortable')
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [reduceMotion, setReduceMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [largeCursor, setLargeCursor] = useState(false)
  const [screenReader, setScreenReader] = useState(false)
  const [language, setLanguage] = useState('zh-CN')
  const [autoSave, setAutoSave] = useState(true)
  const [showConfirm, setShowConfirm] = useState(true)
  const [hardwareAccel, setHardwareAccel] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarCompact, setSidebarCompact] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [dataUsage] = useState({ used: 128, total: 1024 })

  // 扁平化导航项
  const flatNav = useMemo(() => {
    const items: { id: string; label: string; icon: LucideIcon; accent: string; gradient: string }[] = []
    navSections.forEach(s => s.items.forEach(i => items.push(i)))
    return items
  }, [])

  const currentItem = flatNav.find(i => i.id === activeSection)

  /* ─────────────────────────────────────────────────────
     各分区内容
     ───────────────────────────────────────────────────── */
  const renderContent = () => {
    switch (activeSection) {
      // ── 账号与安全 ──
      case 'account':
        return (
          <>
            <SettingGroup title="个人信息">
              <SettingRow
                icon={User} iconColor="#ef4444" iconBg="#fef2f2"
                label="头像" value="修改"
              />
              <SettingRow
                icon={User} iconColor="#ef4444" iconBg="#fef2f2"
                label="昵称" value="观微用户"
              />
              <SettingRow
                icon={Type} iconColor="#ef4444" iconBg="#fef2f2"
                label="个人简介"
                description="一句话介绍你自己"
                value="未填写"
                last
              />
            </SettingGroup>

            <SettingGroup title="账号安全">
              <SettingRow
                icon={Lock} iconColor="#f59e0b" iconBg="#fffbeb"
                label="修改密码"
                description="上次修改于 30 天前"
              />
              <SettingRow
                icon={Mail} iconColor="#3b82f6" iconBg="#eff6ff"
                label="邮箱绑定"
                description="用于接收通知和找回密码"
                value="u***@guanwei.cn"
              />
              <SettingRow
                icon={Shield} iconColor="#10b981" iconBg="#ecfdf5"
                label="两步验证"
                description="登录时需要额外验证"
                value="未开启"
                last
              />
            </SettingGroup>

            <SettingGroup title="账号操作">
              <SettingRow
                icon={LogOut} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="退出登录"
                description="退出当前账号"
                last
              />
            </SettingGroup>
          </>
        )

      // ── 通知设置 ──
      case 'notifications':
        return (
          <>
            <SettingGroup title="推送通知">
              <SettingRow
                icon={Bell} iconColor="#3b82f6" iconBg="#eff6ff"
                label="推送通知"
                description="接收浏览器或系统推送"
                toggle toggleValue={pushNotify} onToggleChange={setPushNotify}
              />
              <SettingRow
                icon={Mail} iconColor="#3b82f6" iconBg="#eff6ff"
                label="邮件通知"
                description="重要消息通过邮件送达"
                toggle toggleValue={emailNotify} onToggleChange={setEmailNotify}
                last
              />
            </SettingGroup>

            <SettingGroup title="内容通知">
              <SettingRow
                icon={Sparkles} iconColor="#f59e0b" iconBg="#fffbeb"
                label="瓜田动态"
                description="关注的瓜有新进展时通知"
                toggle toggleValue={melonNotify} onToggleChange={setMelonNotify}
              />
              <SettingRow
                icon={MessageSquare} iconColor="#8b5cf6" iconBg="#f5f3ff"
                label="辩论提醒"
                description="参与的辩论有新动态时通知"
                toggle toggleValue={debateNotify} onToggleChange={setDebateNotify}
                last
              />
            </SettingGroup>

            <SettingGroup title="免打扰">
              <SettingRow
                icon={Moon} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="免打扰时段"
                description="设置后该时段不接收通知"
                value="未设置"
                last
              />
            </SettingGroup>
          </>
        )

      // ── 隐私设置 ──
      case 'privacy':
        return (
          <>
            <SettingGroup title="个人资料">
              <SettingRow
                icon={Eye} iconColor="#8b5cf6" iconBg="#f5f3ff"
                label="公开资料"
                description="其他人可以查看你的主页"
                toggle toggleValue={publicProfile} onToggleChange={setPublicProfile}
              />
              <SettingRow
                icon={MessageSquare} iconColor="#8b5cf6" iconBg="#f5f3ff"
                label="私信权限"
                description="谁可以给你发送私信"
                value="关注的人"
                last
              />
            </SettingGroup>

            <SettingGroup title="动态可见性">
              <SettingRow
                icon={Layers} iconColor="#3b82f6" iconBg="#eff6ff"
                label="显示活动状态"
                description="让他人看到你是否在线"
                toggle toggleValue={showActivity} onToggleChange={setShowActivity}
              />
              <SettingRow
                icon={FileText} iconColor="#10b981" iconBg="#ecfdf5"
                label="笔记可见性"
                description="默认新建笔记的可见范围"
                value="仅自己"
                last
              />
            </SettingGroup>

            <SettingGroup title="数据与隐私">
              <SettingRow
                icon={Shield} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="隐私政策"
                last
              />
            </SettingGroup>
          </>
        )

      // ── 外观与主题 ──
      case 'appearance':
        return (
          <>
            <SettingGroup title="主题模式">
              <div className="py-4 px-4" style={{ borderBottom: '1px solid #f5f5f5' }}>
                <p className="text-[14px] font-medium mb-3 text-gray-800">选择主题</p>
                <SegmentedControl
                  value={theme}
                  onChange={setTheme}
                  options={[
                    { value: 'light', label: '浅色', icon: Sun },
                    { value: 'dark', label: '深色', icon: Moon },
                    { value: 'system', label: '跟随系统', icon: Monitor },
                  ]}
                />
              </div>
              <SettingRow
                icon={Palette} iconColor="#f59e0b" iconBg="#fffbeb"
                label="强调色"
                description="按钮、链接等元素的主色调"
                value="朱砂红"
                last
              />
            </SettingGroup>

            <SettingGroup title="显示密度">
              <div className="py-4 px-4" style={{ borderBottom: '1px solid #f5f5f5' }}>
                <p className="text-[14px] font-medium mb-3 text-gray-800">界面密度</p>
                <SegmentedControl
                  value={density}
                  onChange={setDensity}
                  options={[
                    { value: 'compact', label: '紧凑' },
                    { value: 'comfortable', label: '舒适' },
                    { value: 'spacious', label: '宽松' },
                  ]}
                />
              </div>
              <div className="py-4 px-4" style={{ borderBottom: '1px solid #f5f5f5' }}>
                <p className="text-[14px] font-medium mb-3 text-gray-800">字体大小</p>
                <SegmentedControl
                  value={fontSize}
                  onChange={setFontSize}
                  options={[
                    { value: 'sm', label: '小' },
                    { value: 'md', label: '中' },
                    { value: 'lg', label: '大' },
                  ]}
                />
              </div>
              <SettingRow
                icon={Type} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="字体"
                description="界面使用的字体"
                value="系统默认"
                last
              />
            </SettingGroup>

            <SettingGroup title="动效">
              <SettingRow
                icon={Sparkles} iconColor="#8b5cf6" iconBg="#f5f3ff"
                label="减少动画"
                description="关闭非必要的过渡和动效"
                toggle toggleValue={reduceMotion} onToggleChange={setReduceMotion}
                last
              />
            </SettingGroup>
          </>
        )

      // ── 语言与地区 ──
      case 'language':
        return (
          <>
            <SettingGroup title="语言">
              <div className="py-4 px-4">
                <p className="text-[14px] font-medium mb-3 text-gray-800">界面语言</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { code: 'zh-CN', label: '简体中文' },
                    { code: 'zh-TW', label: '繁體中文' },
                    { code: 'en-US', label: 'English' },
                    { code: 'ja-JP', label: '日本語' },
                  ].map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                        language === lang.code
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      {lang.label}
                      {language === lang.code && <Check size={15} />}
                    </button>
                  ))}
                </div>
              </div>
            </SettingGroup>

            <SettingGroup title="地区与格式">
              <SettingRow
                icon={Globe} iconColor="#10b981" iconBg="#ecfdf5"
                label="地区" value="中国大陆"
              />
              <SettingRow
                icon={Type} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="时间格式"
                value="24 小时制"
              />
              <SettingRow
                icon={LayoutGrid} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="日期格式"
                value="YYYY-MM-DD"
                last
              />
            </SettingGroup>
          </>
        )

      // ── 侧边栏 ──
      case 'sidebar':
        return (
          <>
            <SettingGroup title="侧边栏外观">
              <SettingRow
                icon={PanelLeft} iconColor="#64748b" iconBg="#f1f5f9"
                label="默认收起侧边栏"
                description="进入页面时侧边栏默认折叠"
                toggle toggleValue={sidebarCollapsed} onToggleChange={setSidebarCollapsed}
              />
              <SettingRow
                icon={LayoutGrid} iconColor="#64748b" iconBg="#f1f5f9"
                label="紧凑模式"
                description="减小导航项间距"
                toggle toggleValue={sidebarCompact} onToggleChange={setSidebarCompact}
              />
              <SettingRow
                icon={Type} iconColor="#64748b" iconBg="#f1f5f9"
                label="显示文字标签"
                description="关闭后仅显示图标"
                toggle toggleValue={showLabels} onToggleChange={setShowLabels}
                last
              />
            </SettingGroup>

            <SettingGroup title="导航项管理">
              <SettingRow
                icon={Layers} iconColor="#3b82f6" iconBg="#eff6ff"
                label="自定义导航"
                description="选择侧边栏显示的页面"
                value="6 个已启用"
                onClick={() => {}}
                last
              />
            </SettingGroup>
          </>
        )

      // ── 无障碍 ──
      case 'accessibility':
        return (
          <>
            <SettingGroup title="视觉辅助">
              <SettingRow
                icon={Eye} iconColor="#f97316" iconBg="#fff7ed"
                label="高对比度模式"
                description="增强文字与背景的对比度"
                toggle toggleValue={highContrast} onToggleChange={setHighContrast}
              />
              <SettingRow
                icon={Accessibility} iconColor="#f97316" iconBg="#fff7ed"
                label="大光标"
                description="使用更大的鼠标光标"
                toggle toggleValue={largeCursor} onToggleChange={setLargeCursor}
                last
              />
            </SettingGroup>

            <SettingGroup title="交互辅助">
              <SettingRow
                icon={Keyboard} iconColor="#f97316" iconBg="#fff7ed"
                label="屏幕阅读器优化"
                description="优化页面结构以适配屏幕阅读器"
                toggle toggleValue={screenReader} onToggleChange={setScreenReader}
              />
              <SettingRow
                icon={Sparkles} iconColor="#f97316" iconBg="#fff7ed"
                label="减少动效"
                description="关闭装饰性动画和过渡"
                toggle toggleValue={reduceMotion} onToggleChange={setReduceMotion}
                last
              />
            </SettingGroup>

            <SettingGroup title="阅读辅助">
              <SettingRow
                icon={Type} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="最小字号"
                value="默认"
                last
              />
            </SettingGroup>
          </>
        )

      // ── 快捷键 ──
      case 'shortcuts':
        return (
          <>
            <SettingGroup title="导航">
              {[
                { keys: ['G', 'M'], desc: '前往瓜田' },
                { keys: ['G', 'V'], desc: '前往求证' },
                { keys: ['G', 'E'], desc: '前往娱乐' },
                { keys: ['G', 'S'], desc: '前往设置' },
                { keys: ['/'], desc: '聚焦搜索框' },
              ].map((item, i) => (
                <SettingRow
                  key={item.desc}
                  icon={Keyboard}
                  iconColor="#0891b2"
                  iconBg="#ecfeff"
                  label={item.desc}
                  last={i === 4}
                  rightElement={
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {item.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="px-2 py-1 text-[11px] font-mono font-semibold rounded-lg bg-gray-100 text-gray-600 border border-gray-200"
                          style={{ boxShadow: '0 1px 0 #e5e5e5' }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  }
                />
              ))}
            </SettingGroup>

            <SettingGroup title="操作">
              {[
                { keys: ['Ctrl', 'K'], desc: '全局搜索' },
                { keys: ['Ctrl', 'N'], desc: '新建笔记' },
                { keys: ['Ctrl', 'S'], desc: '保存' },
                { keys: ['Esc'], desc: '关闭弹窗/返回' },
                { keys: ['?'], desc: '显示快捷键列表' },
              ].map((item, i) => (
                <SettingRow
                  key={item.desc}
                  icon={Keyboard}
                  iconColor="#0891b2"
                  iconBg="#ecfeff"
                  label={item.desc}
                  last={i === 4}
                  rightElement={
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {item.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="px-2 py-1 text-[11px] font-mono font-semibold rounded-lg bg-gray-100 text-gray-600 border border-gray-200"
                          style={{ boxShadow: '0 1px 0 #e5e5e5' }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  }
                />
              ))}
            </SettingGroup>
          </>
        )

      // ── 数据与存储 ──
      case 'data':
        return (
          <>
            <SettingGroup title="存储空间">
              <div className="py-5 px-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[14px] font-semibold text-gray-800">
                    已使用存储
                  </span>
                  <span className="text-[13px] font-mono text-gray-500">
                    {dataUsage.used} / {dataUsage.total} MB
                  </span>
                </div>
                <div
                  className="h-3 rounded-xl overflow-hidden"
                  style={{ background: '#f5f5f5', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}
                >
                  <div
                    className="h-full rounded-xl transition-all"
                    style={{
                      width: `${(dataUsage.used / dataUsage.total) * 100}%`,
                      background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                    }}
                  />
                </div>
                <p className="text-[12px] mt-2.5 text-gray-400">
                  包含笔记、缓存、离线数据等
                </p>
              </div>
            </SettingGroup>

            <SettingGroup title="数据管理">
              <SettingRow
                icon={Download} iconColor="#059669" iconBg="#ecfdf5"
                label="导出数据"
                description="导出你的所有数据为 JSON 格式"
              />
              <SettingRow
                icon={Upload} iconColor="#3b82f6" iconBg="#eff6ff"
                label="导入数据"
                description="从备份文件恢复数据"
                last
              />
            </SettingGroup>

            <SettingGroup title="缓存">
              <SettingRow
                icon={Trash2} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="清除缓存"
                description="清除本地缓存数据，不影响账号数据"
                value="12.4 MB"
                last
              />
            </SettingGroup>
          </>
        )

      // ── 高级设置 ──
      case 'advanced':
        return (
          <>
            <SettingGroup title="性能">
              <SettingRow
                icon={Gauge} iconColor="#7c3aed" iconBg="#f5f3ff"
                label="硬件加速"
                description="使用 GPU 加速渲染，提升性能"
                toggle toggleValue={hardwareAccel} onToggleChange={setHardwareAccel}
              />
              <SettingRow
                icon={Layers} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="自动保存"
                description="编辑内容时自动保存草稿"
                toggle toggleValue={autoSave} onToggleChange={setAutoSave}
                last
              />
            </SettingGroup>

            <SettingGroup title="确认对话框">
              <SettingRow
                icon={HelpCircle} iconColor="#f59e0b" iconBg="#fffbeb"
                label="危险操作确认"
                description="删除、发送等操作前弹出确认"
                toggle toggleValue={showConfirm} onToggleChange={setShowConfirm}
                last
              />
            </SettingGroup>

            <SettingGroup title="开发者">
              <SettingRow
                icon={FileText} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="调试模式"
                description="显示额外的调试信息"
                value="关闭"
              />
              <SettingRow
                icon={Database} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="重置所有设置"
                description="恢复为默认设置"
                danger
                last
              />
            </SettingGroup>
          </>
        )

      // ── 关于 ──
      case 'about':
        return (
          <>
            <SettingGroup title="观微">
              <div className="py-6 px-4 flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mb-3 shadow-lg"
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15), inset 0 2px 0 rgba(255,255,255,0.1)' }}
                >
                  <span className="text-red-400 text-2xl font-serif-cn font-bold">微</span>
                </div>
                <p className="text-[18px] font-bold text-gray-900 font-serif-cn">观微</p>
                <p className="text-[12px] text-gray-400 mt-0.5 font-mono">GUANWEI · v1.0.0</p>
                <p className="text-[12px] text-gray-400 mt-4 text-center max-w-xs leading-relaxed">
                  见微知著，明辨是非<br/>
                  用 AI 帮你看清每一个瓜的真相
                </p>
              </div>
            </SettingGroup>

            <SettingGroup title="信息">
              <SettingRow
                icon={FileText} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="用户协议"
              />
              <SettingRow
                icon={Shield} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="隐私政策"
              />
              <SettingRow
                icon={Info} iconColor="#9ca3af" iconBg="#f3f4f6"
                label="版本更新"
                value="已是最新"
                last
              />
            </SettingGroup>

            <SettingGroup title="反馈">
              <SettingRow
                icon={MessageSquare} iconColor="#3b82f6" iconBg="#eff6ff"
                label="意见反馈"
                description="告诉我们你的想法"
              />
              <SettingRow
                icon={HelpCircle} iconColor="#10b981" iconBg="#ecfdf5"
                label="帮助中心"
                description="查看常见问题和使用指南"
                last
              />
            </SettingGroup>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full flex"
      style={{ background: 'linear-gradient(180deg, #FEF2F2 0%, #ffffff 200px)' }}
    >
      {/* ── 左侧导航 ── */}
      <div
        className="hidden md:flex flex-col w-[232px] shrink-0 border-r border-gray-100 bg-white/80 backdrop-blur-sm overflow-y-auto scrollbar-thin"
      >
        {/* 顶部品牌区 */}
        <div
          className="px-5 pt-5 pb-4 relative overflow-hidden border-b border-gray-50"
          style={{
            background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 50%, #FEF3C7 100%)',
          }}
        >
          <div className="relative z-10 flex items-center gap-2.5 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
                boxShadow: '0 2px 8px -2px rgba(239, 68, 68, 0.4)',
              }}
            >
              <SettingsIcon size={18} className="text-white" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-gray-900 leading-tight">设置</h1>
              <p className="text-[10px] text-gray-500">个性化你的观微</p>
            </div>
          </div>
          {/* 像素装饰 */}
          <div className="absolute bottom-1 right-3 opacity-25">
            <Gamepad2 size={24} className="text-amber-600" />
          </div>
          <div className="absolute top-2 right-2 opacity-30">
            <Sparkles size={12} className="text-rose-400" />
          </div>
        </div>

        <div className="px-2.5 py-4 space-y-5 flex-1">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] px-3 mb-1.5 text-gray-400">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = activeSection === item.id
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
                        isActive
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                      style={isActive ? {
                        background: `linear-gradient(135deg, ${item.accent}12 0%, ${item.accent}08 100%)`,
                        boxShadow: `inset 0 0 0 1px ${item.accent}20`,
                      } : {}}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: isActive
                            ? `linear-gradient(135deg, ${item.accent}, ${item.accent}dd)`
                            : 'transparent',
                          color: isActive ? 'white' : 'inherit',
                          boxShadow: isActive ? `0 2px 6px ${item.accent}35` : 'none',
                        }}
                      >
                        <Icon size={14} strokeWidth={isActive ? 2.25 : 2} />
                      </div>
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 底部版本信息 */}
        <div className="px-4 py-3 border-t border-gray-50">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>版本 v1.0.0</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              在线
            </span>
          </div>
        </div>
      </div>

      {/* ── 右侧内容区 ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 移动端顶栏 */}
        <div className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 -ml-1 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100"
          >
            <ChevronRight size={18} className="rotate-180" />
          </button>
          <h1 className="text-[16px] font-bold text-gray-900">
            {currentItem?.label || '设置'}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* 桌面端 Banner 标题区（社区风格） */}
          <div className="hidden md:block mx-6 mt-5 mb-4">
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                background: currentItem
                  ? `linear-gradient(135deg, ${currentItem.accent}0A 0%, ${currentItem.accent}06 40%, #fef3c725 100%)`
                  : 'linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 50%, #FEF3C7 100%)',
                boxShadow: currentItem
                  ? `0 1px 2px ${currentItem.accent}10, 0 8px 24px -10px ${currentItem.accent}25`
                  : '0 1px 2px rgba(239, 68, 68, 0.06), 0 8px 24px -10px rgba(239, 68, 68, 0.15)',
              }}
            >
              <div className="flex items-center justify-between px-8 py-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                    style={{
                      background: currentItem
                        ? `linear-gradient(135deg, ${currentItem.accent}, ${currentItem.accent}dd)`
                        : 'linear-gradient(135deg, #ef4444, #f59e0b)',
                      boxShadow: `0 4px 14px ${currentItem?.accent || '#ef4444'}35`,
                    }}
                  >
                    {currentItem?.icon && <currentItem.icon size={22} strokeWidth={2} />}
                  </div>
                  <div>
                    <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
                      {currentItem?.label}
                    </h2>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      调整你的偏好设置，打造专属观微体验
                    </p>
                  </div>
                </div>
                <PixelGear />
              </div>

              {/* 装饰光斑 */}
              <div className="absolute -top-4 right-24 w-28 h-28 rounded-full bg-amber-200/30 blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-12 w-20 h-20 rounded-full bg-rose-200/30 blur-xl pointer-events-none" />
            </div>
          </div>

          {/* 设置内容 */}
          <div className="max-w-[680px] mx-auto px-4 md:px-6 pb-10">
            <div key={activeSection} className="animate-page-enter">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
