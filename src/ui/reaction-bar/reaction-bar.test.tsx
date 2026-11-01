// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ReactionBar, type Reaction } from "./reaction-bar.js"

afterEach(cleanup)

const START: Reaction[] = [
  { emoji: "👍", count: 2 },
  { emoji: "🚀", count: 1, reacted: true, label: "rocket" },
  { emoji: "🦉", count: 3 },
  { emoji: "🎉", count: 0 },
]

describe("ReactionBar", () => {
  it("names each reaction for what it says, with the plural form, and shows pressed", () => {
    render(<ReactionBar reactions={START} />)
    expect(screen.getByRole("button", { name: "2 people reacted with thumbs up" }).getAttribute("aria-pressed")).toBe("false")
    expect(screen.getByRole("button", { name: "1 person reacted with rocket" }).getAttribute("aria-pressed")).toBe("true")
  })

  it("falls back to the emoji for a name it does not know", () => {
    render(<ReactionBar reactions={START} />)
    expect(screen.getByRole("button", { name: "3 people reacted with 🦉" })).toBeTruthy()
  })

  it("does not draw a count of zero", () => {
    render(<ReactionBar reactions={START} />)
    expect(screen.queryByRole("button", { name: /party popper/ })).toBeNull()
  })

  it("counts for itself when uncontrolled, and drops a reaction at zero", () => {
    const onReactionsChange = vi.fn()
    render(<ReactionBar defaultReactions={START} onReactionsChange={onReactionsChange} />)
    fireEvent.click(screen.getByRole("button", { name: "2 people reacted with thumbs up" }))
    expect(screen.getByRole("button", { name: "3 people reacted with thumbs up" }).getAttribute("aria-pressed")).toBe("true")
    expect(onReactionsChange.mock.calls[0]?.[1]).toEqual({ emoji: "👍", reacted: true })
    fireEvent.click(screen.getByRole("button", { name: "1 person reacted with rocket" }))
    expect(screen.queryByRole("button", { name: /rocket/ })).toBeNull()
  })

  it("reports a controlled change and changes nothing itself", () => {
    const onReactionsChange = vi.fn()
    render(<ReactionBar reactions={START} onReactionsChange={onReactionsChange} />)
    fireEvent.click(screen.getByRole("button", { name: "2 people reacted with thumbs up" }))
    expect(onReactionsChange).toHaveBeenCalledOnce()
    expect(screen.getByRole("button", { name: "2 people reacted with thumbs up" })).toBeTruthy()
  })

  it("has no buttons when read-only, and nothing at all with no reactions", () => {
    const { rerender, container } = render(<ReactionBar reactions={START} readOnly />)
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(screen.getByRole("img", { name: "2 people reacted with thumbs up" })).toBeTruthy()
    rerender(<ReactionBar reactions={[]} readOnly />)
    expect(container.firstChild).toBeNull()
  })

  it("keeps its controls with a reason", () => {
    render(<ReactionBar reactions={START} disabledReason="Locked" />)
    const add = screen.getByRole("button", { name: "Add reaction" })
    expect(add.getAttribute("aria-description")).toBe("Locked")
    fireEvent.click(screen.getByRole("button", { name: /thumbs up/ }))
    expect(screen.getByRole("button", { name: "2 people reacted with thumbs up" })).toBeTruthy()
  })

  it("leaves out the add control when asked", () => {
    render(<ReactionBar reactions={START} picker={false} />)
    expect(screen.queryByRole("button", { name: "Add reaction" })).toBeNull()
  })
})
