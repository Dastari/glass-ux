import { describe, expect, it } from "vitest"
import { describeTimeZone, formatOffset, isTimeZone, offsetMinutes, timeZoneIds } from "./time-zones.js"

describe("time zones", () => {
  it("lists IANA zones with UTC", () => {
    const ids = timeZoneIds()
    expect(ids).toContain("Australia/Hobart")
    expect(ids).toContain("UTC")
  })
  it("reads offsets through daylight saving", () => {
    expect(offsetMinutes("Australia/Hobart", new Date("2026-01-15T00:00:00Z"))).toBe(660)
    expect(offsetMinutes("Australia/Hobart", new Date("2026-07-15T00:00:00Z"))).toBe(600)
    expect(offsetMinutes("Asia/Kolkata", new Date("2026-07-15T00:00:00Z"))).toBe(330)
    expect(offsetMinutes("America/St_Johns", new Date("2026-01-15T00:00:00Z"))).toBe(-210)
  })
  it("describes a zone", () => {
    const hobart = describeTimeZone("Australia/Hobart", { at: new Date("2026-01-15T00:00:00Z") })
    expect(hobart).toMatchObject({ city: "Hobart", area: "Australia", offset: "UTC+11:00", abbreviation: "AEDT" })
    expect(describeTimeZone("America/Argentina/Buenos_Aires").city).toBe("Buenos Aires")
    expect(formatOffset(-210)).toBe("UTC−03:30")
    expect(formatOffset(0)).toBe("UTC")
  })
  it("knows real zones", () => {
    expect(isTimeZone("Australia/Hobart")).toBe(true)
    expect(isTimeZone("Mars/Olympus_Mons")).toBe(false)
  })
})
