import { describe, expect, it } from "vitest"
import { ribbonAt, ribbonCentreAt, ribbonPath, sankeyLayout, type LaidNode } from "./layout.js"

const box = { width: 400, height: 200, nodeWidth: 10, nodeGap: 10 }
const keys = (...names: string[]) => names.map((key) => ({ key }))
const byKey = (nodes: readonly LaidNode[], key: string) => nodes.find((node) => node.key === key)!

describe("sankeyLayout", () => {
  const nodes = keys("a", "b", "c", "d")
  const links = [
    { source: "a", target: "c", value: 10 },
    { source: "b", target: "c", value: 30 },
    { source: "c", target: "d", value: 25 },
  ]

  it("sets columns by the longest path, and throughput from what enters and leaves", () => {
    const layout = sankeyLayout(nodes, links, box)
    expect(layout.columns).toBe(3)
    expect(byKey(layout.nodes, "a").column).toBe(0)
    expect(byKey(layout.nodes, "b").column).toBe(0)
    expect(byKey(layout.nodes, "c").column).toBe(1)
    expect(byKey(layout.nodes, "d").column).toBe(2)
    expect(byKey(layout.nodes, "c")).toMatchObject({ incoming: 40, outgoing: 25, value: 40 })
  })

  it("stands a sink in the last column, whatever its path", () => {
    const layout = sankeyLayout(keys("a", "b", "c", "end"), [
      { source: "a", target: "b", value: 5 },
      { source: "b", target: "c", value: 5 },
      { source: "a", target: "end", value: 5 },
    ], box)
    expect(byKey(layout.nodes, "end").column).toBe(2)
  })

  it("keeps heights to one scale, inside the box, without overlaps", () => {
    const layout = sankeyLayout(nodes, links, box)
    for (const node of layout.nodes) {
      expect(node.y1 - node.y0).toBeCloseTo(node.value * layout.scale, 6)
      expect(node.y0).toBeGreaterThanOrEqual(-1e-6)
      expect(node.y1).toBeLessThanOrEqual(200 + 1e-6)
    }
    const column = layout.nodes.filter((node) => node.column === 0).toSorted((a, b) => a.y0 - b.y0)
    expect(column[1]!.y0 - column[0]!.y1).toBeGreaterThanOrEqual(10 - 1e-6)
  })

  it("stacks links within their nodes, thickness to value", () => {
    const layout = sankeyLayout(nodes, links, box)
    const c = layout.nodes.findIndex((node) => node.key === "c")
    const entering = layout.links.filter((link) => link.target === c).toSorted((a, b) => a.y1 - b.y1)
    expect(entering[0]!.y1 - entering[0]!.thickness / 2).toBeCloseTo(layout.nodes[c]!.y0, 6)
    expect(entering[0]!.y1 + entering[0]!.thickness / 2).toBeCloseTo(entering[1]!.y1 - entering[1]!.thickness / 2, 6)
    expect(entering[1]!.y1 + entering[1]!.thickness / 2).toBeCloseTo(layout.nodes[c]!.y1, 6)
    for (const link of layout.links) expect(link.thickness).toBeCloseTo(link.value * layout.scale, 6)
  })

  it("orders ribbons to avoid crossing", () => {
    const layout = sankeyLayout(keys("top", "low", "x", "y"), [
      { source: "top", target: "x", value: 10 },
      { source: "top", target: "y", value: 10 },
      { source: "low", target: "y", value: 10 },
    ], box)
    const top = layout.nodes.findIndex((node) => node.key === "top")
    const leaving = layout.links.filter((link) => link.source === top).toSorted((a, b) => a.y0 - b.y0)
    expect(leaving[0]!.y1).toBeLessThan(leaving[1]!.y1)
  })

  it("leaves out loops and self-links, and says which", () => {
    const layout = sankeyLayout(keys("a", "b", "c"), [
      { source: "a", target: "b", value: 5 },
      { source: "b", target: "a", value: 2 },
      { source: "b", target: "c", value: 3 },
      { source: "c", target: "c", value: 1 },
    ], box)
    expect(layout.loops).toEqual([1, 3])
    expect(layout.links.map((link) => link.index)).toEqual([0, 2])
    expect(layout.columns).toBe(3)
  })

  it("ignores links to unknown nodes and values that are not positive, and nodes left unconnected", () => {
    const layout = sankeyLayout(keys("a", "b", "lonely"), [
      { source: "a", target: "b", value: 5 },
      { source: "a", target: "ghost", value: 5 },
      { source: "b", target: "a", value: 0 },
      { source: "b", target: "a", value: Number.NaN },
    ], box)
    expect(layout.nodes.map((node) => node.key)).toEqual(["a", "b"])
    expect(layout.links).toHaveLength(1)
    expect(layout.loops).toEqual([])
  })

  it("gives up gaps in a crowded column rather than overflowing", () => {
    const many = Array.from({ length: 30 }, (_, index) => `s${index}`)
    const layout = sankeyLayout(keys(...many, "end"), many.map((source) => ({ source, target: "end", value: 1 })), { ...box, height: 100 })
    const bottom = Math.max(...layout.nodes.map((node) => node.y1))
    expect(bottom).toBeLessThanOrEqual(100 + 1e-6)
    expect(layout.scale).toBeGreaterThan(0)
  })

  it("has nothing to lay out without links", () => {
    expect(sankeyLayout(keys("a"), [], box)).toMatchObject({ nodes: [], links: [], columns: 0 })
  })

  it("is deterministic", () => {
    expect(sankeyLayout(nodes, links, box)).toEqual(sankeyLayout(nodes, links, box))
  })

  it("mirrors the flow without changing its heights", () => {
    const plain = sankeyLayout(nodes, links, box)
    const mirrored = sankeyLayout(nodes, links, { ...box, mirror: true })
    plain.nodes.forEach((node, index) => {
      const other = mirrored.nodes[index]!
      expect(other.y0).toBe(node.y0)
      expect(other.x0).toBeCloseTo(400 - node.x1, 6)
      expect(other.x1).toBeCloseTo(400 - node.x0, 6)
    })
    expect(mirrored.links[0]!.x0).toBeGreaterThan(mirrored.links[0]!.x1)
  })
})

describe("ribbons", () => {
  const link = { x0: 0, x1: 100, y0: 20, y1: 80, thickness: 10 }

  it("draws a band of constant vertical thickness", () => {
    expect(ribbonPath(link)).toBe("M0,15C50,15 50,75 100,75L100,85C50,85 50,25 0,25Z")
  })

  it("finds the centre along the curve, symmetrically", () => {
    expect(ribbonCentreAt(link, 0)).toBeCloseTo(20, 3)
    expect(ribbonCentreAt(link, 50)).toBeCloseTo(50, 3)
    expect(ribbonCentreAt(link, 100)).toBeCloseTo(80, 3)
    expect(ribbonCentreAt(link, 25)! - 20).toBeCloseTo(80 - ribbonCentreAt(link, 75)!, 3)
    expect(ribbonCentreAt(link, 101)).toBeNull()
  })

  it("reads the same on a mirrored ribbon", () => {
    expect(ribbonCentreAt({ ...link, x0: 100, x1: 0 }, 50)).toBeCloseTo(50, 3)
    expect(ribbonCentreAt({ ...link, x0: 100, x1: 0 }, 100)).toBeCloseTo(20, 3)
  })

  it("picks the thinnest ribbon under a point", () => {
    const wide = { ...link, thickness: 60, index: 0, source: 0, target: 1, value: 60 }
    const slim = { ...link, thickness: 4, index: 1, source: 0, target: 1, value: 4 }
    expect(ribbonAt([wide, slim], 50, 50)).toBe(1)
    expect(ribbonAt([wide, slim], 50, 70)).toBe(0)
    expect(ribbonAt([wide, slim], 50, 90)).toBeNull()
    expect(ribbonAt([wide, slim], 50, 84, 5)).toBe(0)
  })
})
