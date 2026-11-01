// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { CompareSlider } from "./compare-slider.js"

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = () => undefined
})
afterEach(cleanup)

const rect = (element: HTMLElement) => (element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => undefined }))
const root = () => screen.getByRole("slider").parentElement as HTMLElement
const mouse = { pointerId: 1, pointerType: "mouse", button: 0 }

describe("CompareSlider", () => {
  it("is a slider with its percentage, 50 by default", () => {
    render(<CompareSlider before="A" after="B" />)
    const slider = screen.getByRole("slider", { name: "Comparison position" })
    expect(slider.getAttribute("aria-valuenow")).toBe("50")
    expect(slider.getAttribute("aria-valuetext")).toBe("50%")
    expect(slider.getAttribute("aria-orientation")).toBe("horizontal")
  })

  it("moves by keys in the direction they point", () => {
    const onValueChange = vi.fn()
    render(<CompareSlider before="A" after="B" defaultValue={50} onValueChange={onValueChange} />)
    const slider = screen.getByRole("slider")
    fireEvent.keyDown(slider, { key: "ArrowRight" })
    expect(onValueChange).toHaveBeenLastCalledWith(51)
    fireEvent.keyDown(slider, { key: "ArrowLeft", shiftKey: true })
    expect(onValueChange).toHaveBeenLastCalledWith(41)
    fireEvent.keyDown(slider, { key: "End" })
    expect(onValueChange).toHaveBeenLastCalledWith(100)
    fireEvent.keyDown(slider, { key: "ArrowRight" })
    expect(onValueChange).toHaveBeenLastCalledWith(100)
    fireEvent.keyDown(slider, { key: "Home" })
    expect(onValueChange).toHaveBeenLastCalledWith(0)
  })

  it("reads the arrows by the reading direction", () => {
    const onValueChange = vi.fn()
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <CompareSlider before="A" after="B" onValueChange={onValueChange} />
      </div>,
    )
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowLeft" })
    expect(onValueChange).toHaveBeenLastCalledWith(51)
  })

  it("uses up and down when vertical", () => {
    const onValueChange = vi.fn()
    render(<CompareSlider before="A" after="B" orientation="vertical" onValueChange={onValueChange} />)
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowDown" })
    expect(onValueChange).toHaveBeenLastCalledWith(51)
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowLeft" })
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it("writes the custom property during a drag and commits once on release", () => {
    const onValueChange = vi.fn()
    render(<CompareSlider before="A" after="B" onValueChange={onValueChange} />)
    rect(root())
    const slider = screen.getByRole("slider")
    fireEvent.pointerDown(slider, { ...mouse, clientX: 100 })
    fireEvent.pointerMove(slider, { ...mouse, clientX: 150 })
    fireEvent.pointerMove(slider, { ...mouse, clientX: 160 })
    expect(root().style.getPropertyValue("--_split")).toBe("80%")
    expect(slider.getAttribute("aria-valuenow")).toBe("80")
    expect(onValueChange).not.toHaveBeenCalled()
    fireEvent.pointerUp(slider, mouse)
    expect(onValueChange.mock.calls).toEqual([[80]])
  })

  it("moves to a press on the content, once", () => {
    const onValueChange = vi.fn()
    render(<CompareSlider before="A" after="B" onValueChange={onValueChange} />)
    rect(root())
    fireEvent.pointerDown(root(), { ...mouse, clientX: 50 })
    fireEvent.pointerUp(root(), mouse)
    expect(onValueChange.mock.calls).toEqual([[25]])
  })

  it("moves to a press inside a focusable scroller", () => {
    const onValueChange = vi.fn()
    render(
      <div tabIndex={0}>
        <CompareSlider before="A" after="B" onValueChange={onValueChange} />
      </div>,
    )
    rect(root())
    fireEvent.pointerDown(root(), { ...mouse, clientX: 100 + 20 })
    fireEvent.pointerUp(root(), mouse)
    expect(onValueChange.mock.calls).toEqual([[60]])
  })

  it("leaves a press on a control inside the content alone", () => {
    const onValueChange = vi.fn()
    render(<CompareSlider before={<button>Inside</button>} after="B" onValueChange={onValueChange} />)
    rect(root())
    const button = screen.getByRole("button")
    fireEvent.pointerDown(button, { ...mouse, clientX: 20 })
    fireEvent.pointerUp(button, mouse)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("follows a controlled value and stays out of the tab order when disabled", () => {
    const { rerender } = render(<CompareSlider before="A" after="B" value={20} />)
    expect(root().style.getPropertyValue("--_split")).toBe("20%")
    rerender(<CompareSlider before="A" after="B" value={70} disabled />)
    expect(root().style.getPropertyValue("--_split")).toBe("70%")
    expect(screen.getByRole("slider").getAttribute("tabindex")).toBe("-1")
  })
})
