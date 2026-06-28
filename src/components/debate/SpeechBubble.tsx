import TranslationBlock from './TranslationBlock'

interface SpeechBubbleProps {
  speech: {
    nickname: string
    avatar: string
    side: 'affirm' | 'negate'
    content: string
    translatedContent?: string
    round: number
    createdAt: string
    charLimit: number
  }
}

export default function SpeechBubble({ speech }: SpeechBubbleProps) {
  const isAffirm = speech.side === 'affirm'
  const alignClass = isAffirm ? 'items-start' : 'items-end'
  const containerAlign = isAffirm ? 'mr-8' : 'ml-8'
  const sideBorder = isAffirm
    ? 'border-l-2 border-l-seal'
    : 'border-l-2 border-l-bamboo'

  // Format time
  const time = new Date(speech.createdAt)
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`

  return (
    <div className={`flex ${alignClass} gap-2 px-3 py-1.5`}>
      {/* Avatar - only on affirm side (left) */}
      {isAffirm && (
        <div className="w-7 h-7 rounded-full border border-seal overflow-hidden shrink-0 mt-0.5">
          {speech.avatar ? (
            <img src={speech.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface text-[10px] text-text-ink-500">
              {speech.nickname.charAt(0)}
            </div>
          )}
        </div>
      )}

      {/* Bubble content */}
      <div className={`flex-1 ${containerAlign}`}>
        {/* Name header */}
        <div className={`flex items-center gap-1.5 mb-1 ${isAffirm ? '' : 'justify-end'}`}>
          {!isAffirm && (
            <span className="text-[10px] text-text-ink-400">{timeStr}</span>
          )}
          <span className="text-xs font-medium text-text-ink-700">
            {speech.nickname}
          </span>
          <span
            className={`text-[9px] px-1 py-0.5 rounded ${
              isAffirm ? 'bg-seal/10 text-seal' : 'bg-bamboo/10 text-bamboo'
            }`}
          >
            {isAffirm ? '正方' : '反方'}
          </span>
          {isAffirm && (
            <span className="text-[10px] text-text-ink-400">{timeStr}</span>
          )}
        </div>

        {/* Content */}
        <div
          className={`
            bg-surface ${sideBorder} rounded-xl px-3 py-2
            shadow-card
          `}
        >
          <p className="text-sm text-text-ink-900 leading-relaxed whitespace-pre-wrap break-words m-0">
            {speech.content}
          </p>

          {/* Translation */}
          {speech.translatedContent && (
            <TranslationBlock
              original={speech.content}
              translated={speech.translatedContent}
            />
          )}
        </div>

        {/* Round indicator */}
        <span className="text-[9px] text-text-ink-400 mt-0.5 block">
          第{speech.round}轮
        </span>
      </div>

      {/* Avatar - only on negate side (right) */}
      {!isAffirm && (
        <div className="w-7 h-7 rounded-full border border-bamboo overflow-hidden shrink-0 mt-0.5">
          {speech.avatar ? (
            <img src={speech.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface text-[10px] text-text-ink-500">
              {speech.nickname.charAt(0)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
