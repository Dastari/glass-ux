// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MessagesProvider } from "../../lib/i18n/index.js"
import { LocaleProvider } from "../../lib/locale/index.js"
import { dayLabel } from "./group.js"
import { NotificationList, type NotificationItem } from "./notification-list.js"

afterEach(cleanup)

const NOW = new Date(2026, 2, 12, 12, 0).getTime()
const HOUR = 3_600_000
const rows: NotificationItem[] = [
  { id: "a", title: "First", at: NOW - HOUR },
  { id: "b", title: "Second", at: NOW - 30 * HOUR, read: true },
  { id: "c", title: "Third", at: NOW - 60 * HOUR, group: "Kept" },
]
const words = { today: "Today", yesterday: "Yesterday" }

describe("dayLabel", () => {
  it("names today, yesterday, a weekday and a date", () => {
    expect(dayLabel(NOW, NOW, "en-AU", words)).toBe("Today")
    expect(dayLabel(NOW - 24 * HOUR, NOW, "en-AU", words)).toBe("Yesterday")
    expect(dayLabel(NOW - 72 * HOUR, NOW, "en-AU", words)).toBe("Monday")
    expect(dayLabel(NOW - 240 * HOUR, NOW, "en-AU", words)).toBe("2 March 2026")
  })

  it("names the date before the clock is known, as on the server", () => {
    expect(dayLabel(NOW, 0, "en-AU", words)).toBe("12 March 2026")
  })
})

describe("NotificationList", () => {
  it("has no control for a capability the host left out", () => {
    render(<NotificationList items={rows} filters={false} holdNew={false} />)
    expect(screen.queryByRole("button", { name: /Mark read/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Dismiss/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Mark all read" })).toBeNull()
    expect(screen.getByText("First").closest("button")).toBeNull()
  })

  it("puts unread in the name, and keeps controls out of the tab order except on one row", () => {
    render(<NotificationList items={rows} onOpen={() => undefined} onDismiss={() => undefined} />)
    expect(screen.getByRole("button", { name: /^Unread:\s*First/ }).getAttribute("tabindex")).toBe("0")
    expect(screen.getByRole("button", { name: /^Second/ }).getAttribute("tabindex")).toBe("-1")
    expect(screen.getByRole("button", { name: "Dismiss: Second" }).getAttribute("tabindex")).toBe("-1")
  })

  it("updates itself when uncontrolled", () => {
    const onReadChange = vi.fn()
    const onDismiss = vi.fn()
    render(<NotificationList defaultItems={rows} onReadChange={onReadChange} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole("button", { name: "Mark read: First" }))
    expect(onReadChange).toHaveBeenCalledWith(["a"], true)
    expect(screen.getByRole("button", { name: "Mark unread: First" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Dismiss: Second" }))
    expect(onDismiss).toHaveBeenCalledWith(rows[1])
    expect(screen.queryByText("Second")).toBeNull()
  })

  it("marks a row read when it opens", () => {
    const onReadChange = vi.fn()
    const onOpen = vi.fn()
    render(<NotificationList items={rows} onOpen={onOpen} onReadChange={onReadChange} />)
    fireEvent.click(screen.getByRole("button", { name: /^Unread:\s*First/ }))
    expect(onOpen).toHaveBeenCalled()
    expect(onReadChange).toHaveBeenCalledWith(["a"], true)
  })

  it("holds an arrival behind a count and shows it on request", () => {
    function Host() {
      const [items, setItems] = useState(rows)
      return (
        <>
          <button onClick={() => setItems((current) => [{ id: "new", title: "Arrival", at: NOW }, ...current])}>Deliver</button>
          <NotificationList items={items} />
        </>
      )
    }
    render(<Host />)
    fireEvent.click(screen.getByRole("button", { name: "Deliver" }))
    expect(screen.queryByText("Arrival")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Show 1 new notification" }))
    expect(screen.getByText("Arrival")).toBeTruthy()
  })

  it("shows arrivals at once with holdNew off", () => {
    const { rerender } = render(<NotificationList items={rows} holdNew={false} />)
    rerender(<NotificationList items={[{ id: "new", title: "Arrival", at: NOW }, ...rows]} holdNew={false} />)
    expect(screen.getByText("Arrival")).toBeTruthy()
  })

  it("shows every row after loading replaces the list", () => {
    const { rerender } = render(<NotificationList items={rows} />)
    rerender(<NotificationList items={[]} loading />)
    rerender(<NotificationList items={[{ id: "other", title: "Other", at: NOW }, ...rows]} loading />)
    rerender(<NotificationList items={[{ id: "other", title: "Other", at: NOW }, ...rows]} />)
    expect(screen.getByText("Other")).toBeTruthy()
  })

  it("groups by the host's group, and names the list after it", () => {
    render(<NotificationList items={rows} groupBy="host" />)
    expect(screen.getByRole("list", { name: "Kept" })).toBeTruthy()
  })

  it("names an empty filter and offers the way back", () => {
    render(<NotificationList items={[rows[1]!]} />)
    fireEvent.click(screen.getByRole("button", { name: "Unread" }))
    expect(screen.getByText("No notifications in Unread")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Show all" }))
    expect(screen.getByText("Second")).toBeTruthy()
  })

  it("leaves filtering to the host when told to", () => {
    render(<NotificationList items={rows} filter="unread" filtering="host" />)
    expect(screen.getByText("Second")).toBeTruthy()
  })

  it("offers Retry after a failure, and calls it", () => {
    const onRetry = vi.fn()
    render(<NotificationList items={[]} error onRetry={onRetry} />)
    expect(screen.getByRole("alert").textContent).toContain("did not load")
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalled()
  })

  it("keeps Mark all read while unread rows are beyond those loaded", () => {
    render(<NotificationList items={[rows[1]!]} onMarkAllRead={() => undefined} unreadCount={4} />)
    expect(screen.getByRole("button", { name: "Mark all read" }).getAttribute("aria-disabled")).not.toBe("true")
  })

  it("gives a reason when there is nothing to mark", () => {
    render(<NotificationList items={[rows[1]!]} onMarkAllRead={() => undefined} />)
    expect(screen.getByRole("button", { name: "Mark all read" }).getAttribute("aria-description")).toBe("Nothing is unread")
  })

  it("reads its words from the messages", () => {
    render(
      <MessagesProvider messages={{ notificationList: { markAllRead: "Clear" } }}>
        <NotificationList items={rows} onMarkAllRead={() => undefined} />
      </MessagesProvider>,
    )
    expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy()
  })

  it("formats counts in the locale", () => {
    const many = Array.from({ length: 1500 }, (_, index) => ({ id: `n${index}`, title: `Row ${index}`, at: NOW }))
    function Host() {
      const [items, setItems] = useState(rows.slice(0, 1))
      return (
        <LocaleProvider locale="de">
          <button onClick={() => setItems((current) => [...many, ...current])}>Deliver</button>
          <NotificationList items={items} />
        </LocaleProvider>
      )
    }
    render(<Host />)
    act(() => screen.getByRole("button", { name: "Deliver" }).click())
    expect(screen.getByText("1.500 new")).toBeTruthy()
  })
})
