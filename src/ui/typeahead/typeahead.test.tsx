// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react"
import { useRef, useState } from "react"
import { Typeahead, useTypeahead, type TypeaheadItem, type UseTypeaheadOptions } from "./index.js"
import { holdRows } from "./use-typeahead.js"

const rows = (...ids: string[]): TypeaheadItem[] => ids.map((id) => ({ id, label: id.toUpperCase() }))

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function setup(initial: Partial<UseTypeaheadOptions<TypeaheadItem>> = {}) {
  const onPick = vi.fn()
  const onClose = vi.fn()
  const base = { open: true, items: rows("a", "b", "c"), onPick, onClose, ...initial }
  const hook = renderHook((props: Partial<UseTypeaheadOptions<TypeaheadItem>>) => useTypeahead({ ...base, ...props }), { initialProps: {} })
  const key = (name: string, extra = {}) => {
    const event = { key: name, preventDefault: vi.fn(), ...extra }
    let used = false
    act(() => {
      used = hook.result.current.onKeyDown(event)
    })
    return { used, prevented: event.preventDefault.mock.calls.length > 0 }
  }
  return { ...hook, key, onPick, onClose }
}

describe("useTypeahead", () => {
  it("wraps the arrows, picks with Enter and Tab and closes on Escape", () => {
    const { result, key, onPick, onClose } = setup()
    expect(result.current.activeIndex).toBe(0)
    expect(key("ArrowUp")).toEqual({ used: true, prevented: true })
    expect(result.current.activeIndex).toBe(2)
    key("ArrowDown")
    expect(result.current.activeIndex).toBe(0)
    key("ArrowDown")
    key("Enter")
    expect(onPick).toHaveBeenLastCalledWith(expect.objectContaining({ id: "b" }))
    key("Tab")
    expect(onPick).toHaveBeenCalledTimes(2)
    expect(key("Escape").used).toBe(true)
    expect(onClose).toHaveBeenCalledWith("escape")
  })

  it("leaves every key to the text while closed, composing or typing", () => {
    expect(setup({ open: false }).key("ArrowDown")).toEqual({ used: false, prevented: false })
    const { key } = setup()
    expect(key("ArrowDown", { isComposing: true }).used).toBe(false)
    expect(key("ArrowDown", { nativeEvent: { isComposing: true } }).used).toBe(false)
    expect(key("a").used).toBe(false)
    expect(key("ArrowLeft").used).toBe(false)
  })

  it("lets Enter through when no rows show, but still closes on Escape", () => {
    const { key, onClose } = setup({ items: [] })
    expect(key("Enter").used).toBe(false)
    expect(key("Escape").used).toBe(true)
    expect(onClose).toHaveBeenCalled()
  })

  it("shows the host's rows untouched without a filter, and filters with one", () => {
    const items = rows("alpha", "beta")
    expect(setup({ items, query: "zz" }).result.current.items).toBe(items)
    const filtered = setup({ items, query: "be", filter: (item, query) => item.id.includes(query) })
    expect(filtered.result.current.items.map((item) => item.id)).toEqual(["beta"])
  })

  it("describes a single-line input as a combobox", () => {
    const { result, rerender } = setup({ id: "list" })
    expect(result.current.textProps).toEqual({
      role: "combobox",
      "aria-expanded": true,
      "aria-autocomplete": "list",
      "aria-haspopup": "listbox",
      "aria-controls": "list",
      "aria-activedescendant": "list-0",
    })
    rerender({ open: false })
    expect(result.current.textProps["aria-expanded"]).toBe(false)
    expect(result.current.textProps["aria-controls"]).toBeUndefined()
    expect(result.current.textProps["aria-activedescendant"]).toBeUndefined()
  })

  it("keeps multi-line text a textbox", () => {
    const { textProps } = setup({ id: "list", multiline: true }).result.current
    expect(textProps.role).toBeUndefined()
    expect("aria-expanded" in textProps).toBe(false)
    expect(textProps["aria-activedescendant"]).toBe("list-0")
  })

  it("names no list that is not there", () => {
    const { textProps } = setup({ items: [] }).result.current
    expect(textProps["aria-controls"]).toBeUndefined()
    expect(textProps["aria-activedescendant"]).toBeUndefined()
  })

  it("replaces rows that arrive before anyone has pointed or moved", () => {
    const { result, rerender } = setup({ query: "a" })
    rerender({ items: rows("z", "a", "b") })
    expect(result.current.items.map((item) => item.id)).toEqual(["z", "a", "b"])
  })

  it("holds rows under a moved pointer, adds late ones after them and commits on leaving", () => {
    const { result, rerender } = setup({ query: "a" })
    act(() => result.current.listProps.onPointerMove())
    rerender({ items: rows("z", "b", "a", "d") })
    expect(result.current.items.map((item) => item.id)).toEqual(["a", "b", "c", "z", "d"])
    act(() => result.current.listProps.onPointerLeave())
    expect(result.current.items.map((item) => item.id)).toEqual(["z", "b", "a", "d"])
  })

  it("does not count a pointer resting where the list opened", () => {
    const { result, rerender } = setup({ query: "a" })
    act(() => result.current.listProps.onPointerMove())
    rerender({ query: "ab" })
    rerender({ query: "ab", items: rows("x", "y") })
    expect(result.current.items.map((item) => item.id)).toEqual(["x", "y"])
  })

  it("holds rows after the arrows and keeps the highlight on the same item", () => {
    const { result, rerender, key } = setup({ query: "a" })
    key("ArrowDown")
    rerender({ items: rows("z", "b", "a") })
    expect(result.current.items.map((item) => item.id)).toEqual(["a", "b", "c", "z"])
    expect(result.current.activeItem?.id).toBe("b")
  })

  it("replaces rows and resets the highlight for a new query", () => {
    const { result, rerender, key } = setup({ query: "a" })
    key("ArrowDown")
    rerender({ query: "ab", items: rows("q", "r") })
    expect(result.current.items.map((item) => item.id)).toEqual(["q", "r"])
    expect(result.current.activeIndex).toBe(0)
  })

  it("updates a held row's data and keeps a row the host dropped", () => {
    expect(holdRows(rows("a", "b"), [{ id: "b", label: "New" }], (item) => item.id)).toEqual([
      { id: "a", label: "A" },
      { id: "b", label: "New" },
    ])
  })
})

function Demo({ items, loading, detail }: { items: TypeaheadItem[]; loading?: boolean; detail?: boolean }) {
  const anchor = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(true)
  const state = useTypeahead({ id: "people", open, items, onPick: () => setOpen(false), onClose: () => setOpen(false) })
  return (
    <>
      <input ref={anchor} aria-label="To" {...state.textProps} onKeyDown={state.onKeyDown} />
      <Typeahead
        state={state}
        anchor={{ x: 10, y: 10, width: 0, height: 16 }}
        label="People"
        loading={loading}
        reserveRows={loading === undefined ? undefined : 4}
        renderDetail={detail ? (item) => <p>{item.label} detail</p> : undefined}
      />
    </>
  )
}

describe("Typeahead", () => {
  it("draws a named listbox, leaves focus in the text and announces the count", async () => {
    render(<Demo items={rows("a", "b")} />)
    const input = screen.getByRole("combobox", { name: "To" })
    input.focus()
    const list = await screen.findByRole("listbox", { name: "People" })
    expect(within(list).getAllByRole("option")).toHaveLength(2)
    expect(input.getAttribute("aria-activedescendant")).toBe("people-0")
    expect(document.activeElement).toBe(input)
    expect(screen.getByRole("status", { hidden: true }).textContent).toBe("2 results")
  })

  it("keeps the status region mounted and empty when closed", async () => {
    render(<Demo items={rows("a")} />)
    const status = await screen.findByText("1 result")
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
    expect(status.isConnected).toBe(true)
    expect(status.textContent).toBe("")
  })

  it("says it is searching, then that nothing matched, without a listbox", async () => {
    const { rerender } = render(<Demo items={[]} loading />)
    expect(await screen.findAllByText("Searching…")).toHaveLength(2)
    expect(screen.queryByRole("listbox")).toBeNull()
    rerender(<Demo items={[]} loading={false} />)
    expect(await screen.findAllByText("No results")).toHaveLength(2)
  })

  it("reserves rows and describes the highlighted row with the detail pane", async () => {
    render(<Demo items={rows("a", "b")} loading={false} detail />)
    const option = await screen.findByRole("option", { name: "A" })
    expect(option.getAttribute("aria-describedby")).toBe("people-detail")
    expect(document.getElementById("people-detail")?.textContent).toBe("A detail")
    expect(option.closest(".fa-typeahead")?.hasAttribute("data-detail")).toBe(true)
    expect(option.closest<HTMLElement>(".fa-typeahead-scroll")?.style.getPropertyValue("--_rows")).toBe("4")
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" })
    expect(document.getElementById("people-detail")?.textContent).toBe("B detail")
  })
})
