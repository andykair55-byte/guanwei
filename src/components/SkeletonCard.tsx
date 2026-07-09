export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
      <div className="relative w-full aspect-[4/3] overflow-hidden skeleton" />

      <div className="p-3">
        <div className="h-10 w-4/5 rounded-md skeleton mb-2" />

        <div className="h-2" />

        <div className="flex items-center justify-between">
          <div className="w-12 h-5 rounded-md skeleton" />
          <div className="w-10 h-5 rounded-full skeleton" />
        </div>
      </div>
    </div>
  )
}
