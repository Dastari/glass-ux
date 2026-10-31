// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Toolbar } from "./index.js"

afterEach(cleanup)

function Demo({ onSort }: { onSort: () => void }) {
  const [on, setOn] = useState(false)
  return (
    <Toolbar aria-label="Report view">
      <Toolbar.Button label="Filters" pressed={on} onPressedChange={setOn} />
      <Toolbar.Separator />
      <Toolbar.Button label="Sort" onClick={onSort} />
    </Toolbar>
  )
}

describe("Toolbar", () => {
  it("is a named toolbar whose toggles report their pressed state", () => {
    const sort = vi.fn()
    render(<Demo onSort={sort} />)
    expect(screen.getByRole("toolbar", { name: "Report view" })).toBeTruthy()
    const filters = screen.getByRole("button", { name: "Filters" })
    expect(filters.getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(filters)
    expect(filters.getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "Sort" }))
    expect(sort).toHaveBeenCalledOnce()
  })

  it("keeps the More button out of the way while nothing has folded", () => {
    const { container } = render(<Demo onSort={() => {}} />)
    expect(container.querySelector(".fa-toolbar-more")!.hasAttribute("data-idle")).toBe(true)
  })

  it("measures when its items change, not on every render", () => {
    const spy = vi.spyOn(window, "getComputedStyle")
    const measures = () => spy.mock.calls.filter(([element]) => element.classList.contains("fa-toolbar")).length
    const view = (labels: string[]) => (
      <Toolbar aria-label="Report view">
        {labels.map((label) => (
          <Toolbar.Button key={label} label={label} />
        ))}
      </Toolbar>
    )
    const { rerender } = render(view(["Filters", "Sort"]))
    const mounted = measures()
    expect(mounted).toBeGreaterThan(0)
    rerender(view(["Filters", "Sort"]))
    expect(measures()).toBe(mounted)
    rerender(view(["Filters", "Sort", "Group"]))
    expect(measures()).toBeGreaterThan(mounted)
    spy.mockRestore()
  })
})
