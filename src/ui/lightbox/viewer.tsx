import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent, type ReactNode } from "react"
import { cameraTransform, containCamera, usePanZoom, type PanZoomCamera } from "../../hooks/use-pan-zoom.js"
import {
  IconChevronLeft,
  IconChevronRight,
  IconFitWidth,
  IconFlipHorizontal,
  IconFlipVertical,
  IconFullscreen,
  IconFullscreenExit,
  IconImage,
  IconImageOff,
  IconInfo,
  IconMoreHorizontal,
  IconPause,
  IconPlay,
  IconRefresh,
  IconRotateCcw,
  IconRotateCw,
  IconZoomIn,
  IconZoomOut,
} from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { isRtl, readingKey } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { formatPercent, numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { observeElementSize } from "../../lib/resize-observer.js"
import { useControllable } from "../../lib/use-controllable.js"
import { fullscreenSupported, useWindowFullscreen } from "../../windows/fullscreen.js"
import { Button } from "../button/index.js"
import { Dialog } from "../dialog/index.js"
import { shortcutAllowed } from "../kbd/index.js"
import { Menu } from "../menu/index.js"
import { VisuallyHidden } from "../visually-hidden/index.js"
import { fitScale, nextStop, turnedBox, turnView, UNKNOWN_SHAPE, UNTURNED, viewTransform, zoomStops, type PictureBox, type PictureView } from "./geometry.js"
import { lightboxMessages } from "./messages.js"
import { ThumbnailStrip } from "./thumbnails.js"
import type { ImageViewerOptions, LightboxImage, LightboxTool } from "./types.js"
import { useSlideshow } from "./use-slideshow.js"

const ALL_TOOLS: readonly LightboxTool[] = ["rotate", "flip", "fullscreen", "slideshow"]
/** How long full screen waits without input before its chrome fades. */
const CHROME_IDLE_MS = 3000
/** How far a press may travel and still be a tap, and how close two taps make a double. */
const TAP_TRAVEL = 8
const DOUBLE_TAP_MS = 320
const DOUBLE_TAP_REACH = 24
/** A scale this close to a stop is that stop. */
const SAME_SCALE = 0.002

const noSubscription = () => () => {}

/** Elements of a host's item that keep their own pointer and keys. */
const isControl = (target: EventTarget) => target instanceof Element && target.closest("button, a, input, select, textarea, [role='slider'], .fa-lightbox-custom") !== null

/** A state of one picture: reset when another one comes up, so each starts fitted and upright. */
interface Shown {
  key: string
  view: PictureView
  status: "loading" | "loaded" | "error"
  /** The size read from a picture that did not state one. */
  natural: PictureBox | null
  /** Bumped by Retry, which asks for a new image element. */
  attempt: number
}
const freshPicture = (key: string): Shown => ({ key, view: UNTURNED, status: "loading", natural: null, attempt: 0 })

interface Readout {
  fitted: boolean
  actual: boolean
  largest: boolean
  /** Percent of the fitted size, which is what `zoomSteps` count in. */
  percent: number
}
const FITTED: Readout = { fitted: true, actual: false, largest: false, percent: 100 }

interface Tool {
  id: string
  label: string
  icon?: ReactNode
  /** A short text face for a tool with no glyph. */
  face?: string
  shortcut?: string
  disabledReason?: string | undefined
  run: () => void
  "aria-expanded"?: boolean
}

interface LightboxViewerProps extends ImageViewerOptions {
  index: number
  onIndexChange: (index: number) => void
  /** `dialog` sits in a Dialog.Popup and hears keys anywhere; `inline` sits in the page and hears them from inside itself. */
  frame: "dialog" | "inline"
  className?: string | undefined
  label?: string | undefined
}

/** The viewer behind Lightbox and ImageViewer. Internal; `images[index]` must exist. */
export function LightboxViewer({
  frame,
  images,
  index,
  onIndexChange,
  thumbnails = true,
  actions,
  zoomSteps = [1.5, 2, 3],
  maxZoom = 4,
  tools = ALL_TOOLS,
  slideshowInterval = 5000,
  autoHideChrome = true,
  renderInfo,
  infoOpen,
  defaultInfoOpen = false,
  onInfoOpenChange,
  locale: localeProp,
  labels,
  className,
  label,
}: LightboxViewerProps) {
  const t = useMessages(lightboxMessages, { labels, locale: localeProp })
  const locale = useLocale(localeProp)
  const image = images[index]!
  const pictureKey = image.id ?? image.src
  const many = images.length > 1

  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement | null>(null)
  const extent = useRef<HTMLDivElement>(null)
  const plane = useRef<HTMLDivElement>(null)
  const picture = useRef<HTMLImageElement>(null)

  // One picture's state.
  const [stored, setStored] = useState(() => freshPicture(pictureKey))
  const held = stored.key === pictureKey ? stored : freshPicture(pictureKey)
  const shown = image.pending ? { ...held, status: "loading" as const } : held
  const patch = useCallback((change: Partial<Shown>) => setStored((previous) => ({ ...(previous.key === pictureKey ? previous : freshPicture(pictureKey)), ...change })), [pictureKey])
  const size = image.width && image.height ? { width: image.width, height: image.height } : (shown.natural ?? UNKNOWN_SHAPE)
  const content = turnedBox(size, shown.view.turns)
  const custom = image.content !== undefined
  const viewable = !custom && shown.status !== "error"

  // The camera: `pinned` keeps a fitted picture fitted as the stage changes size.
  const contentNow = useRef(content)
  contentNow.current = content
  const pinned = useRef(true)
  const stepping = useRef<number | null>(null)
  const stageBox = () => ({ width: stage.current?.clientWidth ?? 0, height: stage.current?.clientHeight ?? 0 })
  const fitNow = () => fitScale(contentNow.current, stageBox())
  const topNow = () => Math.max(fitNow(), maxZoom)
  const [readout, setReadout] = useState(FITTED)
  const zoomed = !readout.fitted

  const paint = (next: PanZoomCamera) => {
    if (plane.current) plane.current.style.transform = cameraTransform(next)
  }
  // The stage stays a scroller over the zoomed picture, as it was before the camera: its
  // scroll position reports the camera, once a gesture settles, and moves nothing.
  const report = (next: PanZoomCamera) => {
    const box = stage.current
    if (!box || !extent.current) return
    const width = contentNow.current.width * next.k
    const height = contentNow.current.height * next.k
    extent.current.style.width = `${width}px`
    extent.current.style.height = `${height}px`
    box.scrollTop = -next.y
    box.scrollLeft = isRtl(box) ? -(Math.max(0, width - box.clientWidth) + next.x) : -next.x
    plane.current?.style.setProperty("--_k", String(next.k))
  }
  const commit = (next: PanZoomCamera) => {
    const fit = fitNow()
    const fitted = Math.abs(next.k - fit) <= fit * SAME_SCALE
    pinned.current = fitted
    stepping.current = null
    report(next)
    const value: Readout = {
      fitted,
      actual: !fitted && Math.abs(next.k - 1) <= SAME_SCALE,
      largest: next.k >= topNow() * (1 - SAME_SCALE),
      percent: Math.round((next.k / fit) * 100),
    }
    setReadout((previous) => (previous.fitted === value.fitted && previous.actual === value.actual && previous.largest === value.largest && previous.percent === value.percent ? previous : value))
  }
  const camera = usePanZoom({
    onFrame: paint,
    onCommit: commit,
    onGestureStart: () => stopSlideshow(),
    minZoom: fitNow,
    maxZoom: topNow,
    constrain: (next) => containCamera(next, contentNow.current, stageBox()),
    // A fitted picture leaves one mouse or pen press to the swipe; touch stays tracked for a pinch.
    canPan: (event) => !isControl(event.target!) && (!pinned.current || event.pointerType === "touch"),
    arrows: zoomed,
    disabled: !viewable,
  })
  const attachStage = useCallback(
    (element: HTMLDivElement | null) => {
      stage.current = element
      camera.ref(element)
    },
    [camera]
  )

  // The next picture or turn starts from the right place in the frame it first paints.
  const lastPicture = useRef(pictureKey)
  const lastContent = useRef(content)
  useLayoutEffect(() => {
    if (lastPicture.current !== pictureKey) {
      lastPicture.current = pictureKey
      pinned.current = true
    }
    const now = camera.camera()
    const { width, height } = lastContent.current
    lastContent.current = contentNow.current
    camera.moveTo(pinned.current ? { k: fitNow(), x: 0, y: 0 } : { k: now.k, x: now.x + ((width - contentNow.current.width) * now.k) / 2, y: now.y + ((height - contentNow.current.height) * now.k) / 2 })
    paint(camera.camera())
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the camera follows the picture and its turned shape
  }, [pictureKey, content.width, content.height])

  useEffect(() => {
    const element = stage.current
    if (!element) return
    return observeElementSize(element, () => {
      const now = camera.camera()
      camera.moveTo({ ...now, k: pinned.current ? fitNow() : Math.min(topNow(), Math.max(fitNow(), now.k)) })
    })
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- reads the limits at each delivery
  }, [camera])

  const zoomTo = (k: number, point?: { x: number; y: number }) => camera.zoomBy(k / camera.camera().k, point, { animate: true })
  const fitPicture = () => camera.moveTo({ k: fitNow(), x: 0, y: 0 }, { animate: true })
  const stepZoom = (direction: 1 | -1) => {
    const fit = fitNow()
    const from = pinned.current ? fit : (stepping.current ?? camera.camera().k)
    const target = nextStop(zoomStops(fit, zoomSteps, topNow()), from, direction)
    stepping.current = target
    zoomTo(target)
  }
  const toggleZoom = (point?: { x: number; y: number }) => {
    if (!pinned.current) return fitPicture()
    const fit = fitNow()
    zoomTo(fit < 1 ? Math.min(1, topNow()) : nextStop(zoomStops(fit, zoomSteps, topNow()), fit, 1), point)
  }

  // Announcements: one region, always mounted (R20.9).
  const [announcement, setAnnouncement] = useState("")
  const stoppedByMove = useRef(false)

  const go = useCallback((delta: number) => onIndexChange((index + delta + images.length) % images.length), [index, images.length, onIndexChange])
  const [playing, setPlaying] = useSlideshow({ interval: slideshowInterval, ready: shown.status !== "loading" && !custom, step: index, advance: () => go(1) })
  const stopSlideshow = () => {
    if (!playing) return
    setPlaying(false)
    stoppedByMove.current = true
    setAnnouncement(t.slideshowStopped)
  }
  useEffect(() => {
    if (playing && custom) stopSlideshow()
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- a host's media has its own running time
  }, [playing, custom])
  const toggleSlideshow = () => {
    if (playing) return stopSlideshow()
    setPlaying(true)
    setAnnouncement(t.slideshowStarted)
  }

  const announced = useRef(index)
  useEffect(() => {
    const stopped = stoppedByMove.current
    stoppedByMove.current = false
    if (announced.current === index) return
    announced.current = index
    // Nothing ticks through the live region while a slideshow runs.
    if (playing) return
    const details = { index: index + 1, total: images.length, alt: image.alt }
    setAnnouncement(stopped ? t.slideshowStoppedOn(details) : t.shown(details))
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- announce on a change of picture only
  }, [index, playing])

  // Loading: a cached picture can finish before React attaches its handlers.
  const onLoaded = (element: HTMLImageElement) => patch({ status: "loaded", natural: element.naturalWidth > 0 ? { width: element.naturalWidth, height: element.naturalHeight } : null })
  const onFailed = () => {
    patch({ status: "error" })
    setAnnouncement(t.loadFailedNamed(image.alt))
  }
  useLayoutEffect(() => {
    const element = picture.current
    if (!element?.complete) return
    if (element.naturalWidth > 0) return onLoaded(element)
    // No size either way: a broken picture, or an SVG that states none.
    void element.decode().then(
      () => picture.current === element && onLoaded(element),
      () => picture.current === element && onFailed()
    )
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once per image element
  }, [pictureKey, shown.attempt])

  // The neighbours load ahead, so a move or a slideshow finds them ready.
  const neighbours = useRef<HTMLImageElement[]>([])
  const after = images[(index + 1) % images.length]
  const before = images[(index - 1 + images.length) % images.length]
  useEffect(() => {
    neighbours.current = [after, before]
      .filter((item): item is LightboxImage => Boolean(item) && item !== image && item?.content === undefined)
      .map((item) => {
        const element = new window.Image()
        element.decoding = "async"
        element.src = item.src
        return element
      })
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- by their sources, which is what loads
  }, [after?.src, before?.src, image.src])

  // Rotate and flip change the view, never the picture.
  const turn = (direction: 1 | -1) => patch({ view: turnView(shown.view, direction) })
  const flip = (axis: "flipX" | "flipY") => patch({ view: { ...shown.view, [axis]: !shown.view[axis] } })

  // Full screen is on this element, so popups portal here (popupContainer).
  const fullscreen = useWindowFullscreen(root)
  const canFullscreen = useSyncExternalStore(noSubscription, fullscreenSupported, () => false) && tools.includes("fullscreen")

  const [chromeIdle, setChromeIdle] = useState(false)
  useEffect(() => {
    const element = root.current
    if (!element || !fullscreen.fullscreen || !autoHideChrome) return
    let timer: ReturnType<typeof setTimeout>
    let idle = false
    const hide = () => {
      // Not under the pointer, keyboard focus, an open menu or the details panel.
      if (element.querySelector(".fa-lightbox-chrome:hover, .fa-lightbox-chrome :focus-visible, .fa-lightbox-chrome [aria-expanded='true']")) return wake()
      idle = true
      setChromeIdle(true)
    }
    const wake = () => {
      clearTimeout(timer)
      timer = setTimeout(hide, CHROME_IDLE_MS)
      if (idle) {
        idle = false
        setChromeIdle(false)
      }
    }
    wake()
    const events = ["pointermove", "pointerdown", "keydown", "focusin", "wheel"] as const
    for (const name of events) element.addEventListener(name, wake, { capture: true, passive: true })
    return () => {
      clearTimeout(timer)
      setChromeIdle(false)
      for (const name of events) element.removeEventListener(name, wake, { capture: true })
    }
  }, [fullscreen.fullscreen, autoHideChrome])

  // Details.
  const [detailsOpen, setDetailsOpen] = useControllable(infoOpen, defaultInfoOpen, onInfoOpenChange)
  const details = renderInfo && detailsOpen ? renderInfo(image, index) : null

  const unavailable = viewable ? undefined : t.unavailable
  const move = (delta: number) => {
    stopSlideshow()
    go(delta)
  }
  const select = useCallback(
    (next: number) => {
      stopSlideshow()
      onIndexChange(next)
    },
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- stable while the slideshow's state is
    [onIndexChange, playing]
  )
  /** A viewing tool stops the slideshow, like any other interaction. */
  const viewing = (run: () => void) => () => {
    if (!viewable) return
    stopSlideshow()
    run()
  }
  const zoomIn = viewing(() => stepZoom(1))
  const zoomOut = viewing(() => stepZoom(-1))
  const fit = viewing(fitPicture)
  const actualSize = viewing(() => zoomTo(Math.min(1, topNow())))
  const rotateRight = viewing(() => turn(1))
  const rotateLeft = viewing(() => turn(-1))

  useEffect(() => {
    const listener = frame === "dialog" ? window : root.current
    const onKeyDown = (event: Event) => {
      const key = event as globalThis.KeyboardEvent
      if (key.defaultPrevented || key.metaKey || key.ctrlKey || key.altKey) return
      const target = key.target
      if (target instanceof Element) {
        if (target.closest("input, textarea, [contenteditable='true'], .fa-lightbox-custom")) return
        // A menu, or a dialog opened from this one, has the keys to itself.
        const popup = target.closest("[role='menu'], [role='listbox'], [role='dialog'], [role='alertdialog']")
        if (popup && root.current && !popup.contains(root.current)) return
      }
      // A zoomed picture that overflows sideways is moved with ← →, from the stage or inside it.
      const box = stage.current
      const wide = camera.camera().k * contentNow.current.width > (box?.clientWidth ?? 0)
      if (zoomed && wide && box && target instanceof Node && box.contains(target) && (key.key === "ArrowLeft" || key.key === "ArrowRight")) {
        stopSlideshow()
        return
      }
      // In a right-to-left page → goes back, as the chevrons point.
      const reading = box ? readingKey(key.key, box) : key.key
      if (reading === "ArrowRight" && many) move(1)
      else if (reading === "ArrowLeft" && many) move(-1)
      else if (key.key === "+" || key.key === "=") zoomIn()
      else if (key.key === "-" || key.key === "_") zoomOut()
      else if (key.key === "0") fit()
      else if (key.key === "1" && shortcutAllowed("1")) actualSize()
      else if (key.key.toLowerCase() === "r" && tools.includes("rotate") && shortcutAllowed("r")) (key.shiftKey ? rotateLeft : rotateRight)()
      else if (key.key.toLowerCase() === "f" && !key.shiftKey && canFullscreen && shortcutAllowed("f")) fullscreen.toggle()
      else return
      key.preventDefault()
    }
    listener?.addEventListener("keydown", onKeyDown, true)
    return () => listener?.removeEventListener("keydown", onKeyDown, true)
  })

  // Fitted: a horizontal swipe changes picture. Any time: a double press toggles fit and actual size.
  const press = useRef<{ id: number; x: number; y: number; pinch: boolean } | null>(null)
  const lastTap = useRef<{ x: number; y: number; time: number } | null>(null)
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isControl(event.target)) return
    stopSlideshow()
    if (press.current) press.current.pinch = true
    else press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, pinch: false }
  }
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = press.current
    if (!start || start.id !== event.pointerId) return
    press.current = null
    if (start.pinch) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.hypot(dx, dy) <= TAP_TRAVEL) {
      const tap = lastTap.current
      const double = tap !== null && event.timeStamp - tap.time < DOUBLE_TAP_MS && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < DOUBLE_TAP_REACH
      lastTap.current = double ? null : { x: event.clientX, y: event.clientY, time: event.timeStamp }
      if (double && viewable) {
        const rect = stage.current!.getBoundingClientRect()
        toggleZoom({ x: event.clientX - rect.left, y: event.clientY - rect.top })
      }
      return
    }
    if (!pinned.current || !many || Math.abs(dx) <= 48 || Math.abs(dx) <= Math.abs(dy) * 1.5) return
    // A swipe towards the reading start brings the next picture in.
    go((isRtl(stage.current!) ? dx > 0 : dx < 0) ? 1 : -1)
  }

  const secondary: Tool[] = [
    { id: "fit", label: t.fit, icon: <IconFitWidth />, shortcut: "0", disabledReason: unavailable, run: fit },
    { id: "actual", label: t.actualSize, face: t.actualShort, shortcut: "1", disabledReason: unavailable, run: actualSize },
    ...(tools.includes("rotate")
      ? [
          { id: "rotate-left", label: t.rotateLeft, icon: <IconRotateCcw />, shortcut: "shift+r", disabledReason: unavailable, run: rotateLeft },
          { id: "rotate-right", label: t.rotateRight, icon: <IconRotateCw />, shortcut: "r", disabledReason: unavailable, run: rotateRight },
        ]
      : []),
    ...(tools.includes("flip")
      ? [
          { id: "flip-x", label: t.flipHorizontal, icon: <IconFlipHorizontal />, disabledReason: unavailable, run: viewing(() => flip("flipX")) },
          { id: "flip-y", label: t.flipVertical, icon: <IconFlipVertical />, disabledReason: unavailable, run: viewing(() => flip("flipY")) },
        ]
      : []),
    ...(tools.includes("slideshow") && many ? [{ id: "slideshow", label: playing ? t.stopSlideshow : t.startSlideshow, icon: playing ? <IconPause /> : <IconPlay />, run: toggleSlideshow }] : []),
    ...(canFullscreen
      ? [{ id: "fullscreen", label: fullscreen.fullscreen ? t.exitFullScreen : t.fullScreen, icon: fullscreen.fullscreen ? <IconFullscreenExit /> : <IconFullscreen />, shortcut: "f", run: fullscreen.toggle }]
      : []),
    ...(renderInfo ? [{ id: "details", label: t.details, icon: <IconInfo />, "aria-expanded": detailsOpen, run: () => setDetailsOpen(!detailsOpen) }] : []),
  ]

  const dimensions = image.width && image.height ? `${numberFormat(locale).format(image.width)} × ${numberFormat(locale).format(image.height)}` : undefined
  const subtitle = [many ? t.position(index + 1, images.length) : null, dimensions].filter(Boolean).join(" · ") || undefined
  const title = image.caption ?? image.alt

  return (
    <div
      ref={root}
      className={cx("fa-lightbox-viewer", fullscreen.fullscreen && "over-imagery", className)}
      data-frame={frame}
      data-fullscreen={fullscreen.fullscreen ? "" : undefined}
      data-chrome-idle={chromeIdle ? "" : undefined}
      data-details={details === null ? undefined : ""}
      role={frame === "inline" ? "group" : undefined}
      aria-label={frame === "inline" ? (label ?? t.viewer) : undefined}
    >
      {frame === "dialog" ? (
        <Dialog.Header className="fa-lightbox-chrome" icon={<IconImage />} title={title} subtitle={subtitle} />
      ) : (
        <div className="fa-dialog-header fa-lightbox-chrome">
          <div className="fa-dialog-heading">
            <div className="fa-dialog-title">{title}</div>
            {subtitle ? <div className="fa-dialog-subtitle">{subtitle}</div> : null}
          </div>
        </div>
      )}
      <Dialog.Body flush>
        <div className="fa-lightbox-main">
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the stage pans from the keyboard when zoomed (R20.6) */}
          <div
            ref={attachStage}
            className="fa-lightbox-stage"
            data-zoomed={zoomed ? "" : undefined}
            data-custom={custom ? "" : undefined}
            // A bottom sheet keeps a vertical swipe on a fitted picture, and leaves a zoomed one alone.
            data-base-ui-swipe-ignore={zoomed ? "" : "x"}
            tabIndex={0}
            role="region"
            aria-label={image.alt}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              press.current = null
            }}
          >
            <div ref={extent} className="fa-lightbox-extent" aria-hidden />
            <div className="fa-lightbox-view">
              {custom ? (
                <div className="fa-lightbox-custom">{image.content}</div>
              ) : (
                <div ref={plane} className="fa-lightbox-plane" style={{ width: content.width, height: content.height }}>
                  <div className="fa-lightbox-picture" data-state={shown.status} style={{ width: size.width, height: size.height, transform: viewTransform(shown.view) } as CSSProperties}>
                    {shown.status === "loading" ? <span className="fa-lightbox-skeleton fa-skel fa-shimmer" aria-hidden /> : null}
                    {image.placeholder && shown.status === "loading" ? <img className="fa-lightbox-placeholder" src={image.placeholder} alt="" draggable={false} /> : null}
                    {shown.status === "error" || image.pending ? null : (
                      <img
                        key={`${pictureKey}:${shown.attempt}`}
                        ref={picture}
                        className="fa-lightbox-image"
                        src={image.src}
                        alt={image.alt}
                        width={image.width}
                        height={image.height}
                        decoding="async"
                        draggable={false}
                        onLoad={(event) => onLoaded(event.currentTarget)}
                        onError={onFailed}
                      />
                    )}
                  </div>
                </div>
              )}
              {shown.status === "error" && !custom ? (
                <div className="fa-lightbox-failed">
                  <IconImageOff />
                  <p>{t.loadFailed}</p>
                  <Button variant="secondary" size="sm" icon={<IconRefresh />} onClick={() => patch({ status: "loading", attempt: shown.attempt + 1 })}>
                    {t.retry}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          {thumbnails && many ? <ThumbnailStrip images={images} index={index} label={t.thumbnails} itemLabel={t.show} onSelect={select} /> : null}
          {details === null ? null : (
            <aside className="fa-lightbox-details fa-lightbox-chrome" aria-label={t.details}>
              {details}
            </aside>
          )}
        </div>
      </Dialog.Body>
      <Dialog.Footer
        className="fa-lightbox-chrome"
        start={
          many ? (
            <>
              <Button variant="ghost" size="sm" icon={<IconChevronLeft />} aria-label={t.previous} shortcut="left" onClick={() => move(-1)} />
              <Button variant="ghost" size="sm" icon={<IconChevronRight />} aria-label={t.next} shortcut="right" onClick={() => move(1)} />
            </>
          ) : undefined
        }
      >
        <Button variant="ghost" size="sm" icon={<IconZoomOut />} aria-label={t.zoomOut} shortcut="-" disabledReason={unavailable ?? (readout.fitted ? t.alreadyFitted : undefined)} onClick={zoomOut} />
        <span className="fa-lightbox-zoom" data-numeric aria-live="polite">
          {readout.fitted ? t.fitted : readout.actual ? t.actualShort : formatPercent(locale, readout.percent)}
        </span>
        <Button variant="ghost" size="sm" icon={<IconZoomIn />} aria-label={t.zoomIn} shortcut="+" disabledReason={unavailable ?? (readout.largest ? t.largest : undefined)} onClick={zoomIn} />
        <span className="fa-lightbox-tools">
          {secondary.map(({ id, label: name, icon, face, shortcut, disabledReason, run, "aria-expanded": expanded }) =>
            face ? (
              <Button key={id} variant="ghost" size="sm" aria-label={name} tooltip={name} shortcut={shortcut} disabledReason={disabledReason} onClick={run}>
                {face}
              </Button>
            ) : (
              <Button key={id} variant="ghost" size="sm" icon={icon} aria-label={name} shortcut={shortcut} disabledReason={disabledReason} aria-expanded={expanded} onClick={run} />
            )
          )}
        </span>
        <span className="fa-lightbox-more">
          <Menu.Root>
            <Menu.Trigger render={<Button variant="ghost" size="sm" icon={<IconMoreHorizontal />} aria-label={t.moreTools} />} />
            <Menu.Popup align="end">
              {secondary.map(({ id, label: name, icon, shortcut, disabledReason, run }) => (
                <Menu.Item key={id} icon={icon} shortcut={shortcut} disabledReason={disabledReason} onClick={run}>
                  {name}
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Root>
        </span>
        {actions ? <span className="fa-lightbox-actions">{actions(image, index)}</span> : null}
      </Dialog.Footer>
      <VisuallyHidden aria-live="polite" aria-atomic="true">
        {announcement}
      </VisuallyHidden>
    </div>
  )
}

export interface ImageViewerProps extends ImageViewerOptions {
  /** The picture shown. Pair with `onIndexChange` to control it. */
  index?: number
  /** The first picture shown when uncontrolled. Default 0. */
  defaultIndex?: number
  /** Called with the zero-based index to show, from previous/next, ← →, a swipe, a thumbnail or the slideshow (wrapping at the ends). */
  onIndexChange?: (index: number) => void
  /** Classes for the viewer's root, for layout. */
  className?: string
  /** The viewer's accessible name. Default "Image viewer". */
  "aria-label"?: string
}

/**
 * The Lightbox's viewer in the page instead of a dialog: the same pictures, zoom and pan,
 * rotate and flip, full screen, slideshow, thumbnails, details and actions. Its keys work
 * while focus is inside it. It fills a parent of definite height, and holds the Lightbox's
 * stage height in one that has none.
 */
export function ImageViewer({ index: indexProp, defaultIndex = 0, onIndexChange, className, "aria-label": label, images, ...options }: ImageViewerProps) {
  const [index, setIndex] = useControllable(indexProp, defaultIndex, onIndexChange)
  if (!images[index]) return null
  return <LightboxViewer {...options} frame="inline" images={images} index={index} onIndexChange={setIndex} className={className} label={label} />
}
