import { describe, expect, it } from "vitest"
import { splitMiddle } from "./split.js"

describe("splitMiddle", () => {
  it("keeps the last hostname segment with its separator", () => {
    expect(splitMiddle("NST-SERVER-C106")).toEqual({ head: "NST-SERVER", tail: "-C106" })
    expect(splitMiddle("LMN-4E5E\\Front")).toEqual({ head: "LMN-4E5E", tail: "\\Front" })
    // A long last segment keeps its final characters instead.
    expect(splitMiddle("AzureAD\\MirandaRowan")).toEqual({ head: "AzureAD\\Mirand", tail: "aRowan" })
  })

  it("falls back to the last few characters", () => {
    expect(splitMiddle("8CC0481GWV")).toEqual({ head: "8CC0481", tail: "GWV" })
    expect(splitMiddle("abcdefghijklmnopqrstuvwxyz")).toEqual({ head: "abcdefghijklmnopqrst", tail: "uvwxyz" })
  })

  it("honours an explicit tail size", () => {
    expect(splitMiddle("10.20.30.40", 2)).toEqual({ head: "10.20.30.", tail: "40" })
    expect(splitMiddle("ab", 9)).toEqual({ head: "", tail: "ab" })
  })
})
