import { describe, expect, it } from "vitest"
import {
  clampTime,
  formatTimeText,
  hourCycleOf,
  isTimeValue,
  nearestTimeIndex,
  parseTimeText,
  stepTime,
  timePartAt,
  timePartRange,
  timePlaceholder,
  timeSlots,
} from "./time.js"

describe("time values", () => {
  it("are 24-hour, zero-padded strings", () => {
    expect(isTimeValue("09:30")).toBe(true)
    expect(isTimeValue("23:59:59")).toBe(true)
    expect(isTimeValue("9:30")).toBe(false)
    expect(isTimeValue("24:00")).toBe(false)
    expect(isTimeValue("09:30", { seconds: true })).toBe(false)
    expect(isTimeValue("09:30:00", { seconds: false })).toBe(false)
  })
})

describe("time text", () => {
  it("follows the locale's clock unless the hour cycle is given", () => {
    expect(hourCycleOf("en-AU")).toBe(12)
    expect(hourCycleOf("en-GB")).toBe(24)
    expect(formatTimeText("09:05")).toBe("9:05 am")
    expect(formatTimeText("21:05")).toBe("9:05 pm")
    expect(formatTimeText("00:30")).toBe("12:30 am")
    expect(formatTimeText("21:05", { hourCycle: 24 })).toBe("21:05")
    expect(formatTimeText("09:05", { locale: "en-GB" })).toBe("09:05")
    expect(formatTimeText("21:05", { locale: "en-US" })).toBe("9:05 PM")
    expect(formatTimeText("09:05:30", { seconds: true })).toBe("9:05:30 am")
    expect(formatTimeText("nonsense")).toBe("")
  })
  it("shows the format as a placeholder", () => {
    expect(timePlaceholder()).toBe("h:mm am")
    expect(timePlaceholder({ hourCycle: 24 })).toBe("hh:mm")
    expect(timePlaceholder({ hourCycle: 24, seconds: true })).toBe("hh:mm:ss")
  })
  it("reads what people type", () => {
    expect(parseTimeText("9:30")).toBe("09:30")
    expect(parseTimeText("930")).toBe("09:30")
    expect(parseTimeText("0930")).toBe("09:30")
    expect(parseTimeText("2130")).toBe("21:30")
    expect(parseTimeText("21:30")).toBe("21:30")
    expect(parseTimeText("21.30")).toBe("21:30")
    expect(parseTimeText("9h30")).toBe("09:30")
    expect(parseTimeText("9:30pm")).toBe("21:30")
    expect(parseTimeText("9:30 PM")).toBe("21:30")
    expect(parseTimeText("9.30 p.m.")).toBe("21:30")
    expect(parseTimeText("9 pm")).toBe("21:00")
    expect(parseTimeText("9p")).toBe("21:00")
    expect(parseTimeText("12am")).toBe("00:00")
    expect(parseTimeText("12:15 pm")).toBe("12:15")
    expect(parseTimeText("9")).toBe("09:00")
    expect(parseTimeText("noon")).toBe("12:00")
    expect(parseTimeText("Midnight")).toBe("00:00")
    expect(parseTimeText(formatTimeText("21:05"))).toBe("21:05")
  })
  it("reads seconds only when the value holds them", () => {
    expect(parseTimeText("9:30:15")).toBeNull()
    expect(parseTimeText("9:30:00")).toBe("09:30")
    expect(parseTimeText("9:30:15", { seconds: true })).toBe("09:30:15")
    expect(parseTimeText("093015", { seconds: true })).toBe("09:30:15")
    expect(parseTimeText("9:30", { seconds: true })).toBe("09:30:00")
  })
  it("rejects anything else", () => {
    expect(parseTimeText("")).toBeNull()
    expect(parseTimeText("soon")).toBeNull()
    expect(parseTimeText("25:00")).toBeNull()
    expect(parseTimeText("9:75")).toBeNull()
    expect(parseTimeText("13 pm")).toBeNull()
    expect(parseTimeText("9:3")).toBeNull()
  })
})

describe("time stepping", () => {
  it("lists the suggested times", () => {
    expect(timeSlots({ step: 30, min: "09:00", max: "11:00" })).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"])
    expect(timeSlots()).toHaveLength(96)
    expect(timeSlots({ step: 1 })).toHaveLength(1440)
    expect(nearestTimeIndex(["09:00", "09:30", "10:00"], "09:40")).toBe(1)
    expect(clampTime("08:00", { min: "09:00" })).toBe("09:00")
  })
  it("moves minutes to the step grid, hours by one and flips the period", () => {
    expect(stepTime("09:32", "minute", 1, { step: 15 })).toBe("09:45")
    expect(stepTime("09:32", "minute", -1, { step: 15 })).toBe("09:30")
    expect(stepTime("09:30", "minute", 1, { step: 15 })).toBe("09:45")
    expect(stepTime("09:55", "minute", 1, { step: 5 })).toBe("10:00")
    expect(stepTime("09:30", "hour", 1)).toBe("10:30")
    expect(stepTime("09:30", "period", 1)).toBe("21:30")
    expect(stepTime("21:30", "period", 1)).toBe("09:30")
    expect(stepTime("09:30", "minute", 1, { large: true })).toBe("10:30")
    expect(stepTime("09:30:10", "second", -1, { seconds: true })).toBe("09:30:09")
  })
  it("steps from min and stays within the bounds and the day", () => {
    expect(stepTime("09:10", "minute", 1, { step: 15, min: "09:10" })).toBe("09:25")
    expect(stepTime("23:45", "minute", 1, { step: 15 })).toBe("23:59")
    expect(stepTime("00:10", "hour", -1)).toBe("00:00")
    expect(stepTime("16:30", "hour", 1, { max: "17:00" })).toBe("17:00")
  })
  it("finds the part under the caret and where it is", () => {
    expect(timePartAt("9:30 am", 0)).toBe("hour")
    expect(timePartAt("9:30 am", 1)).toBe("hour")
    expect(timePartAt("9:30 am", 3)).toBe("minute")
    expect(timePartAt("9:30 am", 6)).toBe("period")
    expect(timePartAt("09:30:15", 7)).toBe("second")
    expect(timePartAt("930", 1)).toBe("minute")
    expect(timePartRange("10:30 am", "minute")).toEqual([3, 5])
    expect(timePartRange("10:30 am", "period")).toEqual([6, 8])
  })
})
