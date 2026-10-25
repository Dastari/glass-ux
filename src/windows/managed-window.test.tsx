// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createDragStore } from "./drag.js"
import { ManagedWindow, WorkspaceLinkContext, type WorkspaceLink } from "./managed-window.js"
import { WindowManagerProvider } from "./react.js"
import { registerWindowKind } from "./registry.js"
import { createWindowManager, type WindowManager } from "./store.js"

const Icon = Object.assign(() => null, { iconName: "test" })
registerWindowKind({ kind: "keyboard-test", title: () => "Inventory", icon: Icon, load: async () => ({ default: () => null }) })

const STAGE = { left: 0, top: 0, width: 1000, height: 800 }
const FRAME = { left: 100, top: 50, width: 400, height: 300 }

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const box = this.classList.contains("fa-wm-workspace-stage") ? STAGE : this.hasAttribute("data-window-id") ? FRAME : { left: 0, top: 0, width: 0, height: 0 }
    return { ...box, x: box.left, y: box.top, right: box.left + box.width, bottom: box.top + box.height, toJSON: () => box } as DOMRect
  })
})
afterEach(cleanup)

let manager: WindowManager
let id: string
beforeEach(() => {
  manager = createWindowManager({ storageKey: null, channelName: null })
  id = manager.open({ kind: "keyboard-test", layout: "floating", size: { w: 400, h: 300 } })
})

function Harness() {
  const stageRef = createRef<HTMLDivElement>()
  const link: WorkspaceLink = { stageRef, drag: createDragStore(), sheet: false }
  const entry = manager.get(id)!
  return (
    <WindowManagerProvider manager={manager}>
      <WorkspaceLinkContext.Provider value={link}>
        <div ref={stageRef} className="fa-wm-workspace-stage">
          <ManagedWindow entry={entry} focused geometry="free" vars={{}} hidden={false} />
        </div>
      </WorkspaceLinkContext.Provider>
    </WindowManagerProvider>
  )
}

async function chooseFromWindowMenu(name: string) {
  const close = screen.getByRole("button", { name: "Close Inventory" })
  close.focus()
  await act(async () => {
    fireEvent.keyDown(close, { key: "F10", shiftKey: true })
  })
  const item = await screen.findByRole("menuitem", { name })
  await act(async () => {
    fireEvent.click(item)
  })
}

const frame = () => document.querySelector<HTMLElement>("[data-window-id]")!
const press = (key: string, init: KeyboardEventInit = {}) => act(() => void fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init }))

describe("ManagedWindow keyboard gestures", () => {
  it("mirrors horizontal keyboard moves in RTL while keeping physical coordinates", async () => {
    render(<Harness />)
    frame().style.direction = "rtl"
    await chooseFromWindowMenu("Move")
    await press("ArrowLeft")
    await press("ArrowDown", { shiftKey: true })
    expect(frame().style.translate).toBe("16px 2px")
    await press("Enter")
    expect(manager.get(id)!.rect).toEqual({ x: 116, y: 52, w: 400, h: 300 })
  })

  it("mirrors horizontal keyboard resizing in RTL", async () => {
    render(<Harness />)
    frame().style.direction = "rtl"
    await chooseFromWindowMenu("Resize")
    await press("ArrowLeft")
    expect(frame().style.width).toBe("416px")
    await press("Escape")
    expect(manager.get(id)!.rect).toEqual({ x: 100, y: 50, w: 400, h: 300 })
  })
  it("moves with the arrow keys and commits on Enter", async () => {
    render(<Harness />)
    await chooseFromWindowMenu("Move")
    expect(frame().dataset.keyboardGesture).toBe("move")
    expect(screen.getByRole("status")).toHaveTextContent(/Arrow keys move it/)
    await press("ArrowRight")
    await press("ArrowRight")
    await press("ArrowDown", { shiftKey: true })
    expect(frame().style.translate).toBe("32px 2px")
    // Nudges write the frame only; the store is untouched until Enter.
    expect(manager.get(id)!.rect).not.toMatchObject({ x: 132 })
    await press("Enter")
    expect(manager.get(id)!.rect).toEqual({ x: 132, y: 52, w: 400, h: 300 })
    expect(frame().style.translate).toBe("")
    expect(frame().dataset.keyboardGesture).toBeUndefined()
    expect(screen.getByRole("status")).toHaveTextContent("Move finished.")
  })

  it("keeps the window inside the stage", async () => {
    render(<Harness />)
    await chooseFromWindowMenu("Move")
    for (let step = 0; step < 10; step += 1) await press("ArrowLeft")
    await press("Enter")
    expect(manager.get(id)!.rect.x).toBe(0)
  })

  it("resizes and restores the start geometry on Escape", async () => {
    render(<Harness />)
    await chooseFromWindowMenu("Resize")
    await press("ArrowRight")
    await press("ArrowDown")
    expect(frame().style.width).toBe("416px")
    expect(frame().style.height).toBe("316px")
    await press("Escape")
    expect(manager.get(id)!.rect).toEqual({ x: 100, y: 50, w: 400, h: 300 })
    expect(frame().style.width).toBe("")
    expect(screen.getByRole("status")).toHaveTextContent("Resize cancelled.")
  })
})
