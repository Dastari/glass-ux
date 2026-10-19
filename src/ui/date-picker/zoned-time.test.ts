import { describe, expect, it } from "vitest"
import { instantToWallClock, isWallClock, resolveWallClock, splitWallClock, wallClockToInstant, zoneOffsetMinutes } from "./zoned-time.js"

const SYDNEY = "Australia/Sydney"
const NEW_YORK = "America/New_York"

describe("wall-clock values", () => {
  it("name a real day and time without an offset", () => {
    expect(isWallClock("2026-10-21T09:30")).toBe(true)
    expect(isWallClock("2026-10-21T09:30:15")).toBe(true)
    expect(isWallClock("2026-02-30T09:30")).toBe(false)
    expect(isWallClock("2026-10-21T09:30Z")).toBe(false)
    expect(isWallClock("2026-10-21 09:30")).toBe(false)
    expect(splitWallClock("2026-10-21T09:30")).toEqual({ date: "2026-10-21", time: "09:30" })
  })
})

describe("wall clock and instants", () => {
  it("convert in the named zone, not the browser's", () => {
    expect(wallClockToInstant("2026-10-21T09:30", SYDNEY)).toBe(Date.parse("2026-10-20T22:30Z"))
    expect(wallClockToInstant("2026-06-21T09:30", SYDNEY)).toBe(Date.parse("2026-06-20T23:30Z"))
    expect(wallClockToInstant("2026-07-04T09:30", NEW_YORK)).toBe(Date.parse("2026-07-04T13:30Z"))
    expect(instantToWallClock(Date.parse("2026-10-20T22:30Z"), SYDNEY)).toBe("2026-10-21T09:30")
    expect(instantToWallClock("2026-10-20T22:30:15Z", SYDNEY, { seconds: true })).toBe("2026-10-21T09:30:15")
    expect(resolveWallClock("2026-10-21T09:30", SYDNEY)).toMatchObject({ kind: "exact", iso: "2026-10-21T09:30:00+11:00", offsetMinutes: 660 })
    expect(resolveWallClock("2026-01-15T09:30", NEW_YORK)?.iso).toBe("2026-01-15T09:30:00-05:00")
    expect(zoneOffsetMinutes(Date.parse("2026-06-01T00:00Z"), "Asia/Kolkata")).toBe(330)
  })
  it("reject unknown zones and malformed values", () => {
    expect(resolveWallClock("2026-10-21T09:30", "Australia/Sydney (AEDT)")).toBeNull()
    expect(resolveWallClock("2026-10-21", SYDNEY)).toBeNull()
    expect(instantToWallClock(Number.NaN, SYDNEY)).toBe("")
  })
})

describe("daylight-saving changes", () => {
  it("move a skipped time forward by the gap (Sydney, 4 Oct 2026, 2:00 → 3:00)", () => {
    const gap = resolveWallClock("2026-10-04T02:30", SYDNEY)!
    expect(gap.kind).toBe("gap")
    expect(gap.wallClock).toBe("2026-10-04T03:30")
    expect(gap.iso).toBe("2026-10-04T03:30:00+11:00")
    expect(gap.transition).toEqual({ before: 600, after: 660 })
    expect(resolveWallClock("2026-10-04T02:30", SYDNEY, { disambiguation: "earlier" })?.wallClock).toBe("2026-10-04T01:30")
    // Either side of the gap is exact.
    expect(resolveWallClock("2026-10-04T01:59", SYDNEY)?.kind).toBe("exact")
    expect(resolveWallClock("2026-10-04T03:00", SYDNEY)?.kind).toBe("exact")
  })
  it("take the earlier of a repeated time by default (Sydney, 5 Apr 2026, 3:00 → 2:00)", () => {
    const overlap = resolveWallClock("2026-04-05T02:30", SYDNEY)!
    expect(overlap.kind).toBe("overlap")
    expect(overlap.iso).toBe("2026-04-05T02:30:00+11:00")
    expect(overlap.epochMs).toBe(Date.parse("2026-04-04T15:30Z"))
    expect(resolveWallClock("2026-04-05T02:30", SYDNEY, { disambiguation: "later" })?.iso).toBe("2026-04-05T02:30:00+10:00")
    expect(resolveWallClock("2026-04-05T03:00", SYDNEY)?.kind).toBe("exact")
  })
  it("handle New York's changes (8 Mar and 1 Nov 2026)", () => {
    const gap = resolveWallClock("2026-03-08T02:15", NEW_YORK)!
    expect(gap).toMatchObject({ kind: "gap", wallClock: "2026-03-08T03:15", iso: "2026-03-08T03:15:00-04:00" })
    const overlap = resolveWallClock("2026-11-01T01:30", NEW_YORK)!
    expect(overlap).toMatchObject({ kind: "overlap", iso: "2026-11-01T01:30:00-04:00" })
    expect(resolveWallClock("2026-11-01T01:30", NEW_YORK, { disambiguation: "later" })?.iso).toBe("2026-11-01T01:30:00-05:00")
    expect(instantToWallClock(Date.parse("2026-11-01T06:30Z"), NEW_YORK)).toBe("2026-11-01T01:30")
  })
  it("handle half-hour changes (Lord Howe Island)", () => {
    expect(resolveWallClock("2026-10-04T02:15", "Australia/Lord_Howe")).toMatchObject({ kind: "gap", wallClock: "2026-10-04T02:45" })
  })
})
