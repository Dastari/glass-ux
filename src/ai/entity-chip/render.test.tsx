// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
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
