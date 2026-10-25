import { describe, expect, it } from "vitest"
import { columnsFor, fitPath, keyPath, pathKey, resolvePath, searchPaths, toCheckNodes, type CascaderOption } from "./paths.js"

const OPTIONS: CascaderOption[] = [
  {
    value: "au",
    label: "Australia",
    children: [
      { value: "nsw", label: "New South Wales", children: [{ value: "parramatta", label: "Parramatta" }, { value: "newcastle", label: "Newcastle", keywords: ["NCL"] }] },
      { value: "vic", label: "Victoria", children: [{ value: "geelong", label: "Geelong" }], disabled: true },
    ],
  },
  { value: "nz", label: "New Zealand", hasChildren: true },
]

describe("paths", () => {
  it("round-trips a value path through its key", () => {
    expect(keyPath(pathKey(["au", "nsw"]))).toEqual(["au", "nsw"])
    expect(keyPath("")).toEqual([])
  })

  it("resolves options along a path as far as it goes", () => {
    expect(resolvePath(OPTIONS, ["au", "nsw", "nowhere"]).map((o) => o.value)).toEqual(["au", "nsw"])
  })

  it("lists a column per opening option on the active path; unloaded levels are null", () => {
    expect(columnsFor(OPTIONS, []).length).toBe(1)
    expect(columnsFor(OPTIONS, ["au", "nsw"]).map((column) => column?.length)).toEqual([2, 2, 2])
    expect(columnsFor(OPTIONS, ["au", "nsw", "parramatta"]).length).toBe(3)
    expect(columnsFor(OPTIONS, ["nz"])).toEqual([OPTIONS, null])
  })
})

describe("searchPaths", () => {
  it("matches any label on the path and lists full paths to leaves", () => {
    const { matches, total } = searchPaths(OPTIONS, "south", { locale: "en" })
    expect(total).toBe(2)
    expect(matches.map((m) => m.path.map((o) => o.label).join(" / "))).toEqual(["Australia / New South Wales / Parramatta", "Australia / New South Wales / Newcastle"])
    expect(matches[0]!.ranges).toEqual([null, [4, 9], null])
  })

  it("matches keywords, skips disabled branches and lists every level with anyLevel", () => {
    expect(searchPaths(OPTIONS, "ncl", { locale: "en" }).total).toBe(1)
    expect(searchPaths(OPTIONS, "geelong", { locale: "en" }).total).toBe(0)
    expect(searchPaths(OPTIONS, "new", { anyLevel: true, locale: "en" }).matches.map((m) => m.path.at(-1)!.value)).toEqual(["nsw", "parramatta", "newcastle", "nz"])
  })

  it("caps the matches but counts them all", () => {
    const { matches, total } = searchPaths(OPTIONS, "a", { limit: 1, locale: "en" })
    expect(matches).toHaveLength(1)
    expect(total).toBeGreaterThan(1)
  })
})

describe("toCheckNodes", () => {
  it("keys nodes by path", () => {
    const nodes = toCheckNodes(OPTIONS)
    expect(nodes[0]!.children![0]!.children![0]!.id).toBe(pathKey(["au", "nsw", "parramatta"]))
    expect(nodes[1]!.children).toBeUndefined()
  })
})

describe("fitPath", () => {
  it("keeps every segment when they fit", () => {
    expect(fitPath([50, 60, 70], 200, 10, 12)).toEqual({ head: 3, tail: 0 })
  })

  it("drops from the middle, keeping the first and as many last segments as fit", () => {
    expect(fitPath([50, 60, 70, 40], 210, 10, 12)).toEqual({ head: 1, tail: 2 })
    expect(fitPath([50, 60, 70, 40], 140, 10, 12)).toEqual({ head: 1, tail: 1 })
  })

  it("drops the first too when even first … last does not fit", () => {
    expect(fitPath([80, 60, 90], 100, 10, 12)).toEqual({ head: 0, tail: 1 })
  })
})
