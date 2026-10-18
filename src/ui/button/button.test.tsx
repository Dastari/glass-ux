// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { Button, ButtonGroup, type ButtonStatus } from "./button.js"

afterEach(cleanup)

const live = (container: HTMLElement) => container.querySelector<HTMLElement>("[aria-live='polite']")

function Save({ status }: { status: ButtonStatus }) {
  return (
    <Button status={status} successLabel="Saved" errorLabel="Not saved">
      Save
    </Button>
  )
}

describe("Button status announcement", () => {
  it("keeps the live region mounted and announces success after pending", () => {
    const { container, rerender } = render(<Save status="idle" />)
    const region = live(container)
    expect(region).not.toBeNull()
    expect(region).toHaveTextContent("")
    rerender(<Save status="pending" />)
    expect(live(container)).toBe(region)
    expect(region).toHaveTextContent("")
    rerender(<Save status="success" />)
    expect(live(container)).toBe(region)
    expect(region).toHaveTextContent("Saved")
    // The announcement is not part of the button's accessible name.
    expect(screen.getByRole("button").contains(region)).toBe(false)
    rerender(<Save status="idle" />)
    expect(region).toHaveTextContent("")
  })

  it("announces failure, falling back to a generic outcome without labels", () => {
    const { container, rerender } = render(<Button status="pending" aria-label="Refresh" />)
    rerender(<Button status="error" aria-label="Refresh" />)
    expect(live(container)).toHaveTextContent("Failed")
    rerender(<Button status="pending" aria-label="Refresh" />)
    expect(live(container)).toHaveTextContent("")
    rerender(<Button status="success" aria-label="Refresh" />)
    expect(live(container)).toHaveTextContent("Done")
  })

  it("does not announce a status that was set without a pending run", () => {
    const { container } = render(<Save status="error" />)
    expect(live(container)).toHaveTextContent("")
  })

  it("uses custom announcements and can be turned off", () => {
    const { container, rerender } = render(
      <Button status="pending" statusAnnouncement={{ success: "Copied" }}>
        Copy
      </Button>
    )
    rerender(
      <Button status="success" statusAnnouncement={{ success: "Copied" }}>
        Copy
      </Button>
    )
    expect(live(container)).toHaveTextContent("Copied")
    cleanup()
    const off = render(
      <Button status="success" statusAnnouncement={false}>
        Copy
      </Button>
    )
    expect(live(off.container)).toBeNull()
  })

  it("does not remount the focused button when status toggles on and off", () => {
    const { rerender } = render(<Button aria-label="Send" tooltip={false} />)
    const button = screen.getByRole("button")
    button.focus()
    rerender(<Button aria-label="Send" tooltip={false} status="pending" />)
    expect(screen.getByRole("button")).toBe(button)
    rerender(<Button aria-label="Send" tooltip={false} />)
    expect(screen.getByRole("button")).toBe(button)
    expect(document.activeElement).toBe(button)
  })

  it("renders no live region for buttons without status", () => {
    const { container } = render(
      <ButtonGroup attached>
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>
    )
    expect(live(container)).toBeNull()
  })
})
