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
