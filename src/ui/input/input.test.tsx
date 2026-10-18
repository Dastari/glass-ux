// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { Input, SearchField } from "./input.js"

afterEach(cleanup)

function Controlled({ onClear, onParentKey }: { onClear?: () => void; onParentKey?: () => void }) {
  const [value, setValue] = useState("Harbour")
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- records propagation in the test
    <div onKeyDown={onParentKey}>
      <Input aria-label="Venue" clearable value={value} onValueChange={setValue} onClear={onClear} />
    </div>
  )
}

describe("Input Escape clears a clearable field", () => {
  it("clears a controlled value, calls onClear and stops propagation", () => {
    const onClear = vi.fn()
    const onParentKey = vi.fn()
    render(<Controlled onClear={onClear} onParentKey={onParentKey} />)
    const input = screen.getByRole("textbox", { name: "Venue" })
    fireEvent.keyDown(input, { key: "Escape" })
    expect(input).toHaveValue("")
    expect(onClear).toHaveBeenCalledOnce()
    expect(onParentKey).not.toHaveBeenCalled()
    // Empty: Escape passes through to the container (e.g. to close a dialog).
    fireEvent.keyDown(input, { key: "Escape" })
    expect(onParentKey).toHaveBeenCalledOnce()
    expect(onClear).toHaveBeenCalledOnce()
  })

  it("clears an uncontrolled value", () => {
    render(<Input aria-label="Venue" clearable defaultValue="Harbour" />)
    const input = screen.getByRole("textbox", { name: "Venue" })
    fireEvent.keyDown(input, { key: "Escape" })
    expect(input).toHaveValue("")
  })

  it("leaves non-clearable and read-only fields alone", () => {
    render(
      <>
        <Input aria-label="Plain" defaultValue="Harbour" />
        <Input aria-label="Locked" clearable readOnly defaultValue="Harbour" />
      </>
    )
    for (const name of ["Plain", "Locked"]) {
      const input = screen.getByRole("textbox", { name })
      fireEvent.keyDown(input, { key: "Escape" })
      expect(input).toHaveValue("Harbour")
    }
  })

  it("respects a host onKeyDown that prevents the default", () => {
    render(<Input aria-label="Venue" clearable defaultValue="Harbour" onKeyDown={(event) => event.preventDefault()} />)
    const input = screen.getByRole("textbox", { name: "Venue" })
    fireEvent.keyDown(input, { key: "Escape" })
    expect(input).toHaveValue("Harbour")
  })

  it("keeps SearchField's Escape-to-clear", () => {
    const onClear = vi.fn()
    render(<SearchField aria-label="Find" defaultValue="maps" onClear={onClear} />)
    const input = screen.getByRole("searchbox", { name: "Find" })
    fireEvent.keyDown(input, { key: "Escape" })
    expect(input).toHaveValue("")
    expect(onClear).toHaveBeenCalledOnce()
  })
})
