import { describe, expect, it } from "vitest"
import { reasonRuns } from "./menu.js"

describe("reasonRuns", () => {
  it("lets the last row of a run of identical reasons show it", () => {
    expect(reasonRuns(["a", "a", null, "b", "b", "b", "a"])).toEqual([1, 1, 2, 5, 5, 5, 6])
  })
  it("keeps distinct reasons on their own rows", () => {
    expect(reasonRuns([null, "a", "b", undefined])).toEqual([0, 1, 2, 3])
  })
})
