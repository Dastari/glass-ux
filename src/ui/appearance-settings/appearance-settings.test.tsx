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
})
