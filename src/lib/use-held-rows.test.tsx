// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useHeldRows, type HeldRowsOptions } from "./use-held-rows.js"

const start = (ids: readonly string[], options?: HeldRowsOptions) =>
  renderHook(({ list, opts }) => useHeldRows(list, opts), { initialProps: { list: ids, opts: options } })

describe("useHeldRows", () => {
  it("holds a row that lands before one already shown, and shows one after the end", () => {
    const hook = start(["a", "b"])
    hook.rerender({ list: ["new", "a", "b", "older"], opts: undefined })
    expect([...hook.result.current.held]).toEqual(["new"])
    act(() => hook.result.current.reveal())
    expect(hook.result.current.held.size).toBe(0)
  })

  it("shows rows at once while nothing is shown, then holds the next arrival", () => {
    const hook = start([])
    hook.rerender({ list: ["a", "b"], opts: undefined })
    expect(hook.result.current.held.size).toBe(0)
    hook.rerender({ list: ["c", "a", "b"], opts: undefined })
    expect([...hook.result.current.held]).toEqual(["c"])
  })

  it("holds appended rows when the end is what arrives, and lets a passed row through", () => {
    const opts: HeldRowsOptions = { appended: "hold", passes: (id) => id === "mine" }
    const hook = start(["a"], opts)
    hook.rerender({ list: ["a", "theirs", "mine"], opts })
    expect([...hook.result.current.held]).toEqual(["theirs"])
  })

  it("shows everything while off, and remembers it as seen", () => {
    const hook = start(["a"], { enabled: false })
    hook.rerender({ list: ["x", "a"], opts: { enabled: false } })
    expect(hook.result.current.held.size).toBe(0)
    hook.rerender({ list: ["x", "a"], opts: { enabled: true } })
    expect(hook.result.current.held.size).toBe(0)
  })
})
