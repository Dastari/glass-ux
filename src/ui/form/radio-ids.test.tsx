// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Checkbox, CheckboxGroup } from "../checkbox/index.js"
import { Field } from "../field/index.js"
import { useAppForm } from "./index.js"

afterEach(cleanup)

function Demo() {
  const form = useAppForm({ defaultValues: { plan: "monthly" } })
  return (
    <form.AppField name="plan">
      {(field) => (
        <field.RadioGroupField
          label="Billing"
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
            { value: "never", label: "Never" },
          ]}
        />
      )}
    </form.AppField>
  )
}

function Topics() {
  return (
    <Field label="Topics">
      <CheckboxGroup defaultValue={["alerts"]}>
        <Checkbox name="alerts" value="alerts" label="Alerts" />
        <Checkbox name="billing" value="billing" label="Billing" />
      </CheckboxGroup>
    </Field>
  )
}

describe("RadioGroupField", () => {
  it("gives every radio its own id and accessible name", () => {
    render(<Demo />)
    const radios = screen.getAllByRole("radio")
    expect(new Set(radios.map((radio) => radio.id)).size).toBe(3)
    for (const name of ["Monthly", "Yearly", "Never"]) expect(screen.getByRole("radio", { name })).toBeTruthy()
  })
})

describe("CheckboxGroup in a Field", () => {
  it("gives every checkbox its own id and accessible name", () => {
    render(<Topics />)
    const boxes = screen.getAllByRole("checkbox")
    expect(new Set(boxes.map((box) => box.id)).size).toBe(boxes.length)
    for (const name of ["Alerts", "Billing"]) expect(screen.getByRole("checkbox", { name })).toBeTruthy()
  })
})
