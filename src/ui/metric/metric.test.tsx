// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Metric, MetricSkeleton } from "./metric.js"

afterEach(cleanup)

const body = (container: HTMLElement) => container.querySelector(".fa-metric-body")!

describe("Metric sparklineFill", () => {
  it("is off by default", () => {
    const { container } = render(<Metric label="CPU" value={34} data={[1, 2, 3]} />)
    expect(body(container).hasAttribute("data-sparkline")).toBe(false)
  })

  it("marks the body, and the skeleton takes the same mark", () => {
    const loaded = render(<Metric label="CPU" value={34} data={[1, 2, 3]} sparklineFill />)
    expect(body(loaded.container).getAttribute("data-sparkline")).toBe("fill")
    const skeleton = render(<MetricSkeleton sparklineFill />)
    expect(body(skeleton.container).getAttribute("data-sparkline")).toBe("fill")
  })
})

describe("Metric as a link (#29)", () => {
  it("is a group by default", () => {
    const { getByRole } = render(<Metric label="Open jobs" value={14} />)
    expect(getByRole("group", { name: "Open jobs" })).toBeTruthy()
  })

  it("becomes a link named by its label and value with href", () => {
    const { getByRole } = render(<Metric label="Open jobs" value={14} href="/jobs?view=open" />)
    const link = getByRole("link", { name: "Open jobs: 14" })
    expect(link).toHaveAttribute("href", "/jobs?view=open")
    expect(link).toHaveClass("fa-metric", "fa-pressable")
    expect(link).toHaveAttribute("data-link")
  })

  it("renders a router's link with render", () => {
    const { getByRole } = render(<Metric label="Overdue" value={3} unit="items" render={<a href="/overdue" data-router="" />} />)
    const link = getByRole("link", { name: /^Overdue: 3\sitems$/ })
    expect(link).toHaveAttribute("data-router")
    expect(link.querySelector(".fa-metric-value")?.textContent).toMatch(/^3\sitems$/)
  })
})
