// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Stepper, stepStatuses, Wizard } from "./index.js"

afterEach(cleanup)

const STEPS = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Bravo" },
  { id: "c", label: "Charlie" },
]

describe("Stepper", () => {
  it("derives statuses from the current step and keeps explicit ones", () => {
    expect(stepStatuses(STEPS, "b")).toEqual(["complete", "current", "upcoming"])
    expect(stepStatuses([{ ...STEPS[0]!, status: "error" }, ...STEPS.slice(1)], "b")).toEqual(["error", "current", "upcoming"])
  })

  it("marks the current step and lets visited steps be chosen", () => {
    const change = vi.fn()
    render(<Stepper steps={STEPS} value="b" navigation="visited" onValueChange={change} />)
    expect(screen.getByText("Bravo", { selector: ".fa-stepper-label" }).closest("li")!.getAttribute("aria-current")).toBe("step")
    fireEvent.click(screen.getByRole("button", { name: /Alpha/ }))
    expect(change).toHaveBeenCalledWith("a")
    expect(screen.queryByRole("button", { name: /Charlie/ })).toBeNull()
  })
})

describe("Wizard", () => {
  it("stays on a step that fails its check, then moves, skips, goes back and finishes", async () => {
    let ready = false
    const finish = vi.fn(() => Promise.resolve())
    render(
      <Wizard
        steps={[
          { id: "a", label: "Alpha", content: <p>First</p>, validate: () => (ready ? true : "Fill in Alpha.") },
          { id: "b", label: "Bravo", optional: true, content: <p>Second</p> },
          { id: "c", label: "Charlie", content: <p>Third</p>, validate: async () => true },
        ]}
        onFinish={finish}
      />,
    )
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Next" })))
    expect(screen.getByRole("alert").textContent).toBe("Fill in Alpha.")
    expect(screen.getByText("First").closest("[hidden]")).toBeNull()

    ready = true
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Next" })))
    expect(screen.getByRole("alert").textContent).toBe("")
    expect(screen.getByText("Second").closest("[hidden]")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Skip" }))
    expect(screen.getByText("Third").closest("[hidden]")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(screen.getByText("Second").closest("[hidden]")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Skip" }))

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Finish/ })))
    expect(finish).toHaveBeenCalledOnce()
  })
})
