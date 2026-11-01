// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createRef, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DragDropProvider } from "../drag-drop/index.js"
import { Tabs, type TabItem, type TabListHandle, type TabMove } from "./index.js"

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const ITEMS: TabItem[] = [
  { value: "a", label: "Alpha", closable: true },
  { value: "b", label: "Beta", closable: true, unsaved: true },
  { value: "c", label: "Gamma", preview: true },
]

function Strip({ initial = ITEMS, defaultValue = "a", onMove, onCloseSpy, panelId }: { initial?: TabItem[]; defaultValue?: string; onMove?: (move: TabMove) => void; onCloseSpy?: (value: string, reason: string) => void; panelId?: (value: string) => string }) {
  const [items, setItems] = useState(initial)
  return (
    <Tabs.Root defaultValue={defaultValue}>
      <Tabs.List
        items={items}
        aria-label="Files"
        zoneId="main"
        panelId={panelId}
        onClose={(value, details) => {
          onCloseSpy?.(value, details.reason)
          setItems((list) => list.filter((item) => item.value !== value))
        }}
        onKeep={(value) => setItems((list) => list.map((item) => (item.value === value ? { ...item, preview: false } : item)))}
        onTabMove={(move) => {
          onMove?.(move)
          setItems((list) => {
            const moved = list.find((item) => item.value === move.value)!
            const rest = list.filter((item) => item !== moved)
            return [...rest.slice(0, move.index), moved, ...rest.slice(move.index)]
          })
        }}
      />
    </Tabs.Root>
  )
}

const tab = (name: string | RegExp) => screen.findByRole("tab", { name })
const order = () => screen.getAllByRole("tab").map((element) => element.getAttribute("data-value"))

describe("plain Tabs", () => {
  it("render as before, with no extras", () => {
    const view = render(
      <Tabs.Root defaultValue="a">
        <Tabs.List items={[{ value: "a", label: "Alpha" }]} aria-label="Plain" />
      </Tabs.Root>
    )
    const element = screen.getByRole("tab", { name: "Alpha" })
    expect(element).not.toHaveAttribute("aria-describedby")
    expect(view.container.querySelector(".fa-tab-marks, .fa-tabs-close-active, .fa-tabs-announcer")).toBeNull()
  })
})

describe("closing", () => {
  it("names the states, keeps controls out of the tablist and exposes one real close button", async () => {
    render(<Strip />)
    expect(await tab("Beta Unsaved changes")).toBeInTheDocument()
    expect(await tab("Gamma Preview")).toBeInTheDocument()
    const list = screen.getByRole("tablist")
    expect(list.querySelector("button:not([role='tab'])")).toBeNull()
    expect(list.querySelector(".fa-tab-close")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByRole("button", { name: "Close Alpha" })).toBeInTheDocument()
  })

  it("closes with Delete, a middle-click and the mark, and hands selection to the neighbour", async () => {
    const onClose = vi.fn()
    render(<Strip onCloseSpy={onClose} />)
    const alpha = await tab("Alpha")
    alpha.focus()
    fireEvent.keyDown(alpha, { key: "Delete" })
    expect(onClose).toHaveBeenLastCalledWith("a", "keyboard")
    const beta = await tab("Beta Unsaved changes")
    // The hand-over settles after the closed tab leaves, which can take a frame on a busy machine.
    await waitFor(() => expect(beta).toHaveAttribute("aria-selected", "true"))
    await waitFor(() => expect(beta).toHaveFocus())
    fireEvent(beta, new MouseEvent("auxclick", { bubbles: true, button: 1 }))
    expect(onClose).toHaveBeenLastCalledWith("b", "middle-click")
  })

  it("a click on the mark does not select the tab", async () => {
    const onClose = vi.fn()
    render(<Strip defaultValue="c" onCloseSpy={onClose} />)
    const alpha = await tab("Alpha")
    fireEvent.click(alpha.querySelector(".fa-tab-close")!)
    expect(onClose).toHaveBeenCalledWith("a", "button")
    expect(await tab("Gamma Preview")).toHaveAttribute("aria-selected", "true")
  })
})

describe("moving", () => {
  it("Shift and an arrow reports one move, follows reading order and keeps focus", async () => {
    const onMove = vi.fn()
    render(<Strip onMove={onMove} />)
    const alpha = await tab("Alpha")
    alpha.focus()
    fireEvent.keyDown(alpha, { key: "ArrowRight", shiftKey: true })
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove).toHaveBeenCalledWith({ value: "a", from: "main", to: "main", index: 1, input: "keyboard" })
    expect(order()).toEqual(["b", "a", "c"])
    await act(async () => {})
    expect(await tab("Alpha")).toHaveFocus()
    expect(document.querySelector(".fa-tabs-announcer")).toHaveTextContent("Alpha moved to position 2 of 3")
    fireEvent.keyDown(await tab("Alpha"), { key: "Home", shiftKey: true })
    expect(order()).toEqual(["a", "b", "c"])
  })

  it("stops at the ends", async () => {
    const onMove = vi.fn()
    render(<Strip onMove={onMove} />)
    fireEvent.keyDown(await tab("Alpha"), { key: "ArrowLeft", shiftKey: true })
    expect(onMove).not.toHaveBeenCalled()
  })

  it("mirrors under RTL", async () => {
    const onMove = vi.fn()
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <Strip onMove={onMove} />
      </div>
    )
    fireEvent.keyDown(await tab("Alpha"), { key: "ArrowLeft", shiftKey: true })
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ value: "a", index: 1 }))
  })
})

describe("the layout contract", () => {
  it("sets aria-controls from panelId, gives focusTab and joins a provider above", async () => {
    const ref = createRef<TabListHandle>()
    render(
      <DragDropProvider>
        <Tabs.Root defaultValue="a">
          <Tabs.List ref={ref} items={ITEMS} aria-label="Files" zoneId="left" panelId={(value) => `panel-${value}`} onTabMove={() => undefined} />
        </Tabs.Root>
      </DragDropProvider>
    )
    const alpha = await tab("Alpha")
    expect(alpha).toHaveAttribute("aria-controls", "panel-a")
    expect(alpha).toHaveAttribute("data-value", "a")
    act(() => ref.current?.focusTab("b"))
    expect(await tab("Beta Unsaved changes")).toHaveFocus()
    // One provider: the strip brought none of its own.
    expect(document.querySelectorAll(".fa-dnd-announcer")).toHaveLength(1)
  })
})
