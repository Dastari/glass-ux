// @vitest-environment jsdom
// jsdom does not hide a status button's inactive faces, so its names are matched by prefix.
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { EditableAvatar } from "./editable-avatar.js"

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
})
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())

const save = () => undefined

describe("EditableAvatar", () => {
  it("puts an edit button beside a large avatar and makes a small one the button", () => {
    render(
      <>
        <EditableAvatar name="Avery Quinn" onSave={save} />
        <EditableAvatar name="Mira Rowan" size="md" onSave={save} />
      </>,
    )
    expect(screen.getByRole("img", { name: "Avery Quinn" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Change photo for Avery Quinn" }).closest(".fa-avatar-editable")?.getAttribute("data-size")).toBe("2xl")
    const whole = screen.getByRole("button", { name: "Change photo for Mira Rowan" })
    expect(whole.querySelector(".fa-avatar")?.getAttribute("aria-hidden")).toBe("true")
  })

  it("opens the dialog with Save waiting for a photo and Remove only when it can remove", async () => {
    render(<EditableAvatar name="Avery Quinn" src="/avery.jpg" onSave={save} />)
    fireEvent.click(screen.getByRole("button", { name: "Change photo for Avery Quinn" }))
    const dialog = await screen.findByRole("dialog", { name: "Change photo" })
    expect(dialog.textContent).toContain("WebP")
    expect(screen.getByRole("button", { name: /^Save/ }).getAttribute("aria-description")).toBe("Choose a photo first")
    expect(screen.queryByRole("button", { name: /^Remove photo/ })).toBeNull()
  })

  it("offers Remove when there is a photo and onRemove", async () => {
    render(<EditableAvatar name="Avery Quinn" src="/avery.jpg" onSave={save} onRemove={() => undefined} />)
    fireEvent.click(screen.getByRole("button", { name: "Change photo for Avery Quinn" }))
    await screen.findByRole("dialog", { name: "Change photo" })
    expect(screen.getByRole("button", { name: /^Remove photo/ })).toBeTruthy()
  })
})
