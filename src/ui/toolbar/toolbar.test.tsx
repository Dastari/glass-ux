// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
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

describe("vertical toolbar", () => {
  it("is a vertical toolbar (the arrow keys are checked in e2e/toolbar-vertical.spec.ts)", () => {
    render(
      <Toolbar aria-label="Tools" orientation="vertical">
        <Toolbar.Button label="Move" />
        <Toolbar.Button label="Crop" />
      </Toolbar>,
    )
    const bar = screen.getByRole("toolbar", { name: "Tools" })
    expect(bar.getAttribute("aria-orientation")).toBe("vertical")
    expect(bar.getAttribute("data-orientation")).toBe("vertical")
  })

  it("keeps a horizontal toolbar horizontal by default", () => {
    render(<Toolbar aria-label="Row"><Toolbar.Button label="A" /></Toolbar>)
    expect(screen.getByRole("toolbar").getAttribute("data-orientation")).toBe("horizontal")
  })
})

describe("single-choice group", () => {
  function Tools({ onChange }: { onChange?: (value: string) => void }) {
    return (
      <Toolbar aria-label="Tools" orientation="vertical">
        <Toolbar.Group aria-label="Tool" defaultValue="move" onValueChange={onChange}>
          <Toolbar.Button value="move" label="Move" />
          <Toolbar.Button value="brush" label="Brush" />
          <Toolbar.Button value="crop" label="Crop" />
        </Toolbar.Group>
      </Toolbar>
    )
  }

  it("is a radiogroup with exactly one radio checked", () => {
    render(<Tools />)
    expect(screen.getByRole("radiogroup", { name: "Tool" })).toBeTruthy()
    const radios = screen.getAllByRole("radio")
    expect(radios.map((radio) => radio.getAttribute("aria-checked"))).toEqual(["true", "false", "false"])
  })

  it("chooses a tool on press and never unchooses the chosen one", () => {
    const change = vi.fn()
    render(<Tools onChange={change} />)
    fireEvent.click(screen.getByRole("radio", { name: "Brush" }))
    expect(screen.getByRole("radio", { name: "Brush" }).getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("radio", { name: "Move" }).getAttribute("aria-checked")).toBe("false")
    expect(change).toHaveBeenLastCalledWith("brush")
    fireEvent.click(screen.getByRole("radio", { name: "Brush" }))
    expect(screen.getByRole("radio", { name: "Brush" }).getAttribute("aria-checked")).toBe("true")
  })

  it("starts on the first tool when nothing says otherwise, and follows a controlled value", () => {
    function Controlled() {
      const [tool, setTool] = useState("crop")
      return (
        <Toolbar aria-label="Tools">
          <Toolbar.Group aria-label="Tool" value={tool} onValueChange={setTool}>
            <Toolbar.Button value="move" label="Move" />
            <Toolbar.Button value="crop" label="Crop" />
          </Toolbar.Group>
          <Toolbar.Group aria-label="Mode" onValueChange={() => {}}>
            <Toolbar.Button value="a" label="A" />
            <Toolbar.Button value="b" label="B" />
          </Toolbar.Group>
        </Toolbar>
      )
    }
    render(<Controlled />)
    expect(screen.getByRole("radio", { name: "Crop" }).getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("radio", { name: "A" }).getAttribute("aria-checked")).toBe("true")
    fireEvent.click(screen.getByRole("radio", { name: "Move" }))
    expect(screen.getByRole("radio", { name: "Move" }).getAttribute("aria-checked")).toBe("true")
  })
})

describe("flyout", () => {
  const tools = [
    { value: "marquee", label: "Marquee" },
    { value: "lasso", label: "Lasso" },
  ]

  it("shows the first tool, with a hint of related tools, and activates it on press", () => {
    const activate = vi.fn()
    render(
      <Toolbar aria-label="Tools">
        <Toolbar.Flyout label="Selection tools" tools={tools} onActivate={activate} />
      </Toolbar>,
    )
    const button = screen.getByRole("button", { name: "Marquee" })
    expect(button.getAttribute("aria-haspopup")).toBe("menu")
    expect(button.getAttribute("aria-expanded")).toBe("false")
    expect(document.getElementById(button.getAttribute("aria-describedby")!)!.textContent).toBe("Related tools")
    fireEvent.click(button)
    expect(activate).toHaveBeenCalledWith("marquee")
    expect(screen.queryByRole("menu")).toBeNull()
  })

  it("opens its popup with Arrow Down (a row) and chooses another tool", () => {
    render(
      <Toolbar aria-label="Tools">
        <Toolbar.Flyout label="Selection tools" tools={tools} />
      </Toolbar>,
    )
    fireEvent.keyDown(screen.getByRole("button", { name: "Marquee" }), { key: "ArrowDown" })
    const menu = screen.getByRole("menu", { name: "Selection tools" })
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: "Lasso" }))
    expect(screen.getByRole("button", { name: "Lasso" })).toBeTruthy()
  })

  it("opens at the reading end of a vertical toolbar, mirrored in RTL", () => {
    render(
      <div dir="rtl">
        <Toolbar aria-label="Tools" orientation="vertical">
          <Toolbar.Flyout label="Selection tools" tools={tools} />
        </Toolbar>
      </div>,
    )
    const button = screen.getByRole("button", { name: "Marquee" })
    // jsdom resolves direction from the dir attribute; in RTL the reading-forward key is ArrowLeft.
    fireEvent.keyDown(button, { key: "ArrowRight" })
    expect(screen.queryByRole("menu")).toBeNull()
    fireEvent.keyDown(button, { key: "ArrowLeft" })
    expect(screen.getByRole("menu", { name: "Selection tools" })).toBeTruthy()
  })

  it("opens on a long press and does not choose on the release", () => {
    vi.useFakeTimers()
    const activate = vi.fn()
    render(
      <Toolbar aria-label="Tools">
        <Toolbar.Flyout label="Selection tools" tools={tools} onActivate={activate} />
      </Toolbar>,
    )
    const button = screen.getByRole("button", { name: "Marquee" })
    fireEvent.pointerDown(button, { button: 0 })
    act(() => { vi.advanceTimersByTime(500) })
    fireEvent.pointerUp(button)
    fireEvent.click(button)
    vi.useRealTimers()
    expect(screen.getByRole("menu", { name: "Selection tools" })).toBeTruthy()
    expect(activate).not.toHaveBeenCalled()
  })

  it("is a radio button of its single-choice group, showing the chosen tool", () => {
    render(
      <Toolbar aria-label="Tools" orientation="vertical">
        <Toolbar.Group aria-label="Tool" defaultValue="move">
          <Toolbar.Button value="move" label="Move" />
          <Toolbar.Flyout label="Selection tools" tools={tools} />
        </Toolbar.Group>
      </Toolbar>,
    )
    const flyout = screen.getByRole("radio", { name: "Marquee" })
    expect(flyout.getAttribute("aria-checked")).toBe("false")
    expect(flyout.hasAttribute("aria-haspopup")).toBe(false)
    fireEvent.click(flyout)
    expect(screen.getByRole("radio", { name: "Marquee" }).getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("radio", { name: "Move" }).getAttribute("aria-checked")).toBe("false")
    fireEvent.keyDown(flyout, { key: "ArrowRight" })
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitemradio", { name: "Lasso" }))
    expect(screen.getByRole("radio", { name: "Lasso" }).getAttribute("aria-checked")).toBe("true")
  })
})
