import { describe, expect, it } from "vitest"
import { fuzzyMatch, fuzzyMatchFields, highlightRuns } from "./fuzzy.js"

describe("fuzzyMatch", () => {
  it("matches substrings, preferring the start and word starts", () => {
    const start = fuzzyMatch("rest", "Restart")
    const middle = fuzzyMatch("start", "Restart")
    expect(start?.indices).toEqual([0, 1, 2, 3])
    expect(start!.score).toBeGreaterThan(middle!.score)
  })

  it("matches subsequences across word starts", () => {
    const match = fuzzyMatch("ft", "File transfer")
    expect(match?.indices).toEqual([0, 5])
    expect(fuzzyMatch("xyz", "File transfer")).toBeNull()
  })

  it("requires every term and ignores case and accents", () => {
    expect(fuzzyMatch("nst c106", "NST-C106")).not.toBeNull()
    expect(fuzzyMatch("nst x", "NST-C106")).toBeNull()
    expect(fuzzyMatch("resume", "Résumé")).not.toBeNull()
  })

  it("ranks a contiguous label match above a scattered one", () => {
    const tight = fuzzyMatch("shut", "Shut down")!
    const loose = fuzzyMatch("shut", "Show the update history")!
    expect(tight.score).toBeGreaterThan(loose.score)
  })
})

describe("fuzzyMatchFields", () => {
  it("lets keywords match without highlighting the label", () => {
    const match = fuzzyMatchFields("reboot", "Restart", ["reboot", "power"])
    expect(match).not.toBeNull()
    expect(match?.indices).toEqual([])
  })
})

describe("highlightRuns", () => {
  it("groups matched characters", () => {
    expect(highlightRuns("Restart", [0, 1, 2])).toEqual([
      { text: "Res", match: true },
      { text: "tart", match: false },
    ])
  })
})
