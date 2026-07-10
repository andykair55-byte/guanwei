export default function AgentWorldPage() {
  return (
    <div className="min-h-screen bg-paper-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-paper-100 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-ink-300">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-ink-300 text-[14px] font-medium">工作间 · 即将开放</p>
      </div>
    </div>
  )
}
