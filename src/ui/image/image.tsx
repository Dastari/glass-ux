import { useEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react"
import { IconImage, IconImageOff } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { AspectRatio, type AspectRatioRadius, type AspectRatioValue } from "../aspect-ratio/index.js"

/** Named ratios: `square` 1:1, `landscape` 4:3, `wide` 16:9, `portrait` 3:4. */
export type ImageRatioPreset = "square" | "landscape" | "wide" | "portrait"

/** A named ratio, a width:height number (`16 / 9`) or a `"w / h"` string. */
export type ImageRatio = ImageRatioPreset | AspectRatioValue

/** What the frame shows: the picture arriving, the picture, no source, or a failed load. */
export type ImageState = "loading" | "loaded" | "empty" | "error"

const PRESETS: Record<ImageRatioPreset, number> = { square: 1, landscape: 4 / 3, wide: 16 / 9, portrait: 3 / 4 }

export interface ImageProps
  extends Omit<ComponentProps<"img">, "src" | "alt" | "width" | "height" | "children" | "placeholder" | "className" | "style"> {
  /** Image URL. Empty or missing shows the empty fallback. */
  src?: string | null
  /** Text alternative. Required: pass `""` for a decorative image. Shown in the fallback when the frame is wide enough. */
  alt: string
  /** The frame's shape, reserved before the image loads so nothing moves. Default `landscape` (4:3). */
  ratio?: ImageRatio
  /** `cover` fills and crops (default); `contain` shows the whole picture inside the frame. */
  fit?: "cover" | "contain"
  /** `object-position`: the point kept in view when `cover` crops, such as `"50% 25%"`. */
  position?: CSSProperties["objectPosition"]
  /** Corner role. Default `media`. */
  radius?: AspectRatioRadius
  /** The tallest the frame may be; it narrows to keep its ratio. */
  maxHeight?: CSSProperties["maxHeight"]
  /** The picture's dominant colour: shown while it loads instead of the shimmer, and around a contained picture. */
  color?: string
  /** A hairline rim around the frame, which keeps a pale picture's edge visible on a pale surface. Default true. */
  frame?: boolean
  /**
   * Feedback when the image is inside a link or button and that is hovered or focused:
   * `zoom` scales the picture inside its frame, `sheen` sweeps a glass highlight across it.
   * Static images never react. Still and reduced motion turn both off. Default `none`.
   */
  hover?: "none" | "zoom" | "sheen"
  /** Replaces the designed fallback shown for a missing or failed image. */
  fallback?: ReactNode
  /** Called when the state changes, for example to hide a caption when the image fails. */
  onStateChange?: (state: ImageState) => void
  /** Classes for the frame, for layout. */
  className?: string
  /** Inline style for the frame. */
  style?: CSSProperties
}

/**
 * A picture in a frame of fixed ratio, with the media corner radius and a hairline rim. The
 * frame is reserved before the picture loads, a shimmer or the picture's colour fills it
 * meanwhile, and the picture fades in. A missing source or a failed load shows a fallback in
 * the icon language, with the alt text when the frame is wide enough. No shadow: an image
 * sits on its surface (R4.5).
 */
export function Image({
  src,
  alt,
  ratio = "landscape",
  fit = "cover",
  position,
  radius = "media",
  maxHeight,
  color,
  frame = true,
  hover = "none",
  fallback,
  onStateChange,
  onLoad,
  onError,
  loading = "lazy",
  decoding = "async",
  className,
  style,
  ...imgProps
}: ImageProps) {
  const source = src || null
  const [loaded, setLoaded] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const img = useRef<HTMLImageElement>(null)
  const state: ImageState = !source ? "empty" : failed === source ? "error" : loaded === source ? "loaded" : "loading"

  // A cached picture can finish before React attaches its handlers.
  useEffect(() => {
    const element = img.current
    if (!source || !element?.complete) return
    if (element.naturalWidth > 0) setLoaded(source)
    else setFailed(source)
  }, [source])

  const reported = useRef<ImageState | null>(null)
  useEffect(() => {
    if (reported.current === state) return
    reported.current = state
    onStateChange?.(state)
  }, [state, onStateChange])

  const ratioValue = typeof ratio === "string" && ratio in PRESETS ? PRESETS[ratio as ImageRatioPreset] : (ratio as AspectRatioValue)
  const missing = state === "empty" || state === "error"
  return (
    <AspectRatio
      ratio={ratioValue}
      fit={fit}
      radius={radius}
      maxHeight={maxHeight}
      className={cx("fa-image", className)}
      data-state={state}
      data-frame={frame ? "" : undefined}
      data-hover={hover === "none" ? undefined : hover}
      data-color={color ? "" : undefined}
      style={color ? ({ ...style, "--_image-color": color } as CSSProperties) : style}
    >
      {state === "loading" && !color ? <span className="fa-image-placeholder fa-skel fa-shimmer" aria-hidden /> : null}
      {source && state !== "error" ? (
        <img
          {...imgProps}
          ref={img}
          src={source}
          alt={alt}
          loading={loading}
          decoding={decoding}
          className="fa-image-picture"
          style={position === undefined ? undefined : { objectPosition: position }}
          onLoad={(event) => {
            setLoaded(source)
            onLoad?.(event)
          }}
          onError={(event) => {
            setFailed(source)
            onError?.(event)
          }}
        />
      ) : null}
      {missing ? (
        <span
          className="fa-image-fallback"
          role={alt ? "img" : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
        >
          {fallback ?? (
            <>
              {state === "error" ? <IconImageOff className="fa-image-fallback-icon" /> : <IconImage className="fa-image-fallback-icon" />}
              {alt ? (
                <span className="fa-image-fallback-text" aria-hidden>
                  {alt}
                </span>
              ) : null}
            </>
          )}
        </span>
      ) : null}
    </AspectRatio>
  )
}
