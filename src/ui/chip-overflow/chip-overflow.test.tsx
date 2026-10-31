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
