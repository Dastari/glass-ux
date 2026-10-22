// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createRef, useContext } from "react"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "../ui/tooltip/index.js"
import { createDragStore } from "./drag.js"
import { ManagedWindow, WorkspaceLinkContext, type WorkspaceLink } from "./managed-window.js"
import { PopoutWindow } from "./popout.js"
import { WindowContext, WindowManagerProvider, useWindowEntry, type WindowContextValue } from "./react.js"
import { registerWindowKind } from "./registry.js"
import { createWindowManager, type WindowManager } from "./store.js"

const Icon = Object.assign(() => null, { iconName: "test" })
let seen: WindowContextValue | null = null
function Probe() {
  seen = useContext(WindowContext)
  return <div data-testid="body">{seen?.fullscreen ? "full screen" : "framed"}</div>
}
registerWindowKind({ kind: "fs-test", title: () => "Remote screen", icon: Icon, load: async () => ({ default: Probe }) })
registerWindowKind({ kind: "fs-off", title: () => "Settings", icon: Icon, fullscreen: false, load: async () => ({ default: Probe }) })

// jsdom has no Fullscreen API: a minimal one that tracks the element and fires the event.
let fullscreenElement: Element | null = null
const setFullscreen = (element: Element | null) => {
  fullscreenElement = element
  document.dispatchEvent(new Event("fullscreenchange"))
}
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  Object.defineProperty(document, "fullscreenEnabled", { configurable: true, get: () => true })
  Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fullscreenElement })
  Object.defineProperty(document, "exitFullscreen", { configurable: true, value: vi.fn(async () => setFullscreen(null)) })
  Object.defineProperty(Element.prototype, "requestFullscreen", {
    configurable: true,
    value: vi.fn(async function (this: Element) {
      setFullscreen(this)
    }),
  })
})
afterEach(() => {
  cleanup()
  fullscreenElement = null
  seen = null
})
afterAll(() => {
  vi.unstubAllGlobals()
  for (const key of ["fullscreenEnabled", "fullscreenElement", "exitFullscreen"]) Reflect.deleteProperty(document, key)
  Reflect.deleteProperty(Element.prototype, "requestFullscreen")
})

let manager: WindowManager
beforeEach(() => {
  manager = createWindowManager({ storageKey: null, channelName: null })
})

function Workspace({ id }: { id: string }) {
  const stageRef = createRef<HTMLDivElement>()
  const link: WorkspaceLink = { stageRef, drag: createDragStore(), sheet: false }
  return (
    <TooltipProvider>
      <WindowManagerProvider manager={manager}>
        <WorkspaceLinkContext.Provider value={link}>
          <div ref={stageRef} className="fa-wm-workspace-stage">
            <Live id={id} />
          </div>
        </WorkspaceLinkContext.Provider>
      </WindowManagerProvider>
    </TooltipProvider>
  )
}

function Live({ id }: { id: string }) {
  const entry = useWindowEntry(id)
  return entry ? <ManagedWindow entry={entry} focused geometry="free" vars={{}} hidden={false} /> : null
}

describe("Full screen in the workspace", () => {
  it("puts the frame in full screen, tells the body, and leaves with exitFullscreen", async () => {
    const id = manager.open({ kind: "fs-test", layout: "floating" })
    render(<Workspace id={id} />)
    expect(await screen.findByText("framed")).toBeInTheDocument()
    const frame = document.querySelector<HTMLElement>(`[data-window-id="${id}"]`)!
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Full screen Remote screen" }))
    })
    expect(document.fullscreenElement).toBe(frame)
    expect(frame).toHaveAttribute("data-fullscreen", "")
    expect(screen.getByText("full screen")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Exit full screen Remote screen" })).toHaveAttribute("data-control", "fullscreen")
    await act(async () => seen?.exitFullscreen?.())
    expect(document.fullscreenElement).toBeNull()
    expect(frame).not.toHaveAttribute("data-fullscreen")
    expect(screen.getByText("framed")).toBeInTheDocument()
  })

  it("follows Esc (the browser leaving full screen) and leaves when the window is minimised", async () => {
    const id = manager.open({ kind: "fs-test", layout: "floating" })
    render(<Workspace id={id} />)
    await screen.findByText("framed")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Full screen Remote screen" })))
    await act(async () => setFullscreen(null))
    expect(screen.getByText("framed")).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Full screen Remote screen" })))
    expect(screen.getByText("full screen")).toBeInTheDocument()
    await act(async () => manager.minimise(id))
    expect(document.fullscreenElement).toBeNull()
  })

  it("is not offered for a kind with fullscreen: false", async () => {
    const id = manager.open({ kind: "fs-off", layout: "floating" })
    render(<Workspace id={id} />)
    await screen.findByText("framed")
    expect(screen.queryByRole("button", { name: /Full screen/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Close Settings" })).toBeInTheDocument()
  })
})

describe("PopoutWindow without storage", () => {
  it("waits for the workspace's state instead of closing, then offers Full screen", async () => {
    const close = vi.spyOn(window, "close").mockImplementation(() => {})
    const channelName = `test.popout.${Math.random()}`
    const workspace = createWindowManager({ storageKey: null, channelName, popoutUrl: (id) => `/popout/${id}` })
    const disconnect = workspace.connect()
    const id = workspace.open({ kind: "fs-test" })
    const popup = createWindowManager({ storageKey: null, channelName, role: "popout" })
    render(
      <TooltipProvider>
        <WindowManagerProvider manager={popup}>
          <PopoutWindow id={id} />
        </WindowManagerProvider>
      </TooltipProvider>
    )
    expect(await screen.findByText("framed")).toBeInTheDocument()
    expect(seen?.host).toBe("popout")
    expect(screen.getByRole("button", { name: "Full screen Remote screen" })).toBeInTheDocument()
    expect(screen.queryByText("This window was closed in the workspace.")).not.toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(close).not.toHaveBeenCalled()
    disconnect()
    close.mockRestore()
  })

  it("closes once no workspace answers", async () => {
    vi.useFakeTimers()
    const close = vi.spyOn(window, "close").mockImplementation(() => {})
    const popup = createWindowManager({ storageKey: null, channelName: `test.popout.none.${Math.random()}`, role: "popout" })
    render(
      <WindowManagerProvider manager={popup}>
        <PopoutWindow id="fs-test:gone" />
      </WindowManagerProvider>
    )
    await act(async () => vi.advanceTimersByTime(1000))
    expect(screen.queryByText("This window was closed in the workspace.")).not.toBeInTheDocument()
    await act(async () => vi.advanceTimersByTime(1500))
    expect(screen.getByText("This window was closed in the workspace.")).toBeInTheDocument()
    await act(async () => vi.advanceTimersByTime(300))
    expect(close).toHaveBeenCalled()
    close.mockRestore()
    vi.useRealTimers()
  })
})
