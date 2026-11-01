import { useCallback, useLayoutEffect, useRef, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { useMediaPlayerState } from "./use-media-player.js"
import type { MediaPlayerController } from "./controller.js"
import { chapterAt, clamp, formatMediaTime, speakMediaTime, storyboardFrame } from "./state.js"
import type { mediaPlayerMessages } from "./messages.js"
import type { MediaThumbnail } from "./types.js"

export interface SeekBarProps {
  player: MediaPlayerController
  t: typeof mediaPlayerMessages.defaults
  locale: string
  /** A host's preview frames, used before a storyboard. */
  thumbnail?: MediaThumbnail | undefined
  /** Called as a drag starts and ends. */
  onScrubChange?: ((scrubbing: boolean) => void) | undefined
}

/** How often a drag asks the media to show the frame under the pointer. */
const SCRUB_SEEK_MS = 140

const selectBuffered = (state: ReturnType<MediaPlayerController["getState"]>) => state.buffered
const selectChapters = (state: ReturnType<MediaPlayerController["getState"]>) => state.chapters

/**
 * The timeline. A real `input type="range"` carries the slider role, value text and assistive
 * gestures; the visible track is drawn beside it, and pointer gestures work on the track.
 *
 * The bar never renders for time: position, preview and drag are written to the elements
 * (R18.5), and only the release seeks for good. The input's value freezes while it has focus
 * and the media plays, so a screen reader is not read every tick; a seek or a pause refreshes it.
 *
 * Time runs left to right in every language: media timelines are the direction of the tape,
 * not of reading (see docs/components/media-player.md).
 */
export function SeekBar({ player, t, locale, thumbnail, onScrubChange }: SeekBarProps) {
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  const head = useRef<HTMLSpanElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLSpanElement>(null)
  const clock = useRef<HTMLSpanElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const drag = useRef<{ time: number; seekedAt: number } | null>(null)
  const latest = useRef({ t, locale, thumbnail })
  latest.current = { t, locale, thumbnail }

  const buffered = useMediaPlayerState(player, selectBuffered)
  const chapters = useMediaPlayerState(player, selectChapters)
  const span = useSyncExternalStore(
    player.subscribeTime,
    () => {
      const { seekableStart, seekableEnd } = player.getTime()
      return `${seekableStart}|${seekableEnd}`
    },
    () => "0|0",
  )
  const [start, end] = span.split("|").map(Number) as [number, number]
  const width = Math.max(0, end - start)

  const place = useCallback(
    (seconds: number) => {
      const { seekableStart, seekableEnd } = player.getTime()
      const range = seekableEnd - seekableStart
      const fraction = range > 0 ? clamp((seconds - seekableStart) / range, 0, 1) : 0
      if (fill.current) fill.current.style.transform = `scaleX(${fraction})`
      if (head.current) head.current.style.transform = `translateX(${fraction * 100}%)`
    },
    [player],
  )

  const valueText = useCallback(
    (seconds: number) => {
      const { t: words, locale: language } = latest.current
      const time = player.getTime()
      if (player.getState().live) {
        const behind = time.seekableEnd - seconds
        return behind < 8 ? words.atLiveEdge : words.seekLive(speakMediaTime(behind, language))
      }
      return words.seekValue({ elapsed: speakMediaTime(seconds, language), total: speakMediaTime(time.duration, language) })
    },
    [player],
  )

  const writeValue = useCallback(
    (seconds: number) => {
      const element = input.current
      if (!element) return
      element.value = String(Math.round(seconds))
      element.setAttribute("aria-valuetext", valueText(seconds))
    },
    [valueText],
  )

  useLayoutEffect(() => {
    const paint = () => {
      if (drag.current) return
      const { currentTime } = player.getTime()
      place(currentTime)
      const focused = input.current?.ownerDocument.activeElement === input.current
      if (!focused || player.getState().paused) writeValue(currentTime)
    }
    paint()
    const stopTime = player.subscribeTime(paint)
    const stopState = player.subscribe(paint)
    return () => {
      stopTime()
      stopState()
    }
  }, [player, place, writeValue])

  const timeAt = (clientX: number) => {
    const box = root.current!.getBoundingClientRect()
    const { seekableStart, seekableEnd } = player.getTime()
    return seekableStart + clamp((clientX - box.left) / Math.max(1, box.width), 0, 1) * (seekableEnd - seekableStart)
  }

  const showPreview = (seconds: number, clientX: number) => {
    const bubble = preview.current
    const box = root.current?.getBoundingClientRect()
    if (!bubble || !box) return
    const { t: _words, locale: language, thumbnail: host } = latest.current
    const state = player.getState()
    const time = player.getTime()
    const frame = host?.(seconds) ?? (state.item?.storyboard ? storyboardFrame(state.item.storyboard, seconds) : null)
    const tile = image.current
    if (tile) {
      if (frame) {
        tile.hidden = false
        tile.style.width = `${frame.width}px`
        tile.style.height = `${frame.height}px`
        tile.style.backgroundImage = `url("${frame.src}")`
        tile.style.backgroundPosition = `${-(frame.x ?? 0)}px ${-(frame.y ?? 0)}px`
      } else tile.hidden = true
    }
    if (clock.current) clock.current.textContent = formatMediaTime(seconds, language, time.duration)
    if (label.current) label.current.textContent = chapterAt(state.chapters, seconds)?.title ?? ""
    const half = bubble.offsetWidth / 2
    bubble.style.transform = `translateX(${clamp(clientX - box.left, half, Math.max(half, box.width - half)) - half}px)`
    bubble.dataset.shown = ""
  }

  const hidePreview = () => {
    if (preview.current && !drag.current) delete preview.current.dataset.shown
  }

  const scrubTo = (clientX: number) => {
    const current = drag.current
    if (!current) return
    const seconds = timeAt(clientX)
    current.time = seconds
    place(seconds)
    showPreview(seconds, clientX)
    const now = performance.now()
    if (now - current.seekedAt > SCRUB_SEEK_MS && player.getState().cast.status !== "connected") {
      current.seekedAt = now
      const media = player.media.current
      if (media) media.currentTime = seconds
    }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || width <= 0) return
    event.preventDefault()
    event.stopPropagation()
    input.current?.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { time: player.getTime().currentTime, seekedAt: 0 }
    root.current!.dataset.scrubbing = ""
    onScrubChange?.(true)
    scrubTo(event.clientX)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current) scrubTo(event.clientX)
    else if (event.pointerType === "mouse" && width > 0) showPreview(timeAt(event.clientX), event.clientX)
  }

  const finish = (commit: boolean) => {
    const current = drag.current
    if (!current) return
    drag.current = null
    delete root.current!.dataset.scrubbing
    hidePreview()
    onScrubChange?.(false)
    if (commit) {
      player.seek(current.time)
      writeValue(current.time)
    } else place(player.getTime().currentTime)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Page keys step natively; refresh the frozen value after every kind of step.
    if (event.key === "PageUp" || event.key === "PageDown") queueMicrotask(() => writeValue(player.getTime().currentTime))
  }

  const percent = (seconds: number) => (width > 0 ? clamp((seconds - start) / width, 0, 1) * 100 : 0)

  return (
    // The track's pointer gestures have the input's keyboard path.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={root}
      className="fa-media-seek"
      dir="ltr"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => finish(true)}
      onPointerCancel={() => finish(false)}
      onPointerLeave={hidePreview}
      onClick={(event) => event.stopPropagation()}
    >
      <div ref={preview} className="fa-media-preview" aria-hidden>
        <span ref={image} className="fa-media-preview-frame" hidden />
        <span className="fa-media-preview-text">
          <span ref={clock} data-numeric />
          <span ref={label} className="fa-media-preview-label" />
        </span>
      </div>
      <span className="fa-media-seek-track" aria-hidden>
        {buffered.map((range) => (
          <span
            key={range.start}
            className="fa-media-seek-buffered"
            style={{ "--_at": percent(range.start) / 100, "--_size": (percent(range.end) - percent(range.start)) / 100 } as CSSProperties}
          />
        ))}
        <span ref={fill} className="fa-media-seek-fill" />
        {chapters.map((chapter) =>
          chapter.start > start ? <span key={chapter.start} className="fa-media-seek-mark" style={{ "--_at": percent(chapter.start) / 100 } as CSSProperties} /> : null,
        )}
      </span>
      <span ref={head} className="fa-media-seek-head" aria-hidden>
        <span className="fa-media-seek-thumb" />
      </span>
      <input
        ref={input}
        className="fa-media-seek-input"
        type="range"
        min={Math.floor(start)}
        max={Math.ceil(end)}
        step={1}
        defaultValue={0}
        aria-label={t.seek}
        aria-disabled={width <= 0 || undefined}
        onChange={(event) => player.seek(Number(event.target.value))}
        onKeyDown={onKeyDown}
        onFocus={() => writeValue(player.getTime().currentTime)}
      />
    </div>
  )
}
