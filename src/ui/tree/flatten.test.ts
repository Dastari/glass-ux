import { describe, expect, it } from "vitest"
import { flattenTree, typeahead, type TreeNodeLike } from "./flatten.js"

interface Node extends TreeNodeLike<Node> {}

const tree: Node[] = [
  { id: "orb-4e5e", label: "LMN-4E5E", description: "LMN-4E5E\\Front Counter" },
  {
    id: "nst",
    label: "Northstar Studio",
    children: [
      { id: "c106", label: "NST-C106", description: "AzureAD\\MiraRowan" },
      { id: "3bb4", label: "NST-3BB4", description: "AzureAD\\MiraRowan" },
    ],
  },
  {
    id: "cedarvale",
    label: "Cedar Vale Collective",
    children: [{ id: "6231", label: "CDV-6231", description: "AzureAD\\EllisPark" }],
  },
]

const ids = (rows: ReturnType<typeof flattenTree<Node>>) => rows.map((row) => row.node.id)

describe("flattenTree", () => {
  it("shows only expanded branches", () => {
    expect(ids(flattenTree(tree, new Set()))).toEqual(["orb-4e5e", "nst", "cedarvale"])
    expect(ids(flattenTree(tree, new Set(["nst"])))).toEqual(["orb-4e5e", "nst", "c106", "3bb4", "cedarvale"])
  })

  it("sets aria level, position and size", () => {
    const rows = flattenTree(tree, new Set(["nst"]))
    const c106 = rows.find((row) => row.node.id === "c106")!
    expect([c106.level, c106.posinset, c106.setsize, c106.parentId]).toEqual([2, 1, 2, "nst"])
    expect(rows.find((row) => row.node.id === "nst")!.leaves).toBe(2)
  })

  it("matches keywords the row does not show, and reports the keyword", () => {
    const withIp: Node[] = [{ id: "nst", label: "GSB", children: [{ id: "c106", label: "NST-C106", description: "AzureAD\\MiraRowan", keywords: ["10.20.1.106"] }, { id: "3bb4", label: "NST-3BB4", keywords: ["10.20.1.44"] }] }]
    const rows = flattenTree(withIp, new Set(), "1.106")
    expect(ids(rows)).toEqual(["nst", "c106"])
    expect(rows[1]!.keywordMatch).toEqual({ text: "10.20.1.106", range: [6, 11] })
    expect(rows[0]!.leaves).toBe(1)
    // A label match wins: no keyword line.
    expect(flattenTree(withIp, new Set(), "3bb4")[1]!.keywordMatch).toBeNull()
  })

  it("reveals matching branches and highlights the match", () => {
    const rows = flattenTree(tree, new Set(), "ellis")
    expect(ids(rows)).toEqual(["cedarvale", "6231"])
    expect(rows[1]!.descriptionMatch).toEqual([8, 13])
    expect(rows[0]!.leaves).toBe(1)
  })

  it("shows every child of a group that matches by name", () => {
    expect(ids(flattenTree(tree, new Set(), "northstar"))).toEqual(["nst", "c106", "3bb4"])
  })

  it("returns nothing when nothing matches", () => {
    expect(flattenTree(tree, new Set(), "orb-7")).toEqual([])
  })
})

describe("typeahead", () => {
  it("finds the next row by label prefix, wrapping", () => {
    const rows = flattenTree(tree, new Set(["nst"]))
    expect(typeahead(rows, 0, "nst")).toBe(2)
    expect(typeahead(rows, 2, "nst")).toBe(3)
    expect(typeahead(rows, 4, "lmn")).toBe(0)
    expect(typeahead(rows, 0, "zz")).toBe(-1)
  })
})

describe("lazy branches", () => {
  const empty = { loading: new Set<string>(), failed: new Set<string>(), loaded: new Set<string>(), moreLoading: new Set<string>(), moreFailed: new Set<string>() }
  const lazy: Node[] = [
    { id: "hklm", label: "HKEY_LOCAL_MACHINE", hasChildren: true },
    { id: "hkcu", label: "HKEY_CURRENT_USER", hasChildren: true, children: [{ id: "env", label: "Environment" }], hasMore: true },
  ]
  const shape = (rows: ReturnType<typeof flattenTree<Node>>) => rows.map((row) => `${row.node.id}${row.status ? `:${row.status}` : ""}`)

  it("an unloaded branch has a chevron, and opened shows a loading row in place of its children", () => {
    const closed = flattenTree(lazy, new Set(), "", "en", empty)
    expect(closed[0]).toMatchObject({ hasChildren: true, branch: true, expanded: false })
    expect(shape(flattenTree(lazy, new Set(["hklm"]), "", "en", empty))).toEqual(["hklm", "hklm:loading", "hkcu"])
    const failed = { ...empty, failed: new Set(["hklm"]) }
    expect(shape(flattenTree(lazy, new Set(["hklm"]), "", "en", failed))).toEqual(["hklm", "hklm:error", "hkcu"])
  })

  it("a branch whose load ended with no children keeps its folder and loses its chevron", () => {
    const rows = flattenTree(lazy, new Set(["hklm"]), "", "en", { ...empty, loaded: new Set(["hklm"]) })
    expect(shape(rows)).toEqual(["hklm", "hkcu"])
    expect(rows[0]).toMatchObject({ hasChildren: false, branch: true, expanded: false })
    expect(flattenTree([{ id: "k", label: "Key", hasChildren: true, children: [] }], new Set(), "", "en", empty)[0]).toMatchObject({ hasChildren: false, branch: true })
  })

  it("a branch with more children ends with a Load more row counted in its set", () => {
    const rows = flattenTree(lazy, new Set(["hkcu"]), "", "en", empty)
    expect(shape(rows)).toEqual(["hklm", "hkcu", "env", "hkcu:more"])
    expect([rows[2]!.setsize, rows[3]!.posinset, rows[3]!.setsize]).toEqual([2, 2, 2])
    expect(shape(flattenTree(lazy, new Set(["hkcu"]), "", "en", { ...empty, moreLoading: new Set(["hkcu"]) })).at(-1)).toBe("hkcu:more-loading")
    expect(shape(flattenTree(lazy, new Set(["hkcu"]), "", "en", { ...empty, moreFailed: new Set(["hkcu"]) })).at(-1)).toBe("hkcu:more-error")
  })

  it("search does not open branches whose children are not loaded, nor show Load more", () => {
    expect(shape(flattenTree(lazy, new Set(["hklm", "hkcu"]), "env", "en", empty))).toEqual(["hkcu", "env"])
  })

  it("typeahead skips status rows", () => {
    const rows = flattenTree(lazy, new Set(["hklm"]), "", "en", empty)
    expect(typeahead(rows, 0, "h")).toBe(2)
  })

  it("keeps the classic shape: an empty children list is a leaf", () => {
    expect(flattenTree([{ id: "x", label: "X", children: [] }], new Set())[0]).toMatchObject({ hasChildren: false, branch: false })
  })
})
