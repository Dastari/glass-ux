// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { Menu, MenuPreview } from "./menu.js"

afterEach(cleanup)

function Open() {
  return (
    <Menu.Root defaultOpen>
      <Menu.Trigger>Actions</Menu.Trigger>
      <Menu.Popup aria-label="Actions">
        <Menu.Item>Rename</Menu.Item>
        <Menu.Item disabledReason="Connect is not available while offline">Connect</Menu.Item>
        <Menu.Item disabledReason="Connect is not available while offline" reasonShown={false} reasonId="shared">
          Terminal
        </Menu.Item>
        <Menu.Submenu label="Power" disabledReason="Power is not available while offline">
          <Menu.Item>Restart</Menu.Item>
        </Menu.Submenu>
      </Menu.Popup>
    </Menu.Root>
  )
}

const description = (element: HTMLElement) => {
  const id = element.getAttribute("aria-describedby")
  return id ? document.getElementById(id) : null
}

describe("Menu disabled reason", () => {
  it("describes a disabled row with its own hidden reason, with no caption line", async () => {
    render(<Open />)
    const connect = await screen.findByRole("menuitem", { name: "Connect" })
    expect(connect).toHaveAttribute("aria-disabled", "true")
    const reason = description(connect)
    expect(reason).toHaveTextContent("Connect is not available while offline")
    expect(reason).not.toBeVisible()
    expect(document.querySelector(".fa-menu-reason")).toBeNull()
  })

  it("ignores the deprecated run-sharing props", async () => {
    render(<Open />)
    const terminal = await screen.findByRole("menuitem", { name: "Terminal" })
    expect(terminal.getAttribute("aria-describedby")).not.toBe("shared")
    expect(description(terminal)).toHaveTextContent("Connect is not available while offline")
    expect(terminal).not.toHaveAttribute("reasonid")
  })

  it("describes a disabled submenu trigger", async () => {
    render(<Open />)
    const power = await screen.findByRole("menuitem", { name: "Power" })
    expect(power).toHaveAttribute("aria-disabled", "true")
    expect(description(power)).toHaveTextContent("Power is not available while offline")
  })

  it("leaves an enabled row undescribed", async () => {
    render(<Open />)
    const rename = await screen.findByRole("menuitem", { name: "Rename" })
    expect(rename).not.toHaveAttribute("aria-describedby")
    expect(rename).not.toHaveAttribute("aria-disabled")
  })
})

describe("MenuPreview", () => {
  it("draws a disabled row without a reason line", () => {
    const { container } = render(
      <MenuPreview.Surface label="Actions">
        <MenuPreview.Item disabledReason="Not available">Connect</MenuPreview.Item>
      </MenuPreview.Surface>
    )
    expect(container.querySelector("[data-disabled]")).toHaveTextContent("Connect")
    expect(container).not.toHaveTextContent("Not available")
  })
})
