// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { Kanban, type KanbanColumn, type KanbanItem, type KanbanMove } from "./index.js"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
})
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())

const COLUMNS: KanbanColumn[] = [
  { id: "new", title: "New" },
  { id: "triage", title: "Triage", limit: 2 },
  { id: "done", title: "Done" },
]
const CARDS: KanbanItem[] = [
  { id: "a", columnId: "new", title: "Alpha" },
  { id: "b", columnId: "new", title: "Bravo" },
  { id: "c", columnId: "triage", title: "Charlie" },
  { id: "d", columnId: "triage", title: "Delta" },
]
const titles = (list: string) => within(screen.getByRole("list", { name: list })).queryAllByRole("listitem").map((item) => item.textContent?.replace(/Move .*$/, ""))

async function openMenu(user: ReturnType<typeof userEvent.setup>, card: string) {
  await user.click(screen.getByRole("button", { name: `Move ${card}` }))
  return screen.findByRole("menu", { name: `Move ${card}` })
}

describe("Kanban semantics", () => {
  it("keeps cards as list items and puts the drag semantics on a named group inside", () => {
    render(<Kanban aria-label="Board" columns={COLUMNS} defaultCards={CARDS} />)
    expect(titles("New")).toEqual(["Alpha", "Bravo"])
    const handle = screen.getByRole("group", { name: "Alpha" })
    expect(handle).toHaveAttribute("aria-roledescription", "draggable")
    expect(handle.closest("li")).not.toBeNull()
    expect(handle.closest("li")).not.toHaveAttribute("role")
    // The Move button is beside the handle, not inside it.
    expect(handle.querySelector("button")).toBeNull()
  })

  it("names a column's count in text for assistive technology, not with an aria-label on a span", () => {
    render(<Kanban aria-label="Board" columns={COLUMNS} defaultCards={CARDS} />)
    const count = screen.getByText("2 / 2").parentElement!
    expect(count).not.toHaveAttribute("aria-label")
    expect(within(count).getByText("2 cards, limit 2")).toBeTruthy()
    expect(screen.getByText("2 / 2")).toHaveAttribute("aria-hidden", "true")
  })
})

describe("Kanban move menu", () => {
  it("moves a card to another column as a drop does, reports input menu and announces it", async () => {
    const user = userEvent.setup()
    const moves: KanbanMove[] = []
    const changed = vi.fn()
    render(<Kanban aria-label="Board" columns={COLUMNS} defaultCards={CARDS} onCardMove={(move) => void moves.push(move)} onCardsChange={changed} />)
    await openMenu(user, "Alpha")
    await user.click(screen.getByRole("menuitem", { name: "Move to Done" }))
    await waitFor(() => expect(titles("Done")).toEqual(["Alpha"]))
    expect(titles("New")).toEqual(["Bravo"])
    expect(moves).toHaveLength(1)
    expect(moves[0]).toMatchObject({ cardId: "a", from: "new", to: "done", fromIndex: 0, index: 0, input: "menu" })
    expect(changed).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Moved Alpha to Done, position 1 of 1.")).toBeTruthy()
  })

  it("moves a card up and down within its column", async () => {
    const user = userEvent.setup()
    render(<Kanban aria-label="Board" columns={COLUMNS} defaultCards={CARDS} />)
    await openMenu(user, "Alpha")
    expect(screen.queryByRole("menuitem", { name: "Move up" })).toBeNull()
    await user.click(screen.getByRole("menuitem", { name: "Move down" }))
    await waitFor(() => expect(titles("New")).toEqual(["Bravo", "Alpha"]))
    expect(screen.getByText("Moved Alpha to New, position 2 of 2.")).toBeTruthy()
    await openMenu(user, "Alpha")
    expect(screen.queryByRole("menuitem", { name: "Move down" })).toBeNull()
    await user.click(screen.getByRole("menuitem", { name: "Move up" }))
    await waitFor(() => expect(titles("New")).toEqual(["Alpha", "Bravo"]))
  })

  it("disables a full column's row with the limit as the reason", async () => {
    const user = userEvent.setup()
    render(<Kanban aria-label="Board" columns={COLUMNS} defaultCards={CARDS} />)
    await openMenu(user, "Alpha")
    const row = screen.getByRole("menuitem", { name: "Move to Triage" })
    expect(row).toHaveAttribute("aria-disabled", "true")
    await user.click(row)
    expect(titles("Triage")).toEqual(["Charlie", "Delta"])
  })

  it("puts the card back when the host rejects the save", async () => {
    const user = userEvent.setup()
    render(<Kanban aria-label="Board" columns={COLUMNS} defaultCards={CARDS} onCardMove={() => Promise.reject(new Error("Only the owner can do that"))} />)
    await openMenu(user, "Alpha")
    await user.click(screen.getByRole("menuitem", { name: "Move to Done" }))
    await waitFor(() => expect(screen.getByText("Only the owner can do that", { selector: "[aria-live]" })).toBeTruthy())
    await waitFor(() => expect(titles("New")).toEqual(["Alpha", "Bravo"]))
    expect(titles("Done")).toEqual([])
  })

  it("can be turned off", () => {
    render(<Kanban aria-label="Board" columns={COLUMNS} defaultCards={CARDS} moveMenu={false} />)
    expect(screen.queryByRole("button", { name: "Move Alpha" })).toBeNull()
  })
})

