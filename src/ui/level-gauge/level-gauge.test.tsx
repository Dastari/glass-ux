// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LevelGauge, levelSegments, type GaugeLevel } from "./level-gauge.js"

afterEach(cleanup)

const RISK: GaugeLevel<"low" | "moderate" | "high">[] = [
  { value: "low", label: "Low", tone: "success" },
  { value: "moderate", label: "Moderate", tone: "warning" },
  { value: "high", label: "High", tone: "danger" },
]

describe("levelSegments", () => {
  it("fills to the level, traces down from a higher earlier level and stripes up from a lower one", () => {
    expect(levelSegments(3, 1, -1)).toEqual(["filled", "filled", "empty"])
    expect(levelSegments(3, 1, 2)).toEqual(["filled", "filled", "traced"])
    expect(levelSegments(3, 2, 0)).toEqual(["filled", "risen", "risen"])
    expect(levelSegments(3, -1, 2)).toEqual(["empty", "empty", "empty"])
  })
})

describe("LevelGauge", () => {
  it("names the level and the earlier one, and paints segments in the right tones", () => {
    const { container } = render(<LevelGauge label="Final risk" levels={RISK} value="moderate" previous="high" previousLabel="Before mitigation" />)
    expect(container.querySelector(".sr-only")!.textContent).toBe("Final risk: Moderate (Before mitigation: High)")
    const segments = [...container.querySelectorAll(".fa-level-gauge-segment")].map((segment) => [segment.getAttribute("data-state"), segment.getAttribute("data-tone")])
    expect(segments).toEqual([
      ["filled", "warning"],
      ["filled", "warning"],
      ["traced", "danger"],
    ])
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("is a button with the same name when it can be pressed", () => {
    const press = vi.fn()
    render(<LevelGauge label="Final risk" levels={RISK} value="low" onPress={press} size="md" />)
    fireEvent.click(screen.getByRole("button", { name: "Final risk: Low" }))
    expect(press).toHaveBeenCalledOnce()
  })

  it("shows the fallback for a value off the scale, with every segment empty", () => {
    const { container } = render(<LevelGauge label="Final risk" levels={RISK} value={null} />)
    expect(container.querySelector(".fa-level-gauge-value")!.textContent).toBe("Not rated")
    expect(container.querySelector(".sr-only")!.textContent).toBe("Final risk: Not rated")
    expect(container.querySelectorAll('.fa-level-gauge-segment[data-state="empty"]')).toHaveLength(3)
  })
})
