// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { Segmented } from "./segmented.js"

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
})
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())

const OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
]

describe("Segmented readOnly", () => {
  it("is a read-only radio group with the chosen answer as its one tab stop, and ignores presses", () => {
    const change = vi.fn()
    render(<Segmented aria-label="Livestock contact" options={OPTIONS} value="no" onValueChange={change} readOnly collapse="none" />)
    const group = screen.getByRole("radiogroup", { name: "Livestock contact" })
    expect(group.getAttribute("aria-readonly")).toBe("true")
    expect(group.hasAttribute("data-disabled")).toBe(false)
    const yes = screen.getByRole("radio", { name: "Yes" })
    const no = screen.getByRole("radio", { name: "No" })
    expect(no.getAttribute("aria-checked")).toBe("true")
    expect(no.tabIndex).toBe(0)
    expect(yes.hasAttribute("tabindex")).toBe(false)
    fireEvent.click(yes)
    fireEvent.keyDown(no, { key: "ArrowLeft" })
    expect(change).not.toHaveBeenCalled()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("shows the chosen answer alone in the menu form, without a menu", () => {
    render(<Segmented aria-label="Livestock contact" options={OPTIONS} value="yes" readOnly collapse="menu" />)
    const answer = screen.getByRole("radio", { name: "Yes" })
    expect(answer.getAttribute("aria-checked")).toBe("true")
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getAllByRole("radio")).toHaveLength(1)
  })
})
