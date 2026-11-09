// @vitest-environment jsdom
// tokens:allow-file colour values under test
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { APPEARANCE_STORAGE_KEY, AppearanceProvider, configureAppearance } from "../../lib/appearance/index.js"
import { AppearanceSettings } from "./index.js"

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })),
  )
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  HTMLCanvasElement.prototype.getContext = (() => null) as never
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  configureAppearance({})
  vi.unstubAllGlobals()
})

/** A Segmented by name (its SettingRow and FormGroup can carry the same name). */
const segmented = (name: string, required = true) => {
  const found = screen.queryAllByRole("group", { name }).find((element) => element.classList.contains("fa-segmented"))
  if (!found && required) throw new Error(`No Segmented named ${name}`)
  return found as HTMLElement
}

const stored = () => JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "{}")

describe("AppearanceSettings", () => {
  it("applies a background choice at once and stores it", () => {
    render(
      <AppearanceProvider>
        <AppearanceSettings sections={["background"]} />
      </AppearanceProvider>,
    )
    const group = screen.getByRole("radiogroup", { name: "Background" })
    fireEvent.click(within(group).getByRole("radio", { name: "Forest" }))
    expect(stored().background).toBe("forest")
  })

  it("shows locked settings as set by the organisation, or hides them", () => {
    configureAppearance({ locked: { glass: "solid" } })
    const { rerender } = render(
      <AppearanceProvider>
        <AppearanceSettings sections={["display"]} />
      </AppearanceProvider>,
    )
    expect(screen.getByText("Set by your organisation")).toBeTruthy()
    rerender(
      <AppearanceProvider>
        <AppearanceSettings sections={["display"]} locked="hide" />
      </AppearanceProvider>,
    )
    expect(screen.queryByText("Material")).toBeNull()
    expect(screen.getByText("Density")).toBeTruthy()
  })

  it("sets a custom accent and clears it when a palette is chosen", () => {
    render(
      <AppearanceProvider>
        <AppearanceSettings sections={["colours"]} />
      </AppearanceProvider>,
    )
    const accent = screen.getByRole("textbox", { name: "Accent colour" })
    fireEvent.change(accent, { target: { value: "#e8710a" } })
    fireEvent.blur(accent)
    expect(stored().accentColor).toBe("#e8710a")
    expect(document.documentElement.style.getPropertyValue("--accent-h")).not.toBe("")
  })

  it("offers Glass or Flat when the style group is asked for, applies it and resets it", () => {
    render(
      <AppearanceProvider>
        <AppearanceSettings sections={["style"]} />
      </AppearanceProvider>,
    )
    const style = segmented("Style")
    fireEvent.click(within(style).getByRole("button", { name: "Flat" }))
    expect(stored().style).toBe("flat")
    expect(document.documentElement.dataset.style).toBe("flat")
    fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }))
    expect(document.documentElement.dataset.style).toBe("glass")
  })

  it("leaves the style group out by default", () => {
    render(
      <AppearanceProvider>
        <AppearanceSettings />
      </AppearanceProvider>,
    )
    expect((segmented("Style", false) ?? null)).toBeNull()
  })

  it("in Flat, fixes Material, Background and Animation with a note, keeps Density, and restores them in Glass", () => {
    configureAppearance({ defaults: { style: "flat", glass: "reduced", background: "forest" } })
    const panel = (flat?: "disable" | "hide") => (
      <AppearanceProvider>
        <AppearanceSettings sections={["style", "background", "display"]} flat={flat} />
      </AppearanceProvider>
    )
    const { rerender } = render(panel())
    const material = segmented("Material")
    expect(within(material).getByRole("button", { name: "Frosted" }).getAttribute("aria-pressed")).toBe("true")
    expect(within(material).getByRole("button", { name: "Glass" }).hasAttribute("disabled")).toBe(true)
    expect(within(segmented("Animation")).getByRole("button", { name: "Still" }).hasAttribute("disabled")).toBe(true)
    expect(within(screen.getByRole("radiogroup", { name: "Background" })).getByRole("radio", { name: "Forest" }).hasAttribute("data-disabled")).toBe(true)
    expect(screen.getAllByText("Not used in Flat.")).toHaveLength(3)
    expect(within(segmented("Density")).getByRole("button", { name: "Compact" }).hasAttribute("disabled")).toBe(false)

    rerender(panel("hide"))
    expect((segmented("Material", false) ?? null)).toBeNull()
    expect(screen.queryByRole("radiogroup", { name: "Background" })).toBeNull()
    expect(segmented("Density")).toBeTruthy()

    fireEvent.click(within(segmented("Style")).getByRole("button", { name: "Glass" }))
    const restored = segmented("Material")
    expect(within(restored).getByRole("button", { name: "Frosted" }).getAttribute("aria-pressed")).toBe("true")
    expect(within(restored).getByRole("button", { name: "Frosted" }).hasAttribute("disabled")).toBe(false)
    expect(within(screen.getByRole("radiogroup", { name: "Background" })).getByRole("radio", { name: "Forest" }).getAttribute("aria-checked")).toBe("true")
    expect(document.documentElement.dataset.background).toBe("forest")
  })
})
