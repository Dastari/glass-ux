// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TransferList } from "./transfer-list.js"
import type { TransferItem } from "./transfer.js"

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400)
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800)
  HTMLElement.prototype.scrollTo = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const ITEMS: TransferItem[] = [
  { value: "a", label: "View assets" },
  { value: "b", label: "Edit assets" },
  { value: "c", label: "Audit log", disabled: true, disabledReason: "Owner only" },
]

describe("TransferList", () => {
  it("moves the selected items and reports the assigned values", async () => {
    const onValueChange = vi.fn()
    render(<TransferList items={ITEMS} onValueChange={onValueChange} />)
    const available = screen.getByRole("listbox", { name: "Available" })
    const move = screen.getByRole("button", { name: "Move selected to Assigned" })
    expect(move).toHaveAttribute("aria-disabled", "true")
    await act(async () => fireEvent.click(within(available).getByRole("option", { name: /Edit assets/ })))
    expect(within(available).getByRole("option", { name: /Edit assets/ })).toHaveAttribute("aria-selected", "true")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Move selected to Assigned" })))
    expect(onValueChange).toHaveBeenLastCalledWith(["b"])
    expect(within(screen.getByRole("listbox", { name: "Assigned" })).getByRole("option", { name: /Edit assets/ })).toBeTruthy()
  })

  it("leaves disabled items where they are and says why", async () => {
    const onValueChange = vi.fn()
    render(<TransferList items={ITEMS} onValueChange={onValueChange} />)
    const audit = screen.getByRole("option", { name: /Audit log/ })
    expect(audit).toHaveAttribute("aria-description", "Owner only")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Move all to Assigned" })))
    expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"])
  })

  it("Enter moves the focused item when nothing is selected", async () => {
    const onValueChange = vi.fn()
    render(<TransferList items={ITEMS} defaultValue={["a"]} onValueChange={onValueChange} />)
    const assigned = screen.getByRole("listbox", { name: "Assigned" })
    const row = within(assigned).getByRole("option", { name: /View assets/ })
    await act(async () => fireEvent.focus(row))
    await act(async () => fireEvent.keyDown(assigned, { key: "Enter" }))
    expect(onValueChange).toHaveBeenLastCalledWith([])
  })
})
