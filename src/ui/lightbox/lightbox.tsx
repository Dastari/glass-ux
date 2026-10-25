import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react"
import { IconChevronLeft, IconChevronRight, IconFullscreen, IconImage, IconZoomIn, IconZoomOut } from "../../icons/generated/icons.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button } from "../button/index.js"
import { Dialog } from "../dialog/index.js"
import { lightboxMessages } from "./messages.js"

/** One picture in a lightbox. */
export interface LightboxImage {
  /** A stable key; defaults to `src`. */
  id?: string
  src: string
  /** What the picture shows: the stage's name and the title when there is no caption. */
  alt: string
  /** Pixel size, shown in the subtitle and used to reserve the picture's shape. */
  width?: number
  height?: number
  /** The title above the picture. */
  caption?: ReactNode
  /** A smaller image for the thumbnail strip; defaults to `src`. */
  thumbnail?: string
}

export interface LightboxProps {
  images: LightboxImage[]
  /** The picture shown. Pair with `onIndexChange` to control it. */
  index?: number
  defaultIndex?: number
  /** Called with the zero-based index to show, from previous/next, ← →, a swipe or a thumbnail (wrapping at the ends). */
  onIndexChange?: (index: number) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Show a strip of thumbnails under the picture when there are several. Default true. */
  thumbnails?: boolean
  /** Actions for the current picture at the end of the footer: download, open the original. */
  actions?: (image: LightboxImage, index: number) => ReactNode
  /** Zoom steps after "fit", as multiples of the fitted width. Default 1.5, 2 and 3. */
  zoomSteps?: number[]
  locale?: string
  labels?: Partial<typeof lightboxMessages.defaults>
}

/**
 * Pictures at full size in a dialog: previous and next (← →, or a swipe on touch), zoom
 * (+ − and 0 to fit) where a zoomed picture pans by dragging or scrolling, an optional strip
 * of thumbnails and actions for the current picture. Each picture starts fitted.
 */
export function Lightbox({
  images,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  thumbnails = true,
  actions,
  zoomSteps = [1.5, 2, 3],
  locale,
  labels,
}: LightboxProps) {
  const [index, setIndex] = useControllable(indexProp, defaultIndex, onIndexChange)
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const image = images[index]
  return (
    <Dialog.Root open={open && Boolean(image)} onOpenChange={(next) => setOpen(next)}>
      <Dialog.Popup size="xl" className="fa-lightbox">
        {image ? (
          // A new picture starts fitted: the content remounts per picture.
          <LightboxContent
            key={image.id ?? image.src}
            images={images}
            index={index}
            onIndexChange={setIndex}
            thumbnails={thumbnails}
            actions={actions}
            zoomSteps={zoomSteps}
            locale={locale}
            labels={labels}
          />
        ) : null}
      </Dialog.Popup>
    </Dialog.Root>
  )
}

function LightboxContent({
  images,
  index,
  onIndexChange,
  thumbnails,
  actions,
  zoomSteps,
  locale: localeProp,
  labels,
}: Required<Pick<LightboxProps, "images" | "thumbnails" | "zoomSteps">> &
  Pick<LightboxProps, "actions" | "locale" | "labels"> & { index: number; onIndexChange: (index: number) => void }) {
  const t = useMessages(lightboxMessages, { labels, locale: localeProp })
  const locale = useLocale(localeProp)
  const zooms = [1, ...zoomSteps]
  const [zoom, setZoom] = useState(0)
  const stage = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null)
  const image = images[index]!
  const many = images.length > 1
  const go = useCallback((delta: number) => onIndexChange((index + delta + images.length) % images.length), [index, images.length, onIndexChange])
  const zoomBy = (delta: number) => setZoom((value) => Math.min(zooms.length - 1, Math.max(0, value + delta)))

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof Element && target.closest("input, textarea, [contenteditable='true']")) return
      if (event.key === "ArrowRight" && many) go(1)
      else if (event.key === "ArrowLeft" && many) go(-1)
      else if (event.key === "+" || event.key === "=") zoomBy(1)
      else if (event.key === "-") zoomBy(-1)
      else if (event.key === "0") setZoom(0)
      else return
      event.preventDefault()
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  })

  // Fitted: a horizontal swipe changes picture. Zoomed: dragging pans the stage.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const box = stage.current!
    gesture.current = { x: event.clientX, y: event.clientY, left: box.scrollLeft, top: box.scrollTop, moved: false }
    if (zoom > 0) box.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    if (!start || zoom === 0) return
    const box = stage.current!
    box.scrollLeft = start.left - (event.clientX - start.x)
    box.scrollTop = start.top - (event.clientY - start.y)
    start.moved = true
  }
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    gesture.current = null
    if (!start || zoom > 0 || !many) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
  }

  const scale = zooms[zoom] ?? 1
  const size =
    image.width && image.height ? `${numberFormat(locale).format(image.width)} × ${numberFormat(locale).format(image.height)}` : undefined
  const subtitle = [many ? t.position(index + 1, images.length) : null, size].filter(Boolean).join(" · ") || undefined

  return (
    <>
      <Dialog.Header icon={<IconImage />} title={image.caption ?? image.alt} subtitle={subtitle} />
      <Dialog.Body flush>
        <div className="fa-lightbox-main">
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the stage scrolls when zoomed (R20.6) */}
          <div
            ref={stage}
            className="fa-lightbox-stage"
            data-zoomed={zoom > 0 ? "" : undefined}
            tabIndex={0}
            role="region"
            aria-label={image.alt}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              gesture.current = null
            }}
          >
            <img
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              style={{ "--_scale": scale } as CSSProperties}
              draggable={false}
            />
          </div>
          {thumbnails && many ? (
            <div className="fa-lightbox-thumbnails" role="group" aria-label={t.thumbnails}>
              {images.map((item, itemIndex) => (
                <button
                  key={item.id ?? item.src}
                  type="button"
                  className="fa-lightbox-thumbnail fa-pressable"
                  aria-label={t.show(item.alt)}
                  aria-current={itemIndex === index ? "true" : undefined}
                  onClick={() => onIndexChange(itemIndex)}
                >
                  <img src={item.thumbnail ?? item.src} alt="" loading="lazy" decoding="async" draggable={false} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Dialog.Body>
      <Dialog.Footer
        start={
          many ? (
            <>
              <Button variant="ghost" size="sm" icon={<IconChevronLeft />} aria-label={t.previous} shortcut="left" onClick={() => go(-1)} />
              <Button variant="ghost" size="sm" icon={<IconChevronRight />} aria-label={t.next} shortcut="right" onClick={() => go(1)} />
            </>
          ) : undefined
        }
      >
        <Button variant="ghost" size="sm" icon={<IconZoomOut />} aria-label={t.zoomOut} shortcut="-" disabledReason={zoom === 0 ? t.alreadyFitted : undefined} onClick={() => zoomBy(-1)} />
        <span className="fa-lightbox-zoom" data-numeric aria-live="polite">
          {zoom === 0 ? t.fitted : `${Math.round(scale * 100)}%`}
        </span>
        <Button variant="ghost" size="sm" icon={<IconZoomIn />} aria-label={t.zoomIn} shortcut="+" disabledReason={zoom === zooms.length - 1 ? t.largest : undefined} onClick={() => zoomBy(1)} />
        <Button variant="ghost" size="sm" icon={<IconFullscreen />} aria-label={t.fit} shortcut="0" onClick={() => setZoom(0)} />
        {actions ? <span className="fa-lightbox-actions">{actions(image, index)}</span> : null}
      </Dialog.Footer>
    </>
  )
}
