// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import { ConversationLog, useConversationLog } from "./conversation.js"
import { Turn } from "../message/index.js"

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.scrollTo = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const turns = (count: number) =>
  Array.from({ length: count }, (_, i) => (
    <Turn key={i} index={i + 1}>
      Sample turn {i + 1}
    </Turn>
  ))

let api: ReturnType<typeof useConversationLog> = null
function Probe() {
  api = useConversationLog()
  return null
}

describe("ConversationLog long transcripts", () => {
  it("skips off-screen turns only from 20 turns", () => {
    const { container, rerender } = render(<ConversationLog>{turns(19)}</ConversationLog>)
    expect(container.querySelector(".fa-ai-conversation")).not.toHaveAttribute("data-long")
    rerender(<ConversationLog>{turns(20)}</ConversationLog>)
    expect(container.querySelector(".fa-ai-conversation")).toHaveAttribute("data-long")
  })

  it("lays every turn out for a frame before scrolling to a turn in a long log", () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback))
    const { container } = render(
      <ConversationLog>
        <Probe />
        {turns(30)}
      </ConversationLog>
    )
    const root = container.querySelector(".fa-ai-conversation")!
    const target = container.querySelector('[data-turn="3"]')!
    act(() => api!.scrollToTurn(3))
    expect(root).toHaveAttribute("data-measure")
    expect(target.scrollIntoView).not.toHaveBeenCalled()
    act(() => frames.shift()!(0))
    act(() => frames.shift()!(0))
    expect(root).not.toHaveAttribute("data-measure")
    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" })
  })
})
