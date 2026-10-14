import { describe, expect, it, vi } from "vitest"
import { defineActions, resolveActions, type ActionContext } from "../../lib/actions/actions.js"
import { resolveRowActions } from "./row-actions.js"

interface Device {
  name: string
  kind: "endpoint" | "printer"
  online: boolean
}

const endpointRun = vi.fn()
const printerRun = vi.fn()
const pingEndpoint = vi.fn()
const pingPrinter = vi.fn()

const name = (targets: readonly Device[]) => (targets.length === 1 ? targets[0]!.name : `${targets.length} devices`)

const endpointSet = defineActions<Device>("device.endpoint", [
  { id: "connect", label: "Connect", group: "connect", primary: true, disabledReason: (targets) => (targets.some((device) => !device.online) ? `${name(targets)} is offline` : null) },
  { id: "entity-settings", label: "Settings…", group: "manage", run: () => undefined },
  { id: "ping", label: "Ping", group: "connect", bulk: true, run: pingEndpoint },
  {
    id: "remove",
    label: "Remove device",
    group: "danger",
    bulk: true,
    confirm: (targets) => ({ title: `Remove ${name(targets)}?`, confirmLabel: "Remove device", tone: "danger" }),
    run: endpointRun,
    successMessage: (targets) => `${name(targets)} removed`,
  },
])

const printerSet = defineActions<Device>("device.printer", [
  { id: "open-web", label: "Open web interface", group: "connect", primary: true, run: () => undefined },
  { id: "entity-settings", label: "Settings…", group: "manage", run: () => undefined },
  {
    id: "ping",
    label: (targets) => `Ping ${name(targets)}`,
    group: "connect",
    bulk: true,
    disabledReason: (targets) => (targets.some((device) => !device.online) ? "No relay reached CDV-PRN-CLINIC" : null),
    run: pingPrinter,
  },
  { id: "test-page", label: "Print test page", group: "manage", bulk: true, run: () => undefined },
  { id: "remove", label: "Remove device", group: "danger", bulk: true, run: printerRun },
])

const setOf = (device: Device) => (device.kind === "endpoint" ? endpointSet : printerSet)
const ids = (groups: ReturnType<typeof resolveRowActions<Device>>) => groups.flatMap((group) => group.actions.map((action) => action.id))

const c106: Device = { name: "NST-C106", kind: "endpoint", online: true }
const orb: Device = { name: "LMN-4E5E", kind: "endpoint", online: true }
const ricoh: Device = { name: "FA-RICOH-L2", kind: "printer", online: true }
const clinic: Device = { name: "CDV-PRN-CLINIC", kind: "printer", online: false }

const context: ActionContext = { surface: "bulk", navigate: () => undefined, toast: () => undefined, openWindow: () => undefined }

describe("resolveRowActions", () => {
  it("resolves one row against its own set, exactly as its header's set does", () => {
    expect(resolveRowActions([ricoh], setOf, "menu")).toEqual(resolveActions(printerSet, [ricoh], "menu"))
    expect(ids(resolveRowActions([c106], setOf, "context"))).toEqual(["connect", "ping", "entity-settings", "remove"])
    expect(ids(resolveRowActions([ricoh], setOf, "context"))).toEqual(["open-web", "ping", "entity-settings", "test-page", "remove"])
  })

  it("resolves rows of one kind against that kind's set", () => {
    expect(ids(resolveRowActions([ricoh, clinic], setOf, "bulk"))).toEqual(["ping", "test-page", "remove"])
    expect(ids(resolveRowActions([c106, orb], setOf, "bulk"))).toEqual(["ping", "remove"])
  })

  it("offers a mixed selection only the bulk actions every kind resolves", () => {
    const groups = resolveRowActions([c106, ricoh], setOf, "bulk")
    // Settings… is in both sets but not bulk; Print test page is the printer's alone.
    expect(ids(groups)).toEqual(["ping", "remove"])
  })

  it("labels a merged action for the whole selection and keeps any kind's disabled reason", () => {
    const groups = resolveRowActions([c106, clinic], setOf, "bulk")
    const ping = groups.flatMap((group) => group.actions).find((action) => action.id === "ping")!
    expect(ping.label).toBe("Ping")
    expect(ping.disabledReason).toBe("No relay reached CDV-PRN-CLINIC")
  })

  it("runs each kind's own definition against its own rows", async () => {
    const remove = resolveRowActions([c106, ricoh, orb], setOf, "bulk")
      .flatMap((group) => group.actions)
      .find((action) => action.id === "remove")!
    await remove.definition.run?.([c106, ricoh, orb], context)
    expect(endpointRun).toHaveBeenCalledWith([c106, orb], context)
    expect(printerRun).toHaveBeenCalledWith([ricoh], context)
  })

  it("asks once for the confirmation any kind needs, naming the whole selection", () => {
    const remove = resolveRowActions([ricoh, c106], setOf, "bulk")
      .flatMap((group) => group.actions)
      .find((action) => action.id === "remove")!
    expect(remove.definition.confirm?.([ricoh, c106])?.title).toBe("Remove 2 devices?")
    expect(remove.definition.successMessage?.([ricoh, c106])).toBe("2 devices removed")
  })

  it("runs a definition every kind shares once, with every row", () => {
    const move = vi.fn()
    const one = defineActions<Device>("device.endpoint", [{ id: "move", label: "Move to organisation…", group: "organise", bulk: true, run: move }])
    const two = defineActions<Device>("device.printer", [{ id: "move", label: "Move to organisation…", group: "organise", bulk: true, run: move }])
    const action = resolveRowActions([c106, ricoh, orb], (device) => (device.kind === "endpoint" ? one : two), "bulk")
      .flatMap((group) => group.actions)
      .find((entry) => entry.id === "move")!
    void action.definition.run?.([c106, ricoh, orb], context)
    expect(move).toHaveBeenCalledTimes(1)
    expect(move).toHaveBeenCalledWith([c106, ricoh, orb], context)
  })

  it("never merges a submenu with a plain action of the same id", () => {
    const menu = defineActions<Device>("device.endpoint", [
      { id: "move", label: "Move to organisation", group: "organise", bulk: true, children: [{ id: "move-northstar", label: "Northstar Studio", group: "organise", bulk: true, run: () => undefined }] },
    ])
    const plain = defineActions<Device>("device.printer", [{ id: "move", label: "Move to organisation…", group: "organise", bulk: true, run: () => undefined }])
    expect(resolveRowActions([c106, ricoh], (device) => (device.kind === "endpoint" ? menu : plain), "bulk")).toEqual([])
  })

  it("offers nothing when some row has no actions", () => {
    expect(resolveRowActions([c106, ricoh], (device) => (device.kind === "endpoint" ? endpointSet : undefined), "bulk")).toEqual([])
    expect(resolveRowActions([], setOf, "bulk")).toEqual([])
  })
})
