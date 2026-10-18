// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TruncatedText } from "./truncated-text.js"

let observers: StubObserver[] = []
let overflowing = new Set<string>()

class StubObserver {
  targets = new Set<Element>()
  constructor(readonly callback: ResizeObserverCallback) {
    observers.push(this)
  }
  observe(target: Element) {
    this.targets.add(target)
  }
  unobserve(target: Element) {
    this.targets.delete(target)
  }
  disconnect() {
    this.targets.clear()
  }
  /** Deliver one entry per observed element, as the browser does after layout. */
  flush() {
    const entries = [...this.targets].map((target) => ({ target }) as ResizeObserverEntry)
    act(() => this.callback(entries, this as unknown as ResizeObserver))
  }
}

beforeEach(() => {
  observers = []
  overflowing = new Set()
  // A new constructor per test also gives each test a fresh shared observer.
  vi.stubGlobal("ResizeObserver", class extends StubObserver {})
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
    return overflowing.has(this.textContent ?? "") ? 200 : 100
  })
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("TruncatedText", () => {
  it("shares one observer and creates no tooltip trigger for text that fits", () => {
    overflowing.add("Long identifier")
    render(
      <>
        <TruncatedText>Short</TruncatedText>
        <TruncatedText>Long identifier</TruncatedText>
      </>,
    )
    expect(observers).toHaveLength(1)
    observers[0]!.flush()
    const short = screen.getByText("Short")
    const long = screen.getByText("Long identifier")
    expect(short).not.toHaveAttribute("data-truncated")
    expect(short).not.toHaveAttribute("data-base-ui-tooltip-trigger")
    expect(short).not.toHaveAttribute("tabindex")
    expect(long).toHaveAttribute("data-truncated", "")
    expect(long).toHaveAttribute("data-base-ui-tooltip-trigger")
    expect(long).toHaveAttribute("tabindex", "0")
  })

  it("adds no tab stop inside a focusable control", () => {
    overflowing.add("Inside a button")
    render(
      <button type="button">
        <TruncatedText>Inside a button</TruncatedText>
      </button>,
    )
    observers[0]!.flush()
    const text = screen.getByText("Inside a button")
    expect(text).toHaveAttribute("data-truncated", "")
    expect(text).not.toHaveAttribute("tabindex")
  })

  it("re-measures when the text changes inside an unchanged box", () => {
    overflowing.add("Now much longer")
    const { rerender } = render(<TruncatedText>Fits</TruncatedText>)
    observers[0]!.flush()
    expect(screen.getByText("Fits")).not.toHaveAttribute("data-truncated")
    rerender(<TruncatedText>Now much longer</TruncatedText>)
    expect(screen.getByText("Now much longer")).toHaveAttribute("data-truncated", "")
    // The tooltip stays mounted once created, so the text keeps its node as it changes again.
    const node = screen.getByText("Now much longer")
    rerender(<TruncatedText>Fits</TruncatedText>)
    expect(screen.getByText("Fits")).toBe(node)
    expect(node).not.toHaveAttribute("data-truncated")
  })
})
