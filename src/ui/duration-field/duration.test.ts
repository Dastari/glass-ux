import { describe, expect, it } from "vitest"
import { formatDuration, parseDuration } from "./duration.js"

describe("durations", () => {
  it("reads what people write", () => {
    expect(parseDuration("1h 30m")).toBe(5400)
    expect(parseDuration("1h30m")).toBe(5400)
    expect(parseDuration("1.5h")).toBe(5400)
    expect(parseDuration("90")).toBe(5400)
    expect(parseDuration("90", { defaultUnit: "s" })).toBe(90)
    expect(parseDuration("1:30")).toBe(5400)
    expect(parseDuration("1:30:15")).toBe(5415)
    expect(parseDuration("2 days 4 hrs")).toBe(187200)
    expect(parseDuration("1 hour and 15 minutes")).toBe(4500)
    expect(parseDuration("1w")).toBe(604800)
    expect(parseDuration("45s")).toBe(45)
  })
  it("rejects anything else", () => {
    expect(parseDuration("")).toBeNull()
    expect(parseDuration("soon")).toBeNull()
    expect(parseDuration("1h foo")).toBeNull()
    expect(parseDuration("1h 2h")).toBeNull()
    expect(parseDuration("1:75")).toBeNull()
  })
  it("writes durations compactly or in words", () => {
    expect(formatDuration(5400)).toBe("1h 30m")
    expect(formatDuration(187200)).toBe("2d 4h")
    expect(formatDuration(45)).toBe("45s")
    expect(formatDuration(0)).toBe("0s")
    expect(formatDuration(5415, { units: ["h", "m"] })).toBe("1h 30m")
    expect(formatDuration(0, { units: ["h", "m"] })).toBe("0m")
    expect(formatDuration(5400, { style: "long" })).toBe("1 hour 30 minutes")
    expect(parseDuration(formatDuration(93784))).toBe(93784)
  })
})
