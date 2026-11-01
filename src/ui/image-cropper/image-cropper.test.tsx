// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { ImageCropper, type ImageCropperActions } from "./image-cropper.js"
import { ImageInput } from "./image-field.js"

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
  URL.createObjectURL = () => "blob:preview"
  URL.revokeObjectURL = () => undefined
  HTMLElement.prototype.setPointerCapture = () => undefined
})
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())

const IMAGE = { width: 1000, height: 500 }

describe("ImageCropper", () => {
  it("shows the placeholder until there is an image, with the slider waiting", () => {
    const { container } = render(<ImageCropper aspect={1} fields={false} placeholder={<span>Current</span>} />)
    expect(screen.getByText("Current")).toBeTruthy()
    expect(screen.queryByRole("application")).toBeNull()
    expect(container.querySelector("input[type='range']")?.hasAttribute("disabled")).toBe(true)
  })

  it("reports the fitted crop once, then each key press", () => {
    const onValueChange = vi.fn()
    render(<ImageCropper src="/photo.png" image={IMAGE} aspect={1} fields={false} onValueChange={onValueChange} />)
    expect(onValueChange.mock.calls).toEqual([[{ x: 250, y: 0, width: 500, height: 500 }]])
    fireEvent.keyDown(screen.getByRole("application"), { key: "ArrowLeft" })
    expect(onValueChange).toHaveBeenLastCalledWith({ x: 260, y: 0, width: 500, height: 500 })
    fireEvent.keyDown(screen.getByRole("application"), { key: "0" })
    expect(onValueChange).toHaveBeenLastCalledWith({ x: 250, y: 0, width: 500, height: 500 })
  })

  it("moves the picture during a drag and reports once on release", () => {
    const onValueChange = vi.fn()
    render(<ImageCropper src="/photo.png" image={IMAGE} aspect={1} defaultValue={{ x: 250, y: 0, width: 500, height: 500 }} fields={false} onValueChange={onValueChange} />)
    const area = screen.getByRole("application")
    Object.defineProperty(area, "clientWidth", { value: 250 })
    const picture = area.querySelector("img")!
    fireEvent.pointerDown(area, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(area, { pointerId: 1, clientX: 90, clientY: 100 })
    fireEvent.pointerMove(area, { pointerId: 1, clientX: 80, clientY: 100 })
    expect(parseFloat(picture.style.left)).toBeCloseTo(-58)
    expect(onValueChange).not.toHaveBeenCalled()
    fireEvent.pointerUp(area, { pointerId: 1 })
    expect(onValueChange.mock.calls).toEqual([[{ x: 290, y: 0, width: 500, height: 500 }]])
  })

  it("shows a crop the host sets, and answers with the live crop", () => {
    const actions = createRef<ImageCropperActions>()
    const { rerender } = render(<ImageCropper src="/photo.png" image={IMAGE} aspect={1} value={{ x: 0, y: 0, width: 500, height: 500 }} fields={false} actionsRef={actions} />)
    rerender(<ImageCropper src="/photo.png" image={IMAGE} aspect={1} value={{ x: 500, y: 0, width: 250, height: 250 }} fields={false} actionsRef={actions} />)
    expect(actions.current?.crop()).toEqual({ x: 500, y: 0, width: 250, height: 250 })
  })

  it("moves and resizes a free box from the keyboard", () => {
    const onValueChange = vi.fn()
    render(<ImageCropper src="/photo.png" image={IMAGE} aspect="free" defaultValue={{ x: 100, y: 100, width: 200, height: 200 }} fields={false} onValueChange={onValueChange} />)
    const area = screen.getByRole("application")
    fireEvent.keyDown(area, { key: "ArrowRight" })
    expect(onValueChange).toHaveBeenLastCalledWith({ x: 110, y: 100, width: 200, height: 200 })
    fireEvent.keyDown(area, { key: "ArrowDown", altKey: true })
    expect(onValueChange).toHaveBeenLastCalledWith({ x: 110, y: 100, width: 200, height: 210 })
    fireEvent.keyDown(area, { key: "0" })
    expect(onValueChange).toHaveBeenLastCalledWith({ x: 0, y: 0, width: 1000, height: 500 })
  })

  it("drags a free box's handle and reports on release", () => {
    const onValueChange = vi.fn()
    render(<ImageCropper src="/photo.png" image={IMAGE} aspect="free" defaultValue={{ x: 100, y: 100, width: 200, height: 200 }} fields={false} onValueChange={onValueChange} />)
    const area = screen.getByRole("application")
    Object.defineProperty(area, "clientWidth", { value: 500 })
    const grip = area.querySelector("[data-handle='se']")!
    fireEvent.pointerDown(grip, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 150, clientY: 150 })
    fireEvent.pointerMove(area, { pointerId: 1, clientX: 175, clientY: 160 })
    expect(area.style.getPropertyValue("--_box-width")).toBe("25%")
    expect(onValueChange).not.toHaveBeenCalled()
    fireEvent.pointerUp(area, { pointerId: 1 })
    expect(onValueChange).toHaveBeenCalledWith({ x: 100, y: 100, width: 250, height: 220 })
  })

  it("edits the crop through its number fields", () => {
    const onValueChange = vi.fn()
    render(<ImageCropper src="/photo.png" image={IMAGE} aspect="free" defaultValue={{ x: 100, y: 100, width: 200, height: 200 }} onValueChange={onValueChange} />)
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "300" } })
    expect(onValueChange).toHaveBeenLastCalledWith({ x: 100, y: 100, width: 300, height: 200 })
  })
})

describe("ImageInput", () => {
  it("offers Add when empty and keeps Edit to the host", () => {
    const onEdit = vi.fn()
    const { rerender } = render(<ImageInput aria-label="Cover" onEdit={onEdit} />)
    expect(screen.getByRole("button", { name: "Add image" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
    rerender(<ImageInput aria-label="Cover" value="/saved.png" onEdit={onEdit} />)
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    expect(onEdit).toHaveBeenCalledWith("/saved.png")
  })

  it("clears the value and shows nothing to act on when read-only", () => {
    const onValueChange = vi.fn()
    const { rerender } = render(<ImageInput aria-label="Cover" value="/saved.png" onValueChange={onValueChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Remove" }))
    expect(onValueChange).toHaveBeenCalledWith(null)
    rerender(<ImageInput aria-label="Cover" value="/saved.png" readOnly />)
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByRole("img").getAttribute("src")).toBe("/saved.png")
  })
})
