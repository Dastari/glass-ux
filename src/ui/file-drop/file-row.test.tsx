// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { FileDrop, FileList, FileRow, type FileStatus } from "./file-drop.js"

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Files({ initial }: { initial: string[] }) {
  const [names, setNames] = useState(initial)
  return (
    <div>
      <FileDrop aria-label="Add files" onFiles={() => {}} />
      <FileList>
        {names.map((name) => (
          <FileRow key={name} name={name} size={1024} onRemove={() => setNames((list) => list.filter((n) => n !== name))} />
        ))}
      </FileList>
    </div>
  )
}

describe("FileRow removal focus", () => {
  it("moves focus to the next row, then the previous row, then the drop zone", () => {
    render(<Files initial={["alpha.csv", "beta.csv", "gamma.csv"]} />)
    const removeBeta = screen.getByRole("button", { name: "Remove beta.csv" })
    removeBeta.focus()
    fireEvent.click(removeBeta)
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove gamma.csv" }))

    fireEvent.click(screen.getByRole("button", { name: "Remove gamma.csv" }))
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove alpha.csv" }))

    fireEvent.click(screen.getByRole("button", { name: "Remove alpha.csv" }))
    expect(document.activeElement).toBe(screen.getByLabelText("Add files"))
  })
})

describe("FileRow upload announcement", () => {
  it("keeps a polite live region mounted and announces completion and failure", () => {
    const row = (status: FileStatus, error?: string) => (
      <FileList>
        <FileRow name="report.pdf" size={2048} status={status} progress={40} error={error} />
      </FileList>
    )
    const { container, rerender } = render(row("uploading"))
    const region = container.querySelector("[aria-live='polite']")
    expect(region).toHaveTextContent("")
    rerender(row("done"))
    expect(container.querySelector("[aria-live='polite']")).toBe(region)
    expect(region).toHaveTextContent("report.pdf uploaded")
    rerender(row("uploading"))
    rerender(row("error", "Storage is full"))
    expect(region).toHaveTextContent("report.pdf failed: Storage is full")
  })

  it("does not announce rows that mount already uploaded", () => {
    const { container } = render(
      <FileList>
        <FileRow name="report.pdf" size={2048} />
      </FileList>
    )
    expect(container.querySelector("[aria-live='polite']")).toHaveTextContent("")
  })
})
