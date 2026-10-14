import { describe, expect, it } from "vitest"
import { fitChips } from "./multi-select.js"

describe("fitChips", () => {
  it("shows every chip when they fit beside the typing area", () => {
    expect(fitChips([80, 80], 300, 4, 30, 48)).toBe(2)
  })
  it("keeps room for +N when they do not", () => {
    // 80 + 4 + 30 + 4 + 48 = 166 fits; a second chip would need 250.
    expect(fitChips([80, 80, 80], 200, 4, 30, 48)).toBe(1)
  })
  it("can fold every chip into +N", () => {
    expect(fitChips([200, 80], 150, 4, 30, 48)).toBe(0)
  })
  it("uses the whole width when the typing area may shrink", () => {
    expect(fitChips([80, 80, 80], 252, 4, 30, 0)).toBe(3)
  })
})
