interface TranslationBlockProps {
  original: string
  translated: string
}

export default function TranslationBlock({ original: _original, translated }: TranslationBlockProps) {
  return (
    <div className="mt-2 border-l-2 border-sky-400/60 pl-3 py-1.5">
      <span className="inline-block text-[10px] font-medium text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded mb-1">
        AI翻译
      </span>
      <p className="text-xs text-text-ink-500 leading-relaxed m-0">
        {translated}
      </p>
    </div>
  )
}
