interface SkeletonTextProps {
  lines?: number
  lastLineWidth?: string
}

export default function SkeletonText({ lines = 3, lastLineWidth = 'w-2/3' }: SkeletonTextProps) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 rounded skeleton mb-2 last:mb-0 ${
            i === lines - 1 ? lastLineWidth : 'w-full'
          }`}
        />
      ))}
    </div>
  )
}
