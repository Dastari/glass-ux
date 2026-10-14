import { describe, expect, it } from "vitest"
import { addDays, addMonths, dateOrder, datePlaceholder, firstDayOfWeek, formatDateRange, formatDateText, gridStart, isIsoDate, parseDateText } from "./calendar-date.js"

describe("calendar dates", () => {
  it("validate real days only", () => {
    expect(isIsoDate("2026-10-13")).toBe(true)
    expect(isIsoDate("2026-02-29")).toBe(false)
    expect(isIsoDate("2028-02-29")).toBe(true)
    expect(isIsoDate("2026-13-01")).toBe(false)
    expect(isIsoDate(20261013)).toBe(false)
  })
  it("do calendar arithmetic", () => {
    expect(addDays("2026-10-04", -1)).toBe("2026-10-03")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28")
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15")
  })
  it("start the month grid on the locale's first weekday", () => {
    expect(firstDayOfWeek("en-AU")).toBe(1)
    expect(firstDayOfWeek("en-US")).toBe(7)
    // 1 October 2026 is a Thursday.
    expect(gridStart(2026, 10, 1)).toBe("2026-09-28")
    expect(gridStart(2026, 10, 7)).toBe("2026-09-27")
  })
  it("read and write the locale's numeric order", () => {
    expect(dateOrder("en-AU")).toEqual({ order: ["day", "month", "year"], separator: "/" })
    expect(dateOrder("en-US").order).toEqual(["month", "day", "year"])
    expect(datePlaceholder("en-AU")).toBe("dd/mm/yyyy")
    expect(formatDateText("2026-10-03", "en-AU")).toBe("03/10/2026")
    expect(parseDateText("3/10/2026", "en-AU")).toBe("2026-10-03")
    expect(parseDateText("3.10.26", "en-AU")).toBe("2026-10-03")
    expect(parseDateText("10/3/2026", "en-US")).toBe("2026-10-03")
    expect(parseDateText("2026-10-03", "en-AU")).toBe("2026-10-03")
    expect(parseDateText("31/2/2026", "en-AU")).toBeNull()
    expect(parseDateText("13/10", "en-AU")).toBeNull()
  })
  it("format ranges compactly", () => {
    expect(formatDateRange("2026-10-01", "2026-10-13", "en-AU")).toBe("1–13 Oct 2026")
  })
})
