// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, it, vi } from "vitest"
import { usePanZoom, type PanZoom, type PanZoomOptions } from "./index.js"

beforeAll(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  HTMLElement.prototype.setPointerCapture = () => undefined
  HTMLElement.prototype.hasPointerCapture = () => false
})
afterEach(cleanup)

function setup(options: Partial<PanZoomOptions> = {}) {
  const onFrame = vi.fn()
  const onCommit = vi.fn()
  const click = vi.fn()
  let api!: PanZoom
  function Stage() {
    api = usePanZoom({ onFrame, onCommit, ...options })
    return (
      <div ref={api.ref} data-testid="stage" tabIndex={0}>
        <button onClick={click}>Inside</button>
      </div>
    )
  }
  render(<Stage />)
  return { stage: screen.getByTestId("stage"), button: screen.getByRole("button"), onFrame, onCommit, click, api: () => api }
}

const mouse = { pointerId: 1, pointerType: "mouse", button: 0 }

it("pans past the threshold, writes frames and commits once on release", () => {
  const { stage, onFrame, onCommit } = setup()
  fireEvent.pointerDown(stage, { ...mouse, clientX: 10, clientY: 10 })
  fireEvent.pointerMove(stage, { ...mouse, clientX: 12, clientY: 10 })
  expect(onFrame).not.toHaveBeenCalled()
  fireEvent.pointerMove(stage, { ...mouse, clientX: 40, clientY: 20 })
  fireEvent.pointerMove(stage, { ...mouse, clientX: 50, clientY: 30 })
  expect(onFrame).toHaveBeenLastCalledWith({ x: 40, y: 20, k: 1 })
  expect(onCommit).not.toHaveBeenCalled()
  fireEvent.pointerUp(stage, mouse)
  expect(onCommit.mock.calls).toEqual([[{ x: 40, y: 20, k: 1 }]])
})

it("lets a press stay a click and swallows the click that ended a drag", () => {
  const { stage, button, click } = setup()
  fireEvent.pointerDown(button, { ...mouse, clientX: 10, clientY: 10 })
  fireEvent.pointerUp(button, mouse)
  fireEvent.click(button)
  expect(click).toHaveBeenCalledTimes(1)
  fireEvent.pointerDown(button, { ...mouse, clientX: 10, clientY: 10 })
  fireEvent.pointerMove(stage, { ...mouse, clientX: 60, clientY: 10 })
  fireEvent.pointerUp(stage, mouse)
  fireEvent.click(button)
  expect(click).toHaveBeenCalledTimes(1)
})

it("leaves a press canPan refuses", () => {
  const { stage, onFrame } = setup({ canPan: () => false })
  fireEvent.pointerDown(stage, { ...mouse, clientX: 10, clientY: 10 })
  fireEvent.pointerMove(stage, { ...mouse, clientX: 60, clientY: 10 })
  expect(onFrame).not.toHaveBeenCalled()
})

it("zooms by keys and pans by arrows while it has focus", () => {
  const { stage, onCommit } = setup({ defaultCamera: { x: 0, y: 0, k: 1 } })
  fireEvent.keyDown(stage, { key: "ArrowLeft" })
  expect(onCommit).toHaveBeenLastCalledWith({ x: 48, y: 0, k: 1 })
  fireEvent.keyDown(stage, { key: "ArrowDown", shiftKey: true })
  expect(onCommit).toHaveBeenLastCalledWith({ x: 48, y: -144, k: 1 })
  fireEvent.keyDown(stage, { key: "+" })
  expect(onCommit).toHaveBeenLastCalledWith({ x: 60, y: -180, k: 1.25 })
  fireEvent.keyDown(stage, { key: "0" })
  expect(onCommit).toHaveBeenLastCalledWith({ x: 0, y: 0, k: 1 })
})

it("leaves the arrows to a host that uses them", () => {
  const { stage, onCommit } = setup({ arrows: false })
  fireEvent.keyDown(stage, { key: "ArrowLeft" })
  expect(onCommit).not.toHaveBeenCalled()
})

it("zooms the wheel around the pointer and commits when it rests", () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  const { stage, onFrame, onCommit } = setup()
  fireEvent.wheel(stage, { deltaY: -100, clientX: 0, clientY: 0 })
  expect(onFrame.mock.calls[0]![0].k).toBeCloseTo(Math.exp(0.15))
  expect(onCommit).not.toHaveBeenCalled()
  act(() => void vi.advanceTimersByTime(200))
  expect(onCommit).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})

it("pans with the wheel in pan mode, and a held Ctrl zooms", () => {
  const { stage, onFrame } = setup({ wheel: "pan" })
  fireEvent.wheel(stage, { deltaX: 10, deltaY: 20 })
  expect(onFrame).toHaveBeenLastCalledWith({ x: -10, y: -20, k: 1 })
  fireEvent.wheel(stage, { deltaY: -10, ctrlKey: true, clientX: 0, clientY: 0 })
  expect(onFrame.mock.lastCall![0].k).toBeGreaterThan(1)
})

it("pinches with two pointers and carries on as a pan with one", () => {
  const { stage, onFrame, onCommit } = setup({ maxZoom: 8 })
  const touch = (pointerId: number, clientX: number) => ({ pointerId, pointerType: "touch", clientX, clientY: 0 })
  fireEvent.pointerDown(stage, touch(1, 0))
  fireEvent.pointerDown(stage, touch(2, 100))
  fireEvent.pointerMove(stage, touch(2, 200))
  expect(onFrame.mock.lastCall![0].k).toBe(2)
  fireEvent.pointerUp(stage, touch(2, 200))
  expect(onCommit).not.toHaveBeenCalled()
  fireEvent.pointerMove(stage, touch(1, 30))
  expect(onFrame).toHaveBeenLastCalledWith({ x: 30, y: 0, k: 2 })
  fireEvent.pointerUp(stage, touch(1, 30))
  expect(onCommit).toHaveBeenCalledTimes(1)
})

it("runs a camera through constrain and keeps the keys off while disabled", () => {
  const { stage, api, onFrame } = setup({ constrain: (camera) => ({ ...camera, x: Math.min(camera.x, 10) }), disabled: true })
  act(() => api().panBy(100, 5))
  expect(onFrame).toHaveBeenLastCalledWith({ x: 10, y: 5, k: 1 })
  expect(api().camera()).toEqual({ x: 10, y: 5, k: 1 })
  fireEvent.keyDown(stage, { key: "ArrowLeft" })
  expect(api().camera()).toEqual({ x: 10, y: 5, k: 1 })
})
