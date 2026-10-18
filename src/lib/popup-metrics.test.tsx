// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POPUP_METRICS_FALLBACK, readPopupMetrics, resetPopupMetricsForTests, usePopupMetrics } from "./popup-metrics.js"

/** jsdom resolves no var(), so stand in for the browser: tokens at a given --ui-scale. */
let scale = 1
let borderWidth = 1
let probeReads = 0
const realComputed = window.getComputedStyle.bind(window)

function stubTokens() {
  vi.spyOn(window, "getComputedStyle").mockImplementation((element: Element) => {
    if (element === document.documentElement) {
      return { getPropertyValue: (name: string) => (name === "--popup-offset" ? "var(--space-1-5)" : "") } as CSSStyleDeclaration
    }
    probeReads += 1
    const rem = 16 * scale
    return {
      paddingTop: `${0.375 * rem}px`,
      paddingRight: `${0.375 * rem + borderWidth}px`,
      paddingBottom: `${0.5 * rem}px`,
      paddingLeft: `${rem}px`,
    } as CSSStyleDeclaration
  })
}

const flush = () => act(async () => {
  await Promise.resolve()
  await Promise.resolve()
})

beforeEach(() => {
  resetPopupMetricsForTests()
  scale = 1
  borderWidth = 1
  probeReads = 0
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  document.documentElement.removeAttribute("style")
  resetPopupMetricsForTests()
})

function Probe() {
  const popup = usePopupMetrics()
  return <output data-offset={popup.offset} data-submenu={popup.submenuInset} data-collision={popup.collisionPadding} />
}

describe("popup metrics", () => {
  it("falls back to the scale-1 values on the server", () => {
    const html = renderToString(<Probe />)
    expect(html).toContain('data-offset="6"')
    expect(html).toContain('data-submenu="7"')
    expect(html).toContain('data-collision="8"')
  })

  it("falls back while the tokens are not loaded, and measures once they are", () => {
    expect(realComputed(document.documentElement).getPropertyValue("--popup-offset")).toBe("")
    expect(readPopupMetrics()).toBe(POPUP_METRICS_FALLBACK)
    stubTokens()
    scale = 1.25
    expect(readPopupMetrics()).toEqual({ offset: 7.5, pointerOffset: 3.75, submenuInset: 8.5, collisionPadding: 10, rem: 20 })
  })

  it("caches the measurement module-wide and removes its probe", () => {
    stubTokens()
    const first = readPopupMetrics()
    expect(readPopupMetrics()).toBe(first)
    expect(probeReads).toBe(1)
    expect(document.body.children).toHaveLength(0)
  })

  it("re-measures when <html> attributes change and re-renders subscribers", async () => {
    stubTokens()
    const { container } = render(<Probe />)
    const output = container.querySelector("output")!
    expect(output.dataset.offset).toBe("6")
    expect(output.dataset.submenu).toBe("7")

    scale = 1.25
    borderWidth = 2
    document.documentElement.style.setProperty("--ui-scale", "1.25")
    await flush()
    expect(output.dataset.offset).toBe("7.5")
    expect(output.dataset.submenu).toBe("9.5")
    expect(output.dataset.collision).toBe("10")
  })

  it("keeps the same snapshot when an attribute change moves nothing", async () => {
    stubTokens()
    render(<Probe />)
    const before = readPopupMetrics()
    document.documentElement.setAttribute("data-mode", "dark")
    await flush()
    expect(probeReads).toBe(2)
    expect(readPopupMetrics()).toBe(before)
  })

  it("coalesces a burst of attribute changes into one measurement", async () => {
    stubTokens()
    render(<Probe />)
    const reads = probeReads
    const root = document.documentElement
    root.setAttribute("data-density", "compact")
    root.style.setProperty("--ui-scale", "1.1")
    root.style.setProperty("--border-width", "2px")
    await flush()
    expect(probeReads).toBe(reads + 1)
  })
})
