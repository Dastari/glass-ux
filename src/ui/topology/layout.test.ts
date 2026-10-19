import { describe, expect, it } from "vitest"
import { clusterColumns, DEFAULT_METRICS, layoutTopology } from "./layout.js"
import { indexTopology, moveFocus } from "./nav.js"
import { formatLinkSpeed, speedRange } from "./speed.js"
import type { LaidOutNode, TopologyLayout, TopologyNode } from "./types.js"

const m = DEFAULT_METRICS
const node = (id: string, parentId: string | null, extra: Partial<TopologyNode<null>> = {}): TopologyNode<null> => ({ id, parentId, label: id, data: null, ...extra })

/** A gateway, two switches, an access point, and clients in two classes under each. */
function office(): TopologyNode<null>[] {
  return [
    node("gw", null),
    node("sw1", "gw", { link: { kind: "wired", speedMbps: 10_000 } }),
    node("sw2", "gw", { link: { kind: "wired" } }),
    node("ap", "sw1", { link: { kind: "wired", speedMbps: 2500 } }),
    ...Array.from({ length: 9 }, (_, i) => node(`pc${i}`, "sw1", { cluster: "computers", link: { kind: "wired", speedMbps: i < 8 ? 1000 : 100 } })),
    node("prn", "sw1", { cluster: "printers", link: { kind: "wired" } }),
    ...Array.from({ length: 3 }, (_, i) => node(`lt${i}`, "ap", { cluster: "computers", link: { kind: "wireless" } })),
    node("cam", "sw2", { cluster: "cameras", link: { kind: "unknown" } }),
  ]
}

const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

describe("topology layout", () => {
  it("keeps source nodes and cluster member order when collecting wide branches", () => {
    const nodes = Object.freeze([
      Object.freeze(node("root", null)),
      ...Array.from({ length: 1000 }, (_, i) => Object.freeze(node(`sample${i}`, "root", { cluster: i % 2 ? "a" : "b" }))),
    ])
    const before = JSON.stringify(nodes)
    const layout = layoutTopology(nodes)
    expect(layout.nodes).toHaveLength(nodes.length)
    expect(layout.clusters.find(cluster => cluster.key === "a")!.members).toEqual(nodes.filter(entry => entry.cluster === "a").map(entry => entry.id))
    expect(layout.clusters.find(cluster => cluster.key === "b")!.members).toEqual(nodes.filter(entry => entry.cluster === "b").map(entry => entry.id))
    expect(JSON.stringify(nodes)).toBe(before)
  })
  it("widens a narrow block to its label, up to three cells, with its members centred", () => {
    const nodes = [node("gw", null), node("ups", "gw", { cluster: "power" }), node("pc", "gw", { cluster: "computers" })]
    const clusters = { power: { label: "Storage and power" }, computers: { label: "PCs" } }
    const labelWidth = (text: string) => text.length * 10
    const layout = layoutTopology(nodes, { clusters, labelWidth })
    const power = layout.clusters.find((cluster) => cluster.key === "power")!
    const pcs = layout.clusters.find((cluster) => cluster.key === "computers")!
    // "Storage and power · 1" is 21 characters: 210 wide, wider than one cell.
    expect(power.width).toBe(210 + 2 * m.clusterPad)
    // A short label leaves the block at its cells.
    expect(pcs.width).toBe(m.cellWidth + 2 * m.clusterPad)
    const ups = layout.nodes.find((entry) => entry.id === "ups")!
    expect(ups.x - power.x).toBeCloseTo((power.width - m.cellWidth) / 2)
    // Never past three cells: a longer label truncates.
    const long = layoutTopology(nodes, { clusters: { ...clusters, power: { label: "x".repeat(200) } }, labelWidth })
    expect(long.clusters.find((cluster) => cluster.key === "power")!.width).toBe(m.cellWidth * 3 + 2 * m.clusterPad)
  })

  it("draws rows top to bottom: gateway, switches, then access points and client blocks", () => {
    const layout = layoutTopology(office(), { clusters: { computers: { label: "Computers", order: 1 }, printers: { label: "Printers", order: 2 }, cameras: { label: "Cameras", order: 3 } } })
    const at = new Map(layout.nodes.map((entry) => [entry.id, entry] as const))
    expect(at.get("gw")).toMatchObject({ depth: 0, y: 0 })
    expect(at.get("sw1")!.depth).toBe(1)
    expect(at.get("sw2")!.depth).toBe(1)
    expect(at.get("ap")!.depth).toBe(2)
    expect(at.get("sw1")!.y).toBe(m.cellHeight + m.gapY)
    // Clients sit in blocks per parent and class, never as nodes of their own row.
    expect(layout.clusters.map((cluster) => `${cluster.parentId}/${cluster.key}:${cluster.members.length}`).toSorted()).toEqual(["ap/computers:3", "sw1/computers:9", "sw1/printers:1", "sw2/cameras:1"])
    expect(at.get("pc0")!.clusterId).toBe("sw1::computers")
    // A block's members are laid out inside it, row by row.
    const block = layout.clusters.find((cluster) => cluster.id === "sw1::computers")!
    expect(block.columns).toBe(clusterColumns(9, m.clusterColumns))
    for (const id of block.members) {
      const member = at.get(id)!
      expect(member.x).toBeGreaterThanOrEqual(block.x)
      expect(member.x + member.width).toBeLessThanOrEqual(block.x + block.width)
      expect(member.y + member.height).toBeLessThanOrEqual(block.y + block.height)
    }
  })

  it("packs a parent's blocks into shelves; lower shelves hang off a spine and a bus", () => {
    const many: TopologyNode<null>[] = [node("sw", null)]
    for (const key of ["a", "b", "c", "d", "e", "f"]) for (let i = 0; i < 4; i++) many.push(node(`${key}${i}`, "sw", { cluster: key, link: { kind: "wired" } }))
    const layout = layoutTopology(many)
    const blocks = layout.clusters.toSorted((a, b) => a.stack - b.stack)
    expect(blocks.map((block) => block.stack)).toEqual([0, 1, 2, 3, 4, 5])
    // Wider than tall, so more than one block a shelf, and more than one shelf.
    const shelves = new Set(blocks.map((block) => block.shelf))
    expect(shelves.size).toBeGreaterThan(1)
    expect(shelves.size).toBeLessThan(blocks.length)
    const top = blocks.filter((block) => block.shelf === 0)
    const lower = blocks.find((block) => block.shelf === 1)!
    expect(lower.y).toBeGreaterThan(Math.max(...top.map((block) => block.y + block.height)))
    // A top-shelf block's link drops straight onto it; a lower one runs down the spine on the left first.
    const spineX = Math.min(...blocks.map((block) => block.x)) - DEFAULT_METRICS.gapX / 2
    expect(layout.edges.find((edge) => edge.id === top[0]!.id)!.path).not.toContain(`${spineX},`)
    expect(layout.edges.find((edge) => edge.id === lower.id)!.path).toContain(`L${spineX},`)
    // Keyboard: down from a top block's last row reaches the shelf below; up from there comes back.
    const index = indexTopology(layout)
    const above = top[0]!
    const down = moveFocus(index, above.members.at(-1)!, "down")!
    expect(layout.nodes.find((entry) => entry.id === down)!.clusterId).toBe(blocks.find((block) => block.shelf === 1 && block.members.includes(down))!.id)
    expect(moveFocus(index, above.members[0]!, "up")).toBe("sw")
  })

  it("never overlaps two boxes, and starts at the origin", () => {
    const layout = layoutTopology(office())
    const boxes = [...layout.nodes.filter((entry) => !entry.clusterId), ...layout.clusters]
    for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) expect(overlaps(a, b), `${"id" in a ? a.id : ""} × ${"id" in b ? b.id : ""}`).toBe(false)
    expect(Math.min(...boxes.map((box) => box.x))).toBe(0)
    expect(Math.max(...boxes.map((box) => box.x + box.width))).toBeCloseTo(layout.width)
    expect(Math.max(...boxes.map((box) => box.y + box.height))).toBeCloseTo(layout.height)
  })

  it("is deterministic: the same input draws the same map", () => {
    expect(layoutTopology(office())).toEqual(layoutTopology(office()))
  })

  it("draws a link per structural child and one trunk per block, with its kind and speed", () => {
    const layout = layoutTopology(office())
    const edge = new Map(layout.edges.map((entry) => [entry.id, entry] as const))
    expect(edge.get("sw1")).toMatchObject({ from: "gw", kind: "wired", label: formatLinkSpeed(10_000) })
    expect(edge.get("sw2")).toMatchObject({ kind: "wired", label: undefined })
    // Mixed known speeds read as a range; wireless members give a wireless trunk.
    expect(edge.get("sw1::computers")).toMatchObject({ from: "sw1", kind: "wired", label: speedRange([100, 1000]) })
    expect(edge.get("ap::computers")).toMatchObject({ kind: "wireless", label: undefined })
    expect(edge.get("sw2::cameras")!.kind).toBe("unknown")
    expect(edge.has("gw")).toBe(false)
    // An elbow: it starts under the parent and ends on top of the child.
    const parent = layout.nodes.find((entry) => entry.id === "gw")!
    expect(edge.get("sw1")!.path.startsWith(`M${parent.x + parent.width / 2},${parent.y + parent.height}`)).toBe(true)
  })

  it("roots orphans and breaks loops instead of failing", () => {
    const layout = layoutTopology([node("a", "b"), node("b", "a"), node("c", "missing"), node("d", "c")])
    expect(layout.nodes).toHaveLength(4)
    expect(layout.nodes.filter((entry) => entry.depth === 0).map((entry) => entry.id).toSorted()).toEqual(["a", "b", "c"])
    expect(layoutTopology([])).toEqual({ nodes: [], clusters: [], edges: [], width: 0, height: 0 })
  })

  it("lays out 300 nodes in well under a frame and stays readable", () => {
    const big: TopologyNode<null>[] = [node("gw", null)]
    for (let s = 0; s < 6; s++) {
      big.push(node(`sw${s}`, "gw", { link: { kind: "wired" } }))
      for (let a = 0; a < 2; a++) {
        big.push(node(`ap${s}-${a}`, `sw${s}`, { link: { kind: "wired" } }))
        for (let c = 0; c < 10; c++) big.push(node(`w${s}-${a}-${c}`, `ap${s}-${a}`, { cluster: c % 2 ? "phones" : "computers", link: { kind: "wireless" } }))
      }
      for (let c = 0; c < 27; c++) big.push(node(`c${s}-${c}`, `sw${s}`, { cluster: ["computers", "printers", "phones"][c % 3], link: { kind: "wired", speedMbps: 1000 } }))
    }
    expect(big.length).toBeGreaterThanOrEqual(300)
    const start = performance.now()
    const layout = layoutTopology(big)
    expect(performance.now() - start).toBeLessThan(50)
    expect(layout.nodes).toHaveLength(big.length)
    // Blocks keep it in a few rows: gateway, switches, access points and blocks, blocks.
    expect(Math.max(...layout.nodes.map((entry) => entry.depth))).toBe(3)
    // Wider than tall, but not a single endless row.
    expect(layout.width / layout.height).toBeLessThan(8)
  })

  it("names link speeds with a thin space", () => {
    expect(formatLinkSpeed(100)).toBe("100 Mbps")
    expect(formatLinkSpeed(1000)).toBe("1 Gbps")
    expect(formatLinkSpeed(2500)).toBe("2.5 Gbps")
    expect(speedRange([1000, 1000])).toBe("1 Gbps")
    expect(speedRange([])).toBeUndefined()
  })
})

describe("topology keyboard", () => {
  const layout: TopologyLayout = layoutTopology(office(), { clusters: { computers: { label: "Computers", order: 1 }, printers: { label: "Printers", order: 2 } } })
  const index = indexTopology(layout)
  const at = (id: string) => layout.nodes.find((entry) => entry.id === id) as LaidOutNode

  it("goes up to the parent and down to the child nearest below", () => {
    expect(moveFocus(index, "sw1", "up")).toBe("gw")
    expect(moveFocus(index, "gw", "up")).toBeUndefined()
    const down = moveFocus(index, "gw", "down")!
    expect(["sw1", "sw2"]).toContain(down)
    expect(at(down).parentId).toBe("gw")
    // Into a block: its first member.
    expect(moveFocus(index, "ap", "down")).toBe("lt0")
  })

  it("moves along a row and through a block's grid", () => {
    const [left, right] = [at("sw1"), at("sw2")].toSorted((a, b) => a.x - b.x)
    expect(moveFocus(index, left!.id, "right")).toBe(right!.id)
    expect(moveFocus(index, right!.id, "left")).toBe(left!.id)
    const block = layout.clusters.find((cluster) => cluster.id === "sw1::computers")!
    const [first, second] = block.members
    expect(moveFocus(index, first!, "right")).toBe(second)
    expect(moveFocus(index, second!, "left")).toBe(first)
    expect(moveFocus(index, first!, "down")).toBe(block.members[block.columns])
    expect(moveFocus(index, block.members[block.columns]!, "up")).toBe(first)
    // From a block's top row, up is the parent.
    expect(moveFocus(index, first!, "up")).toBe("sw1")
  })

  it("moves from one block to the one beside it on its shelf", () => {
    const computers = layout.clusters.find((cluster) => cluster.id === "sw1::computers")!
    const printers = layout.clusters.find((cluster) => cluster.id === "sw1::printers")!
    if (printers.shelf === computers.shelf) {
      const edge = computers.members[computers.columns - 1]!
      expect(moveFocus(index, edge, "right")).toBe("prn")
    } else {
      expect(moveFocus(index, computers.members.at(-1)!, "down")).toBe("prn")
    }
  })

  it("Home and End reach the first and last nodes drawn", () => {
    expect(moveFocus(index, "pc3", "home")).toBe("gw")
    expect(moveFocus(index, "gw", "end")).toBe(index.order.at(-1))
    expect(new Set(index.order).size).toBe(layout.nodes.length)
  })
})
