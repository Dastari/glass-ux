// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { Suspense } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { FoundationDocumentation } from "./documentation.js"
import { DocsKitProvider, type DocsSite } from "./site.js"

afterEach(cleanup)

const section = (id: string, badge?: string) => ({
  [`./sections/${id}.meta.ts`]: { id, title: id === "curves" ? "Curves" : "Colour", group: "Foundations", order: 10, summary: "A sample.", ...(badge ? { badge } : {}) },
})
const site = {
  title: "Sample",
  packageName: "sample",
  version: "1.0.0",
  repositoryUrl: null,
  docsSourceUrl: null,
  catalogue: [],
  families: { roots: [], related: {} },
  guides: [],
  collections: [],
  badges: {},
  sectionMetas: { ...section("colour"), ...section("curves", "Tool") },
  sectionLoaders: {
    "./sections/colour.section.tsx": async () => ({ default: () => <p>Colour body</p> }),
    "./sections/curves.section.tsx": async () => ({ default: () => <p>Curves body</p> }),
  },
  loadContent: async () => ({}),
  loadGuide: async () => "",
} as unknown as DocsSite

const page = (props: { id: string; badge?: string }) =>
  render(
    <DocsKitProvider site={site}>
      <Suspense fallback={null}>
        <FoundationDocumentation {...props} />
      </Suspense>
    </DocsKitProvider>,
  )

describe("FoundationDocumentation badge", () => {
  it("says Foundation by default", () => {
    page({ id: "colour" })
    expect(screen.getByRole("article", { name: "Colour foundation" })).toBeTruthy()
    expect(screen.getByText("Foundation")).toBeTruthy()
  })

  it("takes the section's badge, and a prop over that", () => {
    page({ id: "curves" })
    expect(screen.getByRole("article", { name: "Curves tool" })).toBeTruthy()
    expect(screen.getByText("Tool")).toBeTruthy()
    cleanup()
    page({ id: "curves", badge: "Filter" })
    expect(screen.getByRole("article", { name: "Curves filter" })).toBeTruthy()
    expect(screen.getByText("Filter")).toBeTruthy()
  })
})
