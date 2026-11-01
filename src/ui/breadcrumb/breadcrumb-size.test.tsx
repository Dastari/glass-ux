// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { createHash } from "node:crypto"
import { Breadcrumb, type Crumb } from "./index.js"

afterEach(cleanup)

const items: Crumb[] = [
  { id: "etc", label: "etc", onSelect: () => {} },
  { id: "cedar", label: "cedar", onSelect: () => {} },
  { id: "storage", label: "storage.conf" },
]

describe("Breadcrumb size", () => {
  it("renders the default exactly as it did before the size prop", () => {
    const html = render(<Breadcrumb items={items} />).container.innerHTML
    cleanup()
    const explicit = render(<Breadcrumb items={items} size="sm" />).container.innerHTML
    // SHA-256 of the markup the component produced for these items before `size` existed.
    expect(createHash("sha256").update(html).digest("hex")).toBe("9b81672495b321496006b5e37cd199a2c5d805009d417558c855c99a8d553835")
    expect(explicit).toBe(html)
    expect(html).not.toContain("data-size")
  })

  it("marks the compact form and names it Path, not Breadcrumb", () => {
    render(<Breadcrumb items={items} size="xs" />)
    const nav = screen.getByRole("navigation", { name: "Path" })
    expect(nav.getAttribute("data-size")).toBe("xs")
    expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).toBeNull()
  })

  it("takes the host's label", () => {
    render(<Breadcrumb items={items} size="xs" aria-label="File path" />)
    expect(screen.getByRole("navigation", { name: "File path" }).getAttribute("data-mode")).toBe("full")
  })

  it("keeps the default name for the default size", () => {
    render(<Breadcrumb items={items} />)
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy()
  })

  it("keeps every crumb a labelled link or button, the current one marked", () => {
    render(<Breadcrumb items={items} size="xs" aria-label="File path" />)
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["etc", "cedar"])
    expect(screen.getByRole("navigation", { name: "File path" }).querySelector("[aria-current]")?.textContent).toBe("storage.conf")
  })
})
