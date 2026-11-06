// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "../ui/tooltip/index.js"
import { Dock, WindowSwitcher } from "./dock.js"
import { registerWindowKind } from "./registry.js"
import { createWindowManager } from "./store.js"
import { WindowManagerProvider } from "./react.js"
import { WindowFrame } from "./window-frame.js"

const Icon = Object.assign(() => <svg />, { iconName: "test" })
const Body = () => <div />
const load = async () => ({ default: Body })

registerWindowKind<{ device: string }>({
  kind: "subject-test",
  title: () => "Terminal",
  subtitle: (params) => params.device,
  renderSubtitle: (params) => <a href={`#${params.device}`}>{`Chip ${params.device}`}</a>,
  renderDockItem: (item, params) => <div data-testid="dock-wrap" data-device={params.device}>{item}</div>,
  icon: Icon,
  load,
})
registerWindowKind<{ device: string }>({ kind: "plain-test", title: () => "Screen", subtitle: (params) => params.device, icon: Icon, load })

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function mount(children: React.ReactNode, kind = "subject-test") {
  const manager = createWindowManager({ storageKey: null, channelName: null })
  manager.open({ kind, params: { device: "C-106" } })
  render(
    <TooltipProvider>
      <WindowManagerProvider manager={manager}>{children}</WindowManagerProvider>
    </TooltipProvider>,
  )
  return manager
}

describe("window subtitle nodes", () => {
  it("draws a node as given in the title bar, and the window does not drag from it", () => {
    render(<WindowFrame.AppBar title="Terminal" subtitle={<a href="#c">Chip</a>} titleId="t" />)
    const link = screen.getByRole("link", { name: "Chip" })
    expect(link.closest("[data-window-no-drag]")).not.toBeNull()
    expect(link.closest("p")).toBeNull()
  })

  it("keeps a string in its paragraph", () => {
    render(<WindowFrame.AppBar title="Terminal" subtitle="C-106" titleId="t" />)
    const text = screen.getByText("C-106")
    expect(text.closest("p.fa-window-subtitle")).not.toBeNull()
    expect(text.closest("[data-window-no-drag]")).toBeNull()
  })

  it("wraps the dock item and keeps the text as its accessible name", () => {
    mount(<Dock />)
    const wrap = screen.getByTestId("dock-wrap")
    expect(wrap).toHaveAttribute("data-device", "C-106")
    const item = wrap.querySelector<HTMLButtonElement>(".fa-wm-dock-item")!
    expect(item.getAttribute("aria-label")).toContain("C-106")
    fireEvent.click(item)
  })

  it("leaves a dock item alone without the option", () => {
    mount(<Dock />, "plain-test")
    expect(document.querySelector(".fa-wm-dock-host")).toBeNull()
    expect(document.querySelector(".fa-wm-dock-item")).not.toBeNull()
  })

  it("draws the node beside the switcher row's button, in place of the text", () => {
    mount(<WindowSwitcher open onOpenChange={() => {}} />)
    const chip = screen.getByRole("link", { name: "Chip C-106" })
    const row = screen.getByRole("button", { name: /^Terminal/ })
    expect(row.contains(chip)).toBe(false)
    expect(row).not.toHaveTextContent("C-106")
  })
})
