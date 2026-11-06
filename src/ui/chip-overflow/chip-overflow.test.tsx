// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { ChipOverflow } from "./chip-overflow.js"

const items = [
  { id: "1", label: "Alpha", content: <span>Alpha</span> },
  { id: "2", label: "Beta", content: <span>Beta</span> },
  { id: "3", label: "Müller", content: <span>Müller chip</span> },
  { id: "4", label: "Moller", content: <span>Moller chip</span> },
]

afterEach(cleanup)

describe("ChipOverflow search", () => {
  it("finds an accented label from the plain spelling", async () => {
    const user = userEvent.setup()
    render(<ChipOverflow items={items} limit={2} label="Owners" />)
    await user.click(screen.getByRole("button"))
    await user.type(screen.getByRole("searchbox"), "muller")
    expect(screen.getByText("Müller chip")).toBeTruthy()
    expect(screen.queryByText("Moller chip")).toBeNull()
  })
})

describe("ChipOverflow on one line", () => {
  it("wraps by default, with its chips left as they are", () => {
    const { container } = render(<ChipOverflow items={items} limit={2} label="Owners" />)
    const root = container.querySelector(".fa-chip-overflow")!
    expect(root.hasAttribute("data-nowrap")).toBe(false)
    expect(container.querySelector(".fa-chip-overflow-item")).toBeNull()
  })

  it("marks the root and keeps the +N trigger and its popover with wrap={false}", async () => {
    const user = userEvent.setup()
    const { container } = render(<ChipOverflow items={items} limit={2} label="Owners" wrap={false} />)
    expect(container.querySelector(".fa-chip-overflow")!.hasAttribute("data-nowrap")).toBe(true)
    expect(container.querySelectorAll(".fa-chip-overflow-item")).toHaveLength(2)
    const more = screen.getByRole("button", { name: "2 more Owners" })
    expect(more.textContent).toBe("+2")
    await user.click(more)
    await user.type(screen.getByRole("searchbox"), "muller")
    expect(screen.getByText("Müller chip")).toBeTruthy()
  })

  it("has no trigger when every chip is shown", () => {
    render(<ChipOverflow items={items.slice(0, 2)} limit={2} label="Owners" wrap={false} />)
    expect(screen.queryByRole("button")).toBeNull()
  })
})
