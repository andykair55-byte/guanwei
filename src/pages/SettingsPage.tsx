import { useState } from 'react'
import {
  User, Lock, Bell, Mail, Eye, MessageSquare,
  Info, Shield, FileText, ChevronRight,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════
   Design Tokens
   ═══════════════════════════════════════════════════════ */
const T = {
  bgPage:        '#f5f5f5',
  bgCard:        '#ffffff',
  bgHover:       '#fafafa',
  accent:        '#1f8c4f',
  accentLight:   '#e8f5ee',
  textPrimary:   '#262626',
  textSecondary: '#8c8c8c',
  textTertiary:  '#bfbfbf',
  border:        '#f0f0f0',
  borderStrong:  '#e5e5e5',
  orange:        '#fa8c16',
  purple:        '#722ed1',
  blue:          '#1890ff',
} as const

/* ═══════════════════════════════════════════════════════
   Toggle Switch (44x24, knob 20x20)
   ═══════════════════════════════════════════════════════ */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-[44px] h-[24px] rounded-full transition-colors shrink-0"
      style={{ background: checked ? T.accent : '#d9d9d9' }}
    >
      <span
        className="absolute top-[2px] left-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

/* ═══════════════════════════════════════════════════════
   Setting Row
   ═══════════════════════════════════════════════════════ */
interface SettingRowProps {
  icon: typeof User
  iconColor: string
  iconBg: string
  label: string
  value?: string
  onClick?: () => void
  toggle?: boolean
  toggleValue?: boolean
  onToggleChange?: (v: boolean) => void
  last?: boolean
}

function SettingRow({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  onClick,
  toggle,
  toggleValue,
  onToggleChange,
  last,
}: SettingRowProps) {
  return (
    <div
      className="flex items-center gap-3 py-3 px-4 cursor-pointer transition-colors hover:bg-[#fafafa]"
      style={{ borderBottom: last ? 'none' : `1px solid ${T.border}` }}
      onClick={toggle ? undefined : onClick}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      <span className="flex-1 text-[14px] font-medium" style={{ color: T.textPrimary }}>{label}</span>
      {value && (
        <span className="text-[13px]" style={{ color: T.textTertiary }}>{value}</span>
      )}
      {toggle && onToggleChange !== undefined && toggleValue !== undefined ? (
        <Toggle checked={toggleValue} onChange={onToggleChange} />
      ) : !value ? (
        <ChevronRight size={16} style={{ color: T.textTertiary }} />
      ) : null}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Setting Group
   ═══════════════════════════════════════════════════════ */
function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider mb-2 px-1" style={{ color: T.textTertiary }}>
        {title}
      </p>
      <div className="rounded-xl overflow-hidden" style={{ background: T.bgCard, boxShadow: `inset 0 0 0 1px ${T.border}` }}>
        {children}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   SettingsPage
   ═══════════════════════════════════════════════════════ */
function SettingsPage() {
  const [pushNotify, setPushNotify] = useState(true)
  const [emailNotify, setEmailNotify] = useState(false)
  const [publicProfile, setPublicProfile] = useState(true)
  const [allowDM, setAllowDM] = useState(true)

  // Icon color config per group
  const greenIcon  = { iconColor: T.accent, iconBg: T.accentLight }
  const blueIcon   = { iconColor: T.blue,   iconBg: '#e6f7ff' }
  const purpleIcon = { iconColor: T.purple, iconBg: '#f9f0ff' }
  const orangeIcon = { iconColor: T.orange, iconBg: '#fff7e6' }

  return (
    <div className="min-h-full flex flex-col" style={{ background: T.bgPage }}>
      {/* ── 顶部标题区 ── */}
      <header
        className="sticky top-0 z-20 flex items-center justify-center h-12"
        style={{ background: T.bgCard }}
      >
        <h1 className="text-[20px] font-bold" style={{ color: T.textPrimary }}>设置</h1>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-5 py-6 space-y-6">

          {/* 账号设置 */}
          <SettingGroup title="账号设置">
            <SettingRow
              icon={User}
              {...greenIcon}
              label="头像"
              value="修改"
            />
            <SettingRow
              icon={User}
              {...greenIcon}
              label="昵称"
              value="观微用户"
            />
            <SettingRow
              icon={Lock}
              {...greenIcon}
              label="密码修改"
              last
            />
          </SettingGroup>

          {/* 通知偏好 */}
          <SettingGroup title="通知偏好">
            <SettingRow
              icon={Bell}
              {...blueIcon}
              label="推送通知"
              toggle
              toggleValue={pushNotify}
              onToggleChange={setPushNotify}
            />
            <SettingRow
              icon={Mail}
              {...blueIcon}
              label="邮件通知"
              toggle
              toggleValue={emailNotify}
              onToggleChange={setEmailNotify}
              last
            />
          </SettingGroup>

          {/* 隐私安全 */}
          <SettingGroup title="隐私安全">
            <SettingRow
              icon={Eye}
              {...purpleIcon}
              label="公开资料"
              toggle
              toggleValue={publicProfile}
              onToggleChange={setPublicProfile}
            />
            <SettingRow
              icon={MessageSquare}
              {...purpleIcon}
              label="私信权限"
              toggle
              toggleValue={allowDM}
              onToggleChange={setAllowDM}
              last
            />
          </SettingGroup>

          {/* 关于 */}
          <SettingGroup title="关于">
            <SettingRow
              icon={Info}
              {...orangeIcon}
              label="版本信息"
              value="v1.0.0"
            />
            <SettingRow
              icon={Shield}
              {...orangeIcon}
              label="隐私政策"
            />
            <SettingRow
              icon={FileText}
              {...orangeIcon}
              label="用户协议"
              last
            />
          </SettingGroup>

        </div>
      </div>
    </div>
  )
}

export default SettingsPage
