// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Composer } from "./composer.js"

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("Composer send/stop control", () => {
  it("keeps focus on the same button when a run starts and ends", () => {
    const onStop = vi.fn()
    const onSend = vi.fn()
    const { rerender } = render(<Composer value="Summarise the report" onSend={onSend} onStop={onStop} run="idle" />)
    const send = screen.getByRole("button", { name: "Send" })
    send.focus()

    rerender(<Composer value="Summarise the report" onSend={onSend} onStop={onStop} run="sending" />)
    expect(document.activeElement).toBe(send)

    rerender(<Composer value="" onSend={onSend} onStop={onStop} run="running" />)
    const stop = screen.getByRole("button", { name: "Stop response" })
    expect(stop).toBe(send)
    expect(document.activeElement).toBe(stop)
    fireEvent.click(stop)
    expect(onStop).toHaveBeenCalledTimes(1)

    rerender(<Composer value="" onSend={onSend} onStop={onStop} run="stopping" />)
    expect(document.activeElement).toBe(stop)

    rerender(<Composer value="" onSend={onSend} onStop={onStop} run="idle" />)
    expect(screen.getByRole("button", { name: "Send" })).toBe(send)
    expect(document.activeElement).toBe(send)
  })
})
