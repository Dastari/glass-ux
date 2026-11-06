// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const toast = vi.hoisted(() => vi.fn())
vi.mock("../toast/toast.js", () => ({ toast }))

import { AlertDialog, ConfirmHost, confirm } from "./alert-dialog.js"

// Its accessible name includes the reserved feedback labels, which only CSS hides.
const confirmButton = () => screen.getByRole("button", { name: /^Delete workspace/ })

function open(onConfirm: () => unknown, onOpenChange?: (open: boolean) => void) {
  render(
    <AlertDialog defaultOpen title="Delete Orbit Workspace?" confirmLabel="Delete workspace" onConfirm={onConfirm} onOpenChange={onOpenChange}>
      <input aria-label="Workspace name" />
    </AlertDialog>
  )
}

/** Long enough for a success beat to have closed the dialog, had there been one. */
const beat = () => new Promise((resolve) => setTimeout(resolve, 520))

beforeEach(() => toast.mockClear())
afterEach(cleanup)

describe("AlertDialog onConfirm", () => {
  it("stays open at rest when it resolves to false, with no toast, shake or success", async () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn(async () => false)
    open(onConfirm, onOpenChange)
    fireEvent.click(confirmButton())
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce())
    await waitFor(() => expect(confirmButton().getAttribute("data-status")).toBe("idle"))
    await beat()
    expect(confirmButton().getAttribute("data-status")).toBe("idle")
    expect(screen.getByRole("alertdialog")).toBeTruthy()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()
  })

  it("refuses on a synchronous false too, and a later press can succeed", async () => {
    const onOpenChange = vi.fn()
    let allow = false
    open(() => (allow ? undefined : false), onOpenChange)
    fireEvent.click(confirmButton())
    await waitFor(() => expect(confirmButton().getAttribute("data-status")).toBe("idle"))
    allow = true
    fireEvent.click(confirmButton())
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 1500 })
    expect(toast).not.toHaveBeenCalled()
  })

  it("treats only exactly false as a refusal", async () => {
    const onOpenChange = vi.fn()
    open(async () => 0, onOpenChange)
    fireEvent.click(confirmButton())
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 1500 })
  })

  it("still sends a throw to a toast and keeps the dialog open", async () => {
    const onOpenChange = vi.fn()
    open(async () => {
      throw new Error("Agent offline")
    }, onOpenChange)
    fireEvent.click(confirmButton())
    await waitFor(() => expect(toast).toHaveBeenCalledOnce())
    expect(toast.mock.calls[0]![0]).toMatchObject({ tone: "danger", description: "Agent offline" })
    expect(confirmButton().getAttribute("data-status")).toBe("error")
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("draws its children in the dialog", () => {
    open(() => undefined)
    expect(screen.getByRole("textbox", { name: "Workspace name" })).toBeTruthy()
  })
})

describe("confirm()", () => {
  it("leaves the promise waiting on a refusal and resolves when a later press succeeds", async () => {
    render(<ConfirmHost />)
    let allow = false
    const settled = vi.fn()
    void confirm({ title: "Delete Orbit Workspace?", confirmLabel: "Delete workspace", onConfirm: () => (allow ? undefined : false) }).then(settled)
    fireEvent.click(await screen.findByRole("button", { name: /^Delete workspace/ }))
    await waitFor(() => expect(confirmButton().getAttribute("data-status")).toBe("idle"))
    await beat()
    expect(settled).not.toHaveBeenCalled()
    allow = true
    fireEvent.click(confirmButton())
    await waitFor(() => expect(settled).toHaveBeenCalledWith(true), { timeout: 1500 })
  })
})
