import { describe, expect, it } from "vitest"
import { daysBetween, rangeTitle, shiftDate, startOfWeek, visibleDays } from "./range.js"
import { wallPosition, zonedInstant } from "./zone.js"

describe("date ranges", () => {
  it("counts calendar days across daylight-saving changes", () => {
    // Sydney springs forward on 4 Oct 2026 and Berlin falls back on 25 Oct 2026.
    expect(daysBetween("2026-10-03", "2026-10-05")).toBe(2)
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2)
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1)
    expect(daysBetween("2026-03-01", "2026-02-27")).toBe(-2)
  })

  it("starts weeks on the given day", () => {
    expect(startOfWeek("2026-10-28", 1)).toBe("2026-10-26")
    expect(startOfWeek("2026-10-28", 7)).toBe("2026-10-25")
    expect(startOfWeek("2026-10-25", 1)).toBe("2026-10-19")
    expect(startOfWeek("2026-10-31", 6)).toBe("2026-10-31")
  })

  it("covers a month in whole weeks", () => {
    const october = visibleDays("month", "2026-10-15", 1)
    expect(october[0]).toBe("2026-09-28")
    expect(october.at(-1)).toBe("2026-11-01")
    expect(october).toHaveLength(35)
    // February 2027 starts on a Monday and has 28 days: exactly four weeks.
    expect(visibleDays("month", "2027-02-10", 1)).toHaveLength(28)
    // August 2026 needs six Monday weeks.
    expect(visibleDays("month", "2026-08-10", 1)).toHaveLength(42)
  })

  it("shows seven days a week, one when compact, and the month in the agenda", () => {
    expect(visibleDays("week", "2026-10-28", 1)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"])
    expect(visibleDays("week", "2026-10-28", 1, true)).toEqual(["2026-10-28"])
    expect(visibleDays("day", "2026-10-28", 1)).toEqual(["2026-10-28"])
    expect(visibleDays("agenda", "2026-02-10", 1)).toHaveLength(28)
  })

  it("moves by the view's step", () => {
    expect(shiftDate("month", "2026-01-31", 1)).toBe("2026-02-28")
    expect(shiftDate("week", "2026-10-28", -1)).toBe("2026-10-21")
    expect(shiftDate("week", "2026-10-28", 1, true)).toBe("2026-10-29")
    expect(shiftDate("day", "2026-10-04", -1)).toBe("2026-10-03")
  })

  it("titles the range in the locale", () => {
    expect(rangeTitle("month", "2026-10-15", [], "en-AU")).toBe("October 2026")
    expect(rangeTitle("week", "2026-10-28", visibleDays("week", "2026-10-28", 1), "en-AU")).toMatch(/26 Oct.+1 Nov 2026/)
    expect(rangeTitle("day", "2026-10-28", ["2026-10-28"], "en-AU")).toMatch(/Wednesday,? 28 October 2026/)
  })
})

describe("zoned wall clock", () => {
  it("finds midnight and a time on a day in a zone, across a skipped hour", () => {
    // 4 Oct 2026 in Sydney is 23 hours long: midnight is +10:00, noon +11:00.
    expect(new Date(zonedInstant("2026-10-04", 0, "Australia/Sydney")).toISOString()).toBe("2026-10-03T14:00:00.000Z")
    expect(new Date(zonedInstant("2026-10-04", 720, "Australia/Sydney")).toISOString()).toBe("2026-10-04T01:00:00.000Z")
    // 02:30 does not exist: it moves forward to 03:30.
    expect(wallPosition(zonedInstant("2026-10-04", 150, "Australia/Sydney"), "Australia/Sydney")).toEqual({ day: "2026-10-04", minutes: 210 })
    // 1440 minutes is the next midnight.
    expect(new Date(zonedInstant("2026-10-04", 1440, "Australia/Sydney")).toISOString()).toBe("2026-10-04T13:00:00.000Z")
  })

  it("reads the wall clock in another zone than the browser's", () => {
    expect(wallPosition(Date.parse("2026-10-25T00:30:00Z"), "Europe/Berlin")).toEqual({ day: "2026-10-25", minutes: 150 })
    expect(wallPosition(Date.parse("2026-10-25T01:30:00Z"), "Europe/Berlin")).toEqual({ day: "2026-10-25", minutes: 150 })
  })
})
