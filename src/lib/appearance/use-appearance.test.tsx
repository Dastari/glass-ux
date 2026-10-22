// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act } from "@testing-library/react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { AppearanceProvider, useAppearance } from "./use-appearance.js"
import { APPEARANCE_STORAGE_KEY } from "./appearance.js"

let renders = 0
function Consumer() {
  const { appearance } = useAppearance()
  renders += 1
  return <span>{appearance.density}</span>
}

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
  localStorage.clear()
  renders = 0
})
afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ""
})

async function hydrate() {
  const container = document.createElement("div")
  document.body.append(container)
  container.innerHTML = renderToString(
    <AppearanceProvider>
      <Consumer />
    </AppearanceProvider>
  )
  renders = 0
  await act(async () => {
    hydrateRoot(
      container,
      <AppearanceProvider>
        <Consumer />
      </AppearanceProvider>
    )
  })
  return container
}

describe("AppearanceProvider hydration", () => {
  it("renders consumers once when nothing is stored", async () => {
    await hydrate()
    expect(renders).toBe(1)
  })

  it("renders consumers once when the stored preferences are the defaults", async () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ density: "comfortable" }))
    await hydrate()
    expect(renders).toBe(1)
  })

  it("re-renders with stored preferences that differ from the defaults", async () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ density: "compact" }))
    const container = await hydrate()
    expect(container.textContent).toBe("compact")
  })
})
