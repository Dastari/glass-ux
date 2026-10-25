// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { clampWindow, insideIndices, isFullWindow, minSpan, panWindow, revealIndex, useXWindow, windowIndices, zoomWindow } from "./zoom.js"
import { previewMatrix } from "./zoom-gestures.js"

const xs = Array.from({ length: 101 }, (_, i) => i * 10) // 0 … 1000
const full = [0, 1000] as const

describe("zoom window maths", () => {
  it("never gets narrower than two samples", () => {
    expect(minSpan(xs)).toBe(20)
    expect(clampWindow([500, 505], full, 20)).toEqual([492.5, 512.5])
  })

  it("stays inside the range and returns the range when wider", () => {
    expect(clampWindow([-50, 150], full, 20)).toEqual([0, 200])
    expect(clampWindow([900, 1100], full, 20)).toEqual([800, 1000])
    expect(clampWindow([-10, 2000], full, 20)).toBe(full)
  })

  it("zooms around a point that keeps its place", () => {
    expect(zoomWindow([0, 1000], 0.5, 250, full, 20)).toEqual([125, 625])
    expect(zoomWindow([125, 625], 2, 250, full, 20)).toEqual([0, 1000])
  })

  it("pans and stops at the ends", () => {
    expect(panWindow([100, 300], 50, full, 20)).toEqual([150, 350])
    expect(panWindow([100, 300], -500, full, 20)).toEqual([0, 200])
  })

  it("reveals an index outside the window by moving it as little as possible", () => {
    expect(revealIndex([100, 300], xs, 35, full, 20)).toEqual([150, 350])
    expect(revealIndex([100, 300], xs, 5, full, 20)).toEqual([50, 250])
    const inside = [100, 300] as const
    expect(revealIndex(inside, xs, 20, full, 20)).toBe(inside)
  })

  it("draws one sample past each edge and reports the samples inside", () => {
    expect(windowIndices(xs, [105, 295])).toEqual([10, 30])
    expect(insideIndices(xs, [105, 295])).toEqual([11, 29])
    expect(isFullWindow([0, 1000], full)).toBe(true)
    expect(isFullWindow([0, 990], full)).toBe(false)
  })

  it("previews a window as a matrix of the committed one", () => {
    const { scale, shift } = previewMatrix([0, 100], [25, 75], 10, 210)
    // x = 25 (drawn at 60) moves to the plot's start, x = 75 (drawn at 160) to its end.
    expect(scale * 60 + shift).toBeCloseTo(10)
    expect(scale * 160 + shift).toBeCloseTo(210)
  })
})

describe("useXWindow", () => {
  it("is uncontrolled by default, reports Dates for time and null at the whole range", () => {
    const onChange = vi.fn()
    const times = xs.map((x) => x * 1000)
    const { result } = renderHook(() => useXWindow({ xs: times, time: true, onChange }))
    expect(result.current.zoomed).toBe(false)
    act(() => result.current.commit([100_000, 300_000]))
    expect(result.current.window).toEqual([100_000, 300_000])
    expect(result.current.zoomed).toBe(true)
    expect(onChange).toHaveBeenLastCalledWith([new Date(100_000), new Date(300_000)])
    act(() => result.current.commit(null))
    expect(result.current.zoomed).toBe(false)
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it("follows its controlled value", () => {
    const { result, rerender } = renderHook(({ value }) => useXWindow({ xs, time: false, value }), { initialProps: { value: [200, 400] as readonly [number, number] | null } })
    expect(result.current.window).toEqual([200, 400])
    act(() => result.current.commit([0, 100]))
    expect(result.current.window).toEqual([200, 400])
    rerender({ value: null })
    expect(result.current.zoomed).toBe(false)
  })

  it("keeps a window pinned to the latest sample moving with a live series", () => {
    const { result, rerender } = renderHook(({ data }) => useXWindow({ xs: data, time: false, defaultValue: [800, 1000] }), { initialProps: { data: xs } })
    expect(result.current.window).toEqual([800, 1000])
    rerender({ data: [...xs.slice(1), 1010] })
    expect(result.current.window).toEqual([810, 1010])
  })
})
