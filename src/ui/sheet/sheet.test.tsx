// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { Sheet, type SheetSnapPoint } from "./index.js"

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: !query.includes("<"), addEventListener() {}, removeEventListener() {} }))
})
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())

const POINTS: SheetSnapPoint[] = [0.5, "10rem", 1]

function SnapSheet(props: Partial<Parameters<typeof Sheet.Root>[0]>) {
  return (
    <Sheet.Root side="bottom" defaultOpen snapPoints={POINTS} {...props}>
      <Sheet.Popup>
        <Sheet.Header title="Fleet" />
        <Sheet.Body>
          <button type="button">First</button>
        </Sheet.Body>
      </Sheet.Popup>
    </Sheet.Root>
  )
}

describe("Sheet snap points", () => {
  it("orders the points by height and exposes the handle as a slider", () => {
    render(<SnapSheet snapPointLabels={["Half", "Peek", "Full"]} />)
    const handle = screen.getByRole("slider", { name: "Sheet height" })
    expect(handle).toHaveAttribute("aria-orientation", "vertical")
    expect(handle).toHaveAttribute("aria-valuemin", "1")
    expect(handle).toHaveAttribute("aria-valuemax", "3")
    // The first point given (0.5) is the default; "10rem" is lower on a 768px jsdom viewport.
    expect(handle).toHaveAttribute("aria-valuenow", "2")
    expect(handle).toHaveAttribute("aria-valuetext", "Half")
  })

  it("steps with the arrow keys, Home and End, and reports each change", () => {
    const onSnapPointChange = vi.fn()
    render(<SnapSheet onSnapPointChange={onSnapPointChange} />)
    const handle = screen.getByRole("slider", { name: "Sheet height" })
    expect(handle).toHaveAttribute("aria-valuetext", "Height 2 of 3")
    fireEvent.keyDown(handle, { key: "ArrowUp" })
    expect(onSnapPointChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ reason: "none" }))
    expect(handle).toHaveAttribute("aria-valuenow", "3")
    expect(handle.closest(".fa-dialog")).toHaveAttribute("data-snap-top")
    fireEvent.keyDown(handle, { key: "ArrowUp" })
    expect(onSnapPointChange).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(handle, { key: "Home" })
    expect(onSnapPointChange).toHaveBeenLastCalledWith("10rem", expect.anything())
    expect(handle.closest(".fa-dialog")).not.toHaveAttribute("data-snap-top")
    fireEvent.keyDown(handle, { key: "End" })
    expect(handle).toHaveAttribute("aria-valuenow", "3")
    fireEvent.keyDown(handle, { key: "PageDown" })
    expect(handle).toHaveAttribute("aria-valuenow", "2")
  })

  it("keeps the point when the change is cancelled, and follows a controlled point", () => {
    const { rerender } = render(<SnapSheet onSnapPointChange={(_point, details) => details.cancel()} />)
    const handle = screen.getByRole("slider", { name: "Sheet height" })
    fireEvent.keyDown(handle, { key: "End" })
    expect(handle).toHaveAttribute("aria-valuenow", "2")
    rerender(<SnapSheet snapPoint={1} />)
    expect(screen.getByRole("slider", { name: "Sheet height" })).toHaveAttribute("aria-valuenow", "3")
  })

  it("rests a sheet with one point at that height, with the decorative handle", () => {
    render(<SnapSheet snapPoints={["20rem"]} />)
    expect(screen.queryByRole("slider")).toBeNull()
    expect(document.querySelector(".fa-dialog")).toHaveAttribute("data-snap-points")
    expect(document.querySelector(".fa-dialog")).toHaveAttribute("data-snap-top")
  })

  it("keeps the decorative handle without snap points, and ignores them on side sheets", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    render(
      <>
        <Sheet.Root side="bottom" defaultOpen>
          <Sheet.Popup aria-label="Plain" />
        </Sheet.Root>
        <Sheet.Root side="right" defaultOpen snapPoints={POINTS}>
          <Sheet.Popup aria-label="Side" />
        </Sheet.Root>
      </>
    )
    expect(screen.queryByRole("slider")).toBeNull()
    expect(document.querySelectorAll(".fa-dialog-handle[aria-hidden]")).toHaveLength(1)
    expect(document.querySelector("[data-snap-points]")).toBeNull()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("bottom sheets only"))
    warn.mockRestore()
  })
})

describe("Sheet modality and nesting", () => {
  it("draws no scrim and lets the page take pointer input when non-modal", () => {
    render(
      <Sheet.Root defaultOpen modal={false}>
        <Sheet.Popup aria-label="Inspector" />
      </Sheet.Root>
    )
    expect(document.querySelector(".fa-scrim")).toBeNull()
    expect(document.querySelector(".fa-dialog-side-viewport")).toHaveAttribute("data-modal", "false")
  })

  it("stacks a nested sheet on its parent's scrim", async () => {
    render(
      <Sheet.Root defaultOpen>
        <Sheet.Popup aria-label="Parent">
          <Sheet.Root defaultOpen>
            <Sheet.Popup aria-label="Child" />
          </Sheet.Root>
        </Sheet.Popup>
      </Sheet.Root>
    )
    await act(async () => {})
    // The parent is hidden from the accessibility tree behind the modal child.
    expect(document.querySelectorAll("[role=dialog][data-open]")).toHaveLength(2)
    expect(document.querySelectorAll(".fa-scrim")).toHaveLength(1)
  })
})
