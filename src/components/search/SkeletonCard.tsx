// Shimmer placeholder that holds a slot until the next person arrives.
export function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="flex w-full min-h-[268px] flex-col items-center rounded-[20px] border border-line bg-surface/70 px-4 pt-6 pb-3"
    >
      <div className="shimmer size-16 rounded-full" />
      <div className="shimmer mt-4 h-4 w-32 rounded-full" />
      <div className="shimmer mt-2.5 h-3 w-40 rounded-full" />
      <div className="shimmer mt-2 h-3 w-28 rounded-full" />
      <div className="mt-4 flex gap-1.5">
        <div className="shimmer h-6 w-16 rounded-full" />
        <div className="shimmer h-6 w-20 rounded-full" />
      </div>
      <div className="mt-auto flex w-full items-center justify-between border-t border-line pt-3">
        <div className="flex gap-2">
          <div className="shimmer size-8 rounded-full" />
          <div className="shimmer size-8 rounded-full" />
        </div>
        <div className="shimmer size-11 rounded-full" />
      </div>
    </div>
  );
}
