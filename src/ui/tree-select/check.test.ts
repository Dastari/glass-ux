import { describe, expect, it } from "vitest"
import { checkStates, indexChecks, normaliseChecks, setAllChecks, toggleCheck, type CheckNodeLike } from "./check.js"

interface Node extends CheckNodeLike<Node> {
  id: string
  children?: Node[]
  disabled?: boolean
}

// org ─┬ sales ─┬ anna
//      │        └ ben
//      ├ ops ───┬ cara
//      │        ├ dev (disabled)
//      │        └ eli
//      └ lab (children not loaded)
const NODES: Node[] = [
  {
    id: "org",
    children: [
      { id: "sales", children: [{ id: "anna" }, { id: "ben" }] },
      { id: "ops", children: [{ id: "cara" }, { id: "dev", disabled: true }, { id: "eli" }] },
      { id: "lab" },
    ],
  },
]
const index = indexChecks(NODES)

describe("check states", () => {
  it("derives branches from their children: all checked, some (mixed) or none", () => {
    const states = checkStates(index, ["anna", "ben", "cara"])
    expect(states.get("sales")).toBe("checked")
    expect(states.get("ops")).toBe("mixed")
    expect(states.get("org")).toBe("mixed")
    expect(states.get("lab")).toBe("unchecked")
  })

  it("a listed branch ticks everything under it", () => {
    const states = checkStates(index, ["org"])
    for (const id of ["org", "sales", "anna", "ops", "dev", "lab"]) expect(states.get(id)).toBe("checked")
  })
})

describe("toggleCheck strategies", () => {
  it("parent collapses a fully checked branch to the branch", () => {
    let value = toggleCheck(index, [], "anna", "parent")
    expect(value).toEqual(["anna"])
    value = toggleCheck(index, value, "ben", "parent")
    expect(value).toEqual(["sales"])
  })

  it("child lists only leaves (and unloaded branches)", () => {
    expect(toggleCheck(index, [], "sales", "child")).toEqual(["anna", "ben"])
    expect(toggleCheck(index, [], "lab", "child")).toEqual(["lab"])
  })

  it("all lists every checked node, branches included", () => {
    expect(toggleCheck(index, [], "sales", "all")).toEqual(["sales", "anna", "ben"])
  })

  it("a checked branch clears; a mixed one checks", () => {
    expect(toggleCheck(index, ["sales"], "sales", "parent")).toEqual([])
    expect(toggleCheck(index, ["anna"], "sales", "parent")).toEqual(["sales"])
  })

  it("clearing a leaf under a listed ancestor keeps its siblings", () => {
    expect(toggleCheck(index, ["org"], "anna", "parent")).toEqual(["ben", "ops", "lab"])
  })

  it("disabled nodes keep their state, so their branch stays mixed", () => {
    const value = toggleCheck(index, [], "ops", "parent")
    expect(value).toEqual(["cara", "eli"])
    expect(checkStates(index, value).get("ops")).toBe("mixed")
    expect(toggleCheck(index, value, "dev", "parent")).toEqual(value)
  })

  it("keeps ids it does not know (under branches that have not loaded)", () => {
    expect(toggleCheck(index, ["lab/deep"], "anna", "parent")).toEqual(["anna", "lab/deep"])
  })
})

describe("normaliseChecks and setAllChecks", () => {
  it("rewrites a value in another strategy's form", () => {
    expect(normaliseChecks(index, ["anna", "ben"], "parent")).toEqual(["sales"])
    expect(normaliseChecks(index, ["sales"], "child")).toEqual(["anna", "ben"])
  })

  it("checks every enabled node and clears them all", () => {
    const all = setAllChecks(index, [], true, "parent")
    expect(all).toEqual(["sales", "cara", "eli", "lab"])
    expect(setAllChecks(index, [...all, "lab/deep"], false, "parent")).toEqual([])
  })
})
