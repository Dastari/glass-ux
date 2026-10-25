import { describe, expect, it } from "vitest"
import { barSegments, daySegments, fitBars, packColumns, packRows, placeEvent } from "./layout.js"

const at = (id: string, start: number, end: number) => ({ id, start, end })

describe("packColumns", () => {
  it("gives events that do not overlap the whole width", () => {
    const placed = packColumns([at("a", 60, 120), at("b", 120, 180)])
    expect(placed.get("a")).toEqual({ column: 0, span: 1, columns: 1 })
    expect(placed.get("b")).toEqual({ column: 0, span: 1, columns: 1 })
  })

  it("puts overlapping events side by side and reuses a column once it is free", () => {
    // a 9–11, b 9:30–10, c 10–12: c takes b's column after b ends.
    const placed = packColumns([at("a", 540, 660), at("b", 570, 600), at("c", 600, 720)])
    expect(placed.get("a")).toMatchObject({ column: 0, columns: 2 })
    expect(placed.get("b")).toMatchObject({ column: 1, columns: 2 })
    expect(placed.get("c")).toMatchObject({ column: 1, columns: 2 })
  })

  it("widens an event into columns its cluster leaves free during it", () => {
    // a and b overlap c; d overlaps only c, so it spans the two columns a and b leave.
    const placed = packColumns([at("a", 0, 60), at("b", 0, 60), at("c", 0, 180), at("d", 90, 150)])
    expect(placed.get("c")).toMatchObject({ column: 0, span: 1, columns: 3 })
    expect(placed.get("a")).toMatchObject({ column: 1, columns: 3 })
    expect(placed.get("d")).toEqual({ column: 1, span: 2, columns: 3 })
  })

  it("starts a new cluster after a gap", () => {
    const placed = packColumns([at("a", 0, 60), at("b", 30, 90), at("c", 120, 150)])
    expect(placed.get("c")).toEqual({ column: 0, span: 1, columns: 1 })
  })

  it("is stable for ties: the longer event first, then the id", () => {
    const one = packColumns([at("b", 0, 60), at("a", 0, 60), at("long", 0, 120)])
    const two = packColumns([at("long", 0, 120), at("a", 0, 60), at("b", 0, 60)])
    expect([...one.entries()].toSorted()).toEqual([...two.entries()].toSorted())
    expect(one.get("long")?.column).toBe(0)
    expect(one.get("a")?.column).toBe(1)
  })
})

describe("packRows", () => {
  it("stacks bars that share a day and reuses rows", () => {
    const { rows, count } = packRows([at("a", 0, 3), at("b", 1, 2), at("c", 3, 5), at("d", 2, 4)])
    expect(rows.get("a")).toBe(0)
    expect(rows.get("b")).toBe(1)
    expect(rows.get("c")).toBe(0)
    expect(rows.get("d")).toBe(1)
    expect(count).toBe(2)
  })
})

describe("placeEvent", () => {
  const zone = "Australia/Sydney"

  it("reads wall-clock strings in the zone and splits an event over midnight", () => {
    const placed = placeEvent({ id: "n", title: "Night shift", start: "2026-10-26T22:00", end: "2026-10-27T06:00" }, zone)!
    expect(placed).toMatchObject({ startDay: "2026-10-26", startMinutes: 1320, endDay: "2026-10-27", endMinutes: 360, band: false })
    expect(daySegments([placed], "2026-10-26")[0]).toMatchObject({ start: 1320, end: 1440, continuesAfter: true })
    expect(daySegments([placed], "2026-10-27")[0]).toMatchObject({ start: 0, end: 360, continuesBefore: true })
  })

  it("closes an event that ends at midnight on its own day", () => {
    const placed = placeEvent({ id: "e", title: "Evening", start: "2026-10-26T20:00", end: "2026-10-27T00:00" }, zone)!
    expect(placed).toMatchObject({ endDay: "2026-10-26", endMinutes: 1440 })
  })

  it("treats all-day ends as exclusive and a missing or same-day end as one day", () => {
    expect(placeEvent({ id: "a", title: "Audit", start: "2026-10-26", end: "2026-10-29", allDay: true }, zone)).toMatchObject({ startDay: "2026-10-26", endDay: "2026-10-28" })
    expect(placeEvent({ id: "b", title: "Audit", start: "2026-10-26", allDay: true }, zone)).toMatchObject({ endDay: "2026-10-26" })
    expect(placeEvent({ id: "c", title: "Audit", start: "2026-10-26", end: "2026-10-26", allDay: true }, zone)).toMatchObject({ endDay: "2026-10-26" })
  })

  it("puts timed events of a day or more in the band", () => {
    expect(placeEvent({ id: "l", title: "Outage", start: "2026-10-26T09:00", end: "2026-10-27T09:00" }, zone)?.band).toBe(true)
  })

  it("positions instants by the zone's wall clock across a daylight-saving change", () => {
    // Sydney springs forward at 02:00 on 4 Oct 2026: 01:00–04:00 lasts two hours but reads 01:00–04:00.
    const placed = placeEvent({ id: "d", title: "Backup", start: "2026-10-03T15:00:00Z", end: "2026-10-03T17:00:00Z" }, zone)!
    expect(placed).toMatchObject({ startDay: "2026-10-04", startMinutes: 60, endMinutes: 240 })
  })
})

describe("barSegments and fitBars", () => {
  const zone = "UTC"
  const week = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]
  const events = [
    placeEvent({ id: "long", title: "Shutdown", start: "2026-10-24", end: "2026-10-28", allDay: true }, zone)!,
    placeEvent({ id: "t1", title: "Check", start: "2026-10-27T09:00", end: "2026-10-27T10:00" }, zone)!,
    placeEvent({ id: "t2", title: "Check", start: "2026-10-27T11:00", end: "2026-10-27T12:00" }, zone)!,
    placeEvent({ id: "t3", title: "Check", start: "2026-10-27T13:00", end: "2026-10-27T14:00" }, zone)!,
  ]

  it("clips bars to the row and lists timed events under them on their day", () => {
    const { bars, rows } = barSegments(events, week, true)
    const long = bars.find((bar) => bar.placed.id === "long")!
    expect(long).toMatchObject({ first: 0, length: 2, row: 0, continuesBefore: true, continuesAfter: false })
    expect(bars.filter((bar) => bar.first === 1).map((bar) => [bar.placed.id, bar.row])).toEqual([
      ["long", 0],
      ["t1", 1],
      ["t2", 2],
      ["t3", 3],
    ].filter(([id]) => id !== "long"))
    expect(rows).toBe(4)
  })

  it("gives the last row to +N more when a day overflows", () => {
    const { bars } = barSegments(events, week, true)
    const { visible, hidden, shown } = fitBars(bars, 7, 3)
    expect(shown).toBe(2)
    expect(visible.map((bar) => bar.placed.id).toSorted()).toEqual(["long", "t1"])
    expect(hidden).toEqual([0, 2, 0, 0, 0, 0, 0])
    expect(fitBars(bars, 7, 4).hidden.every((count) => count === 0)).toBe(true)
  })
})
