// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Form, formBehaviour, useAppForm } from "./index.js"

afterEach(cleanup)

function Prefilled({ allowUnchanged, onSubmit }: { allowUnchanged?: boolean; onSubmit?: (value: { name: string }) => void }) {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { name: "Weekly depot check" },
    onSubmit: ({ value }) => onSubmit?.(value),
  })
  return (
    <Form form={form} aria-label="New checklist">
      <form.AppField name="name">{(field) => <field.TextField label="Name" />}</form.AppField>
      <form.AppForm>
        <form.SubmitButton allowUnchanged={allowUnchanged}>Create</form.SubmitButton>
      </form.AppForm>
    </Form>
  )
}

// Its accessible name includes the reserved feedback labels, which only CSS hides.
const button = () => screen.getByRole("button", { name: /^Create/ }) as HTMLButtonElement

describe("SubmitButton on an unchanged form", () => {
  it("waits for a change by default", () => {
    render(<Prefilled />)
    expect(button().disabled).toBe(true)
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Monthly depot check" } })
    expect(button().disabled).toBe(false)
  })

  it("submits the pre-filled values with allowUnchanged", async () => {
    const onSubmit = vi.fn()
    render(<Prefilled allowUnchanged onSubmit={onSubmit} />)
    expect(button().disabled).toBe(false)
    fireEvent.click(button())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Weekly depot check" }))
  })
})
