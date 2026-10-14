/**
 * Demo data shared by the overlay and action gallery sections: realistic endpoints and the
 * endpoint ActionSet that mirrors the reference menu (Connect … Remove device). Every
 * renderer in the gallery reads this one definition.
 */
import {
  IconDatabase,
  IconEdit,
  IconFileText,
  IconFileTransfer,
  IconHibernate,
  IconLayers,
  IconOrganisation,
  IconPower,
  IconRemoteControl,
  IconRestart,
  IconSleep,
  IconStar,
  IconTaskManager,
  IconTerminal,
  IconTrash,
  IconViewOnly,
  IconWake,
} from "../../icons/generated/icons.js"
import { defineActions } from "../../lib/actions/actions.js"

export interface DemoEndpoint {
  id: string
  name: string
  /** Selected assistant model or typed view model. */
  model: string
  os: string
  user: string
  organisation: string
  online: boolean
  favourite: boolean
  lastSeen: string
}

export const ORGANISATIONS = ["Northstar Studio", "Cedar Vale Collective", "Orbit Workspace"] as const

export const ENDPOINTS: DemoEndpoint[] = [
  {
    id: "nst-c106",
    name: "NST-C106",
    model: "HP EliteOne 1000 G2 27-in 4K UHD AiO",
    os: "Windows 11 Business 10.0.26300",
    user: "AzureAD\\MiraRowan",
    organisation: "Northstar Studio",
    online: true,
    favourite: false,
    lastSeen: "Online",
  },
  {
    id: "orb-4e5e",
    name: "LMN-4E5E",
    model: "Lenovo ThinkCentre M70q Gen 4",
    os: "Windows 11 Pro 10.0.26100",
    user: "LMN-4E5E\\Front Counter",
    organisation: "Orbit Workspace",
    online: true,
    favourite: true,
    lastSeen: "Online",
  },
  {
    id: "win11-vm",
    name: "STUDIO-VM",
    model: "VMware Virtual Platform",
    os: "Windows 11 Enterprise 10.0.26100",
    user: "STUDIO-VM\\Avery Quinn",
    organisation: "Orbit Workspace",
    online: false,
    favourite: false,
    lastSeen: "3 h ago",
  },
  {
    id: "cedarvalei-6231",
    name: "CDV-6231",
    model: "Dell OptiPlex 7010 Micro",
    os: "Windows 10 Pro 22H2",
    user: "AzureAD\\EllisPark",
    organisation: "Cedar Vale Collective",
    online: false,
    favourite: false,
    lastSeen: "2 days ago",
  },
]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Flip to make the next long-running demo action fail, to show ✕ + toast. */
export const demoFailures = { next: false }
async function work(ms: number, reason: string) {
  await wait(ms)
  if (demoFailures.next) {
    demoFailures.next = false
    throw new Error(reason)
  }
}

const one = (targets: readonly DemoEndpoint[]) => targets[0]
const name = (targets: readonly DemoEndpoint[]) => (targets.length === 1 ? (one(targets)?.name ?? "") : `${targets.length} endpoints`)
/** "is" for one endpoint, "are" for a bulk selection. */
const is = (targets: readonly DemoEndpoint[]) => (targets.length === 1 ? "is" : "are")
const offline = (targets: readonly DemoEndpoint[]) =>
  targets.some((endpoint) => !endpoint.online) ? (targets.length === 1 ? `${name(targets)} is offline` : "Some selected endpoints are offline") : null

export const endpointActions = defineActions<DemoEndpoint>("endpoint", [
  {
    id: "connect",
    label: "Connect",
    icon: IconRemoteControl,
    group: "connect",
    primary: true,
    priority: 1,
    shortcut: "mod+shift+c",
    disabledReason: offline,
    run: ([endpoint], context) => context.openWindow("remote-control", { endpoint: endpoint?.id ?? "" }),
  },
  {
    id: "view-only",
    label: "View only",
    icon: IconViewOnly,
    group: "connect",
    priority: 3,
    disabledReason: offline,
    run: ([endpoint], context) => context.openWindow("remote-control", { endpoint: endpoint?.id ?? "", mode: "view" }),
  },
  {
    id: "file-transfer",
    label: "File transfer",
    icon: IconFileTransfer,
    group: "connect",
    priority: 2,
    disabledReason: offline,
    run: ([endpoint], context) => context.openWindow("file-transfer", { endpoint: endpoint?.id ?? "" }),
  },
  {
    id: "command-prompt",
    label: "Command prompt",
    icon: IconTerminal,
    group: "connect",
    disabledReason: offline,
    run: ([endpoint], context) => context.openWindow("terminal", { endpoint: endpoint?.id ?? "" }),
  },
  {
    id: "remote-tools",
    label: "Remote tools",
    icon: IconTaskManager,
    group: "connect",
    disabledReason: offline,
    children: [
      { id: "task-manager", label: "Task manager", icon: IconTaskManager, group: "connect", run: ([e], c) => c.openWindow("task-manager", { endpoint: e?.id ?? "" }) },
      { id: "services", label: "Services", icon: IconLayers, group: "connect", run: ([e], c) => c.openWindow("services", { endpoint: e?.id ?? "" }) },
      { id: "registry", label: "Registry editor", icon: IconDatabase, group: "connect", run: ([e], c) => c.openWindow("registry", { endpoint: e?.id ?? "" }) },
      { id: "event-log", label: "Event log", icon: IconFileText, group: "connect", run: ([e], c) => c.openWindow("event-log", { endpoint: e?.id ?? "" }) },
    ],
  },
  {
    id: "power",
    label: "Power",
    icon: IconPower,
    group: "manage",
    bulk: true,
    children: [
      {
        id: "restart",
        label: "Restart",
        icon: IconRestart,
        group: "manage",
        bulk: true,
        shortcut: "mod+shift+r",
        disabledReason: offline,
        run: (targets) => work(1200, `Agent offline — retry when ${name(targets)} ${targets.length === 1 ? "reconnects" : "reconnect"}`),
        successMessage: (targets) => `${name(targets)} ${is(targets)} restarting`,
      },
      {
        id: "shut-down",
        label: "Shut down",
        icon: IconPower,
        group: "manage",
        bulk: true,
        disabledReason: offline,
        confirm: (targets) => ({
          title: `Shut down ${name(targets)}?`,
          body: `${one(targets)?.user ?? "The signed-in user"} is signed in and loses unsaved work.`,
          confirmLabel: "Shut down",
        }),
        run: (targets) => work(1200, `Agent offline — retry when ${name(targets)} ${targets.length === 1 ? "reconnects" : "reconnect"}`),
        successMessage: (targets) => `${name(targets)} ${is(targets)} shutting down`,
      },
      {
        id: "wake",
        label: "Wake on LAN",
        icon: IconWake,
        group: "manage",
        bulk: true,
        disabledReason: (targets) => (targets.every((endpoint) => endpoint.online) ? (targets.length === 1 ? "Endpoint is online" : "Selected endpoints are online") : null),
        run: (targets) => work(900, `No wake relay in ${one(targets)?.organisation ?? "this organisation"}`),
        successMessage: (targets) => `Wake packet sent to ${name(targets)}`,
      },
      {
        id: "sleep",
        label: "Sleep",
        icon: IconSleep,
        group: "manage",
        bulk: true,
        disabledReason: offline,
        run: (targets) => work(900, `Agent offline — retry when ${name(targets)} ${targets.length === 1 ? "reconnects" : "reconnect"}`),
        successMessage: (targets) => `${name(targets)} ${is(targets)} going to sleep`,
      },
      {
        id: "hibernate",
        label: "Hibernate",
        icon: IconHibernate,
        group: "manage",
        bulk: true,
        disabledReason: offline,
        run: (targets) => work(900, `Agent offline — retry when ${name(targets)} ${targets.length === 1 ? "reconnects" : "reconnect"}`),
        successMessage: (targets) => `${name(targets)} ${is(targets)} hibernating`,
      },
    ],
  },
  {
    id: "edit",
    label: "Edit device",
    icon: IconEdit,
    group: "manage",
    priority: 4,
    run: ([endpoint], context) => context.openWindow("endpoint-settings", { endpoint: endpoint?.id ?? "" }),
  },
  {
    id: "move",
    label: "Move to organisation",
    icon: IconOrganisation,
    group: "organise",
    bulk: true,
    children: ORGANISATIONS.map((organisation) => ({
      id: `move-${organisation}`,
      label: organisation,
      group: "organise" as const,
      bulk: true,
      visible: (targets: readonly DemoEndpoint[]) => targets.some((endpoint) => endpoint.organisation !== organisation),
      run: () => work(800, `Couldn't reach ${organisation}`),
      successMessage: (targets: readonly DemoEndpoint[]) => `${name(targets)} moved to ${organisation}`,
    })),
  },
  {
    id: "favourite",
    label: (targets) => (targets.every((endpoint) => endpoint.favourite) ? "Remove from favourites" : "Add to favourites"),
    icon: IconStar,
    group: "organise",
    run: () => undefined,
    successMessage: (targets) =>
      targets.every((endpoint) => endpoint.favourite) ? `${name(targets)} removed from favourites` : `${name(targets)} added to favourites`,
  },
  {
    id: "remove",
    label: "Remove device",
    icon: IconTrash,
    group: "danger",
    bulk: true,
    confirm: (targets) => ({
      title: `Remove ${name(targets)} from ${one(targets)?.organisation ?? "its organisation"}?`,
      body: "The agent uninstalls at its next check-in. Its history stays in reports.",
      confirmLabel: "Remove device",
      tone: "danger",
    }),
    run: (targets) => work(1400, `Agent offline — retry when ${name(targets)} ${targets.length === 1 ? "reconnects" : "reconnect"}`),
    successMessage: (targets) => `${name(targets)} removed from ${one(targets)?.organisation ?? "its organisation"}`,
  },
])
