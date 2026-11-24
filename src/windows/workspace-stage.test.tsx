// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { Profiler } from "react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "../ui/tooltip/index.js"
import { WindowManagerProvider } from "./react.js"
import { createWindowManager } from "./store.js"
import { Workspace } from "./workspace.js"

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
})
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())

describe("Workspace stage ref (#35)", () => {
  it("commits once per change of primary view: the ref does not set state on every commit", () => {
    const manager = createWindowManager({ storageKey: null, channelName: null })
    let commits = 0
    const tree = (page: string) => (
      <TooltipProvider>
        <WindowManagerProvider manager={manager}>
          <Profiler id="workspace" onRender={() => commits++}>
            <Workspace primary={<p>{page}</p>} primaryLabel={page} />
          </Profiler>
        </WindowManagerProvider>
      </TooltipProvider>
    )
    const view = render(tree("Discovered device"))
    commits = 0
    // A route change swaps the primary view. An inline ref that sets state turned each
    // commit into another render until React gave up (Maximum update depth exceeded).
    // Each such commit set the state twice and committed again; anything that re-rendered
    // the workspace on that extra commit closed the loop. One commit per change.
    const pages = ["Agent computer", "Printer", "Discovered device"]
    for (const page of pages) view.rerender(tree(page))
    expect(commits).toBe(pages.length)
    expect(view.getByText("Discovered device")).toBeTruthy()
  })
})
