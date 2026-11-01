// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { useAppForm } from "./index.js"

afterEach(cleanup)

function Demo({ inline }: { inline?: boolean }) {
  const form = useAppForm({ defaultValues: { limit: 40 } })
  return (
    <form.AppField name="limit">
      {(field) => <field.SliderField label="Limit" unit="Mbps" inline={inline} />}
    </form.AppField>
  )
}

describe("form SliderField", () => {
  it("keeps the value at the end of the label row unless asked for one row", () => {
    const { container } = render(<Demo />)
    expect(container.querySelector(".fa-field-aside")!.textContent).toBe("40\u2009Mbps")
    expect(container.querySelector(".fa-slider-field-row")).toBeNull()
  })

  it("puts label, slider and value on one row with inline, bound to the form", () => {
    const { container } = render(<Demo inline />)
    expect(container.querySelector(".fa-field-aside")).toBeNull()
    expect(container.querySelector(".fa-slider-field-live")!.textContent).toBe("40 Mbps")
    fireEvent.keyDown(screen.getByRole("slider", { hidden: true }), { key: "ArrowRight" })
    expect(container.querySelector(".fa-slider-field-live")!.textContent).toBe("41 Mbps")
  })
})
