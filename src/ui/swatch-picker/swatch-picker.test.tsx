// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SegmentedCollapseContext } from "../segmented/index.js"
import { SettingRow } from "../setting-row/index.js"
import { SwatchPicker, type SwatchOption } from "./swatch-picker.js"

const OPTIONS: SwatchOption[] = [
  { value: "ocean", label: "Ocean", palette: "ocean" },
  { value: "aurora", label: "Aurora", palette: "aurora" },
  { value: "ruby", label: "Ruby", palette: "ruby", disabled: true },
  { value: "tint", label: "Tint 3", colour: "var(--identity-3)" },
]

/** Room the stubbed layout gives the picker's parent, and the natural width of every swatch. */
let room = 1000
const NATURAL = 180

beforeEach(() => {
  room = 1000
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("room") ? room : 0
  })
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("fa-swatch-picker-measure-row") ? NATURAL : 0
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const picker = () => document.querySelector<HTMLElement>(".room > .fa-swatch-picker")!
const trigger = (name: RegExp | string = /^Palette: /) => screen.getByRole("button", { name })

async function openMenu() {
  await act(async () => {
    fireEvent.click(trigger())
  })
  return screen.findByRole("menu")
}

describe("SwatchPicker, full form", () => {
  it("draws every swatch while they fit, named by its label", () => {
    render(
      <div className="room">
        <SwatchPicker options={OPTIONS} defaultValue="ocean" aria-label="Palette" />
      </div>
    )
    expect(picker()).toHaveAttribute("data-form", "full")
    expect(screen.getByRole("group", { name: "Palette" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ocean" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Ruby" })).toBeDisabled()
  })

  it("is uncontrolled with defaultValue and never deselects the chosen swatch", () => {
    const onValueChange = vi.fn()
    render(
      <div className="room">
        <SwatchPicker options={OPTIONS} defaultValue="ocean" onValueChange={onValueChange} aria-label="Palette" />
      </div>
    )
    fireEvent.click(screen.getByRole("button", { name: "Aurora" }))
    expect(onValueChange).toHaveBeenCalledWith("aurora")
    expect(screen.getByRole("button", { name: "Aurora" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(screen.getByRole("button", { name: "Aurora" }))
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Aurora" })).toHaveAttribute("aria-pressed", "true")
  })

  it('wraps instead of folding with collapse="none"', () => {
    room = 40
    render(
      <div className="room">
        <SwatchPicker options={OPTIONS} defaultValue="ocean" collapse="none" aria-label="Palette" />
      </div>
    )
    expect(picker()).toHaveAttribute("data-form", "full")
    expect(picker()).not.toHaveAttribute("data-collapse")
    expect(document.querySelector(".fa-swatch-picker-measure")).toBeNull()
  })
})

describe("SwatchPicker, menu form", () => {
  it("folds to one menu button when the swatches do not fit the container", () => {
    room = 120
    render(
      <div className="room">
        <SwatchPicker options={OPTIONS} defaultValue="aurora" aria-label="Palette" />
      </div>
    )
    expect(picker()).toHaveAttribute("data-form", "menu")
    expect(screen.getByRole("group", { name: "Palette" })).toBeInTheDocument()
    expect(trigger()).toHaveAccessibleName("Palette: Aurora")
    expect(screen.queryByRole("button", { name: "Ocean" })).toBeNull()
  })

  it("keeps the trigger's content the same whatever the value, so its width cannot shift", () => {
    function Harness() {
      const [value, setValue] = useState("ocean")
      return (
        <div className="room">
          <button type="button" onClick={() => setValue("tint")}>
            Next
          </button>
          <SwatchPicker options={OPTIONS} value={value} onValueChange={setValue} collapse="menu" aria-label="Palette" />
        </div>
      )
    }
    render(<Harness />)
    const shape = () =>
      Array.from(trigger().children, (child) => `${child.tagName}.${child.getAttribute("class")}`).join(" ") + `|${trigger().textContent}`
    const before = shape()
    expect(trigger().textContent).toBe("")
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(trigger()).toHaveAccessibleName("Palette: Tint 3")
    expect(shape()).toBe(before)
  })

  it("lists every swatch with its name and a check on the chosen one; choosing calls onValueChange", async () => {
    const onValueChange = vi.fn()
    render(
      <div className="room">
        <SwatchPicker options={OPTIONS} defaultValue="ocean" onValueChange={onValueChange} collapse="menu" aria-label="Palette" />
      </div>
    )
    const menu = await openMenu()
    const items = Array.from(menu.querySelectorAll('[role="menuitemradio"]'))
    expect(items.map((item) => item.textContent)).toEqual(["Ocean", "Aurora", "Ruby", "Tint 3"])
    expect(screen.getByRole("menuitemradio", { name: "Ocean" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("menuitemradio", { name: "Ruby" })).toHaveAttribute("aria-disabled", "true")
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitemradio", { name: "Tint 3" }))
    })
    expect(onValueChange).toHaveBeenCalledWith("tint")
    expect(trigger()).toHaveAccessibleName("Palette: Tint 3")
  })

  it("stays on the controlled value until the owner changes it", async () => {
    const onValueChange = vi.fn()
    render(
      <div className="room">
        <SwatchPicker options={OPTIONS} value="ocean" onValueChange={onValueChange} collapse="menu" aria-label="Palette" />
      </div>
    )
    await openMenu()
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitemradio", { name: "Aurora" }))
    })
    expect(onValueChange).toHaveBeenCalledWith("aurora")
    expect(trigger()).toHaveAccessibleName("Palette: Ocean")
  })

  // Arrow keys and Enter inside the menu are Base UI's; e2e/swatch-fit.spec.ts drives them in a browser.
  it("closes on Escape and returns focus to the trigger", async () => {
    render(
      <div className="room">
        <SwatchPicker options={OPTIONS} defaultValue="ocean" collapse="menu" aria-label="Palette" />
      </div>
    )
    const menu = await openMenu()
    await act(async () => {
      fireEvent.keyDown(menu, { key: "Escape" })
    })
    await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
    expect(trigger()).toHaveFocus()
  })

  it("shows an empty swatch and says so when nothing is chosen", () => {
    render(
      <div className="room">
        <SwatchPicker options={OPTIONS} value={null} collapse="menu" aria-label="Palette" />
      </div>
    )
    expect(trigger()).toHaveAccessibleName("Palette: none")
    expect(trigger().querySelector(".fa-swatch-picker-dot")).toHaveAttribute("data-empty")
  })

  it("is named by a SettingRow's label and the chosen colour", () => {
    render(<SettingRow label="Accent" control={<SwatchPicker options={OPTIONS} defaultValue="aurora" collapse="menu" />} />)
    expect(document.querySelector(".fa-swatch-picker")).toHaveAccessibleName("Accent")
    expect(screen.getByRole("button", { name: "Accent Aurora" })).toBeInTheDocument()
  })

  it("takes the host's SegmentedCollapseContext; its own collapse prop wins", () => {
    render(
      <SegmentedCollapseContext value="menu">
        <div className="room">
          <SwatchPicker options={OPTIONS} defaultValue="ocean" aria-label="Palette" />
        </div>
        <div className="room">
          <SwatchPicker options={OPTIONS} defaultValue="ocean" collapse="none" aria-label="Tint" />
        </div>
      </SegmentedCollapseContext>
    )
    expect(screen.getByRole("group", { name: "Palette" })).toHaveAttribute("data-form", "menu")
    expect(screen.getByRole("group", { name: "Tint" })).toHaveAttribute("data-form", "full")
  })

  it("disables the trigger with the group", () => {
    render(
      <div className="room">
        <SwatchPicker options={OPTIONS} defaultValue="ocean" collapse="menu" disabled aria-label="Palette" />
      </div>
    )
    expect(trigger()).toBeDisabled()
  })
})
