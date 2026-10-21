import { describe, expect, it } from "vitest"
import { connectionPagination, connectionRows, nextKeysetPage, nextOffsetPage, type Connection } from "./connection.js"

const ref = (id: number) => ({ __ref: `Device:${id}` })
function page(ids: readonly number[], info: Partial<Connection<unknown>["PageInfo"]> = {}): Connection<unknown> {
  return {
    Edges: ids.map((id) => ({ Node: ref(id), Cursor: String(id) })),
    PageInfo: { HasNextPage: true, HasPreviousPage: false, StartCursor: String(ids[0]), EndCursor: String(ids.at(-1)), TotalCount: 10, ...info },
  }
}
const ids = (connection: Connection<unknown>) => connection.Edges.map((edge) => (edge.Node as { __ref: string }).__ref.split(":")[1])

describe("connectionRows", () => {
  it("reads the nodes and page facts, the same object for the same connection", () => {
    const connection = { Edges: [{ Node: { id: "a" } }, { Node: { id: "b" } }], PageInfo: { HasNextPage: true, EndCursor: "c2", TotalCount: 40 } }
    const rows = connectionRows(connection)
    expect(rows).toEqual({ rows: [{ id: "a" }, { id: "b" }], rowCount: 40, hasMore: true, endCursor: "c2" })
    expect(connectionRows(connection)).toBe(rows)
    expect(connectionRows(connection).rows).toBe(rows.rows)
  })

  it("is empty while the first page loads, and leaves an uncounted total undefined", () => {
    expect(connectionRows(undefined)).toEqual({ rows: [], rowCount: undefined, hasMore: false, endCursor: undefined })
    expect(connectionRows({ Edges: [], PageInfo: { HasNextPage: false, TotalCount: null } }).rowCount).toBeUndefined()
  })
})

describe("next pages", () => {
  it("offsets by the loaded rows, or continues after the last cursor", () => {
    expect(nextOffsetPage(page([1, 2, 3]), 50)).toEqual({ Limit: 50, Offset: 3 })
    expect(nextOffsetPage(undefined, 50)).toEqual({ Limit: 50, Offset: 0 })
    expect(nextKeysetPage(page([1, 2]), 20, { includeTotalCount: true })).toEqual({ after: "2", limit: 20, includeTotalCount: true })
    expect(nextKeysetPage(undefined, 20)).toEqual({ limit: 20, includeTotalCount: false })
  })
})

describe("connectionPagination", () => {
  const policy = connectionPagination()

  it("keys the list by every argument but the page", () => {
    expect(policy.keyArgs({ Where: {}, OrderBy: [], Page: { Limit: 50 } })).toEqual(["OrderBy", "Where"])
    expect(policy.keyArgs({ where: {}, page: { after: "x" } })).toEqual(["where"])
    expect(connectionPagination({ pageArg: "Window" }).keyArgs({ Window: {}, Page: {} })).toEqual(["Page"])
  })

  it("appends an offset batch and takes its page facts", () => {
    const merged = policy.merge(page([1, 2, 3]), page([4, 5], { HasNextPage: false, StartCursor: "4" }), { args: { Page: { Limit: 3, Offset: 3 } } })
    expect(ids(merged)).toEqual(["1", "2", "3", "4", "5"])
    expect(merged.PageInfo).toMatchObject({ HasNextPage: false, StartCursor: "1", EndCursor: "5" })
  })

  it("appends a keyset batch after the loaded rows", () => {
    const merged = policy.merge(page([1, 2]), page([3, 4]), { args: { page: { after: "2", limit: 2 } } })
    expect(ids(merged)).toEqual(["1", "2", "3", "4"])
  })

  it("replaces the head on a refetch and keeps the rows loaded after it", () => {
    const loaded = page([1, 2, 3, 4], { HasNextPage: true, EndCursor: "4" })
    const merged = policy.merge(loaded, page([9, 1], { EndCursor: "1", TotalCount: 11 }), { args: { Page: { Limit: 2, Offset: 0 } } })
    // 9 arrived at the top; 1 moved down a place and is shown once.
    expect(ids(merged)).toEqual(["9", "1", "3", "4"])
    expect(merged.PageInfo).toMatchObject({ EndCursor: "4", TotalCount: 11 })
  })

  it("shows a row that shifted into the next offset batch once", () => {
    const merged = policy.merge(page([1, 2, 3]), page([3, 4, 5]), { args: { Page: { Limit: 3, Offset: 3 } } })
    expect(ids(merged)).toEqual(["1", "2", "3", "4", "5"])
  })

  it("stores the first page as it comes", () => {
    const first = page([1, 2])
    expect(policy.merge(undefined, first, { args: { Page: { Limit: 2 } } })).toBe(first)
  })
})
