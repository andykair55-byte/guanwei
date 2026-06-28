import type { LucideIcon } from 'lucide-react'
import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  icon?: LucideIcon
  description?: string
}

function PlaceholderPage({ title, icon: Icon = Construction, description = '功能开发中，敬请期待' }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Icon className="text-ink-400 mb-4" size={48} />
      <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
      <p className="text-ink-500 mt-2 text-sm">{description}</p>
    </div>
  )
}

export default PlaceholderPage