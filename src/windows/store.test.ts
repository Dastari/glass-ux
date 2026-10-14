// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assignTiles, edgeSnapTarget, fracToRect, maxTileColumns, normaliseSplits, SNAP_ZONES } from "./geometry.js"
import { registerWindowKind } from "./registry.js"
import { createWindowManager, parseWindows } from "./store.js"
import { PRIMARY_WINDOW_ID } from "./types.js"

const Icon = Object.assign(() => null, { iconName: "test" })

registerWindowKind({
  kind: "test",
  title: (params) => `Test ${String(params.n ?? "")}`,
  icon: Icon,
  load: async () => ({ default: () => null }),
})
registerWindowKind({
  kind: "scoped",
  title: () => "Scoped",
  icon: Icon,
  scope: (params) => (params.org ? String(params.org) : null),
  load: async () => ({ default: () => null }),
})
registerWindowKind({
  kind: "singleton",
  title: () => "Singleton",
  icon: Icon,
  key: (params) => String(params.endpoint),
  load: async () => ({ default: () => null }),
})

describe("geometry", () => {
  it("snaps to halves at the side edges, quarters at the corners and maximises at the top", () => {
    expect(edgeSnapTarget(2, 400, 1000, 800, 24)).toBe("left-half")
    expect(edgeSnapTarget(998, 400, 1000, 800, 24)).toBe("right-half")
    expect(edgeSnapTarget(2, 20, 1000, 800, 24)).toBe("top-left")
    expect(edgeSnapTarget(998, 790, 1000, 800, 24)).toBe("bottom-right")
    expect(edgeSnapTarget(500, 4, 1000, 800, 24)).toBe("maximise")
    expect(edgeSnapTarget(500, 400, 1000, 800, 24)).toBeNull()
  })

  it("gives up half a gap only on interior edges", () => {
    expect(fracToRect(SNAP_ZONES["left-half"], 1000, 800, 16)).toEqual({ x: 0, y: 0, w: 492, h: 800 })
    expect(fracToRect(SNAP_ZONES["right-half"], 1000, 800, 16)).toEqual({ x: 508, y: 0, w: 492, h: 800 })
    expect(fracToRect(SNAP_ZONES["bottom-right"], 1000, 800, 16)).toEqual({ x: 508, y: 408, w: 492, h: 392 })
  })

  it("uses only as many columns as there are tiled windows", () => {
    expect(assignTiles(["a"], 3).columns).toBe(2)
    const three = assignTiles(["a", "b", "c"], 3)
    expect(three.columns).toBe(3)
    expect([...three.slots.values()].map((slot) => slot.column)).toEqual([1, 1, 2])
    expect(assignTiles(["a", "b"], 1).columns).toBe(1)
  })

  it("limits columns by viewport and by the minimum column width", () => {
    expect(maxTileColumns(3440, 2500, 352, 16)).toBe(3)
    expect(maxTileColumns(1920, 1120, 352, 16)).toBe(2)
    expect(maxTileColumns(820, 700, 352, 16)).toBe(1)
    expect(maxTileColumns(2560, 600, 352, 16)).toBe(1)
  })

  it("keeps dividers ordered with a minimum column", () => {
    expect(normaliseSplits([0.95], 2, 0.2)).toEqual([0.8])
    expect(normaliseSplits([0.6, 0.5], 3, 0.2)).toEqual([0.6, 0.8])
  })
})

describe("window manager", () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.useRealTimers())

  it("opens, focuses and raises windows", () => {
    const store = createWindowManager()
    const a = store.open({ kind: "test", params: { n: 1 }, layout: "floating" })
    const b = store.open({ kind: "test", params: { n: 2 }, layout: "floating" })
    expect(store.getState().focusedId).toBe(b)
    store.focus(a)
    const state = store.getState()
    expect(state.focusedId).toBe(a)
    expect(state.windows.find((w) => w.id === a)!.z).toBeGreaterThan(state.windows.find((w) => w.id === b)!.z)
  })

  it("deduplicates by kind key", () => {
    const store = createWindowManager()
    const first = store.open({ kind: "singleton", params: { endpoint: "NST-C106" } })
    const second = store.open({ kind: "singleton", params: { endpoint: "NST-C106" } })
    expect(second).toBe(first)
    expect(store.getState().windows).toHaveLength(1)
  })

  it("minimises to the dock, passes focus on, and restores", () => {
    const store = createWindowManager()
    const a = store.open({ kind: "test", layout: "floating" })
    const b = store.open({ kind: "test", layout: "floating" })
    store.minimise(b)
    expect(store.getState().focusedId).toBe(a)
    store.minimise(a)
    expect(store.getState().focusedId).toBe(PRIMARY_WINDOW_ID)
    store.restore(b)
    expect(store.get(b)?.minimised).toBe(false)
    expect(store.getState().focusedId).toBe(b)
  })

  it("maximises and restores to the previous layout", () => {
    const store = createWindowManager()
    const id = store.open({ kind: "test", layout: "tiled" })
    store.maximise(id)
    expect(store.get(id)?.layout).toBe("maximised")
    store.unmaximise(id)
    expect(store.get(id)?.layout).toBe("tiled")
    store.snap(id, "left-half")
    store.toggleMaximise(id)
    store.toggleMaximise(id)
    expect(store.get(id)).toMatchObject({ layout: "floating", snap: "left-half" })
  })

  it("lets a close guard or a beforeclose listener keep a window open", async () => {
    const store = createWindowManager()
    const id = store.open({ kind: "test" })
    const release = store.addCloseGuard(id, () => false)
    expect(await store.close(id)).toBe(false)
    release()
    const off = store.on("beforeclose", (event) => event.preventDefault())
    expect(await store.close(id)).toBe(false)
    off()
    const closed = vi.fn()
    store.on("close", closed)
    expect(await store.close(id)).toBe(true)
    expect(closed).toHaveBeenCalledOnce()
    expect(store.getState().windows).toHaveLength(0)
  })

  it("persists to storage and restores on connect", () => {
    vi.useFakeTimers()
    const key = "test.windows.v1:avery"
    const first = createWindowManager({ storageKey: key, channelName: null })
    first.connect()
    const id = first.open({ kind: "test", params: { n: 7 }, layout: "floating" })
    first.snap(id, "right-half")
    vi.runAllTimers()
    const second = createWindowManager({ storageKey: key, channelName: null })
    second.connect()
    expect(second.get(id)).toMatchObject({ kind: "test", params: { n: 7 }, snap: "right-half" })
  })

  it("replaces a window's params in place, and other tabs and pop-outs follow", () => {
    const key = "test.windows.v1:params"
    const workspace = createWindowManager({ storageKey: key, channelName: null })
    const id = workspace.open({ kind: "singleton", params: { endpoint: "NST-C106" } })
    const before = workspace.getState().rev
    workspace.setParams(id, { endpoint: "NST-C106", site: "orbit-studio" })
    expect(workspace.get(id)).toMatchObject({ id, params: { endpoint: "NST-C106", site: "orbit-studio" } })
    expect(workspace.getState().rev).toBe(before + 1)
    // The same params again change nothing; an unknown window is ignored.
    workspace.setParams(id, { site: "orbit-studio", endpoint: "NST-C106" })
    workspace.setParams("nope", { a: 1 })
    expect(workspace.getState().rev).toBe(before + 1)
  })

  it("syncs params changes over the window channel (R14.4)", async () => {
    const channelName = `test.windows.params.${Math.random()}`
    const a = createWindowManager({ storageKey: null, channelName })
    const b = createWindowManager({ storageKey: null, channelName, role: "popout" })
    const disconnectA = a.connect()
    const disconnectB = b.connect()
    const id = a.open({ kind: "singleton", params: { endpoint: "LMN-4E5E" } })
    await vi.waitFor(() => expect(b.get(id)).toBeDefined())
    b.setParams(id, { endpoint: "LMN-4E5E", site: "" })
    await vi.waitFor(() => expect(a.get(id)?.params).toEqual({ endpoint: "LMN-4E5E", site: "" }))
    disconnectA()
    disconnectB()
  })

  it("never writes in read-only mode", () => {
    vi.useFakeTimers()
    const store = createWindowManager({ storageKey: "ro", channelName: null, readOnly: true })
    store.connect()
    store.open({ kind: "test" })
    vi.runAllTimers()
    expect(localStorage.getItem("ro")).toBeNull()
  })

  it("records each window's scope from the input or the kind, and keeps it (R14.4)", () => {
    vi.useFakeTimers()
    const key = "test.windows.v1:scope"
    const store = createWindowManager({ storageKey: key, channelName: null })
    store.connect()
    const fromKind = store.open({ kind: "scoped", params: { org: "northstar" } })
    const explicit = store.open({ kind: "scoped", params: { org: "northstar" }, scope: "cedarvale" })
    const none = store.open({ kind: "test" })
    expect(store.get(fromKind)?.scope).toBe("northstar")
    expect(store.get(explicit)?.scope).toBe("cedarvale")
    expect(store.get(none)?.scope).toBeNull()
    vi.runAllTimers()
    const reloaded = createWindowManager({ storageKey: key, channelName: null })
    reloaded.connect()
    expect(reloaded.get(fromKind)?.scope).toBe("northstar")
    expect(parseWindows([{ id: "x", kind: "test", params: {}, rect: { x: 0, y: 0, w: 1, h: 1 }, scope: 42 }])[0]?.scope).toBeNull()
  })

  it("drops malformed persisted windows", () => {
    expect(
      parseWindows([
        { id: "a", kind: "test", params: {}, rect: { x: 0, y: 0, w: 10, h: 10 }, layout: "tiled" },
        { id: "b", kind: "test", params: { nested: { no: true } }, rect: { x: 0, y: 0, w: 10, h: 10 } },
        { id: "c", kind: "test", params: {}, rect: { x: "0" } },
        "nonsense",
      ]).map((entry) => entry.id)
    ).toEqual(["a"])
  })
})
