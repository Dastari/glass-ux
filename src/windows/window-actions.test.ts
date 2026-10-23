import { describe, expect, it } from "vitest"
import { foldActions } from "./window-actions.js"

const action = (id: string | null, width: number, secondary = true) => ({ id, width, secondary })

describe("foldActions", () => {
  it("folds nothing while everything fits", () => {
    expect(foldActions([action("a", 100), action("b", 32)], 140, 4, 32)).toEqual(new Set())
  })
  it("folds secondary actions from the last back, leaving room for More", () => {
    const items = [action("identity", 200), action("keys", 32), action("copy", 32), action("clear", 32), action("restart", 32, false)]
    // 200+32+32+32+32 + 4 gaps of 4 = 344.
    expect([...foldActions(items, 330, 4, 32)]).toEqual(["clear", "copy"])
    expect([...foldActions(items, 177, 4, 32)]).toEqual(["clear", "copy", "keys", "identity"])
  })
  it("never folds a primary action or a plain child, even when nothing fits", () => {
    const items = [action(null, 120, false), action("a", 32), action("b", 32, false)]
    expect([...foldActions(items, 50, 4, 32)]).toEqual(["a"])
  })
})
