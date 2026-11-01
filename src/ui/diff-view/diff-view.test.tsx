// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import { DiffView, diffText, type DiffLine } from "./index.js"

const lines: DiffLine[] = [
  { type: "context", text: "keep" },
  { type: "remove", text: "old" },
  { type: "add", text: "new" },
  { type: "context", text: "" },
]

afterEach(cleanup)

const numbers = (row: HTMLElement) => [...row.querySelectorAll(".fa-diff-number")].map((cell) => cell.textContent)

describe("DiffView", () => {
  it("names the region with the counts and the table with the label", () => {
    render(<DiffView label="storage.conf" lines={lines} />)
    const region = screen.getByRole("region", { name: "storage.conf: 1 added, 1 removed" })
    expect(region.tabIndex).toBe(0)
    expect(within(region).getByRole("table", { name: "storage.conf" })).toBeTruthy()
    expect(within(region).getAllByRole("row")).toHaveLength(4)
  })

  it("takes its own summary and sign names", () => {
    render(<DiffView label="a" lines={lines} summary="Change to a" addedLabel="Inserted" removedLabel="Deleted" />)
    expect(screen.getByRole("region", { name: "Change to a" })).toBeTruthy()
    expect(screen.getByRole("cell", { name: "Inserted" }).textContent).toBe("+")
    expect(screen.getByRole("cell", { name: "Deleted" }).textContent).toBe("−")
  })

  it("marks each line and keeps the sign readable without colour", () => {
    render(<DiffView label="a" lines={lines} />)
    const rows = screen.getAllByRole("row")
    expect(rows.map((row) => row.getAttribute("data-type"))).toEqual(["context", "remove", "add", "context"])
    expect(screen.getByRole("cell", { name: "Added" }).textContent).toBe("+")
    expect(screen.getByRole("cell", { name: "Removed" }).textContent).toBe("−")
  })

  it("counts each side from 1, leaving the other side blank", () => {
    render(<DiffView label="a" lines={lines} />)
    expect(screen.getAllByRole("row").map(numbers)).toEqual([
      ["1", "1"],
      ["2", ""],
      ["", "2"],
      ["3", "3"],
    ])
  })

  it("counts on from a hunk's numbers", () => {
    render(<DiffView label="a" lines={[{ type: "context", text: "a", before: 41, after: 44 }, { type: "remove", text: "b" }, { type: "add", text: "c" }]} />)
    expect(screen.getAllByRole("row").map(numbers)).toEqual([
      ["41", "44"],
      ["42", ""],
      ["", "45"],
    ])
  })

  it("keeps an empty line's height", () => {
    render(<DiffView label="a" lines={[{ type: "context", text: "" }]} />)
    expect(document.querySelector(".fa-diff-text")?.textContent).not.toBe("")
  })

  it("passes attributes through and keeps its class", () => {
    render(<DiffView label="a" lines={lines} dir="ltr" className="extra" data-testid="diff" />)
    const root = screen.getByTestId("diff")
    expect(root.getAttribute("dir")).toBe("ltr")
    expect(root.className).toBe("fa-diff extra")
  })

  it("copies as plain text with ASCII signs", () => {
    expect(diffText(lines)).toBe("  keep\n- old\n+ new\n  ")
  })
})
