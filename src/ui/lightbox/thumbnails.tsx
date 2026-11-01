import { memo, useEffect, useRef, useState, type KeyboardEvent } from "react"
import { prefersReducedMotion } from "../../lib/motion.js"

/** Gives each thumbnail its source when it comes near the strip's view. */
interface ThumbnailLoader {
  /** Returns the way to stop watching. */
  watch: (image: HTMLImageElement, src: string) => () => void
  disconnect: () => void
}

function thumbnailLoader(root: HTMLElement): ThumbnailLoader {
  if (typeof IntersectionObserver === "undefined") {
    return {
      watch(image, src) {
        image.src = src
        return () => {}
      },
      disconnect() {},
    }
  }
  const waiting = new WeakMap<Element, string>()
  // One thumbnail either side, so a step along the strip finds its neighbour ready.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const src = waiting.get(entry.target)
        if (src) (entry.target as HTMLImageElement).src = src
        observer.unobserve(entry.target)
      }
    },
    { root, rootMargin: "0px 72px" } // tokens:allow an observer's reach, not a style
  )
  return {
    watch(image, src) {
      waiting.set(image, src)
      observer.observe(image)
      return () => observer.unobserve(image)
    },
    disconnect: () => observer.disconnect(),
  }
}

const Thumbnail = /* @__PURE__ */ memo(function Thumbnail({
  index,
  src,
  label,
  current,
  loader,
  onSelect,
}: {
  index: number
  src: string
  label: string
  current: boolean
  loader: ThumbnailLoader | null
  onSelect: (index: number) => void
}) {
  const image = useRef<HTMLImageElement>(null)
  useEffect(() => (image.current ? loader?.watch(image.current, src) : undefined), [loader, src])
  return (
    <button
      type="button"
      className="fa-lightbox-thumbnail fa-pressable"
      aria-label={label}
      aria-current={current ? "true" : undefined}
      tabIndex={current ? 0 : -1}
      onClick={() => onSelect(index)}
    >
      <img
        ref={image}
        alt=""
        decoding="async"
        draggable={false}
        onError={(event) => {
          // The tile's own fill stands in, not the browser's broken-image glyph.
          event.currentTarget.hidden = true
        }}
      />
    </button>
  )
})

/**
 * One tab stop, the current picture; the viewer's arrow keys change picture from here and
 * focus follows. Home and End go to the ends. Every thumbnail is in the document so the strip
 * scrolls natively, but only those near its view load, so a long set costs its visible part.
 */
export function ThumbnailStrip({
  images,
  index,
  label,
  itemLabel,
  onSelect,
}: {
  images: readonly { id?: string; src: string; alt: string; thumbnail?: string }[]
  index: number
  label: string
  itemLabel: (alt: string) => string
  onSelect: (index: number) => void
}) {
  const strip = useRef<HTMLDivElement>(null)
  const [loader, setLoader] = useState<ThumbnailLoader | null>(null)
  useEffect(() => {
    const next = thumbnailLoader(strip.current!)
    setLoader(next)
    return next.disconnect
  }, [])

  // Keep the current picture in view, by box so it reads the same in either direction.
  const placed = useRef(false)
  useEffect(() => {
    const box = strip.current
    const item = box?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!box || !item) return
    const room = box.getBoundingClientRect()
    const place = item.getBoundingClientRect()
    const inset = Number.parseFloat(getComputedStyle(box).paddingInlineStart) || 0
    const before = place.left - room.left - inset
    const after = place.right - room.right + inset
    const distance = before < 0 ? before : after > 0 ? after : 0
    if (distance) box.scrollBy({ left: distance, behavior: !placed.current || prefersReducedMotion() ? "auto" : "smooth" })
    placed.current = true
    if (box.contains(document.activeElement)) item.focus({ preventScroll: true })
  }, [index])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Home" && event.key !== "End") return
    event.preventDefault()
    onSelect(event.key === "Home" ? 0 : images.length - 1)
  }

  return (
    <div ref={strip} className="fa-lightbox-thumbnails fa-lightbox-chrome" role="group" aria-label={label} onKeyDown={onKeyDown}>
      {images.map((item, itemIndex) => (
        <Thumbnail
          key={item.id ?? item.src}
          index={itemIndex}
          src={item.thumbnail ?? item.src}
          label={itemLabel(item.alt)}
          current={itemIndex === index}
          loader={loader}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
