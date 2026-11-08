// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PhoneInput } from "./phone-field.js"

afterEach(cleanup)

describe("PhoneInput", () => {
  it("passes standard input attributes to the number input", () => {
    const onKeyDown = vi.fn()
    render(<PhoneInput aria-label="Mobile" enterKeyHint="next" autoComplete="off" data-step="contact" onKeyDown={onKeyDown} />)
    const input = screen.getByRole("textbox", { name: "Mobile" })
    expect(input.getAttribute("type")).toBe("tel")
    expect(input.getAttribute("enterkeyhint")).toBe("next")
    expect(input.getAttribute("autocomplete")).toBe("off")
    expect(input.getAttribute("data-step")).toBe("contact")
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })

  it("keeps its own autocomplete token unless one is given", () => {
    render(<PhoneInput aria-label="Mobile" kind="mobile" />)
    expect(screen.getByRole("textbox", { name: "Mobile" }).getAttribute("autocomplete")).toBe("mobile tel")
  })

  it("focuses the number input with autoFocus or its ref, not the picker's hidden input", () => {
    const ref = createRef<HTMLInputElement>()
    const { unmount } = render(<PhoneInput aria-label="Mobile" autoFocus />)
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Mobile" }))
    unmount()
    render(<PhoneInput aria-label="Desk" ref={ref} />)
    expect(ref.current).toBe(screen.getByRole("textbox", { name: "Desk" }))
    expect(ref.current?.getAttribute("aria-hidden")).toBeNull()
  })

  it("calls onFocus and onPaste alongside its own handlers", () => {
    const onFocus = vi.fn()
    const onPaste = vi.fn()
    render(<PhoneInput aria-label="Mobile" onFocus={onFocus} onPaste={onPaste} />)
    const input = screen.getByRole("textbox", { name: "Mobile" })
    fireEvent.focus(input)
    fireEvent.paste(input, { clipboardData: { getData: () => "0412 345 678" } })
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(onPaste).toHaveBeenCalledTimes(1)
  })
})
