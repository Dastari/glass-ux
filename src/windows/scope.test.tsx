// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "../ui/tooltip/index.js"
import { Dock } from "./dock.js"
import { WindowManagerProvider } from "./react.js"
import { registerWindowKind } from "./registry.js"
import { WindowScopeChip, WindowScopeProvider, type WindowScopeInfo, type WindowScopes } from "./scope.js"
import { createWindowManager } from "./store.js"

const Icon = Object.assign(() => null, { iconName: "test" })
registerWindowKind({ kind: "scope-test", title: () => "Terminal", icon: Icon, load: async () => ({ default: () => null }) })

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(cleanup)

const scopes = (info: WindowScopeInfo): WindowScopes => ({
  current: "cedarvale",
  describe: (id) => (id === "northstar" ? info : undefined),
})

function chip(info: WindowScopeInfo, scope: string | null = "northstar") {
  render(
    <TooltipProvider>
      <WindowScopeProvider value={scopes(info)}>
        <WindowScopeChip scope={scope} />
      </WindowScopeProvider>
    </TooltipProvider>
  )
  return document.querySelector<HTMLElement>(".fa-window-scope")
}

describe("WindowScopeChip", () => {
  it("draws the avatar-and-name pill by default", () => {
    const element = chip({ label: "Northstar Studio", avatar: <i data-testid="avatar" /> })!
    expect(screen.getByRole("img", { name: "Organisation: Northstar Studio" })).toBe(element)
    expect(element).not.toHaveAttribute("data-chip")
    expect(element.querySelector(".fa-window-scope-avatar [data-testid='avatar']")).not.toBeNull()
    expect(element.querySelector(".fa-window-scope-label")).toHaveTextContent("Northstar Studio")
    expect(element.querySelector(".fa-window-scope-icon")).toBeNull()
  })

  it("draws the application's chip in place of the pill, and its icon for narrow windows", () => {
    const element = chip({
      label: "Northstar Studio",
      avatar: <i data-testid="avatar" />,
      chip: <b data-testid="chip">Northstar Studio</b>,
      icon: <b data-testid="icon" />,
    })!
    expect(screen.getByRole("img", { name: "Organisation: Northstar Studio" })).toBe(element)
    expect(element).toHaveAttribute("data-chip", "")
    expect(element).toHaveAttribute("data-icon", "")
    expect(element.querySelector(".fa-window-scope-chip")).toHaveAttribute("aria-hidden", "true")
    expect(element.querySelector(".fa-window-scope-chip [data-testid='chip']")).not.toBeNull()
    expect(element.querySelector(".fa-window-scope-icon")).toHaveAttribute("aria-hidden", "true")
    expect(element.querySelector(".fa-window-scope-icon [data-testid='icon']")).not.toBeNull()
    expect(element.querySelector("[data-testid='avatar'], .fa-window-scope-label")).toBeNull()
  })

  it("keeps the pill beside an icon given on its own", () => {
    const element = chip({ label: "Northstar Studio", icon: <b data-testid="icon" /> })!
    expect(element).not.toHaveAttribute("data-chip")
    expect(element).toHaveAttribute("data-icon", "")
    expect(element.querySelector(".fa-window-scope-label")).toHaveTextContent("Northstar Studio")
  })

  it("shows nothing for the current scope or an unscoped window", () => {
    expect(chip({ label: "Cedar Vale", chip: <b /> }, "cedarvale")).toBeNull()
    cleanup()
    expect(chip({ label: "Northstar Studio", chip: <b /> }, null)).toBeNull()
  })
})

describe("Dock scope groups", () => {
  function dock(info: WindowScopeInfo) {
    const manager = createWindowManager({ storageKey: null, channelName: null })
    manager.open({ kind: "scope-test", scope: "northstar" })
    render(
      <TooltipProvider>
        <WindowManagerProvider manager={manager}>
          <WindowScopeProvider value={scopes(info)}>
            <Dock />
          </WindowScopeProvider>
        </WindowManagerProvider>
      </TooltipProvider>
    )
    return document.querySelector<HTMLElement>(".fa-wm-dock-group[data-scope='northstar']")!
  }

  it("draws the application's icon before the group in place of the avatar", () => {
    const group = dock({ label: "Northstar Studio", avatar: <i data-testid="avatar" />, icon: <b data-testid="icon" /> })
    expect(group.querySelector(".fa-wm-dock-scope [data-testid='icon']")).not.toBeNull()
    expect(group.querySelector("[data-testid='avatar']")).toBeNull()
    expect(screen.getByRole("list", { name: "Northstar Studio" })).toBeInTheDocument()
  })

  it("falls back to the avatar", () => {
    const group = dock({ label: "Northstar Studio", avatar: <i data-testid="avatar" /> })
    expect(group.querySelector(".fa-wm-dock-scope [data-testid='avatar']")).not.toBeNull()
  })
})
