import { describe, expect, it } from "vitest"
import { buildOrgTree, matchRank, orgInitials, orgTint, pushRecent, scopeIds, switcherGroups, type SwitcherOrganisation } from "./model.js"

const ORGS: SwitcherOrganisation[] = [
  { id: "northstar", name: "Northstar Studio" },
  { id: "cedar-annex", name: "Cedar Vale Library", parentId: "northstar" },
  { id: "mossbridge", name: "Mossbridge Visitor Centre", parentId: "northstar" },
  { id: "depot", name: "Bicheno Depot", parentId: "mossbridge" },
  { id: "orbit", name: "Orbit Workspace" },
  { id: "cedarvale", name: "Cedar Vale Collective", keywords: ["cedarvale.org.au"] },
  { id: "orphan", name: "Orphan Clinic", parentId: "hidden" },
]

const tree = buildOrgTree(ORGS)

describe("organisation tree", () => {
  it("orders roots by name with children under their parent, at any depth", () => {
    expect(tree.ordered.map(({ org, depth }) => `${depth}:${org.id}`)).toEqual([
      "0:cedarvale",
      "0:northstar",
      "1:cedar-annex",
      "1:mossbridge",
      "2:depot",
      "0:orbit",
      "0:orphan",
    ])
  })

  it("treats a parent the user cannot see as a root", () => {
    expect(tree.ordered.find(({ org }) => org.id === "orphan")?.depth).toBe(0)
  })

  it("includes every descendant in a parent's scope (R6.9)", () => {
    expect([...scopeIds(tree, "northstar")!].toSorted()).toEqual(["cedar-annex", "depot", "mossbridge", "northstar"])
    expect([...scopeIds(tree, "orbit")!]).toEqual(["orbit"])
    expect(scopeIds(tree, null)).toBeNull()
    expect(scopeIds(tree, "nope")!.size).toBe(0)
    expect(tree.ancestorsOf("depot").map((org) => org.id)).toEqual(["mossbridge", "northstar"])
  })

  it("survives a cycle in the data", () => {
    const cyclic = buildOrgTree([
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ])
    expect(cyclic.ordered).toHaveLength(0)
    expect(cyclic.descendantsOf("a").map((org) => org.id)).toEqual(["b"])
  })
})

describe("switcher rows", () => {
  it("lists All organisations, recents (without the current scope) and the tree", () => {
    const groups = switcherGroups(tree, { recent: ["orbit", "northstar", "orbit", "gone"], value: "northstar" })
    expect(groups.map((group) => group.value)).toEqual(["", "Recent", "Organisations"])
    expect(groups[0]!.items[0]).toMatchObject({ kind: "all", value: null, label: "All organisations" })
    expect(groups[1]!.items.map((row) => row.key)).toEqual(["recent:orbit"])
    const northstar = groups[2]!.items.find((row) => row.value === "northstar")!
    expect(northstar.includes).toBe(3)
    expect(groups[2]!.items.find((row) => row.value === "depot")!.depth).toBe(2)
  })

  it("ranks search results and names a child's parent", () => {
    const [group] = switcherGroups(tree, { query: "moss" })
    expect(group!.items.map((row) => row.value)).toEqual(["mossbridge"])
    expect(group!.items[0]!.detail).toBe("Northstar Studio")
    expect(switcherGroups(tree, { query: "northstar" })[0]!.items[0]!.value).toBe("northstar")
    expect(switcherGroups(tree, { query: "cedarvale.org" })[0]!.items[0]!.value).toBe("cedarvale")
    expect(switcherGroups(tree, { query: "all" })[0]!.items[0]!.kind).toBe("all")
    expect(switcherGroups(tree, { query: "zzz" })).toEqual([])
  })

  it("matches by prefix before anywhere", () => {
    expect(matchRank(ORGS[0]!, "north")).toBe(0)
    expect(matchRank(ORGS[0]!, "studio")).toBe(1)
    expect(matchRank(ORGS[0]!, "ns")).toBe(2)
    expect(matchRank(ORGS[0]!, "star")).toBe(3)
    expect(matchRank(ORGS[0]!, "hobart")).toBeNull()
  })
})

describe("identity", () => {
  it("draws initials and a stable tint", () => {
    expect(orgInitials("Northstar Studio")).toBe("NS")
    expect(orgInitials("The Hobart Clinic")).toBe("HC")
    expect(orgInitials("Huon")).toBe("HU")
    expect(orgTint({ id: "northstar" })).toBe(orgTint({ id: "northstar" }))
    expect(orgTint({ id: "northstar", tint: 3 })).toBe(3)
  })

  it("keeps recents unique and capped", () => {
    expect(pushRecent(["a", "b", "c"], "b", 3)).toEqual(["b", "a", "c"])
    expect(pushRecent(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"])
    expect(pushRecent(["a"], null)).toEqual(["a"])
  })
})
