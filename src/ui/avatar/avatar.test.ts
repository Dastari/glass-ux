import { describe, expect, it } from "vitest"
import { initials, tintFor } from "./avatar.js"

describe("initials", () => {
  it("takes first and last initials", () => {
    expect(initials("Avery Quinn")).toBe("AQ")
    expect(initials("Mira Ann Rowan")).toBe("MR")
  })
  it("reads directory accounts and camel case", () => {
    expect(initials("AzureAD\\EllisPark")).toBe("EP")
    expect(initials("LMN-4E5E\\Front Counter")).toBe("FC")
    expect(initials("avery.quinn")).toBe("AQ")
  })
  it("uses two letters of a single word", () => {
    expect(initials("SYSTEM")).toBe("SY")
  })
})

describe("tintFor", () => {
  it("is stable for a name", () => {
    expect(tintFor("Avery Quinn")).toBe(tintFor("Avery Quinn"))
  })
  it("picks one of the eight identity colours", () => {
    const names = ["Avery Quinn", "Mira Rowan", "Ellis Park", "Front Counter", "Jamie Wells", "Alex Wong", "Jo Smith", "Kim Tran", "Pat Doyle"]
    const tints = new Set(names.map(tintFor))
    for (const tint of tints) expect(["1", "2", "3", "4", "5", "6", "7", "8"]).toContain(tint)
    expect(tints.size).toBeGreaterThan(3)
  })
})
