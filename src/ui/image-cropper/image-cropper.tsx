import { useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, type Ref, type RefObject } from "react"
import { IconImage, IconZoomIn, IconZoomOut } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Field } from "../field/index.js"
import { NumberField } from "../number-field/index.js"
import { Segmented } from "../segmented/index.js"
import { Slider } from "../slider/index.js"
import {
  clampCropRect,
  clampCropView,
  cropExtent,
  cropRectFor,
  fitCropView,
  largestCrop,
  maxCropZoom,
  resizeCropRect,
  roundCropRect,
  viewForCrop,
  wholeImage,
  type ImageCropAspect,
  type ImageCropHandle,
  type ImageCropRect,
  type ImageCropView,
  type ImageSize,
} from "./crop.js"
import { imageCropperMessages } from "./messages.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

const ZOOM_STEP = 1.1
/** A wheel gesture reports its result once it has been still this long. */
const WHEEL_SETTLE_MS = 160

/** One choice of shape in the cropper's aspect control. */
export interface ImageCropAspectOption {
  /** Width ÷ height (16 / 9), or `"free"` for any shape. */
  value: ImageCropAspect
  /** "16:9", "Square", "Free". */
  label: string
}

/** Commands a host can give the cropper, for its own toolbar or Save button. */
export interface ImageCropperActions {
  /** The crop as it stands now, including a gesture that has not been reported yet. Null without an image. */
  crop: () => ImageCropRect | null
  /** Back to the whole image (free) or the largest crop of the shape (locked). */
  fit: () => void
}

export interface ImageCropperProps {
  /** The image's URL. Without it the frame shows `placeholder`. */
  src?: string
  /** The image's pixel size, when known. Read from `src` otherwise. */
  image?: ImageSize
  /** The crop in the image's pixels. Pair with `onValueChange` to control it. */
  value?: ImageCropRect
  /** The starting crop when uncontrolled. Default: the largest crop of the shape, or the whole image. */
  defaultValue?: ImageCropRect
  /** Called with the crop in whole pixels: when an image first shows, and once per gesture when it ends, never during a drag. */
  onValueChange?: (crop: ImageCropRect) => void
  /** Width ÷ height the crop keeps, or `"free"`. Pair with `onAspectChange` to control it. */
  aspect?: ImageCropAspect
  /** The starting aspect when uncontrolled. Default `"free"`. */
  defaultAspect?: ImageCropAspect
  /** Called with the next aspect when the person picks one of `aspects`. */
  onAspectChange?: (aspect: ImageCropAspect) => void
  /** Shapes to choose between, shown as a segmented control. Without it the aspect stays as given. */
  aspects?: readonly ImageCropAspectOption[]
  /** `round` dims the corners a round picture will not show; the crop is still a rectangle. Default `rect`. */
  shape?: "rect" | "round"
  /** The smallest crop width in source pixels; a locked crop stops zooming here. */
  minWidth?: number
  /** The smallest crop height in source pixels. */
  minHeight?: number
  /** Show number fields for the crop's position and size: the way to place it with one pointer press at a time. Default true. */
  fields?: boolean
  disabled?: boolean
  /** Shown in the frame until there is an image. */
  placeholder?: ReactNode
  /** Content over the frame, such as a drop hint; the frame takes a dashed outline while it shows. */
  overlay?: ReactNode
  /** Receives the cropper's commands. */
  actionsRef?: Ref<ImageCropperActions>
  /** Formatting and wording locale; defaults to the nearest LocaleProvider. */
  locale?: string
  /** Wording overrides. */
  labels?: Partial<typeof imageCropperMessages.defaults>
  /** Layout only. */
  className?: string
}

/** What the active stage offers the cropper around it. */
interface StageHandle extends ImageCropperActions {
  /** Apply typed numbers: the stage keeps the crop's shape and keeps it inside the image. */
  edit: (change: Partial<ImageCropRect>) => void
  /** Show a zoom from the slider, reporting it when `done`. */
  zoomTo: (zoom: number, done: boolean) => void
}

/** Carries the zoom from the locked stage to the slider, which alone re-renders to follow it. */
interface ZoomLink {
  zoom: number
  show: ((zoom: number) => void) | null
}

interface StageProps {
  src: string
  image: ImageSize
  crop: ImageCropRect | null
  onCommit: (crop: ImageCropRect) => void
  disabled: boolean
  label: string
  roleDescription: string
  describedBy: string
  minWidth?: number
  minHeight?: number
  handle: RefObject<StageHandle | null>
}

const sameRect = (a: ImageCropRect | null, b: ImageCropRect | null) => a === b || Boolean(a && b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height)

/** The natural size of `src`, when the host did not pass one. */
function useMeasuredSize(src: string | undefined) {
  const [measured, setMeasured] = useState<{ src: string; size: ImageSize } | null>(null)
  useEffect(() => {
    if (!src) return
    let live = true
    const probe = new Image()
    probe.src = src
    probe.decode().then(
      () => {
        if (live && probe.naturalWidth && probe.naturalHeight) setMeasured({ src, size: { width: probe.naturalWidth, height: probe.naturalHeight } })
      },
      () => undefined,
    )
    return () => {
      live = false
    }
  }, [src])
  return measured && measured.src === src ? measured.size : undefined
}

/**
 * Crop an image to a fixed shape or freely. With a locked aspect the image moves under a frame
 * of that shape (drag, pinch, wheel or keys; the slider zooms). With `"free"` a
 * box with handles sits over the whole image. `onValueChange` reports the crop in source
 * pixels once per gesture. Pair with `cropToBlob` to make the file, or use `ImageCropDialog`
 * for picking, checking and saving; the application uploads the result.
 */
export function ImageCropper({
  src,
  image: imageProp,
  value,
  defaultValue,
  onValueChange,
  aspect: aspectProp,
  defaultAspect = "free",
  onAspectChange,
  aspects,
  shape = "rect",
  minWidth,
  minHeight,
  fields = true,
  disabled = false,
  placeholder,
  overlay,
  actionsRef,
  locale: localeProp,
  labels,
  className,
}: ImageCropperProps) {
  const t = useMessages(imageCropperMessages, { labels, locale: localeProp })
  const instructionsId = useId()
  const measured = useMeasuredSize(imageProp ? undefined : src)
  const image = src ? (imageProp ?? measured) : undefined
  const [aspect, setAspect] = useControllable(aspectProp, defaultAspect, onAspectChange)
  const [crop, setCrop] = useControllable<ImageCropRect | null>(value, defaultValue ?? null, (next) => next && onValueChange?.(next))
  const stage = useRef<StageHandle | null>(null)
  const zoomLink = useRef<ZoomLink>({ zoom: 1, show: null })
  const free = aspect === "free"
  const shapeRatio = free ? (image ? image.width / image.height : 1) : aspect

  useImperativeHandle(actionsRef, () => ({ crop: () => stage.current?.crop() ?? null, fit: () => stage.current?.fit() }), [])

  // An image that goes away takes its crop with it, so the next one starts fitted.
  const hadImage = useRef(false)
  useEffect(() => {
    if (image) hadImage.current = true
    else if (hadImage.current && value === undefined) {
      hadImage.current = false
      setCrop(null)
    }
  }, [image, value, setCrop])

  const stageProps = { src: src ?? "", image: image!, crop, onCommit: setCrop, disabled, label: t.cropLabel, roleDescription: t.cropRole, describedBy: instructionsId, minWidth, minHeight, handle: stage }
  return (
    <div className={cx("fa-image-cropper", className)}>
      {aspects ? (
        <Segmented
          size="sm"
          aria-label={t.aspect}
          options={aspects.map((option) => ({ value: String(option.value), label: option.label }))}
          value={String(aspect)}
          onValueChange={(next) => setAspect(next === "free" ? "free" : Number(next))}
          disabled={disabled}
        />
      ) : null}
      <div
        className="fa-image-cropper-frame"
        data-cropping={image ? "" : undefined}
        data-free={free ? "" : undefined}
        data-overlay={overlay ? "" : undefined}
        style={{ "--_aspect": shapeRatio, "--_fit": Math.min(1, shapeRatio) } as CSSProperties}
      >
        {!image ? (
          (placeholder ?? (
            <span className="fa-image-cropper-empty">
              <IconImage aria-hidden />
            </span>
          ))
        ) : free ? (
          <FreeStage {...stageProps} />
        ) : (
          <LockedStage {...stageProps} aspect={aspect} shape={shape} zoomLink={zoomLink} />
        )}
        {overlay ? (
          <span className="fa-image-cropper-overlay" aria-hidden>
            {overlay}
          </span>
        ) : null}
      </div>
      <span id={instructionsId} hidden>
        {free ? t.freeInstructions : t.cropInstructions}
      </span>
      {free ? null : <CropZoom image={image} aspect={aspect} minWidth={minWidth} minHeight={minHeight} disabled={disabled} label={t.zoom} locale={localeProp} stage={stage} link={zoomLink} />}
      {fields ? <CropFields image={image} aspect={aspect} crop={crop} disabled={disabled} minWidth={minWidth} minHeight={minHeight} stage={stage} labels={t} locale={localeProp} /> : null}
    </div>
  )
}

/* ── Locked: the image moves under the frame ────────────────────────────────── */

/**
 * The photo under the mask. The crop fills the frame, so the image is placed in percentages of
 * the frame and never measured. Geometry is physical: a photo does not mirror in right-to-left
 * languages, so the arrow keys move it the way they point. A drag writes the image's style and
 * reports once on release; the zoom slider follows a pinch or the wheel, one state update a frame
 * in the slider alone.
 */
function LockedStage({ src, image, aspect, shape, crop, onCommit, disabled, label, roleDescription, describedBy, minWidth, minHeight, handle, zoomLink }: StageProps & { aspect: number; shape: "rect" | "round"; zoomLink: RefObject<ZoomLink> }) {
  const area = useRef<HTMLDivElement>(null)
  const picture = useRef<HTMLImageElement>(null)
  const maxZoom = maxCropZoom(image, aspect, { minWidth, minHeight })
  const [view, setView] = useState<ImageCropView>(() => (crop ? clampCropView(viewForCrop(crop, image, aspect), image, aspect, maxZoom) : fitCropView(image)))
  const latest = useRef(view)
  const live = useRef({ image, aspect, maxZoom, onCommit })
  live.current = { image, aspect, maxZoom, onCommit }
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ zoom: number; distance: number } | null>(null)
  const moved = useRef(false)
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined)
  const seeded = useRef<string | null>(null)
  const reported = useRef<ImageCropRect | null>(crop)

  const paint = (next: ImageCropView) => {
    latest.current = next
    const element = picture.current
    if (!element) return
    Object.assign(element.style, placement(next, live.current.image, live.current.aspect))
    zoomLink.current.zoom = next.zoom
    zoomLink.current.show?.(next.zoom)
  }
  const report = () => {
    const rect = cropRectFor(latest.current, live.current.image, live.current.aspect)
    reported.current = rect
    live.current.onCommit(rect)
  }
  const clamp = (next: ImageCropView) => clampCropView(next, live.current.image, live.current.aspect, live.current.maxZoom)
  /** Show a change at once and report it: keys, the slider and typed numbers. */
  const commit = (next: ImageCropView) => {
    const clamped = clamp(next)
    paint(clamped)
    setView(clamped)
    report()
  }
  const commitRef = useRef(commit)
  commitRef.current = commit
  const paintRef = useRef(paint)
  paintRef.current = paint
  const reportRef = useRef(report)
  reportRef.current = report

  // A new image or shape starts fitted; a crop passed in shows as given.
  const identity = `${src}|${aspect}|${image.width}x${image.height}`
  useIsomorphicLayoutEffect(() => {
    if (seeded.current === identity) return
    const first = seeded.current === null
    seeded.current = identity
    const next = first && crop ? clamp(viewForCrop(crop, image, aspect)) : fitCropView(image)
    paint(next)
    setView(next)
    if (!sameRect(cropRectFor(next, image, aspect), crop)) report()
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- identity stands for the image and shape
  }, [identity])

  // A crop the host set: typed numbers or a controlled value.
  useIsomorphicLayoutEffect(() => {
    if (!crop || sameRect(crop, reported.current) || sameRect(crop, cropRectFor(latest.current, image, aspect))) return
    reported.current = crop
    const next = clamp(viewForCrop(crop, image, aspect))
    paint(next)
    setView(next)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only a crop from outside moves the view
  }, [crop])

  useImperativeHandle(
    handle,
    () => ({
      crop: () => cropRectFor(latest.current, live.current.image, live.current.aspect),
      fit: () => commitRef.current(fitCropView(live.current.image)),
      zoomTo: (zoom, done) => {
        paintRef.current(clampCropView({ ...latest.current, zoom }, live.current.image, live.current.aspect, live.current.maxZoom))
        if (!done) return
        setView(latest.current)
        reportRef.current()
      },
      edit: (change) => {
        const { image: size, aspect: ratio } = live.current
        const base = largestCrop(size, ratio)
        const current = latest.current
        const zoom = change.width ? base.width / change.width : change.height ? base.height / change.height : current.zoom
        const extent = cropExtent(size, ratio, zoom)
        commitRef.current({
          zoom,
          centerX: change.x === undefined ? current.centerX : change.x + extent.width / 2,
          centerY: change.y === undefined ? current.centerY : change.y + extent.height / 2,
        })
      },
    }),
    [handle],
  )

  // Wheel and trackpad pinch zoom; a non-passive listener, so the dialog body does not scroll.
  useEffect(() => {
    const element = area.current
    if (!element || disabled) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const zoom = latest.current.zoom * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015))
      paint(clamp({ ...latest.current, zoom }))
      clearTimeout(settle.current)
      settle.current = setTimeout(() => {
        setView(latest.current)
        report()
      }, WHEEL_SETTLE_MS)
    }
    element.addEventListener("wheel", wheel, { passive: false })
    return () => {
      element.removeEventListener("wheel", wheel)
      clearTimeout(settle.current)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- paint and report read refs
  }, [disabled])

  const distance = () => {
    const [a, b] = [...pointers.current.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) pinch.current = { zoom: latest.current.zoom, distance: distance() || 1 }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const current = latest.current
    moved.current = true
    if (pointers.current.size >= 2 && pinch.current) {
      paint(clamp({ ...current, zoom: (pinch.current.zoom * distance()) / pinch.current.distance }))
      return
    }
    // Screen pixels to source pixels: the frame shows one crop width across its width.
    const scale = cropExtent(image, aspect, current.zoom).width / (area.current?.clientWidth || 1)
    paint(
      clamp({
        ...current,
        centerX: current.centerX - (event.clientX - previous.x) * scale,
        centerY: current.centerY - (event.clientY - previous.y) * scale,
      }),
    )
  }
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size > 0 || !moved.current) return
    moved.current = false
    setView(latest.current)
    report()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return
    const current = latest.current
    const extent = cropExtent(image, aspect, current.zoom)
    const share = event.shiftKey ? 0.1 : 0.02
    const across = extent.width * share
    const down = extent.height * share
    const moves: Record<string, ImageCropView> = {
      ArrowLeft: { ...current, centerX: current.centerX + across },
      ArrowRight: { ...current, centerX: current.centerX - across },
      ArrowUp: { ...current, centerY: current.centerY + down },
      ArrowDown: { ...current, centerY: current.centerY - down },
      "+": { ...current, zoom: current.zoom * ZOOM_STEP },
      "=": { ...current, zoom: current.zoom * ZOOM_STEP },
      "-": { ...current, zoom: current.zoom / ZOOM_STEP },
      "_": { ...current, zoom: current.zoom / ZOOM_STEP },
      "0": fitCropView(image),
    }
    const next = moves[event.key]
    if (!next) return
    event.preventDefault()
    commit(next)
  }

  return (
    <div
      ref={area}
      role="application"
      aria-roledescription={roleDescription}
      aria-label={label}
      aria-describedby={describedBy}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className="fa-image-cropper-area"
      data-base-ui-swipe-ignore=""
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      <img ref={picture} className="fa-image-cropper-image" src={src} alt="" draggable={false} style={placement(view, image, aspect)} />
      <span className="fa-image-cropper-mask" data-shape={shape} aria-hidden />
    </div>
  )
}

/** The image's box in percentages of the frame. */
function placement(view: ImageCropView, image: ImageSize, aspect: number) {
  const extent = cropExtent(image, aspect, view.zoom)
  return {
    width: `${(image.width / extent.width) * 100}%`,
    height: `${(image.height / extent.height) * 100}%`,
    left: `${((extent.width / 2 - view.centerX) / extent.width) * 100}%`, // logical:allow photo geometry does not mirror
    top: `${((extent.height / 2 - view.centerY) / extent.height) * 100}%`,
  }
}

interface CropZoomProps {
  image: ImageSize | undefined
  aspect: number
  minWidth?: number
  minHeight?: number
  disabled: boolean
  label: string
  locale?: string
  stage: RefObject<StageHandle | null>
  link: RefObject<ZoomLink>
}

/** The zoom slider, as wide as the frame. It holds the zoom itself, so following a pinch re-renders nothing else. */
function CropZoom({ image, aspect, minWidth, minHeight, disabled, label, locale: localeProp, stage, link }: CropZoomProps) {
  const locale = useLocale(localeProp)
  const percent = numberFormat(locale, { style: "percent", maximumFractionDigits: 0 })
  const maxZoom = image ? maxCropZoom(image, aspect, { minWidth, minHeight }) : 1
  const [zoom, setZoom] = useState(1)
  useIsomorphicLayoutEffect(() => {
    const current = link.current
    let frame = 0
    current.show = (next) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setZoom(next))
    }
    setZoom(current.zoom)
    return () => {
      cancelAnimationFrame(frame)
      current.show = null
    }
  }, [link])
  return (
    <div className="fa-image-cropper-zoom" data-base-ui-swipe-ignore="">
      <IconZoomOut aria-hidden />
      <Slider
        aria-label={label}
        min={1}
        max={maxZoom > 1 ? maxZoom : 2}
        step={0.01}
        value={image ? zoom : 1}
        onValueChange={(next) => stage.current?.zoomTo(next as number, false)}
        onValueCommitted={(next) => stage.current?.zoomTo(next as number, true)}
        format={(next) => percent.format(next)}
        disabled={!image || maxZoom <= 1 || disabled}
        bubble="never"
        size="sm"
      />
      <IconZoomIn aria-hidden />
    </div>
  )
}

/* ── Free: a box with handles over the whole image ──────────────────────────── */

const HANDLES: readonly ImageCropHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"]

/**
 * The whole image with a box over it. A drag writes the box's custom properties and reports once
 * on release (R18.5). Geometry is physical, as in the locked stage.
 */
function FreeStage({ src, image, crop, onCommit, disabled, label, roleDescription, describedBy, minWidth, minHeight, handle }: StageProps) {
  const area = useRef<HTMLDivElement>(null)
  const limits = { minWidth, minHeight }
  const [box, setBox] = useState<ImageCropRect>(() => clampCropRect(crop ?? wholeImage(image), image, limits))
  const latest = useRef(box)
  const live = useRef({ image, limits, onCommit })
  live.current = { image, limits, onCommit }
  const gesture = useRef<{ id: number; x: number; y: number; rect: ImageCropRect; handle?: ImageCropHandle; moved: boolean } | null>(null)
  const seeded = useRef<string | null>(null)
  const reported = useRef<ImageCropRect | null>(crop)

  const paint = (next: ImageCropRect) => {
    latest.current = next
    const element = area.current
    if (!element) return
    for (const [name, value] of Object.entries(boxVars(next, live.current.image))) element.style.setProperty(name, value)
  }
  const commit = (next: ImageCropRect) => {
    const rect = roundCropRect(clampCropRect(next, live.current.image, live.current.limits), live.current.image)
    paint(rect)
    setBox(rect)
    reported.current = rect
    live.current.onCommit(rect)
  }
  const commitRef = useRef(commit)
  commitRef.current = commit

  const identity = `${src}|${image.width}x${image.height}`
  useIsomorphicLayoutEffect(() => {
    if (seeded.current === identity) return
    const first = seeded.current === null
    seeded.current = identity
    const next = first && crop ? crop : wholeImage(image)
    if (first && crop && sameRect(roundCropRect(clampCropRect(crop, image, limits), image), crop)) return
    commit(next)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- identity stands for the image
  }, [identity])

  useIsomorphicLayoutEffect(() => {
    if (!crop || sameRect(crop, reported.current) || sameRect(crop, latest.current)) return
    reported.current = crop
    const next = clampCropRect(crop, image, limits)
    paint(next)
    setBox(next)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only a crop from outside moves the box
  }, [crop])

  useImperativeHandle(
    handle,
    () => ({
      crop: () => roundCropRect(latest.current, live.current.image),
      fit: () => commitRef.current(wholeImage(live.current.image)),
      zoomTo: () => undefined,
      edit: (change) => commitRef.current({ ...latest.current, ...change }),
    }),
    [handle],
  )

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || gesture.current || (event.pointerType === "mouse" && event.button !== 0)) return
    const target = event.target as HTMLElement
    const grip = target.closest<HTMLElement>("[data-handle]")?.dataset.handle as ImageCropHandle | undefined
    if (!grip && !target.closest(".fa-image-cropper-box")) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rect: latest.current, handle: grip, moved: false }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (!current || current.id !== event.pointerId) return
    current.moved = true
    // Screen pixels to source pixels: the frame shows the whole image.
    const scale = image.width / (area.current?.clientWidth || 1)
    const dx = (event.clientX - current.x) * scale
    const dy = (event.clientY - current.y) * scale
    paint(current.handle ? resizeCropRect(current.rect, current.handle, dx, dy, image, limits) : clampCropRect({ ...current.rect, x: current.rect.x + dx, y: current.rect.y + dy }, image, limits))
  }
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (!current || current.id !== event.pointerId) return
    gesture.current = null
    if (current.moved) commit(latest.current)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || event.ctrlKey || event.metaKey) return
    if (event.key === "0") {
      event.preventDefault()
      commit(wholeImage(image))
      return
    }
    const steps: Record<string, [number, number, ImageCropHandle]> = { ArrowLeft: [-1, 0, "e"], ArrowRight: [1, 0, "e"], ArrowUp: [0, -1, "s"], ArrowDown: [0, 1, "s"] }
    const step = steps[event.key]
    if (!step) return
    event.preventDefault()
    const [across, down, edge] = step
    const distance = Math.max(1, Math.round(Math.min(image.width, image.height) * (event.shiftKey ? 0.1 : 0.02)))
    const current = latest.current
    commit(event.altKey ? resizeCropRect(current, edge, across * distance, down * distance, image, limits) : { ...current, x: current.x + across * distance, y: current.y + down * distance })
  }

  return (
    <div
      ref={area}
      role="application"
      aria-roledescription={roleDescription}
      aria-label={label}
      aria-describedby={describedBy}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className="fa-image-cropper-area"
      data-base-ui-swipe-ignore=""
      style={boxVars(box, image) as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      <span className="fa-image-cropper-clip">
        <img className="fa-image-cropper-whole" src={src} alt="" draggable={false} />
        <span className="fa-image-cropper-shade" aria-hidden />
      </span>
      <div className="fa-image-cropper-box">
        {HANDLES.map((grip) => (
          <span key={grip} className="fa-image-cropper-handle" data-handle={grip} aria-hidden />
        ))}
      </div>
    </div>
  )
}

/** The box as custom properties, in percentages of the frame. */
function boxVars(rect: ImageCropRect, image: ImageSize) {
  return {
    "--_box-x": `${(rect.x / image.width) * 100}%`,
    "--_box-y": `${(rect.y / image.height) * 100}%`,
    "--_box-width": `${(rect.width / image.width) * 100}%`,
    "--_box-height": `${(rect.height / image.height) * 100}%`,
  }
}

/* ── Typed numbers ──────────────────────────────────────────────────────────── */

interface CropFieldsProps {
  image: ImageSize | undefined
  aspect: ImageCropAspect
  crop: ImageCropRect | null
  disabled: boolean
  minWidth?: number
  minHeight?: number
  stage: RefObject<StageHandle | null>
  labels: typeof imageCropperMessages.defaults
  locale?: string
}

/** The crop as four numbers. A number outside its range waits, so typing "128" passes through "1"; leaving the field clamps it. */
function CropFields({ image, aspect, crop, disabled, minWidth = 1, minHeight = 1, stage, labels, locale }: CropFieldsProps) {
  const off = disabled || !image || !crop
  const size = image ?? { width: 1, height: 1 }
  const rect = crop ?? { x: 0, y: 0, width: 1, height: 1 }
  const locked = aspect === "free" ? null : largestCrop(size, aspect)
  const zoom = locked ? maxCropZoom(size, aspect as number, { minWidth, minHeight }) : 1
  const ranges: Array<{ key: keyof ImageCropRect; label: string; min: number; max: number }> = [
    { key: "x", label: labels.left, min: 0, max: size.width - rect.width },
    { key: "y", label: labels.top, min: 0, max: size.height - rect.height },
    { key: "width", label: labels.width, min: locked ? Math.ceil(locked.width / zoom) : Math.min(minWidth, size.width), max: locked ? Math.floor(locked.width) : size.width - rect.x },
    { key: "height", label: labels.height, min: locked ? Math.ceil(locked.height / zoom) : Math.min(minHeight, size.height), max: locked ? Math.floor(locked.height) : size.height - rect.y },
  ]
  return (
    <div className="fa-image-cropper-fields">
      {ranges.map(({ key, label, min, max }) => (
        <Field key={key} label={label} message="auto">
          <NumberField
            size="sm"
            locale={locale}
            value={crop ? crop[key] : null}
            min={min}
            max={max}
            disabled={off}
            onValueChange={(next) => {
              if (next !== null && next >= min && next <= max && next !== crop?.[key]) stage.current?.edit({ [key]: next })
            }}
          />
        </Field>
      ))}
    </div>
  )
}
