import { describe, expect, it } from "vitest"
import type { EntityResolver } from "../entity-chip/index.js"
import { resolvePreview, type Disclosure } from "./generic.js"

const resolver: EntityResolver = {
  kinds: {},
  preview: () => undefined,
  actions: () => undefined,
  open: () => {},
  openWindow: () => {},
  recognise: (value, typename) => (typename === "SampleAssetSummary" && typeof value.Name === "string" ? { kind: "endpoint", id: value.Name, label: value.Name } : null),
}

const internal = { classification: "Internal" } as const
const scalar = (label?: string): Disclosure => ({ shape: "scalar", rule: internal, label })

describe("resolvePreview", () => {
  it("withholds a preview the server did not send", () => {
    const result = resolvePreview({ id: "a", toolId: "t", title: "Identity", value: null }, resolver)
    expect(result.type).toBe("value")
    expect(result.type === "value" && result.redacted?.redacted).toBe(true)
  })

  it("withholds a result classified above the preview cap", () => {
    const result = resolvePreview({ id: "a", toolId: "t", title: "Identity", value: { Name: "Avery" }, disclosure: { shape: "object", rule: { classification: "Confidential" }, fields: { Name: scalar() } } }, resolver)
    expect(result.type === "value" && result.redacted).toBeTruthy()
  })

  it("renders a scalar root as a value", () => {
    const result = resolvePreview({ id: "a", toolId: "t", title: "Connected", value: { Count: 1207 }, disclosure: { shape: "object", rule: internal, fields: { Count: scalar("Connected") } } }, resolver)
    expect(result).toMatchObject({ type: "value", value: 1207 })
  })

  it("upgrades a recognised object to an entity card", () => {
    const disclosure: Disclosure = { shape: "object", rule: internal, fields: { SampleAssetSummary: { shape: "object", rule: internal, fields: { Name: scalar(), AgentVersion: scalar("Agent") } } } }
    const result = resolvePreview({ id: "a", toolId: "t", title: "NST-C106", value: { SampleAssetSummary: { Name: "NST-C106", AgentVersion: "6.8.0" } }, disclosure }, resolver)
    expect(result).toMatchObject({ type: "entity", entity: { id: "NST-C106" }, facts: [{ label: "Agent", value: "6.8.0" }] })
  })

  it("turns a page of items into a table with its total", () => {
    const disclosure: Disclosure = {
      shape: "object",
      rule: internal,
      fields: { Page: { shape: "object", rule: internal, fields: { Items: { shape: "list", rule: internal, item: { shape: "object", rule: internal, fields: { Summary: scalar("Summary"), Status: scalar("Status") } } }, TotalCount: scalar() } } },
    }
    const result = resolvePreview({ id: "a", toolId: "t", title: "Tickets", value: { Page: { Items: [{ Summary: "Printer", Status: "Open" }], TotalCount: 31 } }, disclosure }, resolver)
    expect(result).toMatchObject({ type: "table", total: 31, columns: [{ header: "Summary" }, { header: "Status" }] })
  })

  it("redacts fields above the cap inside a detail", () => {
    const disclosure: Disclosure = { shape: "object", rule: internal, fields: { Job: { shape: "object", rule: internal, fields: { Status: scalar("Status"), Fault: { shape: "scalar", rule: { classification: "Restricted" }, label: "Fault" } } } } }
    const result = resolvePreview({ id: "a", toolId: "t", title: "Job", value: { Job: { Status: "Open", Fault: "x" } }, disclosure, previewCap: "Confidential" }, resolver)
    expect(result.type).toBe("detail")
    const fault = result.type === "detail" ? result.items.find((item) => item.label === "Fault") : undefined
    expect(fault?.redacted?.redacted).toBe(true)
  })
})
