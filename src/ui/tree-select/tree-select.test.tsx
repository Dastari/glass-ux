// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Field } from "../field/index.js"
import type { TreeNode } from "../tree/index.js"
import { TreeSelect } from "./tree-select.js"

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(200)
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800)
  HTMLElement.prototype.scrollTo = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const NODES: TreeNode[] = [
  {
    id: "ops",
    label: "Operations",
    children: [
      { id: "north", label: "North depot" },
      { id: "south", label: "South depot" },
    ],
  },
  { id: "lab", label: "Research lab" },
]

const row = (id: string) => document.querySelector<HTMLElement>(`[data-row-id="${id}"]`)!

describe("TreeSelect", () => {
  it("takes its name from a Field label and shows the chosen node", async () => {
    render(
      <Field label="Team" nativeLabel={false} hint="Where the asset is assigned">
        <TreeSelect nodes={NODES} defaultValue="north" />
      </Field>,
    )
    const trigger = screen.getByRole("combobox", { name: /Team/ })
    expect(trigger.getAttribute("aria-labelledby")?.split(" ")).toHaveLength(2)
    expect(trigger).toHaveTextContent("North depot")
    expect(trigger.getAttribute("aria-describedby")).toBeTruthy()
  })

  it("picks one node and closes", async () => {
    const onValueChange = vi.fn()
    render(<TreeSelect nodes={NODES} aria-label="Team" onValueChange={onValueChange} defaultExpanded={["ops"]} />)
    await act(async () => fireEvent.click(screen.getByRole("combobox", { name: /^Team / })))
    expect(screen.getByRole("tree")).toBeInTheDocument()
    await act(async () => fireEvent.click(row("south")))
    expect(onValueChange).toHaveBeenCalledWith("south")
    expect(screen.getByRole("combobox", { name: /^Team / })).toHaveTextContent("South depot")
  })

  it("checks a branch with multiple and reports it in parent form", async () => {
    const onValueChange = vi.fn()
    render(<TreeSelect multiple nodes={NODES} aria-label="Teams" onValueChange={onValueChange} defaultExpanded={["ops"]} />)
    await act(async () => fireEvent.click(screen.getByRole("combobox", { name: /^Teams / })))
    await act(async () => fireEvent.click(row("north")))
    expect(onValueChange).toHaveBeenLastCalledWith(["north"])
    expect(row("ops")).toHaveAttribute("aria-checked", "mixed")
    await act(async () => fireEvent.click(row("south")))
    expect(onValueChange).toHaveBeenLastCalledWith(["ops"])
    expect(row("ops")).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("tree")).toHaveAttribute("aria-multiselectable", "true")
  })

  it("search keeps ancestors of matches and highlights them", async () => {
    render(<TreeSelect nodes={NODES} aria-label="Team" />)
    await act(async () => fireEvent.click(screen.getByRole("combobox", { name: /^Team / })))
    await act(async () => fireEvent.change(screen.getByRole("searchbox"), { target: { value: "south" } }))
    expect(row("ops")).toBeTruthy()
    expect(row("south").querySelector("mark")?.textContent).toBe("South")
    expect(document.querySelector('[data-row-id="north"]')).toBeNull()
    expect(document.querySelector('[data-row-id="lab"]')).toBeNull()
  })

  it("Backspace on the trigger removes the last chosen node", async () => {
    const onValueChange = vi.fn()
    render(<TreeSelect multiple nodes={NODES} aria-label="Teams" defaultValue={["lab", "north"]} onValueChange={onValueChange} />)
    fireEvent.keyDown(screen.getByRole("combobox", { name: /^Teams / }), { key: "Backspace" })
    expect(onValueChange).toHaveBeenCalledWith(["lab"])
  })
})
