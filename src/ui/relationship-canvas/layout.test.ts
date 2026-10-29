import { describe, expect, it } from "vitest"
import { autoLayout, bounds, cardHeight, DEFAULT_METRICS as M, diagnose, edgePaths, mergePositions, nearestCard, readingOrder, rowAnchor } from "./layout.js"
import type { RelationshipCard, RelationshipEdge } from "./types.js"

const card = (id: string, rows: string[]): RelationshipCard => ({ id, title: id, rows: rows.map((row) => ({ id: row, label: row })) })
const AUTHOR = card("author", ["id", "name", "email"])
const POST = card("post", ["id", "author", "title"])
const COMMENT = card("comment", ["id", "post", "author", "parent"])
const CARDS = [COMMENT, POST, AUTHOR]
const EDGES: RelationshipEdge[] = [
  { id: "post-author", from: { card: "post", row: "author" }, to: { card: "author", row: "id" }, label: "author" },
  { id: "comment-post", from: { card: "comment", row: "post" }, to: { card: "post", row: "id" }, label: "post" },
  { id: "comment-author", from: { card: "comment", row: "author" }, to: { card: "author", row: "id" }, label: "author" },
  { id: "comment-parent", from: { card: "comment", row: "parent" }, to: { card: "comment", row: "id" }, label: "parent" },
]

describe("geometry", () => {
  it("computes heights and row anchors from the metrics", () => {
    expect(cardHeight(AUTHOR, M)).toBe(44 + 3 * 28 + 8)
    expect(cardHeight(card("empty", []), M)).toBe(44 + 28 + 8)
    expect(rowAnchor(AUTHOR, "name", M)).toBe(44 + 4 + 28 + 14)
    expect(rowAnchor(AUTHOR, undefined, M)).toBe(22)
    expect(rowAnchor(AUTHOR, "missing", M)).toBe(22)
  })

  it("places referenced cards to the left, one column per depth, and survives the self-link", () => {
    const at = autoLayout(CARDS, EDGES, M)
    expect(at.author!.x).toBe(0)
    expect(at.post!.x).toBe(M.cardWidth + M.gapX)
    expect(at.comment!.x).toBe(2 * (M.cardWidth + M.gapX))
  })

  it("breaks a cycle and lays out cards without edges as a grid", () => {
    const cycle: RelationshipEdge[] = [
      { id: "a", from: { card: "author" }, to: { card: "post" } },
      { id: "b", from: { card: "post" }, to: { card: "author" } },
    ]
    const at = autoLayout([AUTHOR, POST], cycle, M)
    expect(at.author!.x).not.toBe(at.post!.x)
    const grid = autoLayout(CARDS, [], M)
    expect(new Set(Object.values(grid).map((point) => point.y)).size).toBe(2)
  })

  it("keeps stored positions and places the rest below them", () => {
    const merged = mergePositions(CARDS, EDGES, { author: { x: 400, y: 100 } }, M)
    expect(merged.author).toEqual({ x: 400, y: 100 })
    expect(merged.post!.y).toBeGreaterThanOrEqual(100 + cardHeight(AUTHOR, M) + M.gapY)
    expect(bounds(CARDS, merged, M).x).toBeLessThanOrEqual(400)
  })
})

describe("edges", () => {
  const byId = new Map(CARDS.map((item) => [item.id, item]))
  const at = { author: { x: 0, y: 0 }, post: { x: 400, y: 0 }, comment: { x: 800, y: 0 } }

  it("runs from the source row's facing side to the target row's facing side", () => {
    const [path] = edgePaths(byId, EDGES.slice(0, 1), at, M)
    const startY = rowAnchor(POST, "author", M)
    const endY = rowAnchor(AUTHOR, "id", M)
    // The bend is half the gap (136 / 2), at least 48.
    expect(path!.path).toBe(`M 400 ${startY} C 332 ${startY}, 332 ${endY}, 264 ${endY}`)
  })

  it("loops a self-link out of the right side and skips edges to missing cards", () => {
    const paths = edgePaths(byId, [...EDGES, { id: "ghost", from: { card: "post" }, to: { card: "gone" } }], at, M)
    expect(paths.map((path) => path.edge.id)).toEqual(EDGES.map((edge) => edge.id))
    expect(paths.at(-1)!.path.startsWith(`M ${800 + M.cardWidth} `)).toBe(true)
  })

  it("fans out parallel edges", () => {
    const twin: RelationshipEdge[] = [EDGES[0]!, { ...EDGES[0]!, id: "twin" }]
    const [a, b] = edgePaths(byId, twin, at, M)
    expect(a!.path).not.toBe(b!.path)
    expect(a!.labelY).not.toBe(b!.labelY)
  })

  it("reports duplicate ids and endpoints that do not exist", () => {
    const problems = diagnose([AUTHOR, AUTHOR], [{ id: "x", from: { card: "author", row: "nope" }, to: { card: "gone" } }])
    expect(problems).toEqual([
      'duplicate card id "author"',
      'edge "x" from row "nope" is not in card "author"',
      'edge "x" to card "gone" does not exist',
    ])
  })
})

describe("keyboard travel", () => {
  const at = { author: { x: 0, y: 0 }, post: { x: 400, y: 0 }, comment: { x: 400, y: 300 } }
  it("goes to the nearest card that way, staying in its lane", () => {
    expect(nearestCard("author", "right", CARDS, at, M)).toBe("post")
    expect(nearestCard("post", "down", CARDS, at, M)).toBe("comment")
    expect(nearestCard("author", "left", CARDS, at, M)).toBeUndefined()
    expect(readingOrder(CARDS, at)).toEqual(["author", "post", "comment"])
  })
})
