// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { GradientPicker } from "./gradient-picker.js"
import type { GradientValue } from "./gradient.js"

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
  HTMLElement.prototype.setPointerCapture = () => undefined
  HTMLCanvasElement.prototype.getContext = () => null
})
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())

const VALUE: GradientValue = {
  kind: "linear",
  angle: 90,
  stops: [
    { color: "#000000", position: 0 },
    { color: "#808080", position: 50 },
    { color: "#ffffff", position: 100 },
  ],
}
const stop = (number: number) => screen.getByRole("slider", { name: `Stop ${number}` })
const mouse = { pointerId: 1, pointerType: "mouse", button: 0 }

describe("GradientPicker", () => {
  it("exposes each stop as a slider with its position and colour", () => {
    render(<GradientPicker defaultValue={VALUE} />)
    expect(stop(2).getAttribute("aria-valuenow")).toBe("50")
    expect(stop(2).getAttribute("aria-valuetext")).toBe("50%, #808080")
  })

  it("moves a stop by keys and keeps the order", () => {
    const onValueChange = vi.fn()
    render(<GradientPicker defaultValue={VALUE} onValueChange={onValueChange} />)
    fireEvent.keyDown(stop(2), { key: "ArrowRight" })
    expect(onValueChange.mock.lastCall![0].stops[1].position).toBe(51)
    fireEvent.keyDown(stop(2), { key: "ArrowLeft", shiftKey: true })
    expect(onValueChange.mock.lastCall![0].stops[1].position).toBe(41)
    fireEvent.keyDown(stop(1), { key: "End" })
    expect(onValueChange.mock.lastCall![0].stops.map((item: { color: string }) => item.color)).toEqual(["#808080", "#000000", "#ffffff"])
  })

  it("removes a stop by key and keeps two", () => {
    const onValueChange = vi.fn()
    render(<GradientPicker defaultValue={VALUE} onValueChange={onValueChange} />)
    fireEvent.keyDown(stop(2), { key: "Delete" })
    expect(onValueChange.mock.lastCall![0].stops).toHaveLength(2)
    fireEvent.keyDown(stop(1), { key: "Delete" })
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: /^Remove stop/ }).getAttribute("aria-description")).toBe("A gradient needs two stops")
  })

  it("adds a stop without a pointer drag", () => {
    const onValueChange = vi.fn()
    render(<GradientPicker defaultValue={VALUE} onValueChange={onValueChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Add stop" }))
    expect(onValueChange.mock.lastCall![0].stops.map((item: { position: number }) => item.position)).toEqual([0, 25, 50, 100])
    expect(document.activeElement).toBe(stop(2))
  })

  it("repaints during a drag and commits once on release", () => {
    const onValueChange = vi.fn()
    const { container } = render(<GradientPicker defaultValue={VALUE} onValueChange={onValueChange} />)
    const rail = container.querySelector<HTMLElement>(".fa-gradient-rail")!
    rail.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 20, right: 200, bottom: 20, x: 0, y: 0, toJSON: () => undefined })
    const thumb = stop(2)
    fireEvent.pointerDown(thumb, { ...mouse, clientX: 100 })
    fireEvent.pointerMove(thumb, { ...mouse, clientX: 60 })
    expect(thumb.style.getPropertyValue("--_position")).toBe("30%")
    expect(container.querySelector<HTMLElement>(".fa-gradient-picker")!.style.getPropertyValue("--_gradient")).toContain("#808080 30%")
    expect(onValueChange).not.toHaveBeenCalled()
    fireEvent.pointerUp(thumb, mouse)
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange.mock.lastCall![0].stops[1].position).toBe(30)
  })

  it("adds a stop where the rail is pressed", () => {
    const onValueChange = vi.fn()
    const { container } = render(<GradientPicker defaultValue={VALUE} onValueChange={onValueChange} />)
    const rail = container.querySelector<HTMLElement>(".fa-gradient-rail")!
    rail.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 20, right: 200, bottom: 20, x: 0, y: 0, toJSON: () => undefined })
    fireEvent.pointerDown(rail, { ...mouse, clientX: 150 })
    expect(onValueChange.mock.lastCall![0].stops[2]).toEqual({ color: "#c0c0c0", position: 75 })
  })

  it("turns the angle off for a radial gradient", () => {
    render(<GradientPicker defaultValue={{ ...VALUE, kind: "radial" }} />)
    expect((screen.getByLabelText("Angle") as HTMLInputElement).disabled).toBe(true)
  })
})
