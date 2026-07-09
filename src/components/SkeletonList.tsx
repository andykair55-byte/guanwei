interface SkeletonListProps {
  count?: number
}

export default function SkeletonList({ count = 5 }: SkeletonListProps) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-2">
          <div className="w-8 h-8 rounded-full skeleton flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="w-3/4 h-3 rounded skeleton" />
            <div className="w-1/2 h-2 rounded skeleton" />
          </div>
        </div>
      ))}
    </div>
  )
}
