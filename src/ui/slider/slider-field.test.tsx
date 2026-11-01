// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SliderField } from "./index.js"

afterEach(cleanup)

describe("SliderField", () => {
  it("names the slider with its label and shows the value on the same row", () => {
    const { container } = render(<SliderField label="Bandwidth limit" unit="Mbps" min={5} max={100} step={5} defaultValue={40} />)
    // jsdom does not resolve the name through aria-labelledby for a thumb it has not measured;
    // the browser spec (e2e/slider-field.spec.ts) asserts the computed name.
    const slider = screen.getByRole("slider", { hidden: true })
    expect(document.getElementById(slider.getAttribute("aria-labelledby")!)!.textContent).toBe("Bandwidth limit")
    expect(slider.getAttribute("aria-valuetext")).toBe("40\u2009Mbps")
    const row = container.querySelector(".fa-slider-field-row")!
    expect(row.querySelector(".fa-slider-field-live")!.textContent).toBe("40\u2009Mbps")
    expect(row.contains(slider)).toBe(true)
    expect(row.querySelector(".fa-slider-field-name")!.textContent).toContain("Bandwidth limit")
  })

  it("keeps the readout out of the accessibility tree", () => {
    const { container } = render(<SliderField label="Volume" defaultValue={30} />)
    expect(container.querySelector(".fa-slider-field-value")!.getAttribute("aria-hidden")).toBe("true")
  })

  it("works uncontrolled: the keyboard moves the value and the readout follows", () => {
    const change = vi.fn()
    const { container } = render(<SliderField label="Volume" defaultValue={30} onValueChange={change} />)
    fireEvent.keyDown(screen.getByRole("slider", { hidden: true }), { key: "ArrowRight" })
    expect(change).toHaveBeenLastCalledWith(31)
    expect(container.querySelector(".fa-slider-field-live")!.textContent).toBe("31")
  })

  it("works controlled: the value is the caller's", () => {
    function Controlled() {
      const [value, setValue] = useState(10)
      return (
        <>
          <SliderField label="Zoom" unit="%" value={value} onValueChange={setValue} max={200} />
          <button type="button" onClick={() => setValue(150)}>
            Reset
          </button>
        </>
      )
    }
    const { container } = render(<Controlled />)
    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(container.querySelector(".fa-slider-field-live")!.textContent).toBe("150\u2009%")
    expect(screen.getByRole("slider", { hidden: true }).getAttribute("aria-valuenow")).toBe("150")
    fireEvent.keyDown(screen.getByRole("slider", { hidden: true }), { key: "End" })
    expect(container.querySelector(".fa-slider-field-live")!.textContent).toBe("200\u2009%")
  })

  it("reserves the readout's width from the widest value it can show", () => {
    const { container } = render(<SliderField label="Gain" min={-12} max={12} step={0.5} defaultValue={0} unit="dB" />)
    const samples = [...container.querySelectorAll(".fa-slider-field-sample")].map((node) => node.textContent)
    expect(samples).toContain("-12\u2009dB")
    expect(samples).toContain("12\u2009dB")
    expect(samples).toContain("-11.5\u2009dB")
    expect(samples).toContain("11.5\u2009dB")
  })

  it("omits the readout when showValue is false and shows the bubble instead", () => {
    const { container } = render(<SliderField label="Quality" showValue={false} defaultValue={2} min={1} max={3} />)
    expect(container.querySelector(".fa-slider-field-value")).toBeNull()
    expect(container.querySelector(".fa-slider")!.getAttribute("data-bubble")).toBeNull()
  })

  it("marks required and optional labels, and shows an error in the reserved line", () => {
    render(<SliderField label="Gain" optional error="Out of range" />)
    expect(screen.getByText("Optional")).toBeTruthy()
    expect(screen.getByText("Out of range")).toBeTruthy()
  })
})
