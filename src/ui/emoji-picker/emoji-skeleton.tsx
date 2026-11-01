import { Skeleton } from "../skeleton/index.js"

/** The list's cells while the data loads, in the box the list will use. */
export function EmojiGridSkeleton({ label }: { label: string }) {
  return (
    <div className="fa-emoji-list" role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: 40 }, (_, index) => (
        <Skeleton.Block key={index} className="fa-emoji-skeleton" radius="item" />
      ))}
    </div>
  )
}
