// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { DragDropProvider, DragHandle, Draggable, DropZone, applyDrop, type DragEndEvent, type DropEvent, type DropVerdict } from "./index.js"

afterEach(cleanup)

interface Card {
  id: string
  title: string
  kind: "task" | "note"
}

const START: Record<string, Card[]> = {
  todo: [
    { id: "a", title: "Alpha", kind: "task" },
    { id: "b", title: "Bravo", kind: "task" },
  ],
  done: [{ id: "c", title: "Charlie", kind: "task" }],
  notes: [],
}

function Board({ onDrop, onDragEnd, validate }: { onDrop?: (event: DropEvent) => void; onDragEnd?: (event: DragEndEvent) => void; validate?: () => DropVerdict }) {
  const [lists, setLists] = useState(START)
  const drop = (event: DropEvent) => {
    onDrop?.(event)
    setLists((current) => applyDrop(current, event, (card) => card.id))
  }
  return (
    <DragDropProvider onDragEnd={onDragEnd}>
      {(["todo", "done", "notes"] as const).map((zone) => (
        <DropZone key={zone} id={zone} label={zone} sort="vertical" accept={zone === "notes" ? "note" : "task"} validate={zone === "done" ? validate : undefined} onDrop={drop} render={<ul />} data-testid={zone}>
          {lists[zone]?.map((card) => (
            <Draggable key={card.id} id={card.id} type={card.kind} data={card} label={card.title} render={<li />}>
              {card.title}
            </Draggable>
          ))}
        </DropZone>
      ))}
    </DragDropProvider>
  )
}

const items = (zone: string) => [...screen.getByTestId(zone).querySelectorAll("li")].map((li) => li.textContent)
const key = (element: Element, value: string) => act(() => void fireEvent.keyDown(element, { key: value }))

describe("keyboard drag and drop", () => {
  it("lifts, moves and drops within a list", async () => {
    const onDrop = vi.fn()
    render(<Board onDrop={onDrop} />)
    const alpha = screen.getByRole("button", { name: "Alpha" })
    expect(alpha).toHaveAttribute("aria-roledescription", "draggable")
    alpha.focus()
    key(alpha, " ")
    expect(alpha).toHaveAttribute("data-dnd-source", "move")
    key(alpha, "ArrowDown")
    key(alpha, " ")
    await waitFor(() => expect(items("todo")).toEqual(["Bravo", "Alpha"]))
    expect(onDrop.mock.calls[0]?.[0]).toMatchObject({ item: { id: "a", type: "task", label: "Alpha" }, source: { zoneId: "todo", index: 0 }, target: { zoneId: "todo", index: 1 }, input: "keyboard" })
    expect(document.activeElement?.textContent).toBe("Alpha")
  })

  it("moves to the next zone that takes the type, keeping its row and skipping filtered zones", async () => {
    const onDragEnd = vi.fn()
    render(<Board onDragEnd={onDragEnd} />)
    const bravo = screen.getByRole("button", { name: "Bravo" })
    bravo.focus()
    key(bravo, "Enter")
    // Filtered by type: disabled for the whole drag; the others are ready.
    expect(screen.getByTestId("notes")).toHaveAttribute("data-drop-state", "disabled")
    expect(screen.getByTestId("done")).toHaveAttribute("data-drop-state", "ready")
    key(bravo, "ArrowRight")
    expect(screen.getByTestId("done")).toHaveAttribute("data-drop-over")
    key(bravo, "ArrowRight")
    // There is no further zone that takes a task: it stays over Done.
    expect(screen.getByTestId("done")).toHaveAttribute("data-drop-over")
    key(bravo, "Enter")
    await waitFor(() => expect(items("done")).toEqual(["Charlie", "Bravo"]))
    expect(items("todo")).toEqual(["Alpha"])
    expect(onDragEnd.mock.calls[0]?.[0]).toMatchObject({ outcome: "dropped", target: { zoneId: "done", index: 1 } })
    expect(screen.getByTestId("done")).toHaveAttribute("data-drop-state", "idle")
  })

  it("refuses a drop on a zone in error, says why and cancels with Escape", async () => {
    const onDrop = vi.fn()
    const onDragEnd = vi.fn()
    render(<Board onDrop={onDrop} onDragEnd={onDragEnd} validate={() => ({ status: "error", reason: "Done is full" })} />)
    const alpha = screen.getByRole("button", { name: "Alpha" })
    alpha.focus()
    key(alpha, " ")
    const done = screen.getByTestId("done")
    expect(done).toHaveAttribute("data-drop-state", "error")
    key(alpha, "ArrowRight")
    expect(done).toHaveAttribute("data-drop-reason", "Done is full")
    key(alpha, " ")
    expect(onDrop).not.toHaveBeenCalled()
    expect(document.querySelector(".fa-dnd-announcer")?.textContent).toContain("Done is full")
    key(alpha, "Escape")
    await waitFor(() => expect(onDragEnd).toHaveBeenCalled())
    expect(onDragEnd.mock.calls[0]?.[0]).toMatchObject({ outcome: "cancelled", reason: "escape" })
    expect(items("todo")).toEqual(["Alpha", "Bravo"])
    expect(alpha).not.toHaveAttribute("data-dnd-source")
  })

  it("lifts only from the handle when the item has one", () => {
    render(
      <DragDropProvider>
        <DropZone id="z" label="Zone">
          <Draggable id="x" label="Report">
            <DragHandle />
            <button type="button">Open</button>
          </Draggable>
        </DropZone>
      </DragDropProvider>
    )
    const handle = screen.getByRole("button", { name: "Move Report" })
    expect(handle).toHaveAttribute("aria-roledescription", "draggable")
    expect(handle.closest("[data-dnd-item]")).not.toHaveAttribute("tabindex")
    const open = screen.getByRole("button", { name: "Open" })
    key(open, " ")
    expect(handle.closest("[data-dnd-item]")).not.toHaveAttribute("data-dnd-source")
    handle.focus()
    key(handle, " ")
    expect(handle.closest("[data-dnd-item]")).toHaveAttribute("data-dnd-source", "move")
    key(handle, "Escape")
  })

  it("lifts only with the keys liftKeys names, and keeps the prop off the element", () => {
    render(
      <DragDropProvider>
        <DropZone id="z" label="Zone">
          <Draggable id="x" label="Report" liftKeys={[" "]}>
            Report
          </Draggable>
        </DropZone>
      </DragDropProvider>
    )
    const item = screen.getByRole("button", { name: "Report" })
    expect(item).not.toHaveAttribute("liftkeys")
    key(item, "Enter")
    expect(item).not.toHaveAttribute("data-dnd-source")
    key(item, " ")
    expect(item).toHaveAttribute("data-dnd-source", "move")
    key(item, "Escape")
  })

  it("does not lift a disabled item and says why", () => {
    render(
      <DragDropProvider>
        <Draggable id="x" label="Locked" disabled="Archived items cannot move">
          Locked
        </Draggable>
      </DragDropProvider>
    )
    const item = screen.getByRole("button", { name: "Locked" })
    expect(item).toHaveAttribute("aria-disabled", "true")
    expect(item).toHaveAttribute("aria-description", "Archived items cannot move")
    key(item, " ")
    expect(item).not.toHaveAttribute("data-dnd-source")
  })
})
