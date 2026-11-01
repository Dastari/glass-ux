import { useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from "react"
import { createPortal } from "react-dom"
import { IconClose, IconPause, IconPlay, IconRefresh, IconRestore } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { motionScale } from "../../lib/motion.js"
import { PopupLayer } from "../../lib/popup-container.js"
import { Button } from "../button/index.js"
import { Skeleton } from "../skeleton/index.js"
import { Spinner } from "../spinner/index.js"
import { TruncatedText } from "../truncated-text/index.js"
import { MediaAnnouncer } from "./announcer.js"
import { DEFAULT_RATES, MediaClock, MediaControls } from "./controls.js"
import type { MediaPlayerController, MediaPlayerOptions } from "./controller.js"
import { onMediaKeyDown } from "./keyboard.js"
import { mediaPlayerMessages } from "./messages.js"
import { ResizeHandles, WindowBar, useMiniWindow } from "./mini-window.js"
import { SeekBar } from "./seek-bar.js"
import type { MediaWindowRect } from "./state.js"
import type { MediaCaptionSize, MediaErrorKind, MediaThumbnail, MediaViewMode, MediaViewModeChangeDetails } from "./types.js"
import { useMediaPlayer, useMediaPlayerState } from "./use-media-player.js"
import { useRemotePlayback } from "./use-remote-playback.js"
import { useMediaViewMode, type MediaViewController } from "./use-view-mode.js"

/** Controls return for this long after the last pointer movement or touch. */
const CONTROLS_MS = 3000
/** The gap between two taps of a double tap. */
const DOUBLE_TAP_MS = 280
/** The distance a double tap seeks. */
const TAP_SEEK = 10

const ERROR_TEXT: Record<MediaErrorKind, keyof typeof mediaPlayerMessages.defaults> = {
  aborted: "errorAborted",
  network: "errorNetwork",
  decode: "errorDecode",
  unsupported: "errorUnsupported",
  stream: "errorStream",
}

/** Props of {@link VideoPlayer}. */
export interface VideoPlayerProps extends MediaPlayerOptions {
  /** The mode shown. Pair with `onViewModeChange` to control it. */
  viewMode?: MediaViewMode
  /** The first mode when uncontrolled. Default `inline`. Full screen and picture-in-picture need a gesture, so a browser refuses them here and the player stays inline. */
  defaultViewMode?: MediaViewMode
  /** Called when the mode changes, with why. */
  onViewModeChange?: (mode: MediaViewMode, details: MediaViewModeChangeDetails) => void
  /** The modes to offer. Default all. Unsupported modes are hidden; `inline` always remains. */
  viewModes?: readonly MediaViewMode[]
  /** `native` is the browser's own window; `document` keeps play and seek controls where Document Picture-in-Picture exists. Default `native`. */
  pictureInPicture?: "native" | "document"
  /** The mini player's rectangle in viewport pixels. Pair with `onWindowRectChange`, which fires once per move. */
  windowRect?: MediaWindowRect
  /** The mini player's first rectangle. Default: the bottom corner at the reading end. */
  defaultWindowRect?: MediaWindowRect
  /** Called once per move or resize of the mini player, with its new rectangle. */
  onWindowRectChange?: (rect: MediaWindowRect) => void
  /** The reserved shape, as CSS `aspect-ratio`. Default `16 / 9`. */
  aspectRatio?: string
  /** Fill a parent of definite height instead of reserving an aspect ratio: a window body, a stage. */
  fill?: boolean
  /** Show the skeleton in the player's box while the host loads what to play. */
  loading?: boolean
  /** Speeds offered, ascending. Default 0.5 to 2. */
  rates?: readonly number[]
  /** Preview frames for the seek bar, where a `storyboard` will not do. */
  thumbnail?: MediaThumbnail
  /** Caption text size. Pair with `onCaptionSizeChange` to control it. */
  captionSize?: MediaCaptionSize
  /** Default `medium`. */
  defaultCaptionSize?: MediaCaptionSize
  /** Called when the person chooses a caption size. */
  onCaptionSizeChange?: (size: MediaCaptionSize) => void
  /** Host controls at the end of the bar. */
  controlsEnd?: ReactNode
  /** The player's controller, for commands from outside. */
  playerRef?: Ref<MediaPlayerController>
  /** Names the player; defaults to the title. */
  "aria-label"?: string
  /** Layout only. */
  className?: string
  /** Formatting and wording locale; defaults to the nearest LocaleProvider. */
  locale?: string
  /** Wording overrides. */
  labels?: Partial<typeof mediaPlayerMessages.defaults>
}

/** The skeleton of a player of the same shape. */
export function VideoPlayerSkeleton({ aspectRatio = "16 / 9", fill, className }: Pick<VideoPlayerProps, "aspectRatio" | "fill" | "className">) {
  return (
    <div className={cx("fa-media", className)} data-kind="video" data-fill={fill ? "" : undefined} style={fill ? undefined : { aspectRatio }}>
      <Skeleton.Block className="fa-media-skeleton" width="100%" height="100%" radius="tile" />
    </div>
  )
}

/**
 * A video player with its own controls, in five view modes that keep one media element:
 * in the page, maximised, a floating mini player, full screen and picture-in-picture.
 * Playback, buffer and position survive every change, and the page never moves: the player's
 * box stays reserved while it is elsewhere. The media element never remounts.
 *
 * Shortcuts apply while focus is inside the player: Space or K play and pause, J and L seek ten
 * seconds, ← → five, ↑ ↓ change volume, M mutes, C toggles captions, F is full screen, Shift
 * with , or . changes speed, Home and End go to the ends, and 0 to 9 go to a tenth of the way.
 * Character keys respect `configureShortcuts`. Time runs left to right in every language.
 */
export function VideoPlayer(props: VideoPlayerProps) {
  return props.loading ? <VideoPlayerSkeleton aspectRatio={props.aspectRatio} fill={props.fill} className={props.className} /> : <LoadedVideoPlayer {...props} />
}

function LoadedVideoPlayer({
  viewMode,
  defaultViewMode,
  onViewModeChange,
  viewModes,
  pictureInPicture,
  windowRect,
  defaultWindowRect,
  onWindowRectChange,
  aspectRatio = "16 / 9",
  fill,
  loading: _loading,
  rates = DEFAULT_RATES,
  thumbnail,
  captionSize: captionSizeProp,
  defaultCaptionSize = "medium",
  onCaptionSizeChange,
  controlsEnd,
  playerRef,
  "aria-label": ariaLabel,
  className,
  locale: localeProp,
  labels,
  ...options
}: VideoPlayerProps) {
  const player = useMediaPlayer(options)
  useImperativeHandle(playerRef, () => player, [player])
  const t = useMessages(mediaPlayerMessages, { labels, locale: localeProp })
  const locale = useLocale(localeProp)
  const shell = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [stageElement, setStageElement] = useState<HTMLDivElement | null>(null)
  const setStage = useCallback((element: HTMLDivElement | null) => {
    stage.current = element
    setStageElement(element)
  }, [])

  const view = useMediaViewMode({ shell, stage, media: player.media, viewMode, defaultViewMode, onViewModeChange, viewModes, pictureInPicture })
  const remote = useRemotePlayback(player.media)
  const { mode, layer } = view

  const paused = useMediaPlayerState(player, (state) => state.paused)
  const item = useMediaPlayerState(player, (state) => state.item)
  const fetching = useMediaPlayerState(player, (state) => state.loading)
  const buffering = useMediaPlayerState(player, (state) => state.buffering)
  const stalled = useMediaPlayerState(player, (state) => state.stalled)
  const error = useMediaPlayerState(player, (state) => state.error)
  const cues = useMediaPlayerState(player, (state) => state.cues)
  const ended = useMediaPlayerState(player, (state) => state.ended)
  const cast = useMediaPlayerState(player, (state) => state.cast)

  const [innerSize, setInnerSize] = useState(defaultCaptionSize)
  const captionSize = captionSizeProp ?? innerSize
  const setCaptionSize = useCallback(
    (size: MediaCaptionSize) => {
      setInnerSize(size)
      onCaptionSizeChange?.(size)
    },
    [onCaptionSizeChange],
  )

  // ── Controls that hide ─────────────────────────────────────────────────────
  const [shown, setShown] = useState(true)
  const hold = useRef({ menus: new Set<string>(), scrubbing: false })
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const canHide = useCallback(() => {
    const state = player.getState()
    return !state.paused && !state.error && hold.current.menus.size === 0 && !hold.current.scrubbing && !stage.current?.querySelector(":is(.fa-media-controls, .fa-media-window-bar) :focus-visible")
  }, [player])
  const wake = useCallback(() => {
    setShown(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(function check() {
      if (canHide()) setShown(false)
      else timer.current = setTimeout(check, CONTROLS_MS)
    }, CONTROLS_MS)
  }, [canHide])
  useEffect(() => {
    wake()
    return () => clearTimeout(timer.current)
  }, [paused, wake])
  const onMenuChange = useCallback(
    (open: boolean, menu = "settings") => {
      if (open) hold.current.menus.add(menu)
      else hold.current.menus.delete(menu)
      wake()
    },
    [wake],
  )
  const onWindowMenuChange = useCallback((open: boolean) => onMenuChange(open, "window"), [onMenuChange])
  const onScrubChange = useCallback(
    (scrubbing: boolean) => {
      hold.current.scrubbing = scrubbing
      wake()
    },
    [wake],
  )

  // ── View changes ───────────────────────────────────────────────────────────
  const [message, setMessage] = useState("")
  const aspect = useCallback(() => {
    const media = player.media.current as HTMLVideoElement | null
    return media?.videoWidth && media.videoHeight ? media.videoWidth / media.videoHeight : 16 / 9
  }, [player])
  const mini = useMiniWindow({
    shell,
    active: layer === "windowed",
    aspect,
    rect: windowRect,
    defaultRect: defaultWindowRect,
    onRectChange: onWindowRectChange,
    onMoved: () => setMessage(`${t.announceMoved}⁠`),
  })
  const setMode = view.setMode
  const go = useCallback((target: MediaViewMode) => setMode(target, "control"), [setMode])
  const toggleFullscreen = useCallback(() => {
    if (view.available.includes("fullscreen")) setMode(mode === "fullscreen" ? layer : "fullscreen", "shortcut")
  }, [layer, mode, setMode, view.available])

  // Focus follows the player into a mode that covers the page, and out of a bar that unmounts.
  const placed = useRef(`${layer}|${mode}`)
  useEffect(() => {
    const element = stage.current
    if (!element || placed.current === `${layer}|${mode}`) return
    placed.current = `${layer}|${mode}`
    const active = element.ownerDocument.activeElement
    if (layer === "maximised" || mode === "fullscreen") {
      if (!element.contains(active)) element.focus({ preventScroll: true })
    } else if (active === element.ownerDocument.body) element.focus({ preventScroll: true })
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only on a change of mode
  }, [layer, mode])

  // Maximised is the page: Escape leaves it, and Tab stays in it.
  useEffect(() => {
    if (layer !== "maximised" || mode === "fullscreen") return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || hold.current.menus.size > 0) return
      event.preventDefault()
      setMode("inline", "escape", event)
    }
    document.addEventListener("keydown", onKey, true)
    return () => document.removeEventListener("keydown", onKey, true)
  }, [layer, mode, setMode])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    wake()
    if (event.key === "Tab" && layer === "maximised" && mode !== "fullscreen" && !(event.target as Element).closest(".fa-menu")) {
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button, input, a[href], [tabindex='0']")).filter((element) => element.offsetParent !== null && element.tabIndex >= 0)
      const first = focusable[0]
      const last = focusable.at(-1)
      const active = event.currentTarget.ownerDocument.activeElement
      if (event.shiftKey && (active === first || active === event.currentTarget)) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first?.focus()
      }
      return
    }
    onMediaKeyDown(event, { player, rates, fullscreen: view.available.includes("fullscreen") ? toggleFullscreen : undefined })
  }

  // ── The picture's own gestures ─────────────────────────────────────────────
  const flash = useRef<HTMLSpanElement>(null)
  const tap = useRef({ time: 0, x: 0, kind: "", timer: undefined as ReturnType<typeof setTimeout> | undefined })
  const showFlash = (seconds: number) => {
    const element = flash.current
    if (!element) return
    element.textContent = numberFormat(locale, { style: "unit", unit: "second", unitDisplay: "narrow", signDisplay: "always" }).format(seconds)
    element.dataset.side = seconds < 0 ? "start" : "end"
    element.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 700 * motionScale(), easing: "ease-out" })
  }
  const onSurfaceDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    tap.current.kind = event.pointerType
    if (layer === "windowed") mini.beginMove(event)
    stage.current?.focus({ preventScroll: true })
  }
  const onSurfaceUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || mini.dragged.current) return
    const box = event.currentTarget.getBoundingClientRect()
    const place = (event.clientX - box.left) / box.width
    const double = event.timeStamp - tap.current.time < DOUBLE_TAP_MS && Math.abs(event.clientX - tap.current.x) < 48
    clearTimeout(tap.current.timer)
    tap.current.time = event.timeStamp
    tap.current.x = event.clientX
    if (double) {
      tap.current.time = 0
      if (place < 1 / 3 || place > 2 / 3) {
        const seconds = place < 1 / 3 ? -TAP_SEEK : TAP_SEEK
        player.seekBy(seconds)
        showFlash(seconds)
      } else player.toggle()
      wake()
      return
    }
    tap.current.timer = setTimeout(() => {
      if (!shownRef.current) wake()
      else if (place >= 1 / 3 && place <= 2 / 3) player.toggle()
      else setShown(false)
    }, DOUBLE_TAP_MS)
  }
  const shownRef = useRef(shown)
  shownRef.current = shown
  useEffect(() => () => clearTimeout(tap.current.timer), [])
  const onSurfaceClick = () => {
    if (tap.current.kind === "touch" || mini.dragged.current) {
      mini.dragged.current = false
      return
    }
    player.toggle()
  }

  const title = item?.title
  const name = ariaLabel ?? title ?? t.videoPlayer
  const away = layer === "windowed" || mode === "pip"
  const casting = cast.status === "connected"
  const covered = layer === "maximised"
  const layerElement = layer === "inline" ? null : stageElement
  const pipPanel = view.pipHost ? createPortal(<PipControls player={player} t={t} locale={locale} onReturn={() => go("inline")} paused={paused} />, view.pipHost) : null

  return (
    <div className={cx("fa-media", className)} data-kind="video" data-fill={fill ? "" : undefined} data-view-mode={mode} style={fill ? undefined : ({ aspectRatio } as CSSProperties)}>
      {away ? (
        <div className="fa-media-away">
          {item?.poster ? <img src={item.poster} alt="" draggable={false} /> : null}
          <span className="fa-media-away-text">
            <span>{mode === "pip" ? t.playingInPip : t.playingInMiniPlayer}</span>
            <Button variant="secondary" size="sm" icon={<IconRestore />} onClick={() => go("inline")}>
              {t.returnToPage}
            </Button>
          </span>
        </div>
      ) : null}
      <div ref={shell} className="fa-media-shell" data-layer={layer}>
        <div
          ref={setStage}
          className="fa-media-stage"
          data-mode="dark"
          data-controls={shown ? undefined : "hidden"}
          data-state={paused ? "paused" : "playing"}
          data-away={mode === "pip" ? "" : undefined}
          data-caption-size={captionSize}
          role={covered ? "dialog" : "group"}
          aria-modal={covered ? true : undefined}
          aria-label={name}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          onPointerMove={(event) => {
            if (event.pointerType === "mouse") wake()
          }}
          onPointerLeave={() => {
            if (canHide()) setShown(false)
          }}
          onFocusCapture={wake}
        >
          <PopupLayer.Provider value={layerElement}>
            <div className="fa-media-frame">
              <video ref={player.mediaRef} className="fa-media-element" playsInline aria-label={title} />
              {/* A tap on the picture is a pointer convenience; the play button and K are the other paths. */}
              {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
              <div
                className="fa-media-surface"
                onPointerDown={onSurfaceDown}
                onPointerUp={onSurfaceUp}
                onClick={onSurfaceClick}
                onDoubleClick={() => {
                  if (tap.current.kind !== "touch") toggleFullscreen()
                }}
              />
              {cues.length ? (
                <div className="fa-media-cues">
                  {cues.map((cue, index) => (
                    <span key={index} className="fa-media-cue">
                      {cue}
                    </span>
                  ))}
                </div>
              ) : null}
              <span ref={flash} className="fa-media-flash" aria-hidden data-numeric />
              {casting ? (
                <div className="fa-media-state" data-kind="cast">
                  {item?.poster ? <img src={item.poster} alt="" draggable={false} /> : null}
                  <span className="fa-media-state-text">{t.castingTo(cast.deviceName ?? t.castDevice)}</span>
                </div>
              ) : null}
              {error ? (
                <div className="fa-media-state" data-kind="error" role="alert">
                  <span className="fa-media-state-text">{t[ERROR_TEXT[error]] as string}</span>
                  <Button size="sm" icon={<IconRefresh />} onClick={() => player.retry()}>
                    {t.retry}
                  </Button>
                </div>
              ) : stalled ? (
                <div className="fa-media-state" data-kind="stalled">
                  <Spinner size="lg" label="" />
                  <span className="fa-media-state-text">{t.stalled}</span>
                  <Button size="sm" icon={<IconRefresh />} onClick={() => player.retry()}>
                    {t.retry}
                  </Button>
                </div>
              ) : buffering || (fetching && !casting) ? (
                <div className="fa-media-spinner">
                  <Spinner size="lg" label={t.loading} />
                </div>
              ) : !casting && (paused || ended) ? (
                <span className="fa-media-glyph" aria-hidden>
                  {ended ? <IconRefresh /> : <IconPlay />}
                </span>
              ) : null}
              {layer === "windowed" ? (
                <WindowBar
                  window={mini}
                  t={t}
                  title={title}
                  onMenuChange={onWindowMenuChange}
                  onMaximise={view.available.includes("maximised") ? () => go("maximised") : undefined}
                  onReturn={() => go("inline")}
                  onClose={() => {
                    player.pause()
                    view.setMode("inline", "close")
                  }}
                />
              ) : null}
              <div className="fa-media-controls over-imagery" data-print="hide">
                {title && layer === "maximised" ? <TruncatedText className="fa-media-title">{title}</TruncatedText> : null}
                <SeekBar player={player} t={t} locale={locale} thumbnail={thumbnail} onScrubChange={onScrubChange} />
                <MediaControls
                  player={player}
                  t={t}
                  locale={locale}
                  rates={rates}
                  captionSize={captionSize}
                  onCaptionSizeChange={setCaptionSize}
                  view={view}
                  remote={remote}
                  extra={controlsEnd}
                  onMenuChange={onMenuChange}
                  onViewChange={go}
                />
              </div>
            </div>
            {layer === "windowed" ? <ResizeHandles window={mini} /> : null}
            <MediaAnnouncer player={player} t={t} locale={locale} mode={mode} message={message} />
            {/* Inside the stage, so its keys reach the player's shortcuts. */}
            {pipPanel}
          </PopupLayer.Provider>
        </div>
      </div>
    </div>
  )
}

/** The Document Picture-in-Picture window's controls. Tooltips stay in the main document, so none here. */
function PipControls({ player, t, locale, paused, onReturn }: { player: MediaPlayerController; t: typeof mediaPlayerMessages.defaults; locale: string; paused: boolean; onReturn: () => void }) {
  return (
    <div className="fa-media-pip-controls" data-mode="dark">
      <SeekBar player={player} t={t} locale={locale} />
      <div className="fa-media-bar">
        <Button variant="ghost" size="sm" tooltip={false} icon={paused ? <IconPlay /> : <IconPause />} aria-label={paused ? t.play : t.pause} onClick={() => player.toggle()} />
        <MediaClock player={player} locale={locale} />
        <span className="fa-media-spacer" />
        <Button variant="ghost" size="sm" tooltip={false} icon={<IconClose />} aria-label={t.exitPictureInPicture} onClick={onReturn} />
      </div>
    </div>
  )
}

export type { MediaViewController }
