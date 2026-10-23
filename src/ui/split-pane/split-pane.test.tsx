// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { StorageScopeContext } from "../../lib/storage-scope.js"
import { SplitPane, splitPaneStorageKey } from "./split-pane.js"

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("SplitPane", () => {
  it("is a separator between two named regions", () => {
    const view = render(<SplitPane start="Tree" end="Table" startLabel="Folders" endLabel="Values" />)
    expect(view.getByRole("separator", { name: "Resize Folders" })).toHaveAttribute("aria-orientation", "vertical")
    expect(view.getByRole("region", { name: "Folders" })).toHaveTextContent("Tree")
    expect(view.getByRole("region", { name: "Values" })).toHaveTextContent("Table")
  })

  it("remembers per window kind inside a window body, and nothing elsewhere", () => {
    const inWindow = render(
      <StorageScopeContext.Provider value="window:registry">
        <SplitPane start="Tree" end="Table" startLabel="Keys" />
      </StorageScopeContext.Provider>
    )
    fireEvent.keyDown(inWindow.getByRole("separator"), { key: "Enter" })
    expect(JSON.parse(localStorage.getItem(splitPaneStorageKey("registry"))!)).toMatchObject({ collapsed: true })
    expect(inWindow.getByRole("button", { name: "Show Keys" })).toBeInTheDocument()
    inWindow.unmount()
    localStorage.clear()
    const outside = render(<SplitPane start="Tree" end="Table" startLabel="Keys" />)
    fireEvent.keyDown(outside.getByRole("separator"), { key: "Enter" })
    expect(localStorage.length).toBe(0)
  })

  it("restores a remembered hidden pane, and a storageKey overrides the window kind", () => {
    localStorage.setItem("app.split", JSON.stringify({ collapsed: true }))
    const view = render(
      <StorageScopeContext.Provider value="window:registry">
        <SplitPane start="Tree" end="Table" startLabel="Keys" storageKey="app.split" />
      </StorageScopeContext.Provider>
    )
    expect(view.queryByRole("separator")).toBeNull()
    fireEvent.click(view.getByRole("button", { name: "Show Keys" }))
    expect(view.getByRole("separator")).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem("app.split")!)).toMatchObject({ collapsed: false })
  })
})
