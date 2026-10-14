import { describe, expect, it } from "vitest"
import { deepEqual, getPath, ownsField, resolveSetting, secretPatch, secretValue, secretWillBeSet, tabMarkers, type SettingLayer } from "./settings-state.js"

const layers = (workspace: boolean | null, organisation: boolean | null, device: boolean | null): SettingLayer<boolean>[] => [
  { scope: "workspace", label: "the workspace", value: workspace },
  { scope: "organisation", label: "NST", value: organisation },
  { scope: "device", label: "this device", value: device },
]

describe("resolveSetting (workspace → organisation → entity)", () => {
  it("takes the narrowest scope that sets a value", () => {
    const resolved = resolveSetting(layers(false, true, null))
    expect(resolved.value).toBe(true)
    expect(resolved.source?.label).toBe("NST")
    expect(resolved.overridden).toBe(false)
  })

  it("an entity override wins and still reports what it would inherit", () => {
    const resolved = resolveSetting(layers(false, true, false))
    expect(resolved.value).toBe(false)
    expect(resolved.overridden).toBe(true)
    expect(resolved.source?.scope).toBe("device")
    expect(resolved.inherited).toEqual({ value: true, source: expect.objectContaining({ label: "NST" }) })
  })

  it("falls through unset scopes to the workspace, then to the built-in default", () => {
    expect(resolveSetting(layers(true, null, null)).source?.label).toBe("the workspace")
    const none = resolveSetting(layers(null, null, null), false)
    expect(none.value).toBe(false)
    expect(none.source).toBeUndefined()
    expect(none.overridden).toBe(false)
  })

  it("treats false as a value, not as unset", () => {
    const resolved = resolveSetting(layers(true, false, null))
    expect(resolved.value).toBe(false)
    expect(resolved.source?.label).toBe("NST")
  })

  it("resolves objects (an SNMP profile) the same way", () => {
    const resolved = resolveSetting<{ version: string }>([
      { scope: "workspace", label: "the workspace", value: { version: "v2c" } },
      { scope: "site", label: "North studio", value: { version: "v3" } },
      { scope: "device", label: "this device", value: undefined },
    ])
    expect(resolved.value).toEqual({ version: "v3" })
    expect(resolved.source?.scope).toBe("site")
  })
})

describe("resolveSetting: sites and enforcement", () => {
  const chain = (opts: { workspace?: boolean | null; organisation?: boolean | null; site?: boolean | null; device?: boolean | null; enforce?: "workspace" | "organisation" | "site" }): SettingLayer<boolean>[] => [
    { scope: "workspace", label: "the workspace", value: opts.workspace ?? null, enforced: opts.enforce === "workspace" },
    { scope: "organisation", label: "Orbit Workspace", value: opts.organisation ?? null, enforced: opts.enforce === "organisation" },
    { scope: "site", label: "Central studio (site)", value: opts.site ?? null, enforced: opts.enforce === "site" },
    { scope: "device", label: "this device", value: opts.device ?? null },
  ]

  it("a site sits between the organisation and the entity", () => {
    const resolved = resolveSetting(chain({ workspace: false, organisation: true, site: false }))
    expect(resolved.value).toBe(false)
    expect(resolved.source?.label).toBe("Central studio (site)")
    expect(resolveSetting(chain({ workspace: false, organisation: true })).source?.label).toBe("Orbit Workspace")
  })

  it("an enforced level wins over every narrower one, including the entity's own value", () => {
    const resolved = resolveSetting(chain({ organisation: true, site: false, device: false, enforce: "organisation" }))
    expect(resolved.value).toBe(true)
    expect(resolved.enforced?.label).toBe("Orbit Workspace")
    expect(resolved.overridden).toBe(false)
    expect(resolved.inherited.source?.label).toBe("Orbit Workspace")
  })

  it("the broadest enforcement wins; an enforcement with no value enforces nothing", () => {
    const both = chain({ workspace: false, organisation: true, enforce: "workspace" })
    both[1] = { ...both[1]!, enforced: true }
    expect(resolveSetting(both).enforced?.scope).toBe("workspace")
    expect(resolveSetting(chain({ site: null, device: true, enforce: "site" })).enforced).toBeUndefined()
  })
})

describe("tab markers", () => {
  const tabs = [{ value: "general", fields: ["general"] }, { value: "snmp", fields: ["snmp"] }, { value: "notes", fields: ["notes"] }, { value: "remove" }]
  const clean = { "general.name": { isDefaultValue: true, errors: [] }, "snmp.port": { isDefaultValue: true, errors: [] }, "notes.text": { isDefaultValue: true, errors: [] } }

  it("marks a tab dirty when a field it owns differs from its saved value", () => {
    expect(tabMarkers(tabs, { ...clean, "snmp.port": { isDefaultValue: false, errors: [] } })).toEqual({ snmp: "dirty" })
  })

  it("an error beats dirty, and is matched by prefix", () => {
    expect(
      tabMarkers(tabs, {
        ...clean,
        "snmp.port": { isDefaultValue: false, errors: ["Enter a port from 1 to 65535"] },
        "notes.text": { isDefaultValue: false, errors: [] },
        "general.name": { isDefaultValue: true, errors: [undefined] },
      })
    ).toEqual({ snmp: "error", notes: "dirty" })
  })

  it("a value changed back is clean again, and a tab with no fields never marks", () => {
    expect(tabMarkers(tabs, clean)).toEqual({})
  })

  it("matches nested and indexed field names", () => {
    expect(ownsField(["context"], "context.links[2].relation")).toBe(true)
    expect(ownsField(["snmp"], "snmpProfile")).toBe(false)
    expect(getPath({ context: { links: [{ relation: "related" }] } }, "context.links[0].relation")).toBe("related")
    expect(deepEqual({ a: [1, { b: 2 }], c: undefined }, { a: [1, { b: 2 }] })).toBe(true)
  })
})

describe("secrets", () => {
  it("keeps, replaces or clears without ever holding the stored value", () => {
    const stored = secretValue(true)
    expect(secretWillBeSet(stored)).toBe(true)
    expect(secretPatch(stored)).toBeUndefined()
    expect(secretPatch({ ...stored, action: "replace", value: "n3w-secret" })).toBe("n3w-secret")
    expect(secretWillBeSet({ ...stored, action: "replace", value: "" })).toBe(false)
    expect(secretPatch({ ...stored, action: "clear" })).toBeNull()
    expect(secretWillBeSet(secretValue(false))).toBe(false)
  })
})
