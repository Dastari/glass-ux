// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAnnounce, type Announce } from "./index.js"

let announce: Announce = () => {}
function Probe() {
  announce = useAnnounce()
  return null
}

const regions = () => [...document.querySelectorAll<HTMLElement>("[data-fa-announcer]")]
const speak = (run: () => void, wait = 200) => act(() => { run(); vi.advanceTimersByTime(wait) })

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  act(() => { vi.advanceTimersByTime(1000) })
  vi.useRealTimers()
  document.body.innerHTML = ""
})

describe("useAnnounce", () => {
  it("mounts one polite live region before any message, and removes it after the last user unmounts", () => {
    const { unmount } = render(
      <>
        <Probe />
        <Probe />
      </>,
    )
    expect(regions()).toHaveLength(1)
    const [region] = regions()
    expect(region!.getAttribute("role")).toBe("status")
    expect(region!.getAttribute("aria-live")).toBe("polite")
    expect(region!.getAttribute("aria-atomic")).toBe("true")
    expect(region!.textContent).toBe("")
    unmount()
    act(() => { vi.advanceTimersByTime(10) })
    expect(regions()).toHaveLength(0)
  })

  it("keeps the region through an immediate unmount and remount (StrictMode)", () => {
    const first = render(<Probe />)
    first.unmount()
    render(<Probe />)
    act(() => { vi.advanceTimersByTime(10) })
    expect(regions()).toHaveLength(1)
  })

  it("speaks a message after the coalescing window, and the same message twice", () => {
    render(<Probe />)
    const [region] = regions()
    speak(() => announce("Saved"), 100)
    expect(region!.textContent).toBe("")
    act(() => { vi.advanceTimersByTime(100) })
    expect(region!.textContent).toBe("Saved")
    // The identical text again must change the DOM, or it is not announced.
    speak(() => announce("Saved"))
    expect(region!.textContent).toBe("Saved ")
    speak(() => announce("Saved"))
    expect(region!.textContent).toBe("Saved")
  })

  it("speaks messages from a burst together, in order, once, and lets a key replace its own", () => {
    render(<Probe />)
    const [region] = regions()
    speak(() => {
      announce("3 results", { key: "results" })
      announce("Moved to Done")
      announce("2 results", { key: "results" })
      announce("Moved to Done")
      announce("1 result.", { key: "results" })
    })
    expect(region!.textContent).toBe("Moved to Done. 1 result.")
  })

  it("clears the text after a while", () => {
    render(<Probe />)
    const [region] = regions()
    speak(() => announce("Copied"))
    expect(region!.textContent).toBe("Copied")
    act(() => { vi.advanceTimersByTime(5100) })
    expect(region!.textContent).toBe("")
  })

  it("speaks inside the topmost modal dialog, where a body region would be inert", () => {
    render(<Probe />)
    const dialog = document.createElement("div")
    dialog.setAttribute("role", "dialog")
    dialog.setAttribute("aria-modal", "true")
    document.body.append(dialog)
    const inner = document.createElement("div")
    inner.setAttribute("role", "alertdialog")
    dialog.append(inner)
    speak(() => announce("Draft discarded"))
    // The new region is primed first, then given its text.
    expect(inner.querySelector("[data-fa-announcer]")).toBeTruthy()
    act(() => { vi.advanceTimersByTime(200) })
    expect(inner.querySelector("[data-fa-announcer]")!.textContent).toBe("Draft discarded")
    expect(document.body.querySelector(":scope > [data-fa-announcer]")!.textContent).toBe("")
    // The dialog closes: the next message returns to the body.
    dialog.remove()
    speak(() => announce("Discarded"))
    expect(document.body.querySelector(":scope > [data-fa-announcer]")!.textContent).toBe("Discarded")
  })

  it("speaks inside the full-screen element", () => {
    render(<Probe />)
    const frame = document.createElement("div")
    document.body.append(frame)
    Object.defineProperty(document, "fullscreenElement", { value: frame, configurable: true })
    try {
      speak(() => announce("Entered full screen"), 400)
      expect(frame.querySelector("[data-fa-announcer]")!.textContent).toBe("Entered full screen")
    } finally {
      Reflect.deleteProperty(document, "fullscreenElement")
    }
  })

  it("renders on the server without a region and does nothing", () => {
    const html = renderToString(<Probe />)
    expect(html).toBe("")
    expect(() => announce("x")).not.toThrow()
  })

  it("returns one function for the lifetime of the component", () => {
    const seen: Announce[] = []
    function Collect() {
      seen.push(useAnnounce())
      return null
    }
    const { rerender } = render(<Collect />)
    rerender(<Collect />)
    expect(seen[0]).toBe(seen[1])
  })
})
