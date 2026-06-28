import { Search, ShieldCheck, FileSearch, Loader2, Check } from 'lucide-react'

type AgentPhase = 'idle' | 'searching' | 'verifying' | 'analyzing' | 'done'

interface AgentProgressProps {
  phase: AgentPhase
}

interface AgentNode {
  key: AgentPhase
  label: string
  icon: typeof Search
}

const agents: AgentNode[] = [
  { key: 'searching', label: '搜集', icon: Search },
  { key: 'verifying', label: '验证', icon: ShieldCheck },
  { key: 'analyzing', label: '分析', icon: FileSearch },
]

const phaseOrder: AgentPhase[] = ['idle', 'searching', 'verifying', 'analyzing', 'done']

function getPhaseIndex(phase: AgentPhase): number {
  return phaseOrder.indexOf(phase)
}

function AgentProgress({ phase }: AgentProgressProps) {
  const currentIdx = getPhaseIndex(phase)

  return (
    <div className="flex items-center justify-center gap-0 px-4 py-4">
      {agents.map((agent, i) => {
        const agentIdx = i + 1 // searching=1, verifying=2, analyzing=3
        const isCompleted = currentIdx > agentIdx || phase === 'done'
        const isActive = currentIdx === agentIdx
        const Icon = agent.icon

        return (
          <div key={agent.key} className="flex items-center">
            {/* Agent 节点 */}
            <div className="flex flex-col items-center">
              <div
                className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isCompleted
                    ? 'bg-bamboo text-white'
                    : isActive
                    ? 'bg-seal text-white animate-pulse-glow'
                    : 'bg-paper-dark text-ink-faint border border-line'
                }`}
              >
                {isCompleted ? (
                  <Check size={18} strokeWidth={3} />
                ) : isActive ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Icon size={18} />
                )}
              </div>
              <span
                className={`mt-1.5 text-[10px] transition-colors duration-300 ${
                  isCompleted ? 'text-bamboo font-medium' : isActive ? 'text-seal font-medium' : 'text-ink-faint'
                }`}
              >
                {agent.label}
              </span>
            </div>

            {/* 连接线 */}
            {i < agents.length - 1 && (
              <div className="relative w-12 h-0.5 mx-1 mb-4">
                <div className="absolute inset-0 bg-line rounded-full" />
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-700 ${
                    isCompleted || currentIdx > agentIdx ? 'bg-bamboo' : isActive ? 'bg-seal' : ''
                  }`}
                  style={{ width: isCompleted || currentIdx > agentIdx ? '100%' : isActive ? '50%' : '0%' }}
                />
                {/* 流动光点 */}
                {isActive && (
                  <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-seal animate-flow-dot" />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default AgentProgress
