// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { Profiler, StrictMode, useEffect, useState, type ComponentType } from "react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { StorageScopeContext } from "../../lib/storage-scope.js"
import { setMaximised } from "./tree.js"
import { closePanel, column, layoutOf, movePanel, openPanel, PaneLayout, paneLayoutStorageKey, panelsOf, row, setPlacement, sized, stack, stackOf, stacksOf, usePaneLayout, usePanelActions, type PaneDefinition, type PaneLayoutHandle, type PaneLayoutState, type PaneSplit, type PaneStack } from "./index.js"

/** Counts for one panel: a mount is a useState initialiser, an effect is a setup. */
interface Counts {
  mounts: number
  renders: number
  setups: number
  cleanups: number
}
const counts = new Map<string, Counts>()
const count = (id: string) => {
  const entry = counts.get(id) ?? { mounts: 0, renders: 0, setups: 0, cleanups: 0 }
  counts.set(id, entry)
  return entry
}

function Counted({ id }: { id: string }) {
  count(id).renders += 1
  useState(() => {
    count(id).mounts += 1
    return null
  })
  useEffect(() => {
    count(id).setups += 1
    return () => {
      count(id).cleanups += 1
    }
  }, [id])
  return (
    <div data-testid={`content-${id}`}>
      <input aria-label={`Note in ${id}`} />
    </div>
  )
}

const panels: Record<string, Partial<PaneDefinition>> = {
  files: { title: "Files" },
  search: { title: "Search" },
  editor: { title: "Editor", primary: true },
  session: { title: "Session", whenHidden: "run" },
  logs: { title: "Logs" },
}
const panel = (id: string): PaneDefinition | null => (panels[id] ? ({ component: Counted, ...panels[id] } as PaneDefinition) : null)

const workbench = () => layoutOf(row(stack("files", "search"), stack("editor"), stack("session", "logs")))
const stackId = (layout: PaneLayoutState, id: string) => stackOf(layout.root, id)!.id
const lastSizes = (spy: { mock: { lastCall?: unknown[] } }) => ((spy.mock.lastCall![0] as PaneLayoutState).root as PaneSplit).sizes
const hostOf = (id: string) => document.querySelector<HTMLElement>(`.fa-pane-host[data-panel="${id}"]`)!

beforeEach(() => {
  counts.clear()
  localStorage.clear()
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function Controlled({ initial, onChange }: { initial: PaneLayoutState; onChange?: (layout: PaneLayoutState) => void }) {
  const [layout, setLayout] = useState(initial)
  latest = setLayout
  return (
    <PaneLayout
      panel={panel}
      layout={layout}
      onLayoutChange={(next) => {
        setLayout(next)
        onChange?.(next)
      }}
    />
  )
}
let latest: (update: PaneLayoutState | ((current: PaneLayoutState) => PaneLayoutState)) => void

describe("PaneLayout", () => {
  it("draws stacks as named regions and shows a strip from two panels", () => {
    render(<PaneLayout panel={panel} defaultLayout={workbench()} />)
    expect(screen.getByRole("region", { name: "Editor" })).toBeInTheDocument()
    expect(screen.getByRole("tablist", { name: "Files group" })).toBeInTheDocument()
    expect(screen.getAllByRole("tablist")).toHaveLength(2)
    expect(screen.getAllByRole("separator")).toHaveLength(2)
    expect(screen.getByRole("separator", { name: "Resize Files" })).toHaveAttribute("aria-orientation", "vertical")
  })

  it("mounts a panel once, on first show", () => {
    render(<PaneLayout panel={panel} defaultLayout={workbench()} />)
    expect(count("files").mounts).toBe(1)
    expect(counts.has("search")).toBe(false)
    fireEvent.click(screen.getByRole("tab", { name: "Search" }))
    expect(count("search").mounts).toBe(1)
    expect(count("files").mounts).toBe(1)
  })

  it("a hidden tab pauses by default: its effects clean up, and set up again on show, with no remount", () => {
    render(<PaneLayout panel={panel} defaultLayout={workbench()} />)
    expect(count("files")).toMatchObject({ mounts: 1, setups: 1, cleanups: 0 })
    fireEvent.click(screen.getByRole("tab", { name: "Search" }))
    expect(count("files")).toMatchObject({ mounts: 1, setups: 1, cleanups: 1 })
    expect(hostOf("files").hidden).toBe(true)
    fireEvent.click(screen.getByRole("tab", { name: "Files" }))
    expect(count("files")).toMatchObject({ mounts: 1, setups: 2, cleanups: 1 })
  })

  it('whenHidden "run" keeps effects alive across a tab switch: no cleanup, no second setup, no remount', () => {
    render(<PaneLayout panel={panel} defaultLayout={workbench()} />)
    expect(count("session")).toMatchObject({ mounts: 1, setups: 1, cleanups: 0 })
    fireEvent.click(screen.getByRole("tab", { name: "Logs" }))
    expect(hostOf("session").hidden).toBe(true)
    expect(count("session")).toMatchObject({ mounts: 1, setups: 1, cleanups: 0 })
    fireEvent.click(screen.getByRole("tab", { name: "Session" }))
    fireEvent.click(screen.getByRole("tab", { name: "Logs" }))
    fireEvent.click(screen.getByRole("tab", { name: "Session" }))
    expect(count("session")).toMatchObject({ mounts: 1, setups: 1, cleanups: 0 })
  })

  it('whenHidden "run" keeps effects alive through a pane move while hidden and while shown', () => {
    render(<Controlled initial={workbench()} />)
    fireEvent.click(screen.getByRole("tab", { name: "Logs" }))
    expect(hostOf("session").hidden).toBe(true)
    const moves: [string, () => void][] = [
      ["to another stack", () => latest((layout) => movePanel(layout, "session", { stack: stackId(layout, "files") }))],
      ["to a new split", () => latest((layout) => movePanel(layout, "session", { stack: stackId(layout, "editor"), edge: "bottom" }))],
    ]
    for (const [, move] of moves) {
      act(move)
      expect(count("session")).toMatchObject({ mounts: 1, setups: 1, cleanups: 0 })
    }
    expect(hostOf("session").closest("[data-stack]")).toHaveAttribute("aria-label", "Session")
  })

  it("moving a panel shows exactly one mount, keeps its input and renders it no more", () => {
    render(<Controlled initial={workbench()} />)
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "Note in editor" })
    fireEvent.change(input, { target: { value: "Draft" } })
    const before = count("editor").renders
    act(() => latest((layout) => movePanel(layout, "editor", { stack: stackId(layout, "session"), edge: "top" })))
    act(() => latest((layout) => movePanel(layout, "editor", { stack: stackId(layout, "files") })))
    act(() => latest((layout) => movePanel(layout, "editor", { stack: stackId(layout, "logs"), edge: "end" })))
    expect(count("editor")).toMatchObject({ mounts: 1, setups: 1, cleanups: 0 })
    expect(count("editor").renders).toBe(before)
    expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Note in editor" })).toBe(input)
    expect(input.value).toBe("Draft")
  })

  it("keeps the host through a commit that removes its stack, and on with moveBefore where it exists", () => {
    const moveBefore = vi.fn(function (this: Element, node: Node, before: Node | null) {
      this.insertBefore(node, before)
    })
    Object.defineProperty(Element.prototype, "moveBefore", { value: moveBefore, configurable: true })
    render(<Controlled initial={workbench()} />)
    const host = hostOf("editor")
    act(() => latest((layout) => movePanel(layout, "editor", { stack: stackId(layout, "session") })))
    expect(hostOf("editor")).toBe(host)
    expect(host.isConnected).toBe(true)
    expect(host.closest("[data-stack]")).toHaveAttribute("aria-label", "Editor")
    // Parked from the stack that went, then placed: neither step removed it from the document.
    expect(moveBefore).toHaveBeenCalled()
    expect(moveBefore.mock.calls.every(([node]) => node === host)).toBe(true)
    delete (Element.prototype as { moveBefore?: unknown }).moveBefore
  })

  it("restores focus and scroll without moveBefore", () => {
    render(<Controlled initial={workbench()} />)
    const input = screen.getByRole("textbox", { name: "Note in editor" })
    input.focus()
    const host = hostOf("editor")
    const scroller = host.firstElementChild as HTMLElement
    scroller.scrollTop = 120
    fireEvent.scroll(scroller)
    act(() => latest((layout) => movePanel(layout, "editor", { stack: stackId(layout, "session"), edge: "bottom" })))
    expect(document.activeElement).toBe(input)
    expect(scroller.scrollTop).toBe(120)
  })

  it("closes a panel: it unmounts and its stack gives way", () => {
    const onLayoutChange = vi.fn()
    render(<PaneLayout panel={panel} defaultLayout={workbench()} onLayoutChange={onLayoutChange} />)
    fireEvent.keyDown(screen.getByRole("tab", { name: "Files" }), { key: "Delete" })
    expect(onLayoutChange).toHaveBeenCalledTimes(1)
    expect(onLayoutChange.mock.lastCall?.[1]).toEqual({ reason: "close" })
    expect(count("files").cleanups).toBe(1)
    expect(document.querySelector('[data-panel="files"]')).toBeNull()
    expect(screen.queryByRole("tab", { name: "Files" })).toBeNull()
  })

  it("canClose keeps a panel that refuses", async () => {
    const definitions = (id: string) => (id === "files" ? { title: "Files", component: Counted, canClose: () => false } : panel(id))
    const onLayoutChange = vi.fn()
    render(<PaneLayout panel={definitions} defaultLayout={workbench()} onLayoutChange={onLayoutChange} />)
    fireEvent.keyDown(screen.getByRole("tab", { name: "Files" }), { key: "Delete" })
    await act(async () => {})
    expect(onLayoutChange).not.toHaveBeenCalled()
    expect(screen.getByRole("tab", { name: "Files" })).toBeInTheDocument()
  })

  it("is one mount under StrictMode's double effects", () => {
    render(
      <StrictMode>
        <Controlled initial={workbench()} />
      </StrictMode>
    )
    const host = hostOf("editor")
    act(() => latest((layout) => movePanel(layout, "editor", { stack: stackId(layout, "files") })))
    expect(hostOf("editor")).toBe(host)
    expect(host.isConnected).toBe(true)
  })

  it("locked: no bar on a single panel, no close, no menu, and tabs still switch", () => {
    render(<PaneLayout locked panel={panel} defaultLayout={layoutOf(row(stack("files", "search"), stack("editor")))} />)
    expect(screen.queryByRole("button", { name: /Actions for/ })).toBeNull()
    expect(document.querySelectorAll(".fa-pane-bar")).toHaveLength(1)
    fireEvent.keyDown(screen.getByRole("tab", { name: "Files" }), { key: "Delete" })
    expect(screen.getByRole("tab", { name: "Files" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("tab", { name: "Search" }))
    expect(hostOf("search").hidden).toBe(false)
  })

  it("renders on a server as skeletons in the final tracks, with no content", () => {
    const html = renderToString(<PaneLayout panel={panel} defaultLayout={layoutOf(row(sized(stack("files"), "16rem"), stack("editor")))} />)
    expect(html).toContain("16rem")
    expect(html).toContain("fa-pane-skeleton")
    expect(html).toContain('aria-label="Files"')
    expect(html).not.toContain("fa-pane-host")
    expect(counts.size).toBe(0)
  })

  it("a layout with no tabs anywhere renders plain stacks", () => {
    render(<PaneLayout locked panel={panel} defaultLayout={layoutOf(row(sized(stack("files"), "16rem"), stack("search"), stack("editor")))} />)
    expect(screen.queryAllByRole("tab")).toHaveLength(0)
    expect(screen.getAllByRole("separator")).toHaveLength(2)
    expect(screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"))).toEqual(["Files", "Search", "Editor"])
    expect(document.querySelector<HTMLElement>(".fa-pane-split")?.style.gridTemplateColumns).toContain("16rem")
  })
})

describe("resizing", () => {
  const rect = (element: Element, length: number) => {
    element.getBoundingClientRect = () => ({ width: length, height: 400, left: 0, top: 0, right: length, bottom: 400, x: 0, y: 0, toJSON: () => null })
  }

  /** Give the tracks real lengths, which jsdom does not lay out. */
  const measure = () => {
    const split = document.querySelector(".fa-pane-split")!
    rect(split, 900)
    for (const child of Array.from(split.children)) rect(child, child.getAttribute("role") === "separator" ? 8 : 300)
    return split as HTMLElement
  }

  it("a drag writes custom properties, commits once on release and renders nothing until then", () => {
    const onLayoutChange = vi.fn()
    const onRender = vi.fn()
    render(
      <Profiler id="layout" onRender={onRender}>
        <PaneLayout panel={panel} defaultLayout={workbench()} onLayoutChange={onLayoutChange} />
      </Profiler>
    )
    const split = measure()
    const separator = screen.getByRole("separator", { name: "Resize Files" })
    separator.setPointerCapture = () => {}
    onRender.mockClear()
    const renders = count("editor").renders
    fireEvent.pointerDown(separator, { button: 0, pointerId: 1, clientX: 300 })
    for (let step = 1; step <= 30; step += 1) fireEvent.pointerMove(separator, { pointerId: 1, clientX: 300 + step })
    expect(onRender).not.toHaveBeenCalled()
    expect(onLayoutChange).not.toHaveBeenCalled()
    expect(split.style.getPropertyValue("--_t0")).toMatch(/fr$/)
    expect(split.style.getPropertyValue("--_t1")).toMatch(/fr$/)
    expect(split).toHaveAttribute("data-dragging")
    fireEvent.pointerUp(separator, { pointerId: 1 })
    expect(onLayoutChange).toHaveBeenCalledTimes(1)
    expect(onLayoutChange.mock.lastCall?.[1]).toEqual({ reason: "resize" })
    expect(lastSizes(onLayoutChange)).toEqual([1.1, 0.9, 1])
    expect(split.style.getPropertyValue("--_t0")).toBe("")
    expect(split).not.toHaveAttribute("data-dragging")
    expect(count("editor").renders).toBe(renders)
  })

  it("a cancelled pointer restores the old size and commits nothing", () => {
    const onLayoutChange = vi.fn()
    render(<PaneLayout panel={panel} defaultLayout={workbench()} onLayoutChange={onLayoutChange} />)
    const split = measure()
    const separator = screen.getByRole("separator", { name: "Resize Files" })
    separator.setPointerCapture = () => {}
    fireEvent.pointerDown(separator, { button: 0, pointerId: 1, clientX: 300 })
    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 340 })
    fireEvent.pointerCancel(separator, { pointerId: 1 })
    expect(split.style.getPropertyValue("--_t0")).toBe("")
    expect(onLayoutChange).not.toHaveBeenCalled()
  })

  it("arrow keys commit once per press, Home and End reach the limits", () => {
    const onLayoutChange = vi.fn()
    render(<PaneLayout panel={panel} defaultLayout={workbench()} onLayoutChange={onLayoutChange} />)
    measure()
    const separator = screen.getByRole("separator", { name: "Resize Files" })
    fireEvent.keyDown(separator, { key: "ArrowRight" })
    expect(onLayoutChange).toHaveBeenCalledTimes(1)
    const sizes = () => lastSizes(onLayoutChange)
    expect(sizes()[0]).toBeGreaterThan(1)
    measure()
    fireEvent.keyDown(separator, { key: "Home" })
    // 12rem of the 600 px the pair shares, with jsdom's 16 px root.
    expect(sizes()[0]).toBeCloseTo((192 / 600) * 2, 2)
  })

  it("Enter hides the stack that gives way behind a rail button, and the button shows it", () => {
    const onLayoutChange = vi.fn()
    render(<PaneLayout panel={panel} defaultLayout={workbench()} onLayoutChange={onLayoutChange} />)
    fireEvent.keyDown(screen.getByRole("separator", { name: "Resize Files" }), { key: "Enter" })
    expect(onLayoutChange.mock.lastCall?.[1]).toEqual({ reason: "collapse" })
    expect(screen.queryByRole("region", { name: "Files" })).toBeNull()
    expect(count("files").cleanups).toBe(1)
    fireEvent.click(screen.getByRole("button", { name: "Show Files" }))
    expect(screen.getByRole("region", { name: "Files" })).toBeInTheDocument()
    expect(count("files")).toMatchObject({ mounts: 1, setups: 2 })
  })

  it("double-click returns a track to the starting layout's size", () => {
    const onLayoutChange = vi.fn()
    const start = layoutOf(row(sized(stack("files"), "16rem"), stack("editor")))
    render(<PaneLayout panel={panel} defaultLayout={start} onLayoutChange={onLayoutChange} />)
    measure()
    const separator = screen.getByRole("separator", { name: "Resize Files" })
    fireEvent.keyDown(separator, { key: "ArrowRight" })
    expect(lastSizes(onLayoutChange)[0]).not.toBe("16rem")
    fireEvent.doubleClick(separator)
    expect(lastSizes(onLayoutChange)[0]).toBe("16rem")
  })
})

describe("saved layouts", () => {
  it("keeps an unknown id dormant: no tab, no track, reported, and still in the JSON", () => {
    const onUnknownPanels = vi.fn()
    const onLayoutChange = vi.fn()
    const start = layoutOf(row(stack("files", "gone"), stack("removed"), stack("editor")))
    render(<PaneLayout panel={panel} defaultLayout={start} onUnknownPanels={onUnknownPanels} onLayoutChange={onLayoutChange} />)
    expect(onUnknownPanels).toHaveBeenCalledWith(["gone", "removed"])
    expect(screen.queryAllByRole("tab")).toHaveLength(0)
    expect(screen.getAllByRole("separator")).toHaveLength(1)
    fireEvent.keyDown(screen.getByRole("separator"), { key: "Enter" })
    expect(JSON.stringify(onLayoutChange.mock.lastCall?.[0])).toContain("removed")
    expect(JSON.stringify(onLayoutChange.mock.lastCall?.[0])).toContain("gone")
  })

  it("brings an id back in place when it resolves again", () => {
    const start = layoutOf(row(stack("files"), stack("later"), stack("editor")))
    const later: PaneDefinition = { title: "Later", component: Counted }
    const view = render(<PaneLayout panel={panel} layout={start} />)
    expect(screen.queryByRole("region", { name: "Later" })).toBeNull()
    view.rerender(<PaneLayout panel={(id) => (id === "later" ? later : panel(id))} layout={start} />)
    expect(screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"))).toEqual(["Files", "Later", "Editor"])
  })

  it("a moved panel's strip index counts only what the strip shows", () => {
    const start = layoutOf(row(stack("files", "gone", "search"), stack("editor")))
    const moved = movePanel(start, "editor", { stack: stackId(start, "files"), index: 1 })
    expect((moved.root as PaneStack).panels).toEqual(["files", "editor", "gone", "search"])
  })

  it("remembers per window kind inside a window body, and nothing elsewhere", () => {
    const inWindow = render(
      <StorageScopeContext.Provider value="window:editor">
        <PaneLayout panel={panel} defaultLayout={workbench()} />
      </StorageScopeContext.Provider>
    )
    fireEvent.click(screen.getByRole("tab", { name: "Search" }))
    expect(JSON.parse(localStorage.getItem(paneLayoutStorageKey("editor"))!)).toMatchObject({ version: 1 })
    inWindow.unmount()
    localStorage.clear()
    render(<PaneLayout panel={panel} defaultLayout={workbench()} />)
    fireEvent.click(screen.getByRole("tab", { name: "Search" }))
    expect(localStorage.length).toBe(0)
  })

  it("restores what it stored, and takes the default over a corrupt or newer store", () => {
    const stored = closePanel(workbench(), "logs")
    localStorage.setItem("app.layout", JSON.stringify(stored))
    const first = render(<PaneLayout panel={panel} storageKey="app.layout" defaultLayout={workbench()} />)
    expect(screen.queryByRole("tab", { name: "Logs" })).toBeNull()
    first.unmount()
    for (const value of ["{not json", JSON.stringify({ ...stored, version: 99 })]) {
      localStorage.setItem("app.layout", value)
      const view = render(<PaneLayout panel={panel} storageKey="app.layout" defaultLayout={workbench()} />)
      expect(screen.getByRole("tab", { name: "Logs" })).toBeInTheDocument()
      view.unmount()
    }
  })
})

describe("usePaneLayout", () => {
  let handle: PaneLayoutHandle
  const Driver: ComponentType<{ id: string }> = ({ id }) => {
    handle = usePaneLayout()
    return <Counted id={id} />
  }
  const driven = (id: string) => (id === "editor" ? { title: "Editor", component: Driver, primary: true } : panel(id))

  it("opens, moves, reveals and closes on the live layout, each reported once", async () => {
    const onLayoutChange = vi.fn()
    render(<PaneLayout panel={driven} defaultLayout={workbench()} onLayoutChange={onLayoutChange} />)
    act(() => handle.open("logs"))
    expect(onLayoutChange.mock.lastCall?.[1]).toEqual({ reason: "open" })
    const reasons = onLayoutChange.mock.calls.length
    act(() => handle.move("files", { stack: stackId(handle.layout, "editor"), edge: "bottom" }))
    expect(onLayoutChange).toHaveBeenCalledTimes(reasons + 1)
    expect(onLayoutChange.mock.lastCall?.[1]).toEqual({ reason: "move" })
    await act(async () => {
      expect(await handle.close("search")).toBe(true)
    })
    expect(onLayoutChange.mock.lastCall?.[1]).toEqual({ reason: "close" })
    expect(stackOf(handle.layout.root, "search")).toBeUndefined()
  })

  it("setLayout switches workspaces and a panel in both keeps its mount", () => {
    render(<PaneLayout panel={driven} defaultLayout={workbench()} />)
    act(() => handle.setLayout(layoutOf(column(stack("logs"), stack("editor")))))
    expect(count("editor")).toMatchObject({ mounts: 1, cleanups: 0 })
    expect(screen.getByRole("region", { name: "Logs" })).toBeInTheDocument()
    expect(count("files").cleanups).toBe(1)
  })

  it("does nothing for a change that changes nothing", () => {
    const onLayoutChange = vi.fn()
    render(<PaneLayout panel={driven} defaultLayout={workbench()} onLayoutChange={onLayoutChange} />)
    act(() => handle.reveal("files"))
    expect(onLayoutChange).not.toHaveBeenCalled()
  })

  it("reveal in the collapsed view shows the panel in a sheet and writes nothing", async () => {
    const onLayoutChange = vi.fn()
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 320, height: 640, left: 0, top: 0, right: 320, bottom: 640, x: 0, y: 0, toJSON: () => null })
    render(<PaneLayout panel={driven} defaultLayout={workbench()} onLayoutChange={onLayoutChange} />)
    expect(screen.getByRole("tablist", { name: "Panels" })).toBeInTheDocument()
    expect(screen.queryAllByRole("separator")).toHaveLength(0)
    expect(count("files").mounts).toBe(0)
    act(() => handle.reveal("logs"))
    expect(await screen.findByRole("dialog", { name: "Logs" })).toBeInTheDocument()
    expect(hostOf("logs").closest('[role="dialog"]')).not.toBeNull()
    expect(onLayoutChange).not.toHaveBeenCalled()
  })

  it("throws outside a panel", () => {
    const Outside = () => {
      usePaneLayout()
      return null
    }
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined)
    expect(() => render(<Outside />)).toThrow("usePaneLayout must be inside a panel of a PaneLayout.")
    quiet.mockRestore()
  })
})

describe("the panel's actions", () => {
  let set: ReturnType<typeof usePanelActions>
  const Reader: ComponentType<{ id: string }> = ({ id }) => {
    set = usePanelActions()
    return <Counted id={id} />
  }
  const read = (id: string) => (id === "editor" ? { title: "Editor", component: Reader } : panel(id))

  it("lists the other stacks and four splits, and hides what never applies", () => {
    render(<PaneLayout panel={read} defaultLayout={workbench()} />)
    const move = set.actions.find((action) => action.id === "move")!
    const rows = move.children!.filter((row) => row.visible?.(["search"]) !== false).map((row) => row.label)
    expect(rows).toEqual(["Editor", "Session", "Split left", "Split right", "Split up", "Split down"])
    const lone = move.children!.filter((row) => row.visible?.(["editor"]) !== false).map((row) => row.label)
    expect(lone).toEqual(["Files", "Session"])
  })

  it("names its region and buttons from the panel's title in a strip-less stack", () => {
    render(<PaneLayout panel={panel} defaultLayout={layoutOf(row(stack("editor"), stack("files")))} />)
    expect(within(screen.getByRole("region", { name: "Editor" })).getByText("Editor")).toBeInTheDocument()
  })
})

describe("a layout held outside the panels", () => {
  it("opens a panel and reads the tree through the public entry", () => {
    const layout = openPanel(layoutOf(row(stack("files"), stack("editor"))), "notes", { stack: stacksOf(layoutOf(row(stack("files"), stack("editor"))).root)[1]!.id })
    expect(panelsOf(layout.root)).toEqual(["files", "editor", "notes"])
    expect(stackOf(layout.root, "notes")?.active).toBe("notes")
  })
})

describe("overlay placement", () => {
  const overlay = () => setPlacement(workbench(), "overlay")
  const stackEl = (id: string) => hostOf(id).closest<HTMLElement>("[data-stack]")!
  const root = () => document.querySelector<HTMLElement>(".fa-pane-layout")!

  it("a docked layout carries none of its attributes", () => {
    render(<PaneLayout panel={panel} defaultLayout={workbench()} moving />)
    expect(document.querySelectorAll("[data-overlay], [data-placement], [data-ground-bar], [data-moving]")).toHaveLength(0)
    expect(document.querySelector(".fa-split-rail.glass-chrome")).toBeNull()
  })

  it("lays the primary panel's stack under the rest, with the tree's order and regions unchanged", () => {
    render(<PaneLayout panel={panel} defaultLayout={overlay()} />)
    expect(root()).toHaveAttribute("data-placement", "overlay")
    expect(root()).toHaveAttribute("data-ground-bar")
    expect(stackEl("editor")).toHaveAttribute("data-overlay", "ground")
    expect(stackEl("files")).toHaveAttribute("data-overlay", "floating")
    expect(stackEl("session")).toHaveAttribute("data-overlay", "floating")
    expect(screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"))).toEqual(["Files", "Editor", "Session"])
    expect(screen.getAllByRole("separator")).toHaveLength(2)
    expect(document.querySelectorAll("[data-stack][data-focus-region]")).toHaveLength(3)
  })

  it("switching docked and overlay moves no host and remounts nothing, run panels included", () => {
    const onLayoutChange = vi.fn()
    render(<Controlled initial={workbench()} onChange={onLayoutChange} />)
    fireEvent.click(screen.getByRole("tab", { name: "Logs" }))
    onLayoutChange.mockClear()
    const before = ["files", "editor", "logs", "session"].map((id) => [hostOf(id), hostOf(id).parentElement])
    const stacks = [...document.querySelectorAll("[data-stack]")]
    for (const placement of ["overlay", "docked", "overlay"] as const) {
      act(() => latest((layout) => setPlacement(layout, placement)))
      expect(["files", "editor", "logs", "session"].map((id) => [hostOf(id), hostOf(id).parentElement])).toEqual(before)
      expect([...document.querySelectorAll("[data-stack]")]).toEqual(stacks)
    }
    for (const id of ["files", "editor", "logs"]) expect(count(id)).toMatchObject({ mounts: 1, setups: 1, cleanups: 0 })
    expect(count("session")).toMatchObject({ mounts: 1, setups: 1, cleanups: 0 })
    expect(onLayoutChange).not.toHaveBeenCalled()
  })

  it('a flush layout draws each stack as a Panel in overlay, and keeps its mounts through the switch', () => {
    function Flush() {
      const [layout, setLayout] = useState(workbench())
      latest = setLayout
      return <PaneLayout panel={panel} layout={layout} chrome="flush" />
    }
    render(<Flush />)
    expect(document.querySelector(".fa-pane-surface")).not.toBeNull()
    act(() => latest((layout) => setPlacement(layout, "overlay")))
    expect(document.querySelector(".fa-pane-surface")).toBeNull()
    expect(root()).toHaveAttribute("data-chrome", "panel")
    expect(stackEl("files")).toHaveClass("glass-panel")
    act(() => latest((layout) => setPlacement(layout, "docked")))
    expect(document.querySelector(".fa-pane-surface")).not.toBeNull()
    for (const id of ["files", "editor", "session"]) expect(count(id)).toMatchObject({ mounts: 1, cleanups: 0 })
  })

  it("moving marks the floating stacks only, and only in overlay", () => {
    function Host({ moving, layout }: { moving: boolean; layout: PaneLayoutState }) {
      return <PaneLayout panel={panel} layout={layout} moving={moving} />
    }
    const view = render(<Host moving={false} layout={overlay()} />)
    expect(document.querySelectorAll("[data-moving]")).toHaveLength(0)
    view.rerender(<Host moving layout={overlay()} />)
    expect(stackEl("files")).toHaveAttribute("data-moving")
    expect(stackEl("session")).toHaveAttribute("data-moving")
    expect(stackEl("editor")).not.toHaveAttribute("data-moving")
    view.rerender(<Host moving layout={workbench()} />)
    expect(document.querySelectorAll("[data-moving]")).toHaveLength(0)
    view.rerender(<Host moving layout={overlay()} />)
    expect(document.querySelectorAll("[data-moving]")).toHaveLength(2)
    view.rerender(<Host moving={false} layout={overlay()} />)
    expect(document.querySelectorAll("[data-moving]")).toHaveLength(0)
  })

  it("a panel says it is moving with setMoving, and nothing renders", () => {
    let handle: PaneLayoutHandle | null = null
    const Driver: ComponentType<{ id: string }> = ({ id }) => {
      handle = usePaneLayout()
      return <Counted id={id} />
    }
    const driven = (id: string) => (id === "editor" ? { title: "Editor", component: Driver, primary: true } : panel(id))
    const onRender = vi.fn()
    render(
      <Profiler id="layout" onRender={onRender}>
        <PaneLayout panel={driven} defaultLayout={overlay()} />
      </Profiler>
    )
    const renders = onRender.mock.calls.length
    act(() => handle!.setMoving(true))
    expect(document.querySelectorAll("[data-moving]")).toHaveLength(2)
    expect(stackEl("editor")).not.toHaveAttribute("data-moving")
    act(() => handle!.setMoving(false))
    expect(document.querySelectorAll("[data-moving]")).toHaveLength(0)
    expect(onRender.mock.calls.length).toBe(renders)
  })

  it("is not drawn on a phone, while a stack is maximised, or with nothing to float", () => {
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 320, height: 640, left: 0, top: 0, right: 320, bottom: 640, x: 0, y: 0, toJSON: () => null })
    const phone = render(<PaneLayout panel={panel} defaultLayout={overlay()} />)
    expect(screen.getByRole("tablist", { name: "Panels" })).toBeInTheDocument()
    expect(document.querySelectorAll("[data-overlay], [data-placement]")).toHaveLength(0)
    phone.unmount()
    rect.mockRestore()
    const maximised = render(<PaneLayout panel={panel} defaultLayout={setMaximised(overlay(), stackId(workbench(), "files"))} />)
    expect(document.querySelectorAll("[data-overlay], [data-placement]")).toHaveLength(0)
    maximised.unmount()
    render(<PaneLayout panel={panel} defaultLayout={setPlacement(layoutOf(stack("editor")), "overlay")} />)
    expect(document.querySelectorAll("[data-overlay], [data-placement]")).toHaveLength(0)
  })

  it("a collapsed floating stack leaves a rail with material, and Move to still lists every stack", () => {
    const layout = workbench()
    const collapsed: PaneLayoutState = { ...overlay(), root: { ...(layout.root as PaneSplit), children: (layout.root as PaneSplit).children.map((child) => (child.type === "stack" && child.panels.includes("session") ? { ...child, collapsed: true } : child)) } }
    render(<PaneLayout panel={panel} defaultLayout={collapsed} />)
    const rail = document.querySelector(".fa-split-rail")!
    expect(rail).toHaveClass("glass-chrome")
    expect(within(rail as HTMLElement).getByRole("button", { name: "Show Session" })).toBeInTheDocument()
  })

  it("the ground is the stack whose primary panel is active", () => {
    render(<PaneLayout panel={panel} defaultLayout={setPlacement(layoutOf(row(stack("files"), stack("logs", "editor"), stack("search"))), "overlay")} />)
    expect(document.querySelector('[data-overlay="ground"]')).toHaveAttribute("aria-label", "Logs")
  })
})
