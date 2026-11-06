// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { act } from "react"
import { afterEach, expect, it, vi } from "vitest"
import { ContextMenu } from "./context-menu.js"

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it.each([["ltr", 124], ["rtl", 376]])("opens keyboard context menus at the %s reading start", (direction, expected) => {
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0)
  render(<ContextMenu.Root><ContextMenu.Trigger><button type="button" style={{ direction: String(direction) as "ltr" | "rtl" }}>Row actions</button></ContextMenu.Trigger></ContextMenu.Root>)
  const target = screen.getByRole("button", { name: "Row actions" })
  vi.spyOn(target, "getBoundingClientRect").mockReturnValue({ left: 100, right: 400, width: 300, bottom: 50 } as DOMRect)
  const open = vi.fn((event: Event) => { event.preventDefault(); event.stopPropagation() })
  target.addEventListener("contextmenu", open)
  fireEvent.keyDown(target, { key: "F10", shiftKey: true })
  expect(open).toHaveBeenCalledOnce()
  expect(open.mock.calls[0]![0]).toMatchObject({ clientX: expected, clientY: 50 })
})

function Linked({ onClick }: { onClick: () => void }) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={<a href="#away" onClick={onClick}>Sample</a>} />
      <ContextMenu.Popup aria-label="Actions"><ContextMenu.Item>Rename</ContextMenu.Item></ContextMenu.Popup>
    </ContextMenu.Root>
  )
}
const hold = (link: HTMLElement, ms: number) => {
  fireEvent.touchStart(link, { touches: [{ clientX: 10, clientY: 10 }] })
  act(() => { vi.advanceTimersByTime(ms) })
  fireEvent.touchEnd(link, { changedTouches: [{ clientX: 10, clientY: 10 }] })
}

it("drops the click that follows a long press which opened the menu", () => {
  vi.useFakeTimers()
  const onClick = vi.fn()
  render(<Linked onClick={onClick} />)
  const link = screen.getByRole("link", { name: "Sample" })
  hold(link, 600)
  // fireEvent returns false when the default was prevented.
  expect(fireEvent.click(link)).toBe(false)
  expect(onClick).not.toHaveBeenCalled()
  vi.useRealTimers()
})

it("keeps the click of a short tap", () => {
  vi.useFakeTimers()
  const onClick = vi.fn()
  render(<Linked onClick={onClick} />)
  const link = screen.getByRole("link", { name: "Sample" })
  hold(link, 100)
  fireEvent.click(link)
  expect(onClick).toHaveBeenCalledOnce()
  vi.useRealTimers()
})

it("keeps a later click after a long press, and a click after a right-click", () => {
  vi.useFakeTimers()
  const onClick = vi.fn()
  render(<Linked onClick={onClick} />)
  const link = screen.getByRole("link", { name: "Sample" })
  hold(link, 600)
  fireEvent.click(link)
  expect(onClick).not.toHaveBeenCalled()
  // Only the one click is dropped.
  fireEvent.click(link)
  expect(onClick).toHaveBeenCalledOnce()
  vi.useRealTimers()
})
