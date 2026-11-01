import { describe, expect, it } from "vitest"
import {
  availableViewModes,
  chapterAt,
  clampWindowRect,
  cornerWindowRect,
  defaultWindowRect,
  formatMediaTime,
  isAtLiveEdge,
  mediaCommand,
  normaliseChapters,
  readRanges,
  resizeWindowRect,
  resolveViewMode,
  sameRanges,
  snapWindowRect,
  speakMediaTime,
  stepRate,
  storyboardFrame,
  type MediaViewSupport,
} from "./state.js"
import { MEDIA_VIEW_MODES } from "./types.js"

const FULL: MediaViewSupport = { topLayer: true, fullscreen: true, videoFullscreen: false, pip: true, documentPip: false }
const viewport = { width: 1000, height: 800 }
const noKeys = { shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }

describe("time", () => {
  it("writes a clock, with hours only when the media has them", () => {
    expect(formatMediaTime(7, "en-AU")).toBe("0:07")
    expect(formatMediaTime(754, "en-AU")).toBe("12:34")
    expect(formatMediaTime(3729, "en-AU")).toBe("1:02:09")
    expect(formatMediaTime(65, "en-AU", 7200)).toBe("0:01:05")
  })
  it("reads non-finite and negative times as zero", () => {
    expect(formatMediaTime(Number.NaN, "en-AU")).toBe("0:00")
    expect(formatMediaTime(-4, "en-AU")).toBe("0:00")
  })
  it("uses the locale's digits", () => {
    expect(formatMediaTime(7, "ar-EG")).toBe("٠:٠٧")
  })
  it("speaks times in words for the slider", () => {
    expect(speakMediaTime(90, "en-AU")).toBe("1 minute 30 seconds")
    expect(speakMediaTime(3600, "en-AU")).toBe("1 hour")
  })
})

describe("ranges and chapters", () => {
  it("reads TimeRanges as plain data and compares them loosely", () => {
    const ranges = { length: 2, start: (index: number) => [0, 10][index]!, end: (index: number) => [5, 12][index]! }
    expect(readRanges(ranges)).toEqual([
      { start: 0, end: 5 },
      { start: 10, end: 12 },
    ])
    expect(readRanges(null)).toEqual([])
    expect(sameRanges([{ start: 0, end: 5 }], [{ start: 0, end: 5.1 }])).toBe(true)
    expect(sameRanges([{ start: 0, end: 5 }], [{ start: 0, end: 6 }])).toBe(false)
  })
  it("finds the chapter at a time and drops those past the end", () => {
    const chapters = normaliseChapters(
      [
        { start: 30, title: "C" },
        { start: 0, title: "A" },
        { start: 90, title: "Past" },
        { start: 10, title: "B" },
      ],
      60,
    )
    expect(chapters.map((chapter) => chapter.title)).toEqual(["A", "B", "C"])
    expect(chapterAt(chapters, 9.9)?.title).toBe("A")
    expect(chapterAt(chapters, 10)?.title).toBe("B")
    expect(chapterAt([{ start: 5, title: "Late" }], 1)).toBeNull()
  })
  it("picks the storyboard tile for a time", () => {
    const board = { src: "s.jpg", tileWidth: 160, tileHeight: 90, columns: 5, interval: 2 }
    expect(storyboardFrame(board, 0)).toMatchObject({ x: 0, y: 0 })
    expect(storyboardFrame(board, 12.5)).toMatchObject({ x: 160, y: 90, width: 160, height: 90 })
  })
})

describe("speed and live", () => {
  const rates = [0.5, 1, 1.5, 2]
  it("steps through the rates and stops at the ends", () => {
    expect(stepRate(rates, 1, 1)).toBe(1.5)
    expect(stepRate(rates, 1, -1)).toBe(0.5)
    expect(stepRate(rates, 2, 1)).toBe(2)
    expect(stepRate(rates, 0.5, -1)).toBe(0.5)
    expect(stepRate(rates, 1.2, 1)).toBe(1.5)
    expect(stepRate([], 1.2, 1)).toBe(1.2)
  })
  it("counts a position near the end of the window as live", () => {
    expect(isAtLiveEdge(100, 105)).toBe(true)
    expect(isAtLiveEdge(100, 120)).toBe(false)
  })
})

describe("view modes", () => {
  it("offers what is allowed and supported, always with inline", () => {
    expect(availableViewModes(MEDIA_VIEW_MODES, FULL)).toEqual([...MEDIA_VIEW_MODES])
    expect(availableViewModes(["pip", "fullscreen"], FULL)).toEqual(["inline", "fullscreen", "pip"])
    expect(availableViewModes([], FULL)).toEqual(["inline"])
  })
  it("hides modes without support", () => {
    expect(availableViewModes(MEDIA_VIEW_MODES, { ...FULL, topLayer: false })).toEqual(["inline", "fullscreen", "pip"])
    expect(availableViewModes(MEDIA_VIEW_MODES, { ...FULL, fullscreen: false, pip: false })).toEqual(["inline", "maximised", "windowed"])
  })
  it("keeps full screen on an iPhone through the video element", () => {
    expect(availableViewModes(["fullscreen"], { ...FULL, fullscreen: false, videoFullscreen: true })).toEqual(["inline", "fullscreen"])
  })
  it("counts Document Picture-in-Picture as picture-in-picture", () => {
    expect(availableViewModes(["pip"], { ...FULL, pip: false, documentPip: true })).toEqual(["inline", "pip"])
  })
  it("falls back from picture-in-picture to the mini player, and otherwise to inline", () => {
    expect(resolveViewMode("pip", ["inline", "windowed"])).toBe("windowed")
    expect(resolveViewMode("pip", ["inline"])).toBe("inline")
    expect(resolveViewMode("windowed", ["inline", "pip"])).toBe("inline")
    expect(resolveViewMode("fullscreen", ["inline", "fullscreen"])).toBe("fullscreen")
  })
})

describe("the mini player's rectangle", () => {
  const rect = { x: 100, y: 100, width: 320, height: 180 }
  it("opens in the bottom corner at the reading end", () => {
    const start = defaultWindowRect(viewport, 16 / 9, false)
    expect(start.x + start.width).toBe(988)
    expect(start.y + start.height).toBeCloseTo(788)
    expect(defaultWindowRect(viewport, 16 / 9, true).x).toBe(12)
  })
  it("stays inside the viewport and keeps its shape", () => {
    const moved = clampWindowRect({ ...rect, x: 5000, y: -50 }, viewport)
    expect(moved.x).toBe(viewport.width - rect.width - 12)
    expect(moved.y).toBe(12)
    const huge = clampWindowRect({ x: 0, y: 0, width: 4000, height: 2250 }, viewport)
    expect(huge.width).toBe(976)
    expect(huge.width / huge.height).toBeCloseTo(16 / 9)
  })
  it("stays at its narrowest width where the viewport has room, and fits a phone where not", () => {
    expect(clampWindowRect({ ...rect, width: 100, height: 56.25 }, viewport).width).toBe(240)
    expect(clampWindowRect(rect, { width: 200, height: 400 }).width).toBe(176)
  })
  it("snaps to edges it lands near and leaves the middle alone", () => {
    expect(snapWindowRect({ ...rect, x: 30, y: 300 }, viewport)).toMatchObject({ x: 12, y: 300 })
    expect(snapWindowRect({ ...rect, x: 660, y: 600 }, viewport)).toMatchObject({ x: 668, y: 608 })
    expect(snapWindowRect({ ...rect, x: 300, y: 300 }, viewport)).toMatchObject({ x: 300, y: 300 })
  })
  it("reaches each corner", () => {
    expect(cornerWindowRect(rect, "top-left", viewport)).toMatchObject({ x: 12, y: 12 })
    expect(cornerWindowRect(rect, "bottom-right", viewport)).toMatchObject({ x: 668, y: 608 })
  })
  it("resizes from a corner, holding the opposite corner and the shape", () => {
    const grown = resizeWindowRect(rect, "bottom-right", 160, 0, viewport)
    expect(grown).toMatchObject({ x: 100, y: 100, width: 480, height: 270 })
    const left = resizeWindowRect(rect, "top-left", -80, 0, viewport)
    expect(left.width).toBe(400)
    expect(left.x + left.width).toBe(rect.x + rect.width)
    expect(left.y + left.height).toBeCloseTo(rect.y + rect.height)
  })
  it("stops a resize at the viewport's edge and at the narrowest width", () => {
    expect(resizeWindowRect(rect, "bottom-right", 5000, 0, viewport).width).toBeCloseTo(888)
    expect(resizeWindowRect(rect, "bottom-right", -5000, 0, viewport).width).toBe(240)
  })
})

describe("keys", () => {
  const key = (name: string, modifiers = {}) => mediaCommand({ ...noKeys, ...modifiers }, name)
  it("maps the player's keys", () => {
    expect(key(" ")?.command).toEqual({ type: "toggle" })
    expect(key("k")?.command).toEqual({ type: "toggle" })
    expect(key("j")?.command).toEqual({ type: "seek-by", seconds: -10 })
    expect(key("l")?.command).toEqual({ type: "seek-by", seconds: 10 })
    expect(key("ArrowLeft")?.command).toEqual({ type: "seek-by", seconds: -5 })
    expect(key("ArrowRight")?.command).toEqual({ type: "seek-by", seconds: 5 })
    expect(key("ArrowUp")?.command).toEqual({ type: "volume-by", delta: 0.05 })
    expect(key("m")?.command).toEqual({ type: "mute" })
    expect(key("f")?.command).toEqual({ type: "fullscreen" })
    expect(key("c")?.command).toEqual({ type: "captions" })
    expect(key("Home")?.command).toEqual({ type: "seek-fraction", fraction: 0 })
    expect(key("End")?.command).toEqual({ type: "seek-fraction", fraction: 1 })
    expect(key("7")?.command).toEqual({ type: "seek-fraction", fraction: 0.7 })
  })
  it("reads Shift with comma and period by either form of the key", () => {
    expect(key("<", { shiftKey: true })?.command).toEqual({ type: "speed", delta: -1 })
    expect(key(",", { shiftKey: true })?.command).toEqual({ type: "speed", delta: -1 })
    expect(key(">", { shiftKey: true })?.command).toEqual({ type: "speed", delta: 1 })
  })
  it("leaves browser chords and plain punctuation alone", () => {
    expect(key("k", { ctrlKey: true })).toBeNull()
    expect(key("f", { metaKey: true })).toBeNull()
    expect(key("l", { altKey: true })).toBeNull()
    expect(key(",")).toBeNull()
    expect(key("x")).toBeNull()
    expect(key("1", { shiftKey: true })).toBeNull()
  })
  it("names each shortcut so shortcutAllowed can be asked", () => {
    expect(key("K")?.shortcut).toBe("k")
    expect(key(" ")?.shortcut).toBe("space")
    expect(key("3")?.shortcut).toBe("3")
    expect(key(">", { shiftKey: true })?.shortcut).toBe("shift+.")
  })
})
