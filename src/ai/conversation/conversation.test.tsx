// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
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

describe("ConversationLog following the end", () => {
  /** A scroller whose geometry the test sets: jsdom lays nothing out. */
  const geometry = (element: HTMLElement) => {
    const box = { scrollTop: 0, scrollHeight: 1000, clientHeight: 400 }
    Object.defineProperty(element, "scrollTop", { configurable: true, get: () => box.scrollTop, set: (value: number) => (box.scrollTop = Math.min(value, box.scrollHeight - box.clientHeight)) })
    Object.defineProperty(element, "scrollHeight", { configurable: true, get: () => box.scrollHeight })
    Object.defineProperty(element, "clientHeight", { configurable: true, get: () => box.clientHeight })
    return box
  }

  it("stays pinned when content grows below between a follow and its scroll event", () => {
    const { container } = render(<ConversationLog>{turns(3)}</ConversationLog>)
    const root = container.querySelector(".fa-ai-conversation")!
    const scroller = container.querySelector<HTMLElement>(".fa-ai-conversation-scroll")!
    const box = geometry(scroller)
    // At the end.
    box.scrollTop = 600
    fireEvent.scroll(scroller)
    expect(root).toHaveAttribute("data-pinned")
    // A streamed word and the completed answer's actions grow the log by 180px before the
    // scroll event from the last follow arrives; the reader has not moved.
    box.scrollHeight = 1180
    fireEvent.scroll(scroller)
    expect(root).toHaveAttribute("data-pinned")
    expect(container.querySelector(".fa-ai-new-pill[data-visible]")).toBeNull()
  })

  it("lets go when the reader moves up, and pins again at the end", () => {
    const { container } = render(<ConversationLog>{turns(3)}</ConversationLog>)
    const root = container.querySelector(".fa-ai-conversation")!
    const scroller = container.querySelector<HTMLElement>(".fa-ai-conversation-scroll")!
    const box = geometry(scroller)
    box.scrollTop = 600
    fireEvent.scroll(scroller)
    box.scrollTop = 300
    fireEvent.scroll(scroller)
    expect(root).not.toHaveAttribute("data-pinned")
    expect(container.querySelector(".fa-ai-new-pill[data-visible]")).not.toBeNull()
    // Moving down short of the end keeps it let go; reaching the end pins it.
    box.scrollTop = 400
    fireEvent.scroll(scroller)
    expect(root).not.toHaveAttribute("data-pinned")
    box.scrollTop = 600
    fireEvent.scroll(scroller)
    expect(root).toHaveAttribute("data-pinned")
  })
})
