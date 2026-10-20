import { useCallback, useEffect, useState, type CSSProperties } from "react"
import { IconChevronLeft, IconChevronRight, IconFullscreen, IconImage, IconZoomIn, IconZoomOut } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button } from "../../ui/button/index.js"
import { Dialog } from "../../ui/dialog/index.js"
import { formatNumber } from "../format.js"
import type { AiResult, ResultImage } from "../types.js"
import { ResultFrame } from "./frame.js"
import { useLocale } from "../../lib/locale/use-locale.js"

type ImagesResult = Extract<AiResult, { type: "images" }>

const ZOOMS = [1, 1.5, 2, 3] as const

/** One image in its reserved aspect-ratio box: it never moves anything when it loads. */
export function ImageTile({ image, onOpen, cover = false, className }: {
  /** The image: `src` and `alt`, `width` and `height` in pixels for the reserved ratio, and an optional `caption`. */
  image: ResultImage
  /** Called when the image is pressed; supplying it makes the image a button named "Open {alt}". */
  onOpen?: () => void
  /** Crop to a 16:10 box from the top instead of fitting the image at its own ratio. Defaults to `false`. */
  cover?: boolean
  className?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const box = { "--_ratio": `${image.width} / ${image.height}` } as CSSProperties
  const body = (
    <span className="fa-ai-image-box" style={box} data-cover={cover ? "" : undefined} data-loaded={loaded ? "" : undefined}>
      <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" onLoad={() => setLoaded(true)} draggable={false} />
    </span>
  )
  return (
    <figure className={cx("fa-ai-image", className)}>
      {onOpen ? (
        <button type="button" className="fa-ai-image-button fa-pressable" onClick={onOpen} aria-label={`Open ${image.alt}`}>
          {body}
        </button>
      ) : (
        body
      )}
      {image.caption ? <figcaption className="fa-ai-image-caption">{image.caption}</figcaption> : null}
    </figure>
  )
}

interface LightboxProps {
  /** Images rendered in display order. */
  images: ResultImage[]
  /** Index of the current item. */
  index: number
  /** Called with the zero-based index to show next, from previous / next or ← → (wrapping at the ends). Pair with `index`. */
  onIndexChange: (index: number) => void
  open: boolean
  /** Called with `false` when the person dismisses the dialog, for example with Esc. Pair with `open`. */
  onOpenChange: (open: boolean) => void
}

/**
 * A lightbox for result images: a dialog with the image on the canvas, previous / next,
 * and zoom (fit, 150 %, 200 %, 300 %); the zoomed image scrolls inside the stage.
 * ← → move between images, + and − zoom, 0 fits.
 */
export function ImageLightbox(props: LightboxProps) {
  if (!props.images[props.index]) return null
  return (
    <Dialog.Root open={props.open} onOpenChange={(next) => props.onOpenChange(next)}>
      <Dialog.Popup size="xl" className="fa-ai-lightbox">
        {/* A new image starts fitted: the content remounts per image. */}
        <LightboxContent key={props.index} {...props} />
      </Dialog.Popup>
    </Dialog.Root>
  )
}

function LightboxContent({ images, index, onIndexChange }: LightboxProps) {
  const locale = useLocale()
  const [zoom, setZoom] = useState(0)
  const image = images[index]!
  const go = useCallback((delta: number) => onIndexChange((index + delta + images.length) % images.length), [index, images.length, onIndexChange])

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === "ArrowRight" && images.length > 1) go(1)
      else if (event.key === "ArrowLeft" && images.length > 1) go(-1)
      else if (event.key === "+" || event.key === "=") setZoom((value) => Math.min(ZOOMS.length - 1, value + 1))
      else if (event.key === "-") setZoom((value) => Math.max(0, value - 1))
      else if (event.key === "0") setZoom(0)
      else return
      event.preventDefault()
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [go, images.length])

  const scale = ZOOMS[zoom] ?? 1
  return (
    <>
      <Dialog.Header icon={<IconImage />} title={image.caption ?? image.alt} subtitle={`${images.length > 1 ? `${index + 1} of ${images.length} · ` : ""}${formatNumber(image.width, 0, locale)} × ${formatNumber(image.height, 0, locale)}`} />
      <Dialog.Body flush>
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the stage scrolls when zoomed (R20.6) */}
        <div className="fa-ai-lightbox-stage" data-zoomed={zoom > 0 ? "" : undefined} tabIndex={0} role="region" aria-label={image.alt}>
          <img src={image.src} alt={image.alt} width={image.width} height={image.height} style={{ "--_scale": scale } as CSSProperties} draggable={false} />
        </div>
      </Dialog.Body>
      <Dialog.Footer
        start={
          images.length > 1 ? (
            <>
              <Button variant="ghost" size="sm" icon={<IconChevronLeft />} aria-label="Previous image" shortcut="left" onClick={() => go(-1)} />
              <Button variant="ghost" size="sm" icon={<IconChevronRight />} aria-label="Next image" shortcut="right" onClick={() => go(1)} />
            </>
          ) : undefined
        }
      >
        <Button variant="ghost" size="sm" icon={<IconZoomOut />} aria-label="Zoom out" shortcut="-" disabledReason={zoom === 0 ? "Already fitted" : undefined} onClick={() => setZoom((value) => Math.max(0, value - 1))} />
        <span className="fa-ai-lightbox-zoom" data-numeric aria-live="polite">
          {zoom === 0 ? "Fit" : `${Math.round(scale * 100)}%`}
        </span>
        <Button variant="ghost" size="sm" icon={<IconZoomIn />} aria-label="Zoom in" shortcut="+" disabledReason={zoom === ZOOMS.length - 1 ? "Largest zoom" : undefined} onClick={() => setZoom((value) => Math.min(ZOOMS.length - 1, value + 1))} />
        <Button variant="ghost" size="sm" icon={<IconFullscreen />} aria-label="Fit to window" shortcut="0" onClick={() => setZoom(0)} />
      </Dialog.Footer>
    </>
  )
}

/**
 * Screenshots and remote previews. One image fills the card at its own ratio (capped
 * height); several form a grid of equal tiles. Every box reserves its aspect ratio, and
 * a click opens the lightbox.
 */
export function ResultImages({ result }: {
  /** The images result: one of its `images` fills the card; several form a grid of cropped tiles. */
  result: ImagesResult
}) {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const single = result.images.length === 1
  return (
    <ResultFrame result={result} icon={<IconImage />} meta={single ? undefined : `${formatNumber(result.images.length, 0, locale)} images`}>
      <div className="fa-ai-images" data-single={single ? "" : undefined}>
        {result.images.map((image, imageIndex) => (
          <ImageTile
            key={image.id}
            image={image}
            cover={!single}
            onOpen={() => {
              setIndex(imageIndex)
              setOpen(true)
            }}
          />
        ))}
      </div>
      <ImageLightbox images={result.images} index={index} onIndexChange={setIndex} open={open} onOpenChange={setOpen} />
    </ResultFrame>
  )
}
