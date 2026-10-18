// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { WindowManagerProvider } from "./react.js"
import { registerWindowKind } from "./registry.js"
import { createWindowManager } from "./store.js"
import { WindowContentHost } from "./window-content.js"
import { WindowFrame } from "./window-frame.js"

const Icon = Object.assign(() => null, { iconName: "test" })
// The body never loads, so the host keeps its Suspense fallback.
registerWindowKind({ kind: "loading-test", title: () => "Inventory", icon: Icon, load: () => new Promise<never>(() => {}) })

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

describe("WindowContentHost while the body is unresolved", () => {
  it("shows the skeleton as a busy status named Loading window", () => {
    const manager = createWindowManager({ storageKey: null, channelName: null })
    const id = manager.open({ kind: "loading-test", params: {} })
    render(
      <WindowManagerProvider manager={manager}>
        <WindowFrame.Root>
          <WindowContentHost id={id} kind="loading-test" params={{}} />
        </WindowFrame.Root>
      </WindowManagerProvider>
    )
    const status = screen.getByRole("status", { name: "Loading window" })
    expect(status).toHaveAttribute("aria-busy", "true")
    expect(status).toHaveClass("fa-window-body")
    expect(status).toBeVisible()
    expect(status.querySelector(".fa-window-skeleton")).not.toBeNull()
  })
})
