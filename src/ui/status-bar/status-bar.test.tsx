// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { WindowFrame } from "../../windows/window-frame.js"
import { StatusBar } from "./index.js"

afterEach(cleanup)

describe("StatusBar", () => {
  it("names a group and places start and end content", () => {
    render(
      <StatusBar aria-label="Workspace status">
        <StatusBar.Start>
          <StatusBar.Item tone="success">Connected</StatusBar.Item>
        </StatusBar.Start>
        <StatusBar.End>
          <StatusBar.Item>28 ms</StatusBar.Item>
        </StatusBar.End>
      </StatusBar>
    )
    const bar = screen.getByRole("group", { name: "Workspace status" })
    expect(bar).toHaveClass("fa-status-bar")
    expect(bar.querySelector(".fa-status-bar-start [data-tone='success']")).toHaveTextContent("Connected")
    expect(bar.querySelector(".fa-status-bar-end")).toHaveTextContent("28 ms")
  })

  it("an item with onClick is a button; a reason stops it and it stays focusable", () => {
    const onClick = vi.fn()
    const view = render(
      <StatusBar aria-label="Status">
        <StatusBar.Item onClick={onClick}>Line 12</StatusBar.Item>
      </StatusBar>
    )
    fireEvent.click(screen.getByRole("button", { name: "Line 12" }))
    expect(onClick).toHaveBeenCalledTimes(1)
    view.rerender(
      <StatusBar aria-label="Status">
        <StatusBar.Item onClick={onClick} disabledReason="No document is open">
          Line 12
        </StatusBar.Item>
      </StatusBar>
    )
    const button = screen.getByRole("button", { name: "Line 12" })
    expect(button).toHaveAttribute("aria-disabled", "true")
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe("WindowFrame.StatusBar on StatusBar", () => {
  it("keeps its element, classes and emptiness", () => {
    const view = render(
      <WindowFrame.StatusBar data-testid="bar" narrow="hide">
        <WindowFrame.StatusItem tone="warning">Degraded</WindowFrame.StatusItem>
        <WindowFrame.StatusMeta>
          <span>12 GB</span>
        </WindowFrame.StatusMeta>
      </WindowFrame.StatusBar>
    )
    const bar = screen.getByTestId("bar")
    expect(bar.tagName).toBe("FOOTER")
    expect(bar).not.toHaveAttribute("role")
    expect(bar).toHaveClass("fa-window-status", "fa-status-bar")
    expect(bar).toHaveAttribute("data-narrow", "hide")
    expect(bar.querySelector(".fa-window-status-item")).toHaveAttribute("data-tone", "warning")
    expect(bar.querySelector(".fa-window-status-meta")).toHaveAttribute("data-numeric")
    view.rerender(<WindowFrame.StatusBar data-testid="bar" />)
    expect(screen.getByTestId("bar")).toBeEmptyDOMElement()
  })
})
