// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useSelectedId, type SelectionChangeDetails } from "./use-selected-id.js"

type Item = { id: string }
const details = (item: Item | null): SelectionChangeDetails<Item> => ({ reason: "item-press", event: undefined, item })

describe("useSelectedId", () => {
  it("keeps its own selection when uncontrolled and reports changes only", () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useSelectedId<Item>(undefined, "a", onChange))
    expect(result.current[0]).toBe("a")
    act(() => result.current[1]("a", details({ id: "a" })))
    expect(onChange).not.toHaveBeenCalled()
    act(() => result.current[1]("b", details({ id: "b" })))
    expect(result.current[0]).toBe("b")
    expect(onChange).toHaveBeenCalledWith("b", details({ id: "b" }))
    act(() => result.current[1](null, { reason: "escape-key", event: undefined, item: null }))
    expect(result.current[0]).toBeNull()
    expect(onChange).toHaveBeenLastCalledWith(null, { reason: "escape-key", event: undefined, item: null })
  })

  it("starts with nothing selected without a default", () => {
    const { result } = renderHook(() => useSelectedId<Item>(undefined, undefined, undefined))
    expect(result.current[0]).toBeNull()
  })

  it("follows selectedId when controlled, null included", () => {
    const onChange = vi.fn()
    const { result, rerender } = renderHook(({ id }) => useSelectedId<Item>(id, "ignored", onChange), {
      initialProps: { id: "x" as string | null },
    })
    act(() => result.current[1]("y", details({ id: "y" })))
    expect(result.current[0]).toBe("x")
    expect(onChange).toHaveBeenCalledWith("y", details({ id: "y" }))
    // Not accepted: pressing the same item again asks again.
    act(() => result.current[1]("y", details({ id: "y" })))
    expect(onChange).toHaveBeenCalledTimes(2)
    rerender({ id: null })
    expect(result.current[0]).toBeNull()
  })
})
