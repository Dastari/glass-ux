// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Grid, Stack } from "../layout/index.js"
import { Heading, Text } from "../text/index.js"
import { Link } from "./index.js"

afterEach(cleanup)

describe("Link", () => {
  it("marks a new tab visibly and for screen readers", () => {
    render(
      <Link href="https://example.com" newTab>
        Vendor notes
      </Link>,
    )
    const link = screen.getByRole("link", { name: /^Vendor notes\s*\(opens in a new tab\)$/ })
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe("noopener noreferrer")
    expect(link.querySelector(".fa-link-external")).toBeTruthy()
  })

  it("drops the href when disabled and renders through a router element", () => {
    const { container } = render(
      <>
        <Link href="#a" disabled>
          Export
        </Link>
        <Link href="#b" render={<a data-router="" href="#routed" />}>
          Routed
        </Link>
      </>,
    )
    const disabled = container.querySelector('[aria-disabled="true"]')!
    expect(disabled.hasAttribute("href")).toBe(false)
    const routed = screen.getByText("Routed").closest("a")!
    expect(routed.hasAttribute("data-router")).toBe(true)
    expect(routed.getAttribute("href")).toBe("#routed")
    expect(routed.className).toContain("fa-link")
  })
})

describe("Text, Heading, Stack and Grid", () => {
  it("sets roles as data attributes and gaps from the spacing roles", () => {
    const { container } = render(
      <Stack direction="row" gap="panels">
        <Heading level={3}>Alerts</Heading>
        <Text tone="muted" truncate={2}>
          Two lines at most
        </Text>
        <Grid columns={3} gap={2} />
      </Stack>,
    )
    expect(screen.getByRole("heading", { level: 3 }).getAttribute("data-variant")).toBe("title")
    const text = screen.getByText("Two lines at most")
    expect(text.getAttribute("data-truncate")).toBe("lines")
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--_gap")).toBe("var(--gap-panels)")
    expect((container.querySelector(".fa-grid") as HTMLElement).style.getPropertyValue("--_gap")).toBe("var(--space-2)")
  })
})
