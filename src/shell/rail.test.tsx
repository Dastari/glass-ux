// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { configureShortcuts } from "../ui/kbd/index.js"
import { TooltipProvider } from "../ui/tooltip/index.js"
import { Rail } from "./rail.js"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
})
afterEach(() => {
  cleanup()
  configureShortcuts({ characterKeys: true })
})
afterAll(() => vi.unstubAllGlobals())

function Fixture({ onGo }: { onGo: () => void }) {
  return (
    <TooltipProvider>
      <Rail.Root aria-label="Main">
        <Rail.Item icon={<span />} label="Endpoints" shortcut="g e" onClick={onGo} />
      </Rail.Root>
    </TooltipProvider>
  )
}
const press = (key: string, init: KeyboardEventInit = {}) => act(() => void fireEvent.keyDown(document.body, { key, ...init }))

describe("Rail sequence shortcuts", () => {
  it("go to the item with 'g e'", () => {
    const go = vi.fn()
    render(<Fixture onGo={go} />)
    press("g")
    press("e")
    expect(go).toHaveBeenCalledTimes(1)
  })

  it("do nothing once the application switches single-character shortcuts off, and come back on", () => {
    const go = vi.fn()
    render(<Fixture onGo={go} />)
    act(() => configureShortcuts({ characterKeys: false }))
    press("g")
    press("e")
    expect(go).not.toHaveBeenCalled()
    act(() => configureShortcuts({ characterKeys: true }))
    press("g")
    press("e")
    expect(go).toHaveBeenCalledTimes(1)
  })

  it("ignore a sequence typed in a field", () => {
    const go = vi.fn()
    render(
      <>
        <Fixture onGo={go} />
        <input aria-label="Name" />
      </>,
    )
    const field = screen.getByRole("textbox", { name: "Name" })
    fireEvent.keyDown(field, { key: "g" })
    fireEvent.keyDown(field, { key: "e" })
    expect(go).not.toHaveBeenCalled()
  })
})
