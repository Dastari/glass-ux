// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Form, useAppForm } from "./index.js"

afterEach(cleanup)

type Values = { notes: string | null; email: string | null; title: string | undefined }
let latest: { values: Values } | null = null

function Editor() {
  const form = useAppForm({ defaultValues: { notes: null, email: null, title: undefined } as Values })
  latest = form.state
  return (
    <Form form={form} aria-label="Job">
      <form.AppField name="notes">{(f) => <f.TextareaField label="Notes" maxLength={200} />}</form.AppField>
      <form.AppField name="email">{(f) => <f.EmailField label="Email" />}</form.AppField>
      <form.AppField name="title">{(f) => <f.TextField label="Title" counter maxLength={40} />}</form.AppField>
      <form.Subscribe selector={(state) => state.values}>{(values) => { latest = { values }; return null }}</form.Subscribe>
    </Form>
  )
}

describe("bound text fields with a null or undefined form value", () => {
  it("show it as empty without warning and leave the value alone", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    render(<Editor />)
    expect((screen.getByRole("textbox", { name: "Notes" }) as HTMLTextAreaElement).value).toBe("")
    expect((screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement).value).toBe("")
    expect(error.mock.calls.filter((call) => String(call[0]).includes("should not be null"))).toEqual([])
    expect(latest!.values).toEqual({ notes: null, email: null, title: undefined })
    error.mockRestore()
  })

  it("store what is typed, and put the blank back when the field is cleared", () => {
    render(<Editor />)
    const notes = screen.getByRole("textbox", { name: "Notes" })
    fireEvent.change(notes, { target: { value: "Check the hydraulic hose" } })
    expect(latest!.values.notes).toBe("Check the hydraulic hose")
    fireEvent.change(notes, { target: { value: "" } })
    expect(latest!.values.notes).toBeNull()
    const title = screen.getByRole("textbox", { name: "Title" })
    fireEvent.change(title, { target: { value: "A" } })
    fireEvent.change(title, { target: { value: "" } })
    expect(latest!.values.title).toBeUndefined()
  })
})
