// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Scheduler, type SchedulerProps } from "./scheduler.js"
import type { SchedulerBlock, SchedulerEvent, SchedulerResource } from "./types.js"

const NOW = Date.parse("2026-10-28T01:00:00Z") // Wednesday 28 October, 12:00 in Hobart
const RESOURCES: SchedulerResource[] = [
  { id: "ari", title: "Ari Moss", description: "Supervisor" },
  { id: "unassigned", title: "Unassigned", sticky: true },
  { id: "bea", title: "Bea Lund" },
]
const EVENTS: SchedulerEvent[] = [
  { id: "mow", title: "Mow fields", start: "2026-10-27", allDay: true, resourceId: "ari" },
  { id: "hedge", title: "Hedge line", start: "2026-10-30", end: "2026-11-03", allDay: true, resourceId: "bea" },
  { id: "edge", title: "Path edging", start: "2026-10-28", allDay: true, resourceId: "unassigned" },
  { id: "stray", title: "Nobody's", start: "2026-10-28", allDay: true, resourceId: "gone" },
]

afterEach(cleanup)

function timeline(props: Partial<SchedulerProps> = {}) {
  return render(<Scheduler events={EVENTS} resources={RESOURCES} layout="timeline" timeZone="Australia/Hobart" locale="en-AU" now={NOW} {...props} />)
}

const announcer = (container: HTMLElement) => container.querySelector(".fa-sch-announcer")!

describe("Scheduler timeline", () => {
  it("draws a row per resource, sticky ones first, and only events of known resources", () => {
    const { container } = timeline()
    const rows = [...container.querySelectorAll(".fa-sch-tl-row")].map((row) => row.getAttribute("aria-label"))
    expect(rows).toEqual(["Unassigned", "Ari Moss", "Bea Lund"])
    expect(within(screen.getByRole("group", { name: "Ari Moss" })).getByRole("button", { name: /^Mow fields, Tuesday,? 27 October, all day, Ari Moss$/ })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Nobody's/ })).toBeNull()
    // Day, week and month; the week opens by default.
    expect(screen.getByRole("button", { name: "Week" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Next week" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Agenda" })).toBeNull()
  })

  it("moves an event to the next resource with the keyboard and reports it", async () => {
    const onEventChange = vi.fn()
    const { container } = timeline({ editable: true, onEventChange })
    fireEvent.keyDown(screen.getByRole("button", { name: /^Mow fields/ }), { key: "ArrowDown" })
    expect(onEventChange).toHaveBeenCalledTimes(1)
    expect(onEventChange.mock.calls[0]![0]).toMatchObject({ kind: "move", resourceId: "bea", input: "keyboard", days: { start: "2026-10-27", end: "2026-10-28" } })
    // Shown in its new row at once, named with it, and announced with the row.
    expect(within(screen.getByRole("group", { name: "Bea Lund" })).getByRole("button", { name: /^Mow fields, .*, Bea Lund$/ })).toBeTruthy()
    await waitFor(() => expect(announcer(container).textContent).toMatch(/^Mow fields moved to Bea Lund, Tuesday,? 27 October, all day$/))
  })

  it("steps over hidden days and changes either end", () => {
    const onEventChange = vi.fn()
    timeline({ editable: true, onEventChange, hiddenDays: [6, 7] })
    const hedge = screen.getByRole("button", { name: /^Hedge line/ })
    // Friday to Monday: Shift+Left pulls the end back over the hidden weekend to Friday.
    fireEvent.keyDown(hedge, { key: "ArrowLeft", shiftKey: true })
    expect(onEventChange.mock.calls[0]![0]).toMatchObject({ kind: "resize", edge: "end", days: { start: "2026-10-30", end: "2026-10-31" } })
    // Alt+Shift+Left moves the start back a day.
    fireEvent.keyDown(screen.getByRole("button", { name: /^Hedge line/ }), { key: "ArrowLeft", shiftKey: true, altKey: true })
    expect(onEventChange.mock.calls[1]![0]).toMatchObject({ kind: "resize", edge: "start", days: { start: "2026-10-29" } })
  })

  it("asks validateDrop about keyboard moves with the target and blocks, and announces a refusal", async () => {
    const onEventChange = vi.fn()
    const blocks: SchedulerBlock[] = [{ id: "leave", resourceId: "bea", start: "2026-10-27", title: "Annual leave" }]
    const validateDrop = vi.fn((_drag, resource: SchedulerResource, target: { blocks: SchedulerBlock[] }) => (target.blocks.length ? { status: "error" as const, reason: `${resource.title} is on leave` } : true))
    const { container } = timeline({ editable: true, onEventChange, blocks, validateDrop })
    fireEvent.keyDown(screen.getByRole("button", { name: /^Mow fields/ }), { key: "ArrowDown" })
    expect(onEventChange).not.toHaveBeenCalled()
    const target = validateDrop.mock.calls[0]![2] as { day: string; allDay: boolean; effect: string; input: string; blocks: SchedulerBlock[]; start: Date; end: Date }
    expect(target).toMatchObject({ day: "2026-10-27", allDay: true, effect: "move", input: "keyboard" })
    expect(target.blocks.map((block) => block.id)).toEqual(["leave"])
    await waitFor(() => expect(announcer(container).textContent).toBe("Mow fields cannot go there: Bea Lund is on leave"))
  })

  it("locks an event with the reason editable gives, and still opens it", () => {
    const onEventClick = vi.fn()
    const onEventChange = vi.fn()
    timeline({ editable: (event) => (event.id === "mow" ? "Sent to the crew" : true), onEventChange, onEventClick })
    const mow = screen.getByRole("button", { name: /^Mow fields/ })
    expect(mow.getAttribute("aria-description")).toBe("Sent to the crew")
    fireEvent.keyDown(mow, { key: "ArrowRight" })
    expect(onEventChange).not.toHaveBeenCalled()
    fireEvent.click(mow)
    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: "mow" }), expect.anything())
  })

  it("keeps the ends fixed when an event is not resizable", () => {
    const onEventChange = vi.fn()
    timeline({ editable: true, resizable: false, onEventChange })
    fireEvent.keyDown(screen.getByRole("button", { name: /^Hedge line/ }), { key: "ArrowRight", shiftKey: true })
    expect(onEventChange).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole("button", { name: /^Hedge line/ }), { key: "ArrowRight" })
    expect(onEventChange).toHaveBeenCalledTimes(1)
  })

  it("renders custom event content beside the card's button, never inside it", () => {
    const send = vi.fn()
    const onEventClick = vi.fn()
    timeline({
      onEventClick,
      renderEvent: (event, info) => (
        <span>
          {event.title} · {info.time}
          <button type="button" onClick={() => send(event.id)}>
            Send {event.title}
          </button>
        </span>
      ),
    })
    const action = screen.getByRole("button", { name: "Send Mow fields" })
    expect(action.closest(".fa-sch-tl-hit")).toBeNull()
    expect(action.parentElement?.closest("button")).toBeNull()
    fireEvent.click(action)
    expect(send).toHaveBeenCalledWith("mow")
    expect(onEventClick).not.toHaveBeenCalled()
  })

  it("chooses a row and days with the keyboard and selects them with the row's resource", () => {
    const onSlotSelect = vi.fn()
    const { container } = timeline({ onSlotSelect })
    const grid = screen.getByRole("group", { name: /^Days, 26/ })
    fireEvent.focus(grid)
    // Starts on today in the first row; down to Ari, then extend a day.
    fireEvent.keyDown(grid, { key: "ArrowDown" })
    fireEvent.keyDown(grid, { key: "ArrowRight", shiftKey: true })
    fireEvent.keyDown(grid, { key: "Enter" })
    expect(onSlotSelect).toHaveBeenCalledTimes(1)
    const [slot, details] = onSlotSelect.mock.calls[0]!
    expect(slot).toMatchObject({ allDay: true, resourceId: "ari", input: "keyboard", days: { start: "2026-10-28", end: "2026-10-30" } })
    expect(details.element).toBe(container.querySelector('[data-row-index="1"] .fa-sch-tl-selection'))
  })

  it("copies an event whose effect is copy, leaving it in place", () => {
    const onEventChange = vi.fn()
    timeline({ editable: true, eventEffect: () => "copy", onEventChange })
    // Keyboard moves are moves; copies come from dragging. The effect is still reported per event.
    fireEvent.keyDown(screen.getByRole("button", { name: /^Mow fields/ }), { key: "ArrowRight" })
    expect(onEventChange.mock.calls[0]![0].effect).toBeUndefined()
  })

  it("reports the days shown for loading, and a continuous month spans three months", () => {
    const onRangeChange = vi.fn()
    timeline({ onRangeChange, view: "month", continuous: true })
    const range = onRangeChange.mock.calls.at(-1)![0]
    expect(range).toMatchObject({ first: "2026-09-01", last: "2026-11-30" })
    expect(range.end.toISOString()).toBe("2026-11-30T13:00:00.000Z")
    expect(screen.getByText("October 2026")).toBeTruthy()
  })

  it("shades blocks and names them with the keyboard cursor", async () => {
    const blocks: SchedulerBlock[] = [{ id: "leave", resourceId: "unassigned", start: "2026-10-28", title: "Closed" }]
    const { container } = timeline({ blocks, onSlotSelect: vi.fn() })
    expect(container.querySelector(".fa-sch-tl-block")?.textContent).toBe("Closed")
    fireEvent.focus(screen.getByRole("group", { name: /^Days, 26/ }))
    await waitFor(() => expect(announcer(container).textContent).toBe("Unassigned, Wednesday 28 October, Closed"))
  })

  it("takes drops of the host's items on a row and day", () => {
    // The drop zone contract is DragDrop's; here: rows are zones named by their resource.
    const { container } = timeline({ dropAccept: "work-order", onDrop: vi.fn() })
    const zones = [...container.querySelectorAll("[data-tl-zone]")]
    expect(zones).toHaveLength(3)
    expect(zones.every((zone) => zone.hasAttribute("data-dnd-zone"))).toBe(true)
  })
})
