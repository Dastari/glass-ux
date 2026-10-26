// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Autocomplete } from "../autocomplete/index.js"
import { useAppForm } from "../form/index.js"
import { Combobox } from "./index.js"

afterEach(cleanup)

const OPTIONS = [
  { value: "syd", label: "Sydney" },
  { value: "hba", label: "Hobart" },
]

function RequiredField() {
  const form = useAppForm({ defaultValues: { city: "syd" as string | null } })
  return (
    <form.AppField name="city">{(field) => <field.ComboboxField label="City" required options={OPTIONS} />}</form.AppField>
  )
}

describe("clearable pickers", () => {
  it("shows Clear by default and hides it for a required choice", () => {
    const { rerender } = render(<Combobox aria-label="City" options={OPTIONS} defaultValue="syd" />)
    expect(screen.queryByRole("button", { name: "Clear" })).toBeTruthy()
    rerender(<Combobox aria-label="City" options={OPTIONS} defaultValue="syd" required />)
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()
    rerender(<Combobox aria-label="City" options={OPTIONS} defaultValue="syd" required clearable />)
    expect(screen.queryByRole("button", { name: "Clear" })).toBeTruthy()
    rerender(<Combobox aria-label="City" options={OPTIONS} defaultValue="syd" clearable={false} />)
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()
  })

  it("hides Clear on a required ComboboxField", () => {
    render(<RequiredField />)
    expect(screen.getByRole("combobox")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()
  })

  it("lets Autocomplete drop its Clear button", () => {
    render(<Autocomplete aria-label="Search" items={["Sydney"]} clearable={false} />)
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()
  })
})
