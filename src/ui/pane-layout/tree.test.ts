import { describe, expect, it } from "vitest"
import { closePanel, column, emptyLayout, layoutOf, movePanel, normaliseLayout, openPanel, panelsOf, parsePaneLayout, pruneLayout, resizedPair, revealPanel, row, setMaximised, setSizes, setStackCollapsed, sized, stack, stackOf, stacksOf, type PaneLayoutState, type PaneSplit, type PaneStack } from "./tree.js"

const base = () => layoutOf(row(sized(stack("tools"), "3rem"), stack("canvas", "preview"), sized(column(stack("layers", "adjust"), stack("histogram")), "18rem")))
const panelsIn = (layout: PaneLayoutState, id: string) => stackOf(layout.root, id)?.panels
const roundTrip = (layout: PaneLayoutState) => JSON.parse(JSON.stringify(layout)) as unknown

describe("building a layout", () => {
  it("gives each child its size, in reading order", () => {
    const root = base().root as PaneSplit
    expect(root.orientation).toBe("horizontal")
    expect(root.sizes).toEqual(["3rem", 1, "18rem"])
    expect(root.children.map((child) => child.type)).toEqual(["stack", "stack", "split"])
  })

  it("makes the first panel active and leaves no sizes on the nodes", () => {
    const layout = base()
    expect(stackOf(layout.root, "preview")?.active).toBe("canvas")
    expect(JSON.stringify(layout)).not.toContain('"size"')
    expect(JSON.stringify(layoutOf(sized(stack("a"), 2)))).not.toContain('"size"')
  })

  it("holds only JSON", () => {
    const layout = base()
    expect(roundTrip(layout)).toEqual(layout)
  })

  it("replaces a split of one by its child", () => {
    expect(layoutOf(row(stack("a"))).root.type).toBe("stack")
    expect(layoutOf(row(row(stack("a"), stack("b")))).root.id).toBe((layoutOf(row(stack("a"), stack("b"))).root as PaneSplit).id)
  })
})

describe("moving a panel", () => {
  it("adds it to a stack at an index counted without it, active", () => {
    const next = movePanel(base(), "preview", { stack: stackOf(base().root, "layers")!.id, index: 1 })
    expect(panelsIn(next, "layers")).toEqual(["layers", "preview", "adjust"])
    expect(stackOf(next.root, "layers")?.active).toBe("preview")
    expect(panelsIn(next, "canvas")).toEqual(["canvas"])
  })

  it("reorders within a stack", () => {
    const id = stackOf(base().root, "canvas")!.id
    expect(panelsIn(movePanel(base(), "canvas", { stack: id, index: 1 }), "canvas")).toEqual(["preview", "canvas"])
  })

  it("makes a neighbour active when the active panel leaves", () => {
    const next = movePanel(base(), "canvas", { stack: stackOf(base().root, "layers")!.id })
    expect(stackOf(next.root, "preview")?.active).toBe("preview")
  })

  it("closes a stack it empties, and its split when one child remains", () => {
    const next = movePanel(base(), "histogram", { stack: stackOf(base().root, "layers")!.id })
    expect(panelsIn(next, "histogram")).toEqual(["layers", "adjust", "histogram"])
    const root = next.root as PaneSplit
    expect(root.children).toHaveLength(3)
    expect(root.children[2]?.type).toBe("stack")
    expect(root.sizes).toEqual(["3rem", 1, "18rem"])
  })

  it("splits inside a parent running the same way, sharing the track", () => {
    const next = movePanel(base(), "preview", { stack: stackOf(base().root, "tools")!.id, edge: "end" })
    const root = next.root as PaneSplit
    expect(root.children).toHaveLength(4)
    expect(root.sizes).toEqual(["1.5rem", "1.5rem", 1, "18rem"])
    expect(root.children[1]).toMatchObject({ type: "stack", panels: ["preview"], active: "preview" })
  })

  it("splits with a new split across a parent running the other way", () => {
    const next = movePanel(base(), "adjust", { stack: stackOf(base().root, "canvas")!.id, edge: "top" })
    const root = next.root as PaneSplit
    const made = root.children[1] as PaneSplit
    expect(made).toMatchObject({ type: "split", orientation: "vertical", sizes: [1, 1] })
    expect((made.children[0] as PaneStack).panels).toEqual(["adjust"])
    expect(root.sizes).toEqual(["3rem", 1, "18rem"])
  })

  it("does nothing for an unknown panel or stack, or a lone panel split from its own stack", () => {
    const layout = base()
    expect(movePanel(layout, "nope", { stack: "stack:tools" })).toBe(layout)
    expect(movePanel(layout, "tools", { stack: "nope" })).toBe(layout)
    expect(movePanel(layout, "tools", { stack: "stack:tools", edge: "end" })).toBe(layout)
    const held = stackOf(layout.root, "canvas")!
    expect(movePanel(layout, "canvas", { stack: held.id, index: 0 })).toBe(layout)
  })

  it("gives new stacks ids no node has", () => {
    let layout = base()
    for (const id of ["preview", "adjust"]) layout = movePanel(layout, id, { stack: stackOf(layout.root, "tools")!.id, edge: "end" })
    const ids = stacksOf(layout.root).map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("splits a stack with a move of one of its own panels", () => {
    const held = stackOf(base().root, "canvas")!
    const next = movePanel(base(), "preview", { stack: held.id, edge: "bottom" })
    expect(panelsIn(next, "canvas")).toEqual(["canvas"])
    expect(panelsIn(next, "preview")).toEqual(["preview"])
  })
})

describe("closing, opening and revealing", () => {
  it("closes an emptied stack and leaves one empty stack when nothing is left", () => {
    const next = closePanel(base(), "tools")
    expect((next.root as PaneSplit).children).toHaveLength(2)
    const one = layoutOf(stack("a"))
    expect(closePanel(one, "a").root).toMatchObject({ type: "stack", panels: [] })
  })

  it("selects a neighbour, and returns the same layout for an unknown id", () => {
    expect(stackOf(closePanel(base(), "canvas").root, "preview")?.active).toBe("preview")
    const layout = base()
    expect(closePanel(layout, "nope")).toBe(layout)
  })

  it("opens a new panel in the first stack, in a stack or beside one", () => {
    expect(panelsIn(openPanel(base(), "fresh"), "tools")).toEqual(["tools", "fresh"])
    const held = stackOf(base().root, "canvas")!.id
    expect(panelsIn(openPanel(base(), "fresh", { stack: held }), "canvas")).toEqual(["canvas", "preview", "fresh"])
    expect(panelsIn(openPanel(base(), "fresh", { stack: held, edge: "end" }), "fresh")).toEqual(["fresh"])
  })

  it("reveals a panel that is already open", () => {
    expect(stackOf(openPanel(base(), "preview").root, "canvas")?.active).toBe("preview")
  })

  it("reveal opens a collapsed stack and clears another stack's maximise", () => {
    const held = stackOf(base().root, "canvas")!.id
    const collapsed = setMaximised(setStackCollapsed(base(), held, true), stackOf(base().root, "tools")!.id)
    const next = revealPanel(collapsed, "preview")
    expect(stackOf(next.root, "preview")).toMatchObject({ active: "preview", collapsed: false })
    expect(next.maximised).toBeUndefined()
  })
})

describe("sizes", () => {
  it("trades shares between two share tracks and keeps their sum", () => {
    expect(resizedPair(1, 1, 200, 200, 100, 16)).toEqual([1.5, 0.5])
  })

  it("gives a fixed track its new length and leaves a share alone", () => {
    expect(resizedPair("10rem", 1, 160, 300, 32, 16)).toEqual(["12rem", 1])
    expect(resizedPair(1, "10rem", 300, 160, 32, 16)).toEqual([1, "8rem"])
  })

  it("moves two fixed tracks by the same amount", () => {
    expect(resizedPair("10rem", "10rem", 160, 160, 16, 16)).toEqual(["11rem", "9rem"])
  })

  it("setSizes changes only the named split", () => {
    const layout = base()
    const id = layout.root.id
    expect((setSizes(layout, id, ["4rem", 1, "20rem"]).root as PaneSplit).sizes).toEqual(["4rem", 1, "20rem"])
    expect(setSizes(layout, id, ["3rem", 1, "18rem"])).toBe(layout)
  })
})

describe("normalising", () => {
  it("returns the same object for a layout in order", () => {
    const layout = base()
    expect(normaliseLayout(layout)).toBe(layout)
  })

  it("repairs sizes, active panels, duplicates and a stale maximise", () => {
    const layout = normaliseLayout({
      version: 1,
      maximised: "gone",
      root: {
        type: "split",
        id: "root",
        orientation: "horizontal",
        sizes: [0],
        children: [
          { type: "stack", id: "a", panels: ["one", "two"], active: "absent" },
          { type: "stack", id: "a", panels: ["two", "three"], active: "two" },
          { type: "stack", id: "c", panels: [], active: null },
        ],
      },
    })
    const root = layout.root as PaneSplit
    expect(root.sizes).toEqual([1, 1])
    expect(stacksOf(root).map((node) => node.panels)).toEqual([["one", "two"], ["three"]])
    expect(stacksOf(root).map((node) => node.active)).toEqual(["one", "three"])
    expect(new Set(stacksOf(root).map((node) => node.id)).size).toBe(2)
    expect(layout.maximised).toBeUndefined()
  })
})

describe("saved layouts", () => {
  it("reads back what it wrote", () => {
    const layout = movePanel(base(), "preview", { stack: stackOf(base().root, "tools")!.id, edge: "end" })
    expect(parsePaneLayout(roundTrip(layout))).toEqual(layout)
  })

  it.each([[null], [undefined], [12], ["text"], [[]], [{}], [{ version: 1 }], [{ version: 1, root: 3 }], [{ version: "1", root: { type: "stack", id: "a", panels: [] } }], [{ version: 1, root: { type: "box", id: "a" } }]])("refuses %j", (value) => {
    expect(parsePaneLayout(value)).toBeNull()
  })

  it("refuses a newer version so the host falls back", () => {
    expect(parsePaneLayout({ ...base(), version: 2 })).toBeNull()
  })

  it("drops malformed nodes and keeps the rest", () => {
    const layout = parsePaneLayout({
      version: 1,
      root: {
        type: "split",
        id: "root",
        orientation: "horizontal",
        sizes: [1, "nonsense", "-2rem", 2],
        children: [
          { type: "stack", id: "a", panels: ["one", 7, null, ""], active: 12, tabs: "sideways" },
          { type: "unknown" },
          { id: "missing-type", panels: ["two"] },
          { type: "stack", id: "b", panels: ["three"], active: "three", collapsed: "yes" },
        ],
      },
    })!
    const root = layout.root as PaneSplit
    expect(root.children.map((child) => (child as PaneStack).panels)).toEqual([["one"], ["three"]])
    expect(root.sizes).toEqual([1, 2])
    expect(root.children[0]).toEqual({ type: "stack", id: "a", panels: ["one"], active: "one" })
    expect((root.children[1] as PaneStack).collapsed).toBeUndefined()
  })

  it("repairs a split with a bad orientation by dropping it", () => {
    const layout = parsePaneLayout({
      version: 1,
      root: { type: "split", id: "r", orientation: "horizontal", sizes: [1, 1], children: [{ type: "stack", id: "a", panels: ["x"] }, { type: "split", id: "b", orientation: "diagonal", children: [], sizes: [] }] },
    })
    expect(layout?.root).toMatchObject({ type: "stack", id: "a", panels: ["x"] })
  })

  it("keeps a root that holds nothing as one empty stack", () => {
    expect(parsePaneLayout({ version: 1, root: { type: "split", id: "r", orientation: "vertical", children: [], sizes: [] } })?.root).toEqual(emptyLayout().root)
  })

  it("keeps unknown ids in the JSON and a field a later build added", () => {
    const saved = { ...roundTrip(layoutOf(row(stack("known"), stack("from-a-plugin")))) as object, floating: [{ id: "palette" }] }
    const parsed = parsePaneLayout(saved)!
    expect(panelsOf(parsed.root)).toEqual(["known", "from-a-plugin"])
    expect((parsed as unknown as { floating: unknown }).floating).toEqual([{ id: "palette" }])
  })

  it("pruneLayout removes what the host no longer knows", () => {
    const pruned = pruneLayout(base(), (id) => id !== "histogram" && id !== "preview")
    expect(panelsOf(pruned.root)).toEqual(["tools", "canvas", "layers", "adjust"])
    const layout = base()
    expect(pruneLayout(layout, () => true)).toBe(layout)
  })
})
