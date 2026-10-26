import { useMessages } from "../../lib/i18n/index.js"
import { resultsMessages } from "./messages.js"
import { useState, type CSSProperties } from "react"
import { IconImage } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Lightbox } from "../../ui/lightbox/index.js"
import type { AiResult, ResultImage } from "../types.js"
import { ResultFrame } from "./frame.js"
import { useLocale } from "../../lib/locale/use-locale.js"

type ImagesResult = Extract<AiResult, { type: "images" }>

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
  const messages = useMessages(resultsMessages)

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
        <button type="button" className="fa-ai-image-button fa-pressable" onClick={onOpen} aria-label={messages.open(image.alt)}>
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
 * A lightbox for result images: the library's Lightbox (previous / next, swipe, zoom and
 * pan, thumbnails) fed with the result's images. ← → move between images, + and − zoom,
 * 0 fits.
 */
export function ImageLightbox({ images, index, onIndexChange, open, onOpenChange }: LightboxProps) {
  if (!images[index]) return null
  return (
    <Lightbox
      images={images.map((image) => ({ id: image.id, src: image.src, alt: image.alt, width: image.width, height: image.height, caption: image.caption }))}
      index={index}
      onIndexChange={onIndexChange}
      open={open}
      onOpenChange={onOpenChange}
    />
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
  const messages = useMessages(resultsMessages)

  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const single = result.images.length === 1
  return (
    <ResultFrame result={result} icon={<IconImage />} meta={single ? undefined : messages.imageCount(result.images.length, locale)}>
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
