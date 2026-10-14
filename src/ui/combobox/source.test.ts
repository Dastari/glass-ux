import { describe, expect, it } from "vitest"
import { filterOptions, matchRanges, matches } from "./source.js"
import { splitValues } from "../tag-input/tag-input.js"

describe("matching", () => {
  it("ignores case and diacritics", () => {
    expect(matches("Freycinet Lodge", "FRÉYCINET")).toBe(true)
    expect(matches("Café Orford", "cafe")).toBe(true)
    expect(matches("NST-C106", "orb")).toBe(false)
  })
  it("needs every word", () => {
    expect(matches("NST-C106 AzureAD\\MiraRowan", "nst mir")).toBe(true)
    expect(matches("NST-C106 AzureAD\\MiraRowan", "nst ellis")).toBe(false)
  })
  it("returns merged ranges in the original text", () => {
    expect(matchRanges("NST-C106", "nst")).toEqual([[0, 3]])
    expect(matchRanges("Café Orford", "cafe or")).toEqual([[0, 4], [5, 7], [8, 10]])
    expect(matchRanges("aaa", "aa")).toEqual([[0, 2]])
    expect(matchRanges("text", "")).toEqual([])
  })
  it("filters label and description", () => {
    const options = [
      { value: "a", label: "NST-C106", description: "AzureAD\\MiraRowan" },
      { value: "b", label: "LMN-4E5E", description: "LMN-4E5E\\Front Counter" },
    ]
    expect(filterOptions(options, "front").map((option) => option.value)).toEqual(["b"])
    expect(filterOptions(options, " ")).toHaveLength(2)
  })
})

describe("splitValues", () => {
  it("splits pasted lists on commas, semicolons and new lines", () => {
    expect(splitValues("a@x.com; b@y.com,\nc@z.com\r\n\t d@w.com ;;")).toEqual(["a@x.com", "b@y.com", "c@z.com", "d@w.com"])
  })
})
