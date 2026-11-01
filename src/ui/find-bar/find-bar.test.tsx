// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useRef, useState } from "react"
import { FindBar, type FindBarProps } from "./index.js"

beforeEach(() => {
  vi.useFakeTimers()
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
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const count = (root: HTMLElement) => root.querySelector(".fa-find-bar-count > span:last-child")?.textContent
const term = () => screen.getByRole("textbox", { name: "Find" })
const status = () => screen.getByRole("status", { hidden: true })
const settle = () => act(() => vi.advanceTimersByTime(500))

describe("FindBar count", () => {
  it.each<[string, FindBarProps, string]>([
    ["nothing typed", { matchCount: 3 }, ""],
    ["a position", { defaultValue: "a", matchCount: 128, matchIndex: 2 }, "3 of 128"],
    ["a total without a position", { defaultValue: "a", matchCount: 128 }, "128"],
    ["a climbing count", { defaultValue: "a", matchCount: 128, searching: true }, "128+"],
    ["a climbing position", { defaultValue: "a", matchCount: 128, matchIndex: 0, searching: true }, "1 of 128+"],
    ["the search starting", { defaultValue: "a", matchCount: 0, searching: true }, "Searching…"],
    ["no matches", { defaultValue: "a", matchCount: 0 }, "No matches"],
    ["a large count", { defaultValue: "a", matchCount: 1_248_000, matchIndex: 12_399 }, "12.4K of 1.2M"],
    ["no count yet", { defaultValue: "a" }, ""],
  ])("shows %s", (_, props, expected) => {
    const { container } = render(<FindBar {...props} />)
    expect(count(container)).toBe(expected)
  })

  it("reserves its widest forms in the same cell", () => {
    const { container } = render(<FindBar defaultValue="a" matchCount={1} />)
    const sizers = [...container.querySelectorAll(".fa-find-bar-sizer")].map((element) => element.textContent)
    expect(sizers).toEqual(["9,999 of 9,999+", "No matches", "Searching…"])
  })
})

describe("FindBar announcements", () => {
  it("keeps the region mounted and quiet until something is known", () => {
    render(<FindBar />)
    expect(status().textContent).toBe("")
    settle()
    expect(status().textContent).toBe("")
  })

  it("keeps a climbing count out, then announces the settled count once", () => {
    const { rerender } = render(<FindBar defaultValue="a" matchCount={10} searching />)
    settle()
    expect(status().textContent).toBe("Searching…")
    rerender(<FindBar defaultValue="a" matchCount={2_000} searching />)
    settle()
    expect(status().textContent).toBe("Searching…")
    rerender(<FindBar defaultValue="a" matchCount={2_412} />)
    expect(status().textContent).toBe("Searching…")
    settle()
    expect(status().textContent).toBe("2,412 matches")
  })

  it("announces the current match while searching, without the total", () => {
    render(<FindBar defaultValue="a" matchCount={10} matchIndex={3} searching />)
    settle()
    expect(status().textContent).toBe("Match 4, still searching")
  })

  it("announces a position, no matches and a singular", () => {
    const { rerender } = render(<FindBar defaultValue="a" matchCount={8} matchIndex={1} />)
    settle()
    expect(status().textContent).toBe("Match 2 of 8")
    rerender(<FindBar defaultValue="a" matchCount={1} />)
    settle()
    expect(status().textContent).toBe("1 match")
    rerender(<FindBar defaultValue="a" matchCount={0} />)
    settle()
    expect(status().textContent).toBe("No matches")
  })

  it("waits for typing to pause", () => {
    const { rerender } = render(<FindBar defaultValue="a" matchCount={8} />)
    act(() => vi.advanceTimersByTime(200))
    rerender(<FindBar defaultValue="a" matchCount={4} />)
    act(() => vi.advanceTimersByTime(200))
    expect(status().textContent).toBe("")
    settle()
    expect(status().textContent).toBe("4 matches")
  })
})

describe("FindBar keys and buttons", () => {
  it("moves with Enter and Shift+Enter, and leaves IME composition alone", () => {
    const onNext = vi.fn()
    const onPrevious = vi.fn()
    render(<FindBar defaultValue="a" matchCount={2} onNext={onNext} onPrevious={onPrevious} />)
    fireEvent.keyDown(term(), { key: "Enter" })
    fireEvent.keyDown(term(), { key: "Enter", shiftKey: true })
    fireEvent.keyDown(term(), { key: "Enter", isComposing: true })
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrevious).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "Next match" }))
    expect(onNext).toHaveBeenCalledTimes(2)
  })

  it("keeps previous and next focusable with a reason when nothing matches", () => {
    const onNext = vi.fn()
    render(<FindBar defaultValue="a" matchCount={0} onNext={onNext} />)
    const next = screen.getByRole("button", { name: "Next match" })
    expect(next.getAttribute("aria-disabled")).toBe("true")
    expect(next.getAttribute("aria-description")).toBe("No matches")
    fireEvent.click(next)
    fireEvent.keyDown(term(), { key: "Enter" })
    expect(onNext).not.toHaveBeenCalled()
  })

  it("controls and leaves uncontrolled the term", () => {
    const onValueChange = vi.fn()
    const { rerender } = render(<FindBar value="a" onValueChange={onValueChange} />)
    fireEvent.change(term(), { target: { value: "ab" } })
    expect(onValueChange).toHaveBeenCalledWith("ab")
    expect((term() as HTMLInputElement).value).toBe("a")
    rerender(<FindBar defaultValue="x" key="uncontrolled" />)
    fireEvent.change(term(), { target: { value: "xy" } })
    expect((term() as HTMLInputElement).value).toBe("xy")
  })

  it("renders the toggles slot and is a search landmark", () => {
    render(<FindBar aria-label="Find in log" toggles={<button aria-pressed="false">Case</button>} />)
    expect(screen.getByRole("search", { name: "Find in log" }).contains(screen.getByRole("button", { name: "Case" }))).toBe(true)
  })
})

describe("FindBar replace", () => {
  const replaceProps = { defaultValue: "a", matchCount: 2 }

  it("offers no row without a handler", () => {
    render(<FindBar {...replaceProps} />)
    expect(screen.queryByRole("button", { name: "Show replace" })).toBeNull()
  })

  it("opens the row, replaces and replaces all", () => {
    const onReplace = vi.fn()
    const onReplaceAll = vi.fn()
    render(<FindBar {...replaceProps} onReplace={onReplace} onReplaceAll={onReplaceAll} />)
    const disclosure = screen.getByRole("button", { name: "Show replace" })
    expect(disclosure.getAttribute("aria-expanded")).toBe("false")
    fireEvent.click(disclosure)
    expect(screen.getByRole("button", { name: "Hide replace" }).getAttribute("aria-expanded")).toBe("true")
    const field = screen.getByRole("textbox", { name: "Replace with" })
    fireEvent.change(field, { target: { value: "b" } })
    fireEvent.keyDown(field, { key: "Enter" })
    expect(onReplace).toHaveBeenLastCalledWith("b")
    fireEvent.click(screen.getByRole("button", { name: "Replace all" }))
    expect(onReplaceAll).toHaveBeenCalledWith("b")
  })

  it("does not replace when nothing matches", () => {
    const onReplace = vi.fn()
    render(<FindBar defaultValue="a" matchCount={0} defaultReplaceOpen onReplace={onReplace} />)
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Replace with" }), { key: "Enter" })
    fireEvent.click(screen.getByRole("button", { name: "Replace" }))
    expect(onReplace).not.toHaveBeenCalled()
  })
})

describe("FindBar focus", () => {
  function Host({ useRefTarget = false }: { useRefTarget?: boolean }) {
    const [open, setOpen] = useState(false)
    const other = useRef<HTMLButtonElement>(null)
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        <button ref={other}>Other</button>
        <FindBar open={open} onOpenChange={setOpen} returnFocusRef={useRefTarget ? other : undefined} />
      </>
    )
  }

  it("focuses the term when it opens and returns focus on Escape", () => {
    render(<Host />)
    const opener = screen.getByRole("button", { name: "Open" })
    opener.focus()
    fireEvent.click(opener)
    expect(document.activeElement).toBe(term())
    fireEvent.keyDown(term(), { key: "Escape" })
    expect(screen.queryByRole("search")).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it("returns focus from the close button to returnFocusRef", () => {
    render(<Host useRefTarget />)
    fireEvent.click(screen.getByRole("button", { name: "Open" }))
    screen.getByRole("button", { name: "Close find" }).focus()
    fireEvent.click(screen.getByRole("button", { name: "Close find" }))
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Other" }))
  })

  it("leaves focus alone on first render unless asked", () => {
    const first = render(<FindBar />)
    expect(document.activeElement).toBe(document.body)
    first.unmount()
    render(<FindBar autoFocus defaultValue="cedar" />)
    expect(document.activeElement).toBe(term())
    expect((term() as HTMLInputElement).selectionEnd).toBe(5)
  })

  it("returns focus when the host unmounts it", () => {
    function Unmounting() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(!open)}>Toggle</button>
          {open ? <FindBar autoFocus /> : null}
        </>
      )
    }
    render(<Unmounting />)
    const toggle = screen.getByRole("button", { name: "Toggle" })
    toggle.focus()
    fireEvent.click(toggle)
    expect(document.activeElement).toBe(term())
    act(() => toggle.click())
    expect(document.activeElement).toBe(toggle)
  })

  it("does not take the press from an inner control that handled Escape", () => {
    const onOpenChange = vi.fn()
    render(<FindBar onOpenChange={onOpenChange} toggles={<button onKeyDown={(event) => event.preventDefault()}>Menu</button>} />)
    fireEvent.keyDown(screen.getByRole("button", { name: "Menu" }), { key: "Escape" })
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
