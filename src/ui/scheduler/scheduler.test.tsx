// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Scheduler } from "./scheduler.js"
import { editEvent } from "./edit.js"
import { placeEvent } from "./layout.js"
import type { SchedulerEvent } from "./types.js"

const NOW = Date.parse("2026-10-28T01:00:00Z") // Wednesday 28 October, 12:00 in Sydney
const EVENTS: SchedulerEvent[] = [
  { id: "a", title: "Pump check", start: "2026-10-28T09:00", end: "2026-10-28T10:30", resourceId: "pump" },
  { id: "b", title: "Audit", start: "2026-10-27", end: "2026-10-29", allDay: true, tone: 5 },
]

afterEach(cleanup)

function renderScheduler(props: Partial<Parameters<typeof Scheduler>[0]> = {}) {
  return render(<Scheduler events={EVENTS} timeZone="Australia/Sydney" locale="en-AU" now={NOW} resources={[{ id: "pump", title: "Pump house" }]} {...props} />)
}

describe("Scheduler", () => {
  it("names every event with its time and resource", () => {
    renderScheduler()
    expect(screen.getByRole("button", { name: /^Pump check, Wednesday,? 28 October, 9:00\s?am to 10:30\s?am, Pump house$/ })).toBeTruthy()
    expect(screen.getByRole("button", { name: /^Audit, Tue,? 27 Oct to Wed,? 28 Oct, all day$/ })).toBeTruthy()
  })

  it("switches views and moves by the view's step", () => {
    const onViewChange = vi.fn()
    const onDateChange = vi.fn()
    renderScheduler({ onViewChange, onDateChange })
    expect(screen.getByText(/26.+Nov 2026/)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Next week" }))
    expect(onDateChange).toHaveBeenLastCalledWith("2026-11-04")
    fireEvent.click(screen.getByRole("button", { name: "Month" }))
    expect(onViewChange).toHaveBeenLastCalledWith("month")
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Today" }))
    expect(onDateChange).toHaveBeenLastCalledWith("2026-10-28")
  })

  it("lists the month's events in the agenda", () => {
    renderScheduler({ defaultView: "agenda" })
    const list = screen.getByRole("list", { name: "Events, October 2026" })
    expect(list.textContent).toContain("Pump check")
    expect(list.textContent).toContain("All day")
  })

  it("moves an event with the keyboard and reports the change", () => {
    const onEventChange = vi.fn()
    renderScheduler({ editable: true, onEventChange })
    const event = screen.getByRole("button", { name: /^Pump check/ })
    fireEvent.keyDown(event, { key: "ArrowDown" })
    expect(onEventChange).toHaveBeenCalledTimes(1)
    const change = onEventChange.mock.calls[0]![0]
    expect(change).toMatchObject({ kind: "move", input: "keyboard", allDay: false })
    expect(change.start.toISOString()).toBe("2026-10-27T22:15:00.000Z")
    expect(change.end.toISOString()).toBe("2026-10-27T23:45:00.000Z")
    // Shown at its new time at once, and announced.
    expect(screen.getByRole("button", { name: /^Pump check, Wednesday,? 28 October, 9:15\s?am to 10:45\s?am/ })).toBeTruthy()
  })

  it("shows placeholders while loading and keeps the header", () => {
    const { container } = renderScheduler({ loading: true })
    expect(container.querySelectorAll("[data-skeleton]").length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: /^Pump check/ })).toBeNull()
    expect(screen.getByRole("button", { name: "Today" })).toBeTruthy()
  })
})

describe("editEvent", () => {
  const zone = "Australia/Sydney"
  it("keeps the wall-clock time when moving across a daylight-saving change", () => {
    // 3 Oct is +10:00 and 5 Oct +11:00 in Sydney.
    const placed = placeEvent({ id: "x", title: "Check", start: "2026-10-03T09:00", end: "2026-10-03T10:00" }, zone)!
    const change = editEvent(placed, { kind: "move", days: 2 }, zone, "keyboard")!
    expect(new Date(change.startMs).toISOString()).toBe("2026-10-04T22:00:00.000Z")
    expect(change.endMs - change.startMs).toBe(3_600_000)
  })

  it("moves and stretches all-day events by days, never shorter than one", () => {
    const placed = placeEvent({ id: "y", title: "Audit", start: "2026-10-27", end: "2026-10-29", allDay: true }, zone)!
    expect(editEvent(placed, { kind: "move", days: 1 }, zone, "keyboard")?.days).toEqual({ start: "2026-10-28", end: "2026-10-30" })
    expect(editEvent(placed, { kind: "resize", days: 1 }, zone, "keyboard")?.days).toEqual({ start: "2026-10-27", end: "2026-10-30" })
    expect(editEvent(placed, { kind: "resize", days: -5 }, zone, "keyboard")?.days).toEqual({ start: "2026-10-27", end: "2026-10-28" })
  })

  it("snaps resized ends and keeps one snap at least", () => {
    const placed = placeEvent({ id: "z", title: "Call", start: "2026-10-28T09:00", end: "2026-10-28T09:30" }, zone)!
    const shorter = editEvent(placed, { kind: "resize", minutes: -30, snap: 15 }, zone, "keyboard")!
    expect(shorter.endMs - shorter.startMs).toBe(15 * 60_000)
  })
})
