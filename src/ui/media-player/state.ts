/**
 * The media player's state logic. Pure functions, no DOM or React, so the controller, the
 * components and the tests share one definition.
 */
import { formatDuration } from "../duration-field/duration.js"
import { numberFormat } from "../../lib/locale/intl.js"
import type { MediaChapter, MediaPreviewFrame, MediaRange, MediaStoryboard, MediaViewMode } from "./types.js"

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

/** Whole seconds as a clock: "0:07", "12:34", "1:02:09", in the locale's digits. */
export function formatMediaTime(seconds: number, locale: string, longest: number = seconds): string {
  const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const pad = numberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false })
  const plain = numberFormat(locale, { useGrouping: false })
  const end = pad.format(whole % 60)
  return longest >= 3600 ? `${plain.format(hours)}:${pad.format(minutes)}:${end}` : `${plain.format(minutes)}:${end}`
}

/** A time as speech, for the seek bar's value text: "1 minute 30 seconds". */
export function speakMediaTime(seconds: number, locale: string): string {
  return formatDuration(Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0)), { locale, units: ["h", "m", "s"], style: "long" })
}

/** The buffered ranges of a media element as plain data, merged and sorted by the browser. */
export function readRanges(ranges: Pick<TimeRanges, "length" | "start" | "end"> | null | undefined): MediaRange[] {
  const out: MediaRange[] = []
  for (let index = 0; index < (ranges?.length ?? 0); index += 1) out.push({ start: ranges!.start(index), end: ranges!.end(index) })
  return out
}

/** Whether two lists of ranges are the same to the nearest quarter second. */
export function sameRanges(a: readonly MediaRange[], b: readonly MediaRange[]) {
  return a.length === b.length && a.every((range, index) => Math.abs(range.start - b[index]!.start) < 0.25 && Math.abs(range.end - b[index]!.end) < 0.25)
}

/** The chapter playing at a time, from a list sorted by start. */
export function chapterAt(chapters: readonly MediaChapter[], seconds: number): MediaChapter | null {
  let found: MediaChapter | null = null
  for (const chapter of chapters) {
    if (chapter.start > seconds) break
    found = chapter
  }
  return found
}

/** Chapters sorted by start, without any past the end of the media. */
export function normaliseChapters(chapters: readonly MediaChapter[] | undefined, duration: number): MediaChapter[] {
  const sorted = [...(chapters ?? [])].sort((a, b) => a.start - b.start)
  return Number.isFinite(duration) && duration > 0 ? sorted.filter((chapter) => chapter.start < duration) : sorted
}

/** The sheet tile for a time. */
export function storyboardFrame(board: MediaStoryboard, seconds: number): MediaPreviewFrame {
  const index = Math.max(0, Math.floor(seconds / board.interval))
  return {
    src: board.src,
    x: (index % board.columns) * board.tileWidth,
    y: Math.floor(index / board.columns) * board.tileHeight,
    width: board.tileWidth,
    height: board.tileHeight,
  }
}

/** The next speed from a sorted list, stopping at the ends. */
export function stepRate(rates: readonly number[], current: number, delta: 1 | -1): number {
  if (!rates.length) return current
  const nearest = rates.reduce((best, rate, index) => (Math.abs(rate - current) < Math.abs((rates[best] ?? rate) - current) ? index : best), 0)
  return rates[clamp(nearest + delta, 0, rates.length - 1)] ?? current
}

/** Whether a live position is close enough to the edge to count as live. */
export function isAtLiveEdge(currentTime: number, seekableEnd: number, tolerance = 8) {
  return seekableEnd - currentTime <= tolerance
}

/** What a browser can do. Read through {@link detectViewSupport}. */
export interface MediaViewSupport {
  /** The Popover API, which puts maximised and windowed in the top layer. */
  topLayer: boolean
  /** The Fullscreen API on the player's container. */
  fullscreen: boolean
  /** iPhone: `webkitEnterFullscreen`, with the system's controls instead of the player's. */
  videoFullscreen: boolean
  /** `requestPictureInPicture`, or Safari's `webkitSetPresentationMode`. */
  pip: boolean
  /** Document Picture-in-Picture. */
  documentPip: boolean
}

/** The modes a player can offer from those allowed. `inline` is always available. */
export function availableViewModes(allowed: readonly MediaViewMode[], support: MediaViewSupport): MediaViewMode[] {
  return (["inline", "maximised", "windowed", "fullscreen", "pip"] as const).filter((mode) => {
    if (mode === "inline") return true
    if (!allowed.includes(mode)) return false
    if (mode === "maximised" || mode === "windowed") return support.topLayer
    if (mode === "fullscreen") return support.fullscreen || support.videoFullscreen
    return support.pip || support.documentPip
  })
}

/**
 * The mode to use for a request: the mode itself when available. Picture-in-picture falls back
 * to the mini player, which is the same idea on a browser without it; other modes fall back
 * to `inline`.
 */
export function resolveViewMode(requested: MediaViewMode, available: readonly MediaViewMode[]): MediaViewMode {
  if (available.includes(requested)) return requested
  return requested === "pip" && available.includes("windowed") ? "windowed" : "inline"
}

/** A pure rectangle of the mini player, in viewport pixels. */
export interface MediaWindowRect {
  /** Distance from the viewport's left edge. */
  x: number
  /** Distance from the viewport's top edge. */
  y: number
  /** CSS pixels. */
  width: number
  /** CSS pixels. */
  height: number
}

/** The viewport the mini player lives in. */
export interface MediaViewport {
  /** CSS pixels. */
  width: number
  /** CSS pixels. */
  height: number
}

/** Mini player corners, named as seen: the window is spatial and does not mirror (R5.11). */
export type MediaWindowCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right"

/** The mini player's narrowest width in CSS pixels. Its controls fit from here. */
export const WINDOW_MIN_WIDTH = 240
/** Mini player widths offered in its menu, in CSS pixels. */
export const WINDOW_SIZES = { small: 280, medium: 400, large: 560 } as const
/** The space kept between the mini player and the viewport's edge. */
export const WINDOW_MARGIN = 12
/** How close to an edge the mini player must land to snap to it. */
export const WINDOW_SNAP = 32

/** Keep the rectangle's size and position within the viewport. */
export function clampWindowRect(rect: MediaWindowRect, viewport: MediaViewport, margin = WINDOW_MARGIN): MediaWindowRect {
  const aspect = rect.height > 0 ? rect.width / rect.height : 16 / 9
  const maxWidth = Math.max(1, viewport.width - margin * 2)
  const maxHeight = Math.max(1, viewport.height - margin * 2)
  const width = Math.min(Math.max(rect.width, Math.min(WINDOW_MIN_WIDTH, maxWidth)), maxWidth, maxHeight * aspect)
  const height = width / aspect
  return {
    x: clamp(rect.x, margin, viewport.width - width - margin),
    y: clamp(rect.y, margin, viewport.height - height - margin),
    width,
    height,
  }
}

/** Move the rectangle to a corner of the viewport. */
export function cornerWindowRect(rect: MediaWindowRect, corner: MediaWindowCorner, viewport: MediaViewport, margin = WINDOW_MARGIN): MediaWindowRect {
  const fitted = clampWindowRect(rect, viewport, margin)
  return {
    ...fitted,
    x: corner.endsWith("left") ? margin : viewport.width - fitted.width - margin,
    y: corner.startsWith("top") ? margin : viewport.height - fitted.height - margin,
  }
}

/** Where the mini player first opens: the bottom corner at the reading end. */
export function defaultWindowRect(viewport: MediaViewport, aspect: number, rtl: boolean, margin = WINDOW_MARGIN): MediaWindowRect {
  const width = Math.min(Math.max(viewport.width * 0.32, WINDOW_SIZES.small), WINDOW_SIZES.medium)
  return cornerWindowRect({ x: 0, y: 0, width, height: width / aspect }, rtl ? "bottom-left" : "bottom-right", viewport, margin)
}

/** Snap the rectangle to the edges it landed near, after keeping it in the viewport. */
export function snapWindowRect(rect: MediaWindowRect, viewport: MediaViewport, margin = WINDOW_MARGIN, threshold = WINDOW_SNAP): MediaWindowRect {
  const fitted = clampWindowRect(rect, viewport, margin)
  const right = viewport.width - fitted.width - margin
  const bottom = viewport.height - fitted.height - margin
  return {
    ...fitted,
    x: fitted.x - margin <= threshold ? margin : right - fitted.x <= threshold ? right : fitted.x,
    y: fitted.y - margin <= threshold ? margin : bottom - fitted.y <= threshold ? bottom : fitted.y,
  }
}

/** Resize from a corner, holding the opposite corner and the aspect ratio. */
export function resizeWindowRect(start: MediaWindowRect, corner: MediaWindowCorner, dx: number, dy: number, viewport: MediaViewport, margin = WINDOW_MARGIN): MediaWindowRect {
  const aspect = start.width / start.height
  const left = corner.endsWith("left")
  const top = corner.startsWith("top")
  const across = left ? -dx : dx
  const down = (top ? -dy : dy) * aspect
  const pull = Math.abs(across) >= Math.abs(down) ? across : down
  const room = Math.min(
    left ? start.x + start.width - margin : viewport.width - margin - start.x,
    (top ? start.y + start.height - margin : viewport.height - margin - start.y) * aspect,
  )
  const width = clamp(start.width + pull, Math.min(WINDOW_MIN_WIDTH, room), room)
  const height = width / aspect
  return {
    x: left ? start.x + start.width - width : start.x,
    y: top ? start.y + start.height - height : start.y,
    width,
    height,
  }
}

/** A keyboard command of the player. */
export type MediaCommand =
  | { type: "toggle" }
  | { type: "seek-by"; seconds: number }
  | { type: "seek-fraction"; fraction: number }
  | { type: "volume-by"; delta: number }
  | { type: "mute" }
  | { type: "fullscreen" }
  | { type: "captions" }
  | { type: "speed"; delta: 1 | -1 }

/**
 * The command a key press means, with the shortcut `shortcutAllowed` should be asked about.
 * `key` is already in the timeline's direction (`readingKey` on the seek bar).
 */
export function mediaCommand(event: Pick<KeyboardEvent, "shiftKey" | "ctrlKey" | "metaKey" | "altKey">, key: string): { command: MediaCommand; shortcut: string } | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  const digit = /^[0-9]$/.test(key) ? Number(key) : null
  if (digit !== null && !event.shiftKey) return { command: { type: "seek-fraction", fraction: digit / 10 }, shortcut: key }
  if (event.shiftKey) {
    if (key === "<" || key === ",") return { command: { type: "speed", delta: -1 }, shortcut: "shift+," }
    if (key === ">" || key === ".") return { command: { type: "speed", delta: 1 }, shortcut: "shift+." }
    return null
  }
  switch (key) {
    case " ":
      return { command: { type: "toggle" }, shortcut: "space" }
    case "k":
    case "K":
      return { command: { type: "toggle" }, shortcut: "k" }
    case "j":
    case "J":
      return { command: { type: "seek-by", seconds: -10 }, shortcut: "j" }
    case "l":
    case "L":
      return { command: { type: "seek-by", seconds: 10 }, shortcut: "l" }
    case "m":
    case "M":
      return { command: { type: "mute" }, shortcut: "m" }
    case "f":
    case "F":
      return { command: { type: "fullscreen" }, shortcut: "f" }
    case "c":
    case "C":
      return { command: { type: "captions" }, shortcut: "c" }
    case "ArrowLeft":
      return { command: { type: "seek-by", seconds: -5 }, shortcut: "arrowleft" }
    case "ArrowRight":
      return { command: { type: "seek-by", seconds: 5 }, shortcut: "arrowright" }
    case "ArrowUp":
      return { command: { type: "volume-by", delta: 0.05 }, shortcut: "arrowup" }
    case "ArrowDown":
      return { command: { type: "volume-by", delta: -0.05 }, shortcut: "arrowdown" }
    case "Home":
      return { command: { type: "seek-fraction", fraction: 0 }, shortcut: "home" }
    case "End":
      return { command: { type: "seek-fraction", fraction: 1 }, shortcut: "end" }
    default:
      return null
  }
}
