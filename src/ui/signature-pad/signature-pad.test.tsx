// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Field } from "../field/index.js"
import type { DrawnSignature, SignatureValue } from "./ink.js"
import { SignaturePad } from "./signature-pad.js"

afterEach(cleanup)

const stroke = (y: number) => [
  { x: 20, y, t: 0, p: 0.5 },
  { x: 60, y: y + 5, t: 16, p: 0.5 },
]
const SIGNED: DrawnSignature = { kind: "drawn", width: 600, height: 200, strokes: [stroke(80), stroke(120)] }

describe("SignaturePad", () => {
  it("is named by its Field label and states whether it is signed", () => {
    render(
      <Field label="Visitor signature">
        <SignaturePad />
      </Field>,
    )
    const pad = screen.getByRole("application", { name: "Visitor signature" })
    expect(pad.getAttribute("aria-roledescription")).toBe("signature pad")
    expect(pad.getAttribute("aria-describedby")).toBeTruthy()
    expect(document.getElementById(pad.getAttribute("aria-describedby")!.split(" ")[0]!)?.textContent).toBe("Not signed")
    expect(screen.getByRole("button", { name: "Undo" }).hasAttribute("disabled")).toBe(true)
    expect(screen.getByRole("button", { name: "Clear" }).hasAttribute("disabled")).toBe(true)
  })

  it("undoes the last stroke and clears from the toolbar and the keyboard", () => {
    const changes: (SignatureValue | null)[] = []
    render(<SignaturePad aria-label="Signature" defaultValue={SIGNED} onValueChange={(value) => changes.push(value)} />)
    expect(document.querySelectorAll(".fa-signature-ink path")).toHaveLength(3)
    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect((changes.at(-1) as DrawnSignature).strokes).toHaveLength(1)
    const pad = screen.getByRole("application", { name: "Signature" })
    fireEvent.keyDown(pad, { key: "z", ctrlKey: true })
    expect(changes.at(-1)).toBeNull()
    expect(screen.getByRole("button", { name: "Clear" }).hasAttribute("disabled")).toBe(true)
  })

  it("clears with Delete", () => {
    const onValueChange = vi.fn()
    render(<SignaturePad aria-label="Signature" defaultValue={SIGNED} onValueChange={onValueChange} />)
    fireEvent.keyDown(screen.getByRole("application", { name: "Signature" }), { key: "Delete" })
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })

  it("takes a typed name instead, and switching back restores the drawing", () => {
    const changes: (SignatureValue | null)[] = []
    render(
      <Field label="Signature">
        <SignaturePad defaultValue={SIGNED} onValueChange={(value) => changes.push(value)} />
      </Field>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Type instead" }))
    expect(changes.at(-1)).toBeNull()
    const input = screen.getByRole("textbox", { name: "Signature" })
    fireEvent.change(input, { target: { value: "Ana Lima" } })
    expect(changes.at(-1)).toEqual({ kind: "typed", text: "Ana Lima" })
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Draw instead" }))
    expect(changes.at(-1)).toEqual(SIGNED)
    fireEvent.click(screen.getByRole("button", { name: "Type instead" }))
    expect(changes.at(-1)).toEqual({ kind: "typed", text: "Ana Lima" })
  })

  it("shows a read-only signature as an image without the toolbar", () => {
    render(<SignaturePad aria-label="Signature" defaultValue={SIGNED} readOnly />)
    expect(screen.getByRole("img", { name: "Signature" })).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("submits its value with a native form", () => {
    const { container } = render(<SignaturePad aria-label="Signature" name="signature" defaultValue={{ kind: "typed", text: "Ana Lima" }} />)
    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="signature"]')
    expect(JSON.parse(hidden!.value)).toEqual({ kind: "typed", text: "Ana Lima" })
  })
})
