// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Slider } from "./index.js"

afterEach(cleanup)

const fill = (container: HTMLElement) => {
  const indicator = container.querySelector<HTMLElement>(".fa-slider-indicator")!
  return {
    ranged: indicator.hasAttribute("data-range"),
    from: Number(indicator.style.getPropertyValue("--_from")),
    to: Number(indicator.style.getPropertyValue("--_to")),
  }
}

describe("Slider origin", () => {
  it("fills from the origin to the thumb on either side", () => {
    const { container, rerender } = render(<Slider aria-label="Exposure" min={-100} max={100} origin={0} value={50} />)
    expect(fill(container)).toEqual({ ranged: true, from: 0.5, to: 0.75 })
    rerender(<Slider aria-label="Exposure" min={-100} max={100} origin={0} value={-50} />)
    expect(fill(container)).toEqual({ ranged: true, from: 0.25, to: 0.5 })
    rerender(<Slider aria-label="Exposure" min={-100} max={100} origin={0} value={0} />)
    expect(fill(container)).toEqual({ ranged: true, from: 0.5, to: 0.5 })
  })

  it("lights the ticks between the origin and the value", () => {
    const { container } = render(<Slider aria-label="Tint" min={-2} max={2} origin={0} defaultValue={-1} marks />)
    const active = [...container.querySelectorAll(".fa-slider-tick")].map((tick) => tick.hasAttribute("data-active"))
    expect(active).toEqual([false, true, true, false, false])
  })

  it("follows the keyboard across the origin", () => {
    const { container } = render(<Slider aria-label="Tint" min={-2} max={2} origin={0} defaultValue={1} />)
    const slider = screen.getByRole("slider", { hidden: true })
    fireEvent.keyDown(slider, { key: "ArrowLeft" })
    fireEvent.keyDown(slider, { key: "ArrowLeft" })
    expect(fill(container)).toEqual({ ranged: true, from: 0.25, to: 0.5 })
  })

  it("leaves a slider without it, and a range, as they were", () => {
    expect(fill(render(<Slider aria-label="Volume" defaultValue={40} />).container)).toEqual({ ranged: false, from: 0, to: 0.4 })
    cleanup()
    const range = render(<Slider defaultValue={[20, 70]} origin={50} thumbLabels={["From", "To"]} />)
    expect(fill(range.container)).toEqual({ ranged: true, from: 0.2, to: 0.7 })
  })
})
