import { describe, expect, it } from "vitest"
import { defineActions, resolveActions, splitForHeader } from "./actions.js"

interface Endpoint {
  id: string
  online: boolean
}

const set = defineActions<Endpoint>("endpoint", [
  { id: "remove", label: "Remove device", group: "danger", confirm: () => ({ title: "Remove?", confirmLabel: "Remove", tone: "danger" }) },
  { id: "connect", label: "Connect", group: "connect", primary: true, priority: 1, disabledReason: ([e]) => (e?.online ? null : "Endpoint offline") },
  { id: "files", label: "File transfer", group: "connect", priority: 2 },
  { id: "restart", label: (targets) => (targets.length > 1 ? `Restart ${targets.length} endpoints` : "Restart"), group: "manage", bulk: true },
  { id: "favourite", label: "Add to favourites", group: "organise", surfaces: ["menu", "context"] },
  {
    id: "power",
    label: "Power",
    group: "manage",
    children: [
      { id: "shutdown", label: "Shut down", group: "manage" },
      { id: "wake", label: "Wake on LAN", group: "manage", visible: ([e]) => !e?.online },
    ],
  },
])

describe("actions", () => {
  it("orders groups with danger last and keeps definition order inside a group", () => {
    const groups = resolveActions(set, [{ id: "a", online: true }], "menu")
    expect(groups.map((g) => g.group)).toEqual(["connect", "manage", "organise", "danger"])
    expect(groups[1]?.actions.map((a) => a.id)).toEqual(["restart", "power"])
  })

  it("applies visibility, disabled reasons and surface restrictions", () => {
    const offline = resolveActions(set, [{ id: "a", online: false }], "header")
    const connect = offline.flatMap((g) => g.actions).find((a) => a.id === "connect")
    expect(connect?.disabledReason).toBe("Endpoint offline")
    expect(offline.flatMap((g) => g.actions).some((a) => a.id === "favourite")).toBe(false)
    const power = offline.flatMap((g) => g.actions).find((a) => a.id === "power")
    expect(power?.children.map((c) => c.id)).toEqual(["shutdown", "wake"])
  })

  it("keeps only bulk actions for several targets and labels them for the count", () => {
    const groups = resolveActions(set, [{ id: "a", online: true }, { id: "b", online: true }], "bulk")
    expect(groups.flatMap((g) => g.actions).map((a) => a.label)).toEqual(["Restart 2 endpoints"])
  })

  it("promotes header actions by priority with the primary right-most", () => {
    const { promoted, overflow } = splitForHeader(resolveActions(set, [{ id: "a", online: true }], "header"), 2)
    expect(promoted.map((a) => a.id)).toEqual(["files", "connect"])
    expect(overflow.flatMap((g) => g.actions).map((a) => a.id)).toEqual(["restart", "power", "remove"])
  })

  it("rejects two primaries", () => {
    expect(() =>
      defineActions("x", [
        { id: "a", label: "A", group: "open", primary: true },
        { id: "b", label: "B", group: "open", primary: true },
      ])
    ).toThrow(/at most one primary/)
  })

  it("offers a split action's own run as the first item of its submenu", () => {
    const split = defineActions<Endpoint>("endpoint", [
      {
        id: "connect",
        label: "Connect",
        group: "connect",
        primary: true,
        run: () => undefined,
        children: [{ id: "view-only", label: "View only", group: "connect", run: () => undefined }],
      },
    ])
    const [connect] = resolveActions(split, [{ id: "a", online: true }], "menu").flatMap((g) => g.actions)
    expect(connect?.children.map((c) => [c.id, c.label])).toEqual([
      ["connect:self", "Connect"],
      ["view-only", "View only"],
    ])
  })
})
