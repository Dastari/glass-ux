// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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
