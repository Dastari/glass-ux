// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { Accordion, Disclosure } from "../accordion/index.js"
import { OptionRow } from "../combobox/option-row.js"
import { MenuPreview } from "../menu/index.js"
import { Segmented } from "../segmented/index.js"
import { countText } from "./badge.js"

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

// jsdom has no layout: it joins the label and the badge without the space a browser puts
// between flex items. e2e/count-props.spec.ts checks the real names.
const named = (...parts: string[]) => new RegExp(`^${parts.join(" ?")}$`)

const icon = <svg className="fa-icon" />
const OPTIONS = [
  { value: "open", label: "Open", count: 12, icon },
  { value: "closed", label: "Closed", count: 1204, icon },
  { value: "all", label: "All", icon },
]

describe("countText", () => {
  it("uses locale digits and caps at max+", () => {
    expect(countText(1204, "en-US", 9999)).toBe("1,204")
    expect(countText(1204, "en-US")).toBe("999+")
    expect(countText(12, "ar-EG")).toBe("١٢")
  })
})

describe("Segmented count", () => {
  it("draws a count badge after the label, read with the segment's name", () => {
    render(<Segmented aria-label="Status" options={OPTIONS} collapse="none" />)
    const open = screen.getByRole("button", { name: named("Open", "12") })
    expect(open.querySelector(".fa-count")?.textContent).toBe("12")
    expect(screen.getByRole("button", { name: named("Closed", "999\\+") })).toBeTruthy()
    expect(screen.getByRole("button", { name: "All" }).querySelector(".fa-count")).toBeNull()
  })

  it("puts the count on the icon's corner in the icon form and keeps it in the name", () => {
    render(<Segmented aria-label="Status" options={OPTIONS} iconOnly collapse="none" />)
    const open = screen.getByRole("button", { name: named("Open", "12") })
    const badge = open.querySelector(".fa-count")
    expect(badge?.hasAttribute("data-overlay")).toBe(true)
    expect(badge?.getAttribute("aria-hidden")).toBe("true")
  })

  it("shows the chosen count on the menu button and each count in the menu", () => {
    render(<Segmented aria-label="Status" options={OPTIONS} value="open" collapse="menu" />)
    const trigger = screen.getByRole("button", { name: "Status: Open 12" })
    fireEvent.click(trigger)
    const closed = screen.getByRole("menuitemradio", { name: /Closed/ })
    expect(closed.querySelector(".fa-segmented-menu-count")?.textContent).toBe("1,204")
  })
})

describe("Menu count", () => {
  it("adds quiet trailing figures before the shortcut", () => {
    render(
      <MenuPreview.Surface label="Filters">
        <MenuPreview.Item count={4} shortcut="mod+1">
          Critical
        </MenuPreview.Item>
      </MenuPreview.Surface>,
    )
    const row = screen.getByText("Critical").closest(".fa-menu-item")!
    const count = row.querySelector(".fa-menu-count")!
    expect(count.textContent).toBe("4")
    expect(count.nextElementSibling?.classList.contains("fa-item-trail")).toBe(true)
  })
})

describe("Option count", () => {
  it("adds the count before meta in shared option rows", () => {
    render(
      <div role="option" aria-selected={false}>
        <OptionRow item={{ value: "c", label: "Critical", count: 4, meta: "P1" }} />
      </div>,
    )
    const option = screen.getByRole("option", { name: named("Critical", "4", "P1") })
    expect(option.querySelector(".fa-option-count")?.textContent).toBe("4")
  })
})

describe("Accordion count", () => {
  it("puts a count badge after the title, inside the trigger's name", () => {
    render(
      <Accordion.Root>
        <Accordion.Item value="a" title="Alerts" count={3} meta="Updated now">
          Body
        </Accordion.Item>
      </Accordion.Root>,
    )
    expect(screen.getByRole("button", { name: named("Alerts", "3", "Updated now") }).querySelector(".fa-accordion-count")?.textContent).toBe("3")
  })

  it("does the same for a Disclosure", () => {
    render(
      <Disclosure title="Warnings" count={2}>
        Body
      </Disclosure>,
    )
    expect(screen.getByRole("button", { name: named("Warnings", "2") })).toBeTruthy()
  })
})
