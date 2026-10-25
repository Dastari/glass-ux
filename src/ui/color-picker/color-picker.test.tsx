// @vitest-environment jsdom
// tokens:allow-file colour values under test
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { ColorField, ColorPicker } from "./index.js"
import { clampToGamut, formatHex, inGamut, maxChroma, parseHex } from "./color.js"

beforeAll(() => {
  // jsdom has no canvas; the area paints nothing there.
  HTMLCanvasElement.prototype.getContext = (() => null) as never
})
afterEach(cleanup)

describe("colour maths", () => {
  it("round-trips hex through OKLCH", () => {
    for (const hex of ["#000000", "#ffffff", "#1f6feb", "#e8710a", "#0f9d58", "#80808080"]) {
      const parsed = parseHex(hex)!
      expect(formatHex(parsed, true)).toBe(hex)
    }
    expect(parseHex("#abc")).toEqual(parseHex("#aabbcc"))
    expect(parseHex("nope")).toBeNull()
  })

  it("finds the gamut's edge and clamps to it", () => {
    const edge = maxChroma(0.6, 250)
    expect(inGamut(0.6, edge, 250)).toBe(true)
    expect(inGamut(0.6, edge + 0.01, 250)).toBe(false)
    expect(clampToGamut({ l: 0.6, c: 0.4, h: 250, a: 1 }).c).toBeCloseTo(edge, 4)
  })
})

describe("ColorPicker", () => {
  it("moves lightness and chroma with the keyboard and commits", () => {
    const change = vi.fn()
    const commit = vi.fn()
    render(<ColorPicker defaultValue="#808080" onValueChange={change} onValueCommit={commit} />)
    const area = screen.getByRole("slider", { name: "Lightness and chroma" })
    const before = Number(area.getAttribute("aria-valuenow"))
    fireEvent.keyDown(area, { key: "ArrowUp", shiftKey: true })
    expect(Number(area.getAttribute("aria-valuenow"))).toBe(before + 10)
    fireEvent.keyDown(area, { key: "End" })
    const last = change.mock.calls.at(-1)![0] as string
    expect(parseHex(last)!.c).toBeGreaterThan(0.05)
    expect(commit).toHaveBeenCalled()
  })

  it("commits a typed hex value and ignores text that is not a colour", () => {
    const change = vi.fn()
    render(<ColorPicker defaultValue="#1f6feb" onValueChange={change} />)
    const hex = screen.getByRole("textbox", { name: "Hex colour" })
    fireEvent.change(hex, { target: { value: "zz" } })
    fireEvent.keyDown(hex, { key: "Enter" })
    expect(change).not.toHaveBeenCalled()
    expect((hex as HTMLInputElement).value).toBe("#1f6feb")
    fireEvent.change(hex, { target: { value: "e8710a" } })
    fireEvent.keyDown(hex, { key: "Enter" })
    expect(change).toHaveBeenLastCalledWith("#e8710a")
  })

  it("chooses a swatch and marks it pressed", () => {
    const change = vi.fn()
    render(<ColorPicker defaultValue="#1f6feb" swatches={[{ value: "#0f9d58", label: "Fern" }]} onValueChange={change} />)
    const fern = screen.getByRole("button", { name: "Fern" })
    fireEvent.click(fern)
    expect(change).toHaveBeenLastCalledWith("#0f9d58")
    expect(fern.getAttribute("aria-pressed")).toBe("true")
  })
})

describe("ColorField", () => {
  it("types a colour, clears it, and submits it with a form", () => {
    const change = vi.fn()
    const { container } = render(
      <form>
        <ColorField aria-label="Tag colour" name="tag" defaultValue="#1f6feb" clearable onValueChange={change} />
      </form>,
    )
    const input = screen.getByRole("textbox", { name: "Tag colour" })
    fireEvent.change(input, { target: { value: "#0F9D58" } })
    fireEvent.blur(input)
    expect(change).toHaveBeenLastCalledWith("#0f9d58")
    expect(container.querySelector<HTMLInputElement>('input[name="tag"]')!.value).toBe("#0f9d58")
    fireEvent.change(input, { target: { value: "" } })
    fireEvent.blur(input)
    expect(change).toHaveBeenLastCalledWith(null)
  })
})
