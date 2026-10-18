// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ChartLegend } from "./legend.js"

afterEach(cleanup)

const items = [
  { key: "a", label: "North" },
  { key: "b", label: "South" },
  { key: "c", label: "West" },
]

describe("ChartLegend", () => {
  it("moves the roving tab stop with the arrow keys and emphasises the focused series", () => {
    const onActive = vi.fn()
    const { rerender } = render(<ChartLegend items={items} onToggle={() => {}} onActive={onActive} />)
    const [north, south] = screen.getAllByRole("button")
    expect(north).toHaveAttribute("tabindex", "0")
    north!.focus()
    expect(onActive).toHaveBeenLastCalledWith("a")
    fireEvent.keyDown(north!, { key: "ArrowRight" })
    expect(document.activeElement).toBe(south)
    expect(onActive).toHaveBeenLastCalledWith("b")
    expect(south).toHaveAttribute("tabindex", "0")
    expect(north).toHaveAttribute("tabindex", "-1")
    // A re-render keeps the tab stop on the last focused item.
    rerender(<ChartLegend items={items} onToggle={() => {}} onActive={onActive} active="b" />)
    expect(screen.getAllByRole("button")[1]).toHaveAttribute("tabindex", "0")
    fireEvent.blur(south!)
    expect(onActive).toHaveBeenLastCalledWith(null)
  })

  it("explains why the last visible series cannot be hidden", () => {
    const onToggle = vi.fn()
    render(<ChartLegend items={items} hidden={new Set(["b", "c"])} onToggle={onToggle} />)
    const north = screen.getByRole("button", { name: "North" })
    expect(north).toHaveAttribute("aria-disabled", "true")
    expect(north).toHaveAccessibleDescription("At least one series stays visible")
    fireEvent.click(north)
    expect(onToggle).not.toHaveBeenCalled()
  })
})
