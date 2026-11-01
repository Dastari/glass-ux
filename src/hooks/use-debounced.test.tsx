// @vitest-environment jsdom
import { act, cleanup, render, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDebouncedCallback, useDebouncedValue } from "./index.js"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("useDebouncedValue", () => {
  it("returns the first value at once and later ones after the quiet", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), { initialProps: { value: "a" } })
    expect(result.current).toBe("a")
    rerender({ value: "ab" })
    act(() => { vi.advanceTimersByTime(150) })
    rerender({ value: "abc" })
    act(() => { vi.advanceTimersByTime(150) })
    expect(result.current).toBe("a")
    act(() => { vi.advanceTimersByTime(60) })
    expect(result.current).toBe("abc")
  })

  it("cancels the wait when the value returns to the one shown", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), { initialProps: { value: 1 } })
    rerender({ value: 2 })
    rerender({ value: 1 })
    expect(vi.getTimerCount()).toBe(0)
    expect(result.current).toBe(1)
  })
})

describe("useDebouncedCallback", () => {
  it("calls once with the last arguments after the quiet, using the latest callback", () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(({ callback }) => useDebouncedCallback(callback, 100), { initialProps: { callback: first } })
    result.current("a")
    result.current("b")
    rerender({ callback: second })
    act(() => { vi.advanceTimersByTime(100) })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledWith("b")
  })

  it("keeps one identity, and cancel, flush and pending control the waiting call", () => {
    const callback = vi.fn()
    const { result, rerender } = renderHook(() => useDebouncedCallback(callback, 100))
    const initial = result.current
    rerender()
    expect(result.current).toBe(initial)
    result.current("x")
    expect(result.current.pending()).toBe(true)
    result.current.cancel()
    expect(result.current.pending()).toBe(false)
    act(() => { vi.advanceTimersByTime(200) })
    expect(callback).not.toHaveBeenCalled()
    result.current("y")
    result.current.flush()
    expect(callback).toHaveBeenCalledWith("y")
    expect(vi.getTimerCount()).toBe(0)
  })

  it("can call on the leading edge of a burst", () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 100, { leading: true }))
    result.current(1)
    result.current(2)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenLastCalledWith(1)
    act(() => { vi.advanceTimersByTime(100) })
    expect(callback).toHaveBeenLastCalledWith(2)
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it("drops a waiting call when the component unmounts", () => {
    const callback = vi.fn()
    function Probe() {
      useDebouncedCallback(callback, 100)("late")
      return null
    }
    const { unmount } = render(<Probe />)
    unmount()
    act(() => { vi.advanceTimersByTime(200) })
    expect(callback).not.toHaveBeenCalled()
  })
})
