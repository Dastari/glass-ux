// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useControllable } from "./use-controllable.js"

describe("useControllable", () => {
  it("keeps its own state when uncontrolled and reports every change", () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useControllable<string>(undefined, "a", onChange))
    expect(result.current[0]).toBe("a")
    act(() => result.current[1]("b"))
    expect(result.current[0]).toBe("b")
    expect(onChange).toHaveBeenLastCalledWith("b")
    act(() => result.current[1]("b"))
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it("follows the value prop when controlled and only reports a change", () => {
    const onChange = vi.fn()
    const { result, rerender } = renderHook(({ value }) => useControllable<string>(value, "a", onChange), {
      initialProps: { value: "x" as string | undefined },
    })
    act(() => result.current[1]("y"))
    expect(result.current[0]).toBe("x")
    expect(onChange).toHaveBeenCalledWith("y")
    rerender({ value: "y" })
    expect(result.current[0]).toBe("y")
  })

  it("treats null as a controlled value", () => {
    const { result } = renderHook(() => useControllable<string | null>(null, "fallback"))
    expect(result.current[0]).toBeNull()
    act(() => result.current[1]("typed"))
    expect(result.current[0]).toBeNull()
  })

  it("returns the same setter across renders, value changes and new callbacks", () => {
    const { result, rerender } = renderHook(({ value, onChange }) => useControllable<number>(value, 0, onChange), {
      initialProps: { value: undefined as number | undefined, onChange: vi.fn() },
    })
    const setter = result.current[1]
    act(() => setter(1))
    const latest = vi.fn()
    rerender({ value: 5, onChange: latest })
    expect(result.current[1]).toBe(setter)
    act(() => setter((previous) => previous + 1))
    // The stable setter sees the latest props: the controlled value and the new callback.
    expect(latest).toHaveBeenCalledWith(6)
  })

  it("composes successive updaters within one event", () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useControllable<number>(undefined, 0, onChange))
    act(() => {
      result.current[1]((n) => n + 1)
      result.current[1]((n) => n + 1)
    })
    expect(result.current[0]).toBe(2)
    expect(onChange.mock.calls).toEqual([[1], [2]])
  })

  it("composes updaters on a controlled value before the parent re-renders", () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useControllable<number>(10, 0, onChange))
    act(() => {
      result.current[1]((n) => n + 1)
      result.current[1]((n) => n * 2)
    })
    expect(onChange.mock.calls).toEqual([[11], [22]])
    expect(result.current[0]).toBe(10)
  })

  it("builds on the shown value again once a controlling parent rejects an update", async () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useControllable<number>(10, 0, onChange))
    await act(async () => result.current[1]((n) => n + 1))
    await act(async () => result.current[1]((n) => n + 1))
    expect(onChange.mock.calls).toEqual([[11], [11]])
  })
})
