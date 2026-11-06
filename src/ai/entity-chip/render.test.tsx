// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { EntityChip, EntityGlyph, EntityResolverProvider, type EntityResolver } from "./index.js"

const base: EntityResolver = {
  kinds: {},
  preview: () => undefined,
  actions: () => undefined,
  open: () => {},
  openWindow: () => {},
}

describe("entity render swap point", () => {
  it("draws chips, rows and glyphs with the application's renderer", () => {
    const seen: string[] = []
    const resolver: EntityResolver = {
      ...base,
      render: (entity, tier) => {
        seen.push(tier)
        return <span data-testid={`${tier}-${entity.id}`}>{entity.label}</span>
      },
    }
    const entity = { kind: "endpoint", id: "NST-C106", label: "NST-C106" }
    render(
      <EntityResolverProvider resolver={resolver}>
        <EntityChip entity={entity} />
        <EntityChip entity={entity} variant="plain" />
        <EntityGlyph entity={entity} />
      </EntityResolverProvider>
    )
    expect(screen.getByTestId("chip-NST-C106")).toBeTruthy()
    expect(screen.getByTestId("row-NST-C106")).toBeTruthy()
    expect(screen.getByTestId("icon-NST-C106")).toBeTruthy()
    expect(seen).toEqual(["chip", "row", "icon"])
  })

  it("falls back to the built-in chip when the renderer returns undefined", () => {
    const resolver: EntityResolver = { ...base, render: () => undefined }
    render(
      <EntityResolverProvider resolver={resolver}>
        <EntityChip entity={{ kind: "ticket", id: "4821", label: "Ticket 4821" }} preview={false} />
      </EntityResolverProvider>
    )
    expect(screen.getByRole("link", { name: /Ticket 4821/ }).getAttribute("class")).toContain("fa-ai-chip")
  })
})

describe("removable EntityChip", () => {
  const entity = { kind: "endpoint", id: "NST-C106", label: "NST-C106" }

  it("keeps its link and opens from it, with the ✕ beside it", () => {
    const opened = vi.fn()
    const remove = vi.fn()
    render(
      <EntityResolverProvider resolver={{ ...base, open: opened, kinds: { endpoint: { segment: "endpoints" } } as EntityResolver["kinds"] }}>
        <EntityChip entity={entity} preview={false} glyph={false} onRemove={remove} />
      </EntityResolverProvider>
    )
    const link = screen.getByRole("link", { name: "NST-C106" })
    const close = screen.getByRole("button", { name: /NST-C106/ })
    expect(link.getAttribute("href")).toBe("/endpoints/NST-C106")
    expect(link.contains(close)).toBe(false)
    fireEvent.click(close)
    expect(remove).toHaveBeenCalledTimes(1)
    expect(opened).not.toHaveBeenCalled()
    fireEvent.click(link)
    expect(opened).toHaveBeenCalledTimes(1)
  })
})
