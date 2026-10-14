/**
 * tokens:allow-file ticket numbers (#7102) read as hex colours to the token check.
 * Realistic Glass UX data for the AI gallery sections and the /preview/ai templates: the
 * application's entity kinds and resolver, sessions, results, asks and one long mixed
 * conversation. Not a section itself (the registry loads only *.meta.ts / *.section.tsx).
 */
import {
  IconClock,
  IconCode,
  IconCpu,
  IconEndpoint,
  IconFileText,
  IconGlobe,
  IconMemory,
  IconNetwork,
  IconOperatingSystem,
  IconOrganisation,
  IconPatch,
  IconPopOut,
  IconPower,
  IconPrinter,
  IconRemoteControl,
  IconRestart,
  IconSoftware,
  IconTag,
  IconTasks,
  IconTerminal,
  IconTickets,
  IconUser,
  IconUsers,
  IconWake,
  IconWarning,
} from "../../icons/generated/icons.js"
import { defineActions, type ActionSet } from "../../lib/actions/actions.js"
import { toast } from "../../ui/toast/index.js"
import {
  defineEntityKinds,
  type AiApproval,
  type AiAsk,
  type AiBudget,
  type AiMessage,
  type AiProject,
  type AiResult,
  type AiSession,
  type AiSource,
  type AiToolCall,
  type ApprovalAsk,
  type ComposerModel,
  type EntityRef,
  type EntityResolver,
  type SlashCommand,
  type Suggestion,
  type ToolPreview,
} from "../../ai/index.js"
import { DEMO_DATASET } from "../fixtures/organisations.js"
import { screenshot } from "./ai.screens.js"


const MINUTE = 60_000
const HOUR = 60 * MINUTE
/** Rounded to the minute so server and client render the same times. */
export const NOW = Math.floor(Date.now() / MINUTE) * MINUTE
const ago = (ms: number) => NOW - ms
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/* ── Entity kinds ─────────────────────────────────────────────────────────── */

export const DEMO_KINDS = defineEntityKinds({
  endpoint: { icon: IconEndpoint, noun: "Endpoint", plural: "Endpoints", segment: "endpoints" },
  organisation: { icon: IconOrganisation, noun: "Organisation", plural: "Organisations", segment: "organisations" },
  ticket: { icon: IconTickets, noun: "Ticket", plural: "Tickets", segment: "tickets" },
  user: { icon: IconUser, noun: "User", plural: "Users", segment: "users" },
  software: { icon: IconSoftware, noun: "Software", plural: "Software", segment: "software" },
  script: { icon: IconCode, noun: "Script", plural: "Scripts", segment: "scripts" },
  alert: { icon: IconWarning, noun: "Alert", plural: "Alerts", segment: "alerts" },
  printer: { icon: IconPrinter, noun: "Printer", plural: "Printers", segment: "printers" },
  job: { icon: IconTasks, noun: "Project job", plural: "Project jobs", segment: "jobs" },
})

/* ── Entities ─────────────────────────────────────────────────────────────── */


/** An organisation from the domain dataset, as an AI entity reference. */
function organisationRef(id: string): EntityRef {
  const org = DEMO_DATASET.organisations.find((entry) => entry.id === id)!
  return { kind: "organisation", id: org.id, label: org.name }
}

/** A person from the domain dataset, as an AI entity reference ("user" is the person kind). */
function personRef(id: string): EntityRef {
  const person = DEMO_DATASET.people.find((entry) => entry.id === id)!
  return { kind: "user", id: person.id, label: person.name }
}

export const E = {
  c106: { kind: "endpoint", id: "NST-C106", label: "NST-C106", status: "offline" },
  c106Online: { kind: "endpoint", id: "NST-C106", label: "NST-C106", status: "online" },
  c112: { kind: "endpoint", id: "NST-C112", label: "NST-C112", status: "offline" },
  c118: { kind: "endpoint", id: "NST-C118", label: "NST-C118", status: "offline" },
  reception: { kind: "endpoint", id: "NST-REC01", label: "NST-REC01", status: "offline" },
  library: { kind: "endpoint", id: "NST-LIB02", label: "NST-LIB02", status: "offline" },
  depot: { kind: "endpoint", id: "NST-DEPOT3", label: "NST-DEPOT3", status: "offline" },
  acs4e5e: { kind: "endpoint", id: "LMN-4E5E", label: "LMN-4E5E", status: "online" },
  acs4e5f: { kind: "endpoint", id: "LMN-4E5F", label: "LMN-4E5F", status: "online" },
  acs7b73: { kind: "endpoint", id: "LMN-7B73", label: "LMN-7B73", status: "warning" },
  win11vm: { kind: "endpoint", id: "STUDIO-VM", label: "STUDIO-VM", status: "online" },
  fia01: { kind: "endpoint", id: "CDV-ADMIN01", label: "CDV-ADMIN01", status: "online" },
  fia02: { kind: "endpoint", id: "CDV-CLINIC02", label: "CDV-CLINIC02", status: "warning" },
  fia03: { kind: "endpoint", id: "CDV-CLINIC03", label: "CDV-CLINIC03", status: "online" },
  fia04: { kind: "endpoint", id: "CDV-RECEPT01", label: "CDV-RECEPT01", status: "online" },
  // Organisations and people are the domain dataset's (docs/domain.md).
  northstar: organisationRef("northstar"),
  cedarvale: organisationRef("cedarvale"),
  fa: organisationRef("orbit"),
  t7102: { kind: "ticket", id: "7102", label: "#7102", state: { label: "Open", tone: "accent" } },
  t7105: { kind: "ticket", id: "7105", label: "#7105", state: { label: "Waiting", tone: "warning" } },
  mira: personRef("mira.rowan"),
  avery: personRef("avery.quinn"),
  chrome: { kind: "software", id: "google-chrome", label: "Google Chrome", meta: "129.0" },
  clearQueue: { kind: "script", id: "clear-printqueue", label: "Clear-PrintQueue.ps1" },
  spoolerAlert: { kind: "alert", id: "a-99812", label: "Print Spooler stopped", tone: "warning", state: { label: "Warning", tone: "warning" } },
  diskAlert: { kind: "alert", id: "a-99840", label: "Disk C: 94% full", tone: "danger", state: { label: "Critical", tone: "danger" } },
  ricohL2: { kind: "printer", id: "ricoh-l2", label: "Ricoh IM C3000 · Level 2" },
  job: { kind: "job", id: "830017", label: "Job 830017", meta: "Harbourlight Goods" },
  jobUnverified: { kind: "job", id: "830018", label: "Job 830018", verified: false },
} satisfies Record<string, EntityRef>

const PREVIEWS: Record<string, { subtitle?: string; facts?: Array<{ label: string; value: string }> }> = {
  "endpoint:NST-C106": {
    subtitle: "HP EliteOne 1000 G2 27-in 4K UHD AiO · Windows 11 Business 10.0.26300",
    facts: [
      { label: "Signed in", value: "AzureAD\\MiraRowan" },
      { label: "Last seen", value: "Sat 9:42 pm" },
      { label: "IP address", value: "10.20.4.106" },
      { label: "Site", value: "North studio" },
    ],
  },
  "endpoint:LMN-4E5E": {
    subtitle: "Dell OptiPlex 7090 · Windows 11 Pro 10.0.26100",
    facts: [
      { label: "Signed in", value: "LMN-4E5E\\Front Counter" },
      { label: "Last seen", value: "just now" },
      { label: "IP address", value: "10.13.4.94" },
    ],
  },
  "organisation:northstar": {
    subtitle: "214 endpoints · 9 sites",
    facts: [
      { label: "Online", value: "201" },
      { label: "Open tickets", value: "7" },
      { label: "Primary contact", value: "Morgan Vale" },
    ],
  },
  "ticket:7102": {
    subtitle: "Power outage — North studio",
    facts: [
      { label: "Organisation", value: "Northstar Studio" },
      { label: "Opened", value: "Sat 9:51 pm" },
      { label: "Assignee", value: "Avery Quinn" },
    ],
  },
  "user:mira.rowan": {
    subtitle: "AzureAD\\MiraRowan · Northstar Studio",
    facts: [
      { label: "Role", value: "Customer service" },
      { label: "Devices", value: "NST-C106" },
    ],
  },
  "software:google-chrome": { subtitle: "Google LLC · 129.0.6668.90", facts: [{ label: "Installed on", value: "1,107 endpoints" }] },
}

/* ── Actions (R12: one definition per kind) ───────────────────────────────── */

const endpointActions = defineActions<EntityRef>("endpoint", [
  { id: "open", label: "Open", icon: IconPopOut, group: "open", surfaces: ["menu", "context", "palette"], run: ([target]) => toast.info(`Opened ${target!.label}`) },
  {
    id: "remote",
    label: "Remote control",
    icon: IconRemoteControl,
    group: "connect",
    priority: 1,
    primary: true,
    disabledReason: ([target]) => (target!.status === "offline" ? `${target!.label} is offline` : null),
    run: () => wait(600),
    successMessage: ([target]) => `Connected to ${target!.label}`,
  },
  {
    id: "wake",
    label: "Wake",
    icon: IconWake,
    group: "connect",
    priority: 2,
    visible: ([target]) => target!.status === "offline",
    run: () => wait(900),
    successMessage: ([target]) => `Sent Wake-on-LAN to ${target!.label}`,
  },
  { id: "terminal", label: "Terminal", icon: IconTerminal, group: "connect", priority: 3, disabledReason: ([target]) => (target!.status === "offline" ? `${target!.label} is offline` : null), run: () => wait(400) },
  {
    id: "restart",
    label: "Restart",
    icon: IconRestart,
    group: "manage",
    disabledReason: ([target]) => (target!.status === "offline" ? `${target!.label} is offline` : null),
    confirm: ([target]) => ({ title: `Restart ${target!.label}?`, body: "Whoever is signed in loses unsaved work.", confirmLabel: "Restart now", tone: "default" }),
    run: () => wait(800),
    successMessage: ([target]) => `${target!.label} is restarting`,
  },
  {
    id: "shutdown",
    label: "Shut down",
    icon: IconPower,
    group: "danger",
    disabledReason: ([target]) => (target!.status === "offline" ? `${target!.label} is offline` : null),
    confirm: ([target]) => ({ title: `Shut down ${target!.label}?`, body: "It stays off until someone powers it on or it is woken.", confirmLabel: "Shut down", tone: "danger" }),
    run: () => wait(800),
  },
])

const openOnly = (entity: string) =>
  defineActions<EntityRef>(entity, [
    { id: "open", label: "Open", icon: IconPopOut, group: "open", priority: 1, run: ([target]) => toast.info(`Opened ${target!.label}`) },
  ])

const ticketActions = defineActions<EntityRef>("ticket", [
  { id: "open", label: "Open ticket", icon: IconTickets, group: "open", priority: 1, run: ([target]) => toast.info(`Opened ${target!.label}`) },
  { id: "assign", label: "Assign to me", icon: IconUser, group: "manage", priority: 2, run: () => wait(500), successMessage: ([target]) => `${target!.label} assigned to Avery Quinn` },
])

const ACTIONS: Record<string, ActionSet<EntityRef>> = {
  endpoint: endpointActions,
  ticket: ticketActions,
  organisation: openOnly("organisation"),
  user: openOnly("user"),
  software: openOnly("software"),
}

const SEARCHABLE: EntityRef[] = [E.c106, E.c112, E.c118, E.reception, E.library, E.depot, E.acs4e5e, E.acs4e5f, E.acs7b73, E.win11vm, E.fia01, E.fia02, E.fia03, E.northstar, E.cedarvale, E.fa, E.t7102, E.t7105, E.mira, E.chrome]

/** The demo resolver: fixtures for previews, the action sets above, toasts for navigation. */
export const demoResolver: EntityResolver = {
  kinds: DEMO_KINDS,
  // Endpoints and printers draw through Glass UX's device identity: the same chip, glyph, state
  // and ActionSet as their header and tree row (src/workspace/devices/ai.tsx).

  preview: (ref) => PREVIEWS[`${ref.kind}:${ref.id}`],
  actions: (kind) => ACTIONS[kind],
  open: (ref) => toast.info(`Open ${ref.label}`, { description: `Navigates to /${DEMO_KINDS[ref.kind as keyof typeof DEMO_KINDS]?.segment ?? ref.kind}/${ref.id}` }),
  openWindow: (ref) => toast.info(`${ref.label} opened in a window`),
  recognise: (value, typename) => {
    // Keyed on the result's root field (tools carry no __typename; Example application tools.rs).
    const text = (key: string) => (typeof value[key] === "string" || typeof value[key] === "number" ? String(value[key]) : undefined)
    if (typename === "SampleAssetSummary" || typename === "SampleAssetPage") {
      const name = text("Name")
      return name ? { kind: "endpoint", id: name, label: name, status: value.ConnectionState === "Connected" ? "online" : "offline" } : null
    }
    if (typename === "SampleTicket" || typename === "SampleTickets") {
      const id = text("Id")
      const status = text("Status")
      return id ? { kind: "ticket", id, label: `#${id}`, state: status ? { label: status, tone: status === "Open" ? "accent" : status === "Waiting" ? "warning" : "success" } : undefined } : null
    }
    if (typename === "SampleProjects") {
      const id = text("Id")
      const name = text("Name")
      return id && name ? { kind: "organisation", id, label: name } : null
    }
    if (typename === "JimJob") {
      const id = text("JobNo")
      return id ? { kind: "job", id, label: `Job ${id}` } : null
    }
    return null
  },
  search: (query, kind) => {
    const text = query.toLowerCase()
    return SEARCHABLE.filter((entity) => (!kind || entity.kind === kind) && (entity.label.toLowerCase().includes(text) || entity.id.toLowerCase().includes(text)))
  },
}

/* ── Workspace ────────────────────────────────────────────────────────────── */

export const MODEL: ComposerModel = { name: "gpt-5.6-terra", runtime: "OpenAI API", effort: "Medium" }

export const BUDGET: AiBudget = { label: "Daily allowance", used: 128_400, maximum: 200_000, unit: "tokens", resetsAt: NOW + 9 * HOUR }
export const BUDGET_LOW: AiBudget = { label: "Daily allowance", used: 171_000, maximum: 200_000, unit: "tokens", resetsAt: NOW + 3 * HOUR }
export const BUDGET_OUT: AiBudget = { label: "Daily allowance", used: 200_000, maximum: 200_000, unit: "tokens", resetsAt: NOW + 2 * HOUR }

export const COMMANDS: SlashCommand[] = [
  { id: "summarise", description: "Summarise this conversation", icon: IconFileText },
  { id: "find", description: "Find endpoints, tickets or people", icon: IconUsers, insert: "/find " },
  { id: "ticket", description: "Draft a ticket from this conversation", icon: IconTickets },
  { id: "script", description: "Write a PowerShell script", icon: IconTerminal },
  { id: "report", description: "Build a report for an organisation", icon: IconOrganisation },
]

export const SUGGESTIONS: Suggestion[] = [
  { id: "customer", prompt: "Summarise Northstar Studio", label: "Summarise a customer", icon: <IconUsers /> },
  { id: "endpoints", prompt: "Which endpoints are offline right now?", label: "Show offline endpoints", icon: <IconEndpoint /> },
  { id: "tickets", prompt: "Find my open Glass UX tickets", label: "Find recent Glass UX tickets", icon: <IconTickets /> },
]

export const SCOPED_SUGGESTIONS: Suggestion[] = [
  { id: "why", prompt: "Why is NST-C106 offline?", icon: <IconWarning /> },
  { id: "changes", prompt: "What changed on NST-C106 this week?", icon: <IconClock /> },
  { id: "patches", prompt: "Is NST-C106 missing October patches?", icon: <IconPatch /> },
]

export const PROJECTS: AiProject[] = [
  { id: "northstar-migration", name: "Northstar Studio migration", count: 12 },
  { id: "patch-oct", name: "Patch Tuesday · October", count: 5 },
  { id: "fia-onboarding", name: "Cedar Vale onboarding", count: 3 },
]

export const SESSIONS: AiSession[] = [
  { id: "s-cedar-annex", title: "North studio printing and offline PCs", lastActivityAt: ago(2 * MINUTE), activity: "prompt", organisation: E.northstar },
  { id: "s-patch", title: "Cedar Vale patch compliance", lastActivityAt: ago(48 * MINUTE), activity: "working", organisation: E.cedarvale },
  { id: "s-chrome", title: "Chrome 129 rollout status", lastActivityAt: ago(3 * HOUR), activity: "done", unread: true, organisation: null },
  { id: "s-orb", title: "ORB front counter screenshots", lastActivityAt: ago(5 * HOUR), activity: "done", organisation: E.northstar },
  { id: "s-disk", title: "Disk space alerts at the depot", lastActivityAt: ago(26 * HOUR), activity: "error", organisation: E.northstar },
  { id: "s-licences", title: "Microsoft 365 licence count by site", lastActivityAt: ago(30 * HOUR), activity: "done", organisation: null },
  { id: "s-onboard", title: "New starter checklist — Morgan Vale", lastActivityAt: ago(4 * 24 * HOUR), activity: "done", organisation: E.cedarvale },
  { id: "s-vpn", title: "Why is the Mossbridge VPN slow?", lastActivityAt: ago(5 * 24 * HOUR), activity: "done", organisation: E.northstar },
  { id: "s-old1", title: "Bitlocker recovery keys audit", lastActivityAt: ago(12 * 24 * HOUR), activity: "done", archived: true, organisation: null },
  { id: "s-old2", title: "Printer driver cleanup", lastActivityAt: ago(20 * 24 * HOUR), activity: "done", archived: true, organisation: E.northstar },
]

/* ── Tool calls ───────────────────────────────────────────────────────────── */

export const TOOLS = {
  org: {
    id: "tc-org",
    toolId: "glass-ux.organisations.search",
    label: "Found Northstar Studio",
    activeLabel: "Finding the organisation",
    icon: IconOrganisation,
    status: "succeeded",
    elapsedMs: 320,
    targets: [E.northstar],
    args: { query: "Northstar Studio", first: 5 },
    result: { items: [{ id: "northstar", name: "Northstar Studio", endpoints: 214, sites: 9 }] },
  },
  endpoints: {
    id: "tc-endpoints",
    toolId: "glass-ux.endpoints.query",
    label: "Queried 214 endpoints",
    activeLabel: "Querying endpoints",
    icon: IconEndpoint,
    status: "succeeded",
    elapsedMs: 1410,
    args: { organisationId: "northstar", status: ["offline"], lastSeenBefore: "PT24H", first: 25 },
    result: { totalCount: 6, items: [{ name: "NST-C106", lastSeen: "2026-10-11T21:42:10+11:00" }, { name: "NST-C112", lastSeen: "2026-10-11T21:41:55+11:00" }] },
  },
  heartbeats: {
    id: "tc-heartbeats",
    toolId: "glass-ux.endpoints.heartbeats",
    label: "Read last-seen times for 6 endpoints",
    activeLabel: "Reading last-seen times",
    icon: IconClock,
    status: "succeeded",
    elapsedMs: 580,
  },
  eventlog: {
    id: "tc-eventlog",
    toolId: "glass-ux.endpoint.eventlog",
    label: "Read the event log on NST-C106",
    icon: IconFileText,
    status: "failed",
    elapsedMs: 5000,
    reason: "Agent offline — retry when NST-C106 reconnects",
    targets: [E.c106],
    args: { endpointId: "NST-C106", log: "System", since: "PT72H" },
    result: { ok: false, code: "temporarily_unavailable", retryable: true },
  },
  snapshot: {
    id: "tc-snapshot",
    toolId: "glass-ux.endpoint.diagnostics",
    label: "Read the last diagnostic snapshot",
    icon: IconCpu,
    status: "succeeded",
    elapsedMs: 760,
    targets: [E.c106],
  },
  wake: {
    id: "tc-wake",
    toolId: "glass-ux.endpoint.wake",
    label: "Woke NST-C106 from LMN-4E5E",
    activeLabel: "Waking NST-C106",
    icon: IconWake,
    status: "succeeded",
    elapsedMs: 48_200,
    targets: [E.c106, E.acs4e5e],
  },
  spooler: {
    id: "tc-spooler",
    toolId: "glass-ux.powershell.execute",
    label: "Ran Clear-PrintQueue.ps1 on NST-C106",
    icon: IconTerminal,
    status: "succeeded",
    elapsedMs: 2100,
    targets: [E.c106Online],
  },
  screens: {
    id: "tc-screens",
    toolId: "glass-ux.endpoint.screenshot",
    label: "Captured 3 screens",
    icon: IconEndpoint,
    status: "succeeded",
    elapsedMs: 3400,
    targets: [E.acs4e5e, E.acs4e5f, E.acs7b73],
  },
  web: {
    id: "tc-web",
    toolId: "web_search",
    label: "Searched the web for “TasNetworks Cedar Annex outage”",
    icon: IconGlobe,
    status: "succeeded",
    elapsedMs: 2900,
  },
  patches: {
    id: "tc-patches",
    toolId: "glass-ux.patches.compliance",
    label: "Read patch compliance for 38 endpoints",
    icon: IconPatch,
    status: "succeeded",
    elapsedMs: 1900,
    targets: [E.cedarvale],
  },
  printers: {
    id: "tc-printers",
    toolId: "glass-ux.endpoint.printers",
    label: "Listed 3 printers on NST-C106",
    icon: IconPrinter,
    status: "succeeded",
    elapsedMs: 900,
    targets: [E.c106Online],
  },
} satisfies Record<string, AiToolCall>

/* ── Results ──────────────────────────────────────────────────────────────── */

export const RESULTS = {
  offline: {
    id: "r-offline",
    type: "table",
    title: "Offline for more than 24 hours",
    source: "glass-ux.endpoints · Northstar Studio",
    total: 6,
    noun: { one: "endpoint", other: "endpoints" },
    columns: [
      { key: "endpoint", header: "Endpoint", type: "entity", priority: 1 },
      { key: "status", header: "Status", type: "status", priority: 2 },
      { key: "seen", header: "Last seen", type: "time", priority: 2 },
      { key: "user", header: "Signed-in user", priority: 3 },
      { key: "site", header: "Site", priority: 4 },
      { key: "agent", header: "Agent", priority: 5 },
    ],
    rows: [
      { endpoint: E.c106, status: "offline", seen: ago(37 * HOUR), user: "AzureAD\\MiraRowan", site: "North studio", agent: "6.8.0" },
      { endpoint: E.c112, status: "offline", seen: ago(37 * HOUR + 2 * MINUTE), user: "AzureAD\\MorganVale", site: "North studio", agent: "6.8.0" },
      { endpoint: E.c118, status: "offline", seen: ago(37 * HOUR + 3 * MINUTE), user: "No one signed in", site: "North studio", agent: "6.7.2" },
      { endpoint: E.reception, status: "offline", seen: ago(37 * HOUR + 4 * MINUTE), user: "NST-REC01\\Reception", site: "North studio", agent: "6.8.0" },
      { endpoint: E.library, status: "offline", seen: ago(52 * HOUR), user: "AzureAD\\LibraryKiosk", site: "Cedar Annex library", agent: "6.7.2" },
      { endpoint: E.depot, status: "offline", seen: ago(4 * 24 * HOUR), user: "No one signed in", site: "Mossbridge depot", agent: "6.6.1" },
    ],
  },
  big: {
    id: "r-big",
    type: "table",
    title: "Endpoints by last check-in",
    source: "glass-ux.endpoints · All organisations",
    total: 1284,
    noun: { one: "endpoint", other: "endpoints" },
    columns: [
      { key: "endpoint", header: "Endpoint", type: "entity", priority: 1 },
      { key: "status", header: "Status", type: "status", priority: 2 },
      { key: "org", header: "Organisation", priority: 3 },
      { key: "cpu", header: "CPU", type: "number", unit: "%", priority: 4 },
      { key: "seen", header: "Last seen", type: "time", priority: 2 },
    ],
    rows: [
      { endpoint: E.acs4e5e, status: "online", org: "Lumen Fieldworks", cpu: 34, seen: ago(MINUTE) },
      { endpoint: E.acs4e5f, status: "online", org: "Lumen Fieldworks", cpu: 12, seen: ago(2 * MINUTE) },
      { endpoint: E.acs7b73, status: "warning", org: "Lumen Fieldworks", cpu: 71, seen: ago(MINUTE) },
      { endpoint: E.win11vm, status: "online", org: "Orbit Workspace", cpu: 8, seen: ago(30_000) },
      { endpoint: E.fia01, status: "online", org: "Cedar Vale Collective", cpu: 19, seen: ago(4 * MINUTE) },
      { endpoint: E.fia02, status: "warning", org: "Cedar Vale Collective", cpu: 88, seen: ago(6 * MINUTE) },
      { endpoint: E.fia03, status: "online", org: "Cedar Vale Collective", cpu: 22, seen: ago(9 * MINUTE) },
      { endpoint: E.c106, status: "offline", org: "Northstar Studio", cpu: null, seen: ago(37 * HOUR) },
      { endpoint: E.c112, status: "offline", org: "Northstar Studio", cpu: null, seen: ago(37 * HOUR) },
    ],
  },
  c106: {
    id: "r-c106",
    type: "entity",
    title: "NST-C106",
    entity: E.c106,
    subtitle: "HP EliteOne 1000 G2 27-in 4K UHD AiO · Windows 11 Business 10.0.26300",
    facts: [
      { label: "Last seen", value: "Sat 9:42 pm" },
      { label: "Signed in", value: "AzureAD\\MiraRowan" },
      { label: "IP address", value: "10.20.4.106" },
      { label: "Site", value: "North studio" },
    ],
  },
  network: {
    id: "r-network",
    type: "detail",
    title: "Diagnostic snapshot · Sat 9:40 pm",
    source: "glass-ux.endpoint.diagnostics · NST-C106",
    items: [
      { label: "Model", value: "EliteOne 1000 G2", detail: "27-in 4K UHD AiO", icon: IconEndpoint },
      { label: "Operating system", value: "Windows 11 Business", detail: "10.0.26300", icon: IconOperatingSystem, numeric: true },
      { label: "IP address", value: "10.20.4.106", detail: "Wake-on-LAN enabled", icon: IconNetwork, numeric: true },
      { label: "Memory", value: "7.4 GB of 16 GB", icon: IconMemory, numeric: true },
      { label: "Uptime", value: "6 days", icon: IconClock },
      { label: "Serial number", value: "8CC0481GWV", icon: IconTag, numeric: true },
    ],
  },
  spoolerLog: {
    id: "r-log",
    type: "log",
    title: "System log · Print Spooler",
    source: "Last snapshot from NST-C106",
    lines: [
      { time: "21:14:02", level: "info", text: "The Print Spooler service entered the running state." },
      { time: "21:20:47", level: "info", text: "Document 211, Rates notice.pdf owned by MiraRowan was printed on Ricoh MP 2555 Reception." },
      { time: "21:22:10", level: "warning", text: "The print queue Ricoh MP 2555 Reception has 14 jobs older than 10 minutes." },
      { time: "21:26:33", level: "error", text: "The Print Spooler service terminated unexpectedly. It has done this 1 time(s)." },
      { time: "21:26:34", level: "info", text: "The Service Control Manager restarted the Print Spooler service." },
      { time: "21:31:09", level: "error", text: "The Print Spooler service terminated unexpectedly. It has done this 2 time(s)." },
      { time: "21:31:10", level: "info", text: "The Service Control Manager restarted the Print Spooler service." },
      { time: "21:38:51", level: "error", text: "Faulting module PrintConfig.dll, version 10.0.26300.1, exception 0xc0000005." },
      { time: "21:38:52", level: "error", text: "The Print Spooler service terminated unexpectedly. It has done this 3 time(s)." },
      { time: "21:38:52", level: "warning", text: "Recovery action not taken: restart limit reached for the Print Spooler service." },
      { time: "21:41:58", level: "debug", text: "Glass UX agent heartbeat sent (seq 88412)." },
      { time: "21:42:10", level: "debug", text: "Glass UX agent heartbeat sent (seq 88413)." },
      { time: "21:44:00", level: "warning", text: "Kernel-Power: the system has resumed from an unexpected loss of power." },
    ],
  },
  health: {
    id: "r-health",
    type: "metrics",
    title: "Patch compliance · Cedar Vale",
    source: "glass-ux.patches · last 30 days",
    metrics: [
      { label: "Compliant", value: 84, unit: "%", delta: 6, better: "up", data: [71, 72, 72, 74, 76, 75, 78, 80, 81, 84], domain: [0, 100] },
      { label: "Missing critical", value: 3, delta: -4, better: "down", data: [9, 9, 8, 8, 7, 7, 6, 5, 4, 3], tone: "warning" },
      { label: "Pending restart", value: 5, delta: 2, better: "down", data: [2, 3, 3, 4, 3, 4, 4, 5, 5, 5] },
      { label: "Scanned today", value: 38, delta: 0, better: "up", data: [31, 34, 36, 35, 38, 37, 38, 38, 38, 38] },
    ],
  },
  patchChart: {
    id: "r-patch-chart",
    type: "chart",
    chart: "bar",
    title: "Missing updates by group",
    source: "glass-ux.patches · Cedar Vale Collective",
    labels: ["Admin", "Clinic", "Reception", "Laptops", "Kiosks"],
    series: [
      { name: "Critical", values: [0, 2, 1, 0, 0] },
      { name: "Important", values: [1, 4, 2, 3, 1] },
    ],
  },
  latency: {
    id: "r-latency",
    type: "chart",
    chart: "line",
    title: "Heartbeat latency before the outage",
    source: "glass-ux.endpoint.heartbeats · Saturday",
    unit: "ms",
    labels: ["2 pm", "3 pm", "4 pm", "5 pm", "6 pm", "7 pm", "8 pm", "9 pm", "9:40 pm"],
    series: [
      { name: "NST-C106", values: [41, 38, 44, 52, 47, 61, 58, 74, 96] },
      { name: "North studio median", values: [38, 37, 40, 46, 44, 49, 47, 52, 55] },
    ],
  },
  missing: {
    id: "r-missing",
    type: "entities",
    title: "Missing critical updates",
    source: "glass-ux.patches",
    entities: [
      { ...E.fia02, detail: "KB5044284 · Windows 11 cumulative update" },
      { ...E.fia03, detail: "KB5044284 · Windows 11 cumulative update" },
      { ...E.fia04, detail: "Google Chrome 129.0.6668.90" },
    ],
  },
  screens: {
    id: "r-screens",
    type: "images",
    title: "Front counter screens",
    source: "glass-ux.endpoint.screenshot · Lumen Fieldworks",
    images: [
      { id: "i1", src: screenshot({ app: "Reckon Accounts — Lumen Fieldworks", hue: 215 }), alt: "LMN-4E5E desktop with Reckon Accounts open", width: 1600, height: 1000, caption: "LMN-4E5E · Front Counter" },
      { id: "i2", src: screenshot({ app: "Outlook — Inbox", hue: 160 }), alt: "LMN-4E5F desktop with Outlook open", width: 1600, height: 1000, caption: "LMN-4E5F · Front Counter 2" },
      { id: "i3", src: screenshot({ app: "Print queue — Ricoh MP 2555", hue: 20, dialog: "The printer is not responding" }), alt: "LMN-7B73 desktop with a printer error dialog", width: 1600, height: 1000, caption: "LMN-7B73 · Dispatch" },
    ],
  },
  screen: {
    id: "r-screen",
    type: "images",
    title: "NST-C106 · now",
    source: "glass-ux.endpoint.screenshot",
    images: [{ id: "i4", src: screenshot({ app: "Print queue — Ricoh IM C3000 Level 2", hue: 250 }), alt: "NST-C106 desktop with the Level 2 print queue open", width: 1600, height: 1000 }],
  },
  files: {
    id: "r-files",
    type: "files",
    title: "Exported for the ticket",
    source: "GlassUxAiShareFile",
    files: [
      { id: "f1", name: "NST-C106-system-log.evtx", size: 2_480_000, href: "#" },
      { id: "f2", name: "offline-endpoints-northstar.csv", size: 1840, mime: "text/csv", href: "#" },
      { id: "f3", name: "Clear-PrintQueue.ps1", size: 912, href: "#" },
    ],
  },
  printerDiff: {
    id: "r-diff",
    type: "diff",
    title: "Default printer for MiraRowan",
    source: "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows",
    target: E.c106Online,
    lines: [
      { type: "context", text: "[HKEY_CURRENT_USER\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows]" },
      { type: "remove", text: "\"Device\"=\"Ricoh MP 2555 Reception,winspool,Ne01:\"" },
      { type: "add", text: "\"Device\"=\"Ricoh IM C3000 Level 2,winspool,Ne03:\"" },
      { type: "context", text: "\"LegacyDefaultPrinterMode\"=dword:00000001" },
    ],
  },
} satisfies Record<string, AiResult>

/* ── Sources ──────────────────────────────────────────────────────────────── */

export const SOURCES: AiSource[] = [
  { id: "src-1", index: 1, title: "#7102 · Power outage — North studio", href: "/tickets/7102", site: "Glass UX ticket", entity: E.t7102 },
  { id: "src-2", index: 2, title: "Sample maintenance and incidents", href: "https://status.northstar.example/incidents", site: "status.northstar.example" },
  { id: "src-3", index: 3, title: "Print Spooler crashes with PrintConfig.dll", href: "https://learn.microsoft.com/troubleshoot/windows-server/printing/print-spooler-crash", site: "learn.microsoft.com" },
]

/* ── Asks ─────────────────────────────────────────────────────────────────── */

const spoolerScript = `Stop-Service -Name Spooler -Force
Remove-Item "$env:SystemRoot\\System32\\spool\\PRINTERS\\*" -Force
Start-Service -Name Spooler
Get-Service -Name Spooler | Select-Object Status, StartType`

export const APPROVAL = (state: ApprovalAsk["state"], overrides: Partial<AiApproval> = {}): AiApproval =>
  ({
    id: `ask-spooler-${state}`,
    type: "approval",
    question: "Restart the Print Spooler and clear the queue on NST-C106?",
    action: "Restart the Print Spooler and clear the queue",
    targets: [E.c106Online],
    risk: "warning",
    effect: "Stops the Print Spooler, deletes the 14 stuck jobs and starts it again. Jobs in the queue are not recoverable.",
    preview: { language: "powershell", code: spoolerScript },
    expiresAt: NOW + 9 * MINUTE + 32_000,
    allowForSession: true,
    actionKind: "PowerShell",
    state,
    decidedBy: state === "pending" ? undefined : "Avery Quinn",
    decidedAt: state === "pending" ? undefined : ago(14 * MINUTE),
    outcome: state === "executed" ? "Spooler running · 14 jobs cleared · 2.1 s" : undefined,
    ...overrides,
  }) as AiApproval

export const APPROVAL_DANGER: AiApproval = {
  id: "ask-reimage",
  type: "approval",
  question: "Reset NST-C106 to factory settings?",
  action: "Reset Windows",
  targets: [E.c106Online],
  risk: "danger",
  effect: "Removes every app, file and profile on NST-C106 and reinstalls Windows 11 Business. Mira Rowan cannot use it for about 90 minutes. This cannot be undone.",
  preview: { language: "powershell", code: "systemreset -factoryreset -quiet" },
  stepUp: true,
  expiresAt: NOW + 4 * MINUTE,
  state: "pending",
}

export const PRINTER_APPROVAL: AiApproval = {
  id: "ask-printer",
  type: "approval",
  question: "Change Mira Rowan’s default printer on NST-C106?",
  action: "Set the default printer",
  targets: [E.c106Online, E.mira],
  risk: "warning",
  effect: "Sets Ricoh IM C3000 · Level 2 as the default for AzureAD\\MiraRowan. It applies at her next print; nothing else changes.",
  preview: { language: "powershell", code: '(New-Object -ComObject WScript.Network).SetDefaultPrinter("Ricoh IM C3000 Level 2")' },
  expiresAt: NOW + 9 * MINUTE + 32_000,
  allowForSession: true,
  actionKind: "Printer changes",
  state: "pending",
}

const PRINTER_OPTIONS = [
  { value: "ricoh-l2", label: "Ricoh IM C3000 · Level 2", description: "Colour, duplex · beside the lifts", meta: "10.20.4.40", icon: IconPrinter },
  { value: "ricoh-rec", label: "Ricoh MP 2555 · Reception", description: "Mono · the current default", meta: "10.20.4.41", icon: IconPrinter },
  { value: "hp-admin", label: "HP LaserJet M404 · Admin", description: "Mono · locked to the admin team", meta: "10.20.4.47", icon: IconPrinter },
]

export const ASKS = {
  single: { id: "ask-single", type: "single", question: "Which printer should be her default?", detail: "3 printers on NST-C106", options: PRINTER_OPTIONS, submitLabel: "Set as default" },
  singleDone: { id: "ask-single-done", type: "single", question: "Which printer should be her default?", options: PRINTER_OPTIONS, status: "answered", answer: "Chose Ricoh IM C3000 · Level 2 · 10.20.4.40", answeredBy: "Avery Quinn", answeredAt: ago(6 * MINUTE) },
  multi: {
    id: "ask-multi",
    type: "multi",
    question: "Which endpoints should get KB5044284 tonight?",
    detail: "Cedar Vale Collective · 3 missing it",
    options: [
      { value: "CDV-CLINIC02", label: "CDV-CLINIC02", description: "Clinic · pending restart", icon: IconEndpoint },
      { value: "CDV-CLINIC03", label: "CDV-CLINIC03", description: "Clinic", icon: IconEndpoint },
      { value: "CDV-RECEPT01", label: "CDV-RECEPT01", description: "Reception · used until 6 pm", icon: IconEndpoint },
    ],
    submitLabel: "Schedule selected",
  },
  multiDone: { id: "ask-multi-done", type: "multi", question: "Which endpoints should get KB5044284 tonight?", options: [], status: "answered", answer: "Selected CDV-CLINIC02, CDV-CLINIC03", answeredBy: "Avery Quinn", answeredAt: ago(40 * MINUTE) },
  quick: {
    id: "ask-quick",
    type: "quick",
    question: "Restart them after installing?",
    options: [
      { value: "tonight", label: "Restart at 10 pm", icon: IconClock },
      { value: "prompt", label: "Ask the user", icon: IconUser },
      { value: "skip", label: "Don’t restart" },
    ],
  },
  quickDone: { id: "ask-quick-done", type: "quick", question: "Restart them after installing?", options: [], status: "answered", answer: "Replied · Restart at 10 pm", answeredBy: "Avery Quinn", answeredAt: ago(39 * MINUTE) },
  form: {
    id: "ask-form",
    type: "form",
    question: "Raise a ticket for the Cedar Annex outage follow-up?",
    detail: "Northstar Studio",
    submitLabel: "Raise ticket",
    fields: [
      { name: "title", label: "Title", kind: "text", required: true, value: "North studio PCs offline after power loss" },
      {
        name: "priority",
        label: "Priority",
        kind: "select",
        required: true,
        value: "normal",
        options: [
          { value: "low", label: "Low" },
          { value: "normal", label: "Normal" },
          { value: "high", label: "High" },
          { value: "urgent", label: "Urgent" },
        ],
      },
      { name: "contact", label: "Contact", kind: "text", placeholder: "Who to update", hint: "Defaults to the organisation's primary contact" },
      { name: "notes", label: "Notes", kind: "textarea", value: "6 endpoints offline since Sat 9:42 pm. NST-C106 woken remotely; 5 still need someone on site." },
    ],
  },
  formDone: { id: "ask-form-done", type: "form", question: "Raise a ticket?", fields: [], status: "answered", answer: "Sent · North studio PCs offline after power loss · Normal", answeredBy: "Avery Quinn", answeredAt: ago(20 * MINUTE) },
  entity: { id: "ask-entity", type: "entity", question: "Which endpoint did Mira mean?", detail: "Two endpoints are signed in as AzureAD\\MiraRowan", entityKind: "endpoint", suggestions: [E.c106, E.win11vm, E.acs4e5e], multiple: false, submitLabel: "Use this endpoint" },
  datetime: {
    id: "ask-datetime",
    type: "datetime",
    question: "When should the update install?",
    timezone: "Australia/Hobart (AEDT)",
    suggestions: [
      { label: "Tonight 10:00 pm", value: "2026-10-13T22:00" },
      { label: "Tomorrow 7:00 am", value: "2026-10-14T07:00" },
      { label: "Saturday 9:00 am", value: "2026-10-17T09:00" },
    ],
    earliest: "now",
    submitLabel: "Schedule",
  },
  datetimeDone: { id: "ask-datetime-done", type: "datetime", question: "When should the update install?", timezone: "Australia/Hobart (AEDT)", suggestions: [], status: "answered", answer: "Scheduled · Tonight 10:00 pm (AEDT)", answeredBy: "Avery Quinn", answeredAt: ago(41 * MINUTE) },
  confirm: { id: "ask-confirm", type: "confirm", question: "Restart NST-C106 now?", consequence: "Mira Rowan is signed in with Outlook and Word open; unsaved work is lost.", confirmLabel: "Restart now", tone: "warning" },
  confirmDanger: { id: "ask-confirm-danger", type: "confirm", question: "Remove NST-C106 from Northstar Studio?", consequence: "Its agent is uninstalled at next check-in and its history is deleted after 30 days.", confirmLabel: "Remove endpoint", tone: "danger" },
  rank: {
    id: "ask-rank",
    type: "rank",
    question: "In what order should the groups update?",
    detail: "One group per night",
    options: [
      { value: "kiosks", label: "Kiosks", description: "4 endpoints · nobody signed in" },
      { value: "admin", label: "Admin", description: "6 endpoints" },
      { value: "clinic", label: "Clinic", description: "12 endpoints · used until 8 pm" },
      { value: "reception", label: "Reception", description: "3 endpoints · used until 6 pm" },
    ],
  },
  clarify: { id: "ask-clarify", type: "clarify", question: "Did you mean LMN-4E5E or LMN-4E5F?", detail: "Both are named Front Counter", placeholder: "Type a name or describe the PC", suggestions: ["LMN-4E5E", "LMN-4E5F", "Both"] },
  expired: { id: "ask-expired", type: "single", question: "Which printer should be her default?", options: [], status: "expired" },
} satisfies Record<string, AiAsk>

/* ── The long conversation ────────────────────────────────────────────────── */

export type ConversationItem =
  | { kind: "turn"; index: number; user: AiMessage; replies: AiMessage[] }
  | { kind: "notice"; id: string; text: string; at: number }

const user = (id: string, text: string, at: number, extra: Partial<AiMessage> = {}): AiMessage => ({ id, role: "user", createdAt: at, state: "complete", blocks: [{ kind: "markdown", text }], author: "Avery Quinn", ...extra })
const ai = (id: string, at: number, blocks: AiMessage["blocks"], extra: Partial<AiMessage> = {}): AiMessage => ({ id, role: "assistant", createdAt: at, state: "complete", blocks, model: MODEL.name, ...extra })

export const CONVERSATION: ConversationItem[] = [
  {
    kind: "turn",
    index: 1,
    user: user("m1", "Which Northstar Studio endpoints have been offline for more than a day?", ago(52 * MINUTE)),
    replies: [
      ai("m2", ago(51 * MINUTE), [
        { kind: "reasoning", reasoning: { seconds: 3, summary: "Find the organisation, list its endpoints that are offline, keep the ones whose last heartbeat is older than 24 hours, then look for a shared cause (site, time)." } },
        { kind: "tools", calls: [TOOLS.org, TOOLS.endpoints, TOOLS.heartbeats, TOOLS.web] },
        {
          kind: "markdown",
          text: "**6 endpoints** at [Northstar Studio](/organisations/northstar) have not checked in for more than 24 hours. Four of them are at the North studio and all four went quiet within two minutes of each other on **Saturday at 9:42 pm** — the same evening [#7102](/tickets/7102) logged a power outage there [^1]. TasNetworks shows the supply was restored at 11:15 pm [^2], so they are most likely still off rather than broken.",
        },
        { kind: "result", result: RESULTS.offline },
        { kind: "markdown", text: "The library kiosk and the Mossbridge depot PC dropped off at different times, so they look unrelated. See the [outage map](https://status.northstar.example/incidents) for the street-level detail." },
        { kind: "sources", sources: SOURCES.slice(0, 2) },
      ], { feedback: "up" }),
    ],
  },
  { kind: "notice", id: "n1", text: "NST-C106 added to the conversation context", at: ago(46 * MINUTE) },
  {
    kind: "turn",
    index: 2,
    user: user("m3", "Why is @[NST-C106](endpoint:NST-C106) offline? Mira says it was printing fine on Friday.", ago(46 * MINUTE), {
      attachments: [{ id: "a1", name: "printer-error.png", size: 412_000, mime: "image/png", previewUrl: screenshot({ app: "Print queue — Ricoh MP 2555 Reception", hue: 20, dialog: "The printer is not responding" }), state: "ready" }],
    }),
    replies: [
      ai("m4", ago(45 * MINUTE), [
        { kind: "tools", calls: [TOOLS.eventlog, TOOLS.snapshot] },
        { kind: "result", result: RESULTS.c106 },
        {
          kind: "markdown",
          text: "NST-C106's last heartbeat was **Saturday 9:42 pm**, two minutes before the outage, and the event log confirms an unexpected loss of power. It is off, not failed.\n\nThe printing problem is separate and started earlier. In the hour before the outage the Print Spooler crashed three times in `PrintConfig.dll` and Windows stopped restarting it:\n\n- 14 jobs are stuck in the *Ricoh MP 2555 Reception* queue\n- the crash matches a known driver fault [^3]\n- the screenshot Mira sent shows the same queue\n\n> Wake-on-LAN is enabled on this model, so it can be woken from [LMN-4E5E](/endpoints/LMN-4E5E) on the same subnet.",
        },
        { kind: "result", result: RESULTS.spoolerLog },
        { kind: "result", result: RESULTS.latency },
        { kind: "result", result: RESULTS.network },
        { kind: "sources", sources: [SOURCES[2]!] },
      ]),
    ],
  },
  {
    kind: "turn",
    index: 3,
    user: user("m5", "Wake it, then restart the print spooler and clear the queue.", ago(30 * MINUTE)),
    replies: [
      ai("m6", ago(29 * MINUTE), [
        { kind: "tools", calls: [TOOLS.wake] },
        { kind: "markdown", text: "NST-C106 is back online after 48 s. Clearing the queue needs your approval because the stuck jobs cannot be recovered. This runs as **SYSTEM**:" },
        { kind: "ask", ask: APPROVAL("executed") },
        { kind: "tools", calls: [TOOLS.spooler] },
        {
          kind: "markdown",
          text: "Done. The spooler is running and the queue is empty.\n\n- [x] Woke NST-C106\n- [x] Restarted the Print Spooler\n- [x] Cleared 14 stuck jobs\n- [ ] Update the Ricoh driver (needs a restart)\n\nI've attached the log and the script to [#7102](/tickets/7102).",
        },
        { kind: "result", result: RESULTS.files },
      ]),
    ],
  },
  {
    kind: "turn",
    index: 4,
    user: user("m7", "Show me the front counter screens at ORB.", ago(24 * MINUTE)),
    replies: [
      ai("m8", ago(24 * MINUTE), [
        { kind: "tools", calls: [TOOLS.screens] },
        { kind: "result", result: RESULTS.screens },
        { kind: "markdown", text: "[LMN-7B73](/endpoints/LMN-7B73) shows the same *printer is not responding* dialog on the dispatch printer. The other two look normal." },
      ]),
    ],
  },
  {
    kind: "turn",
    index: 5,
    user: user("m9", "How is Cedar Vale going with October patches?", ago(18 * MINUTE)),
    replies: [
      ai("m10", ago(17 * MINUTE), [
        { kind: "tools", calls: [TOOLS.patches] },
        {
          kind: "markdown",
          text: "## Cedar Vale Collective\n\nCompliance is up to **84%** from 78% last week. Three endpoints still miss a critical update.\n\n| Group | Endpoints | Missing | Compliant |\n| --- | ---: | ---: | ---: |\n| Admin | 6 | 1 | 92% |\n| Clinic | 12 | 6 | 71% |\n| Reception | 3 | 3 | 67% |\n| Laptops | 13 | 3 | 89% |\n| Kiosks | 4 | 1 | 100% |",
        },
        { kind: "result", result: RESULTS.health },
        { kind: "result", result: RESULTS.patchChart },
        { kind: "result", result: RESULTS.missing },
        { kind: "ask", ask: ASKS.multiDone },
        { kind: "ask", ask: ASKS.datetimeDone },
        { kind: "ask", ask: ASKS.quickDone },
      ]),
    ],
  },
  {
    kind: "turn",
    index: 6,
    user: user("m11", "Make the Level 2 Ricoh Mira's default printer.", ago(7 * MINUTE)),
    replies: [
      ai("m12", ago(6 * MINUTE), [
        { kind: "tools", calls: [TOOLS.printers] },
        { kind: "ask", ask: ASKS.singleDone },
        { kind: "result", result: RESULTS.printerDiff },
        { kind: "ask", ask: PRINTER_APPROVAL },
      ]),
    ],
  },
]

/** The prompts for the turn navigator. */
export const TURNS = CONVERSATION.flatMap((item) => (item.kind === "turn" ? [{ index: item.index, preview: (item.user.blocks[0] as { text: string }).text.replace(/@\[([^\]]+)\]\([^)]+\)/g, "$1") }] : []))

/** Everything the conversation referenced, for the inspector. */
export const REFERENCED: EntityRef[] = [E.c106Online, E.northstar, E.t7102, E.acs4e5e, E.acs7b73, E.cedarvale, E.mira, E.ricohL2]

export const ALL_TOOLS: AiToolCall[] = Object.values(TOOLS)


/* ── Tool previews (the static Example application tools, crates/glass-ux-ai/src/tools.rs) ──────── */

const internal = { classification: "Internal" } as const
const confidential = { classification: "Confidential" } as const
const scalar = (label?: string, rule: { classification: "Internal" | "Confidential" } = internal) => ({ shape: "scalar" as const, rule, label })

export const TOOL_PREVIEWS = {
  connectedCount: {
    id: "tp-connected",
    toolId: "sample.connected_endpoint_count",
    title: "Connected endpoints",
    source: "sample.connected_endpoint_count",
    value: { GlassUxConnectedEndpointCount: 1207 },
    disclosure: { shape: "object", rule: internal, fields: { GlassUxConnectedEndpointCount: scalar("Connected endpoints") } },
  },
  orgCount: {
    id: "tp-org-count",
    toolId: "sample.directory.organization_count",
    title: "Organisations",
    source: "sample.directory.organization_count",
    value: { SampleProjects: { PageInfo: { TotalCount: 142 } } },
    disclosure: { shape: "object", rule: internal, fields: { SampleProjects: { shape: "object", rule: internal, fields: { PageInfo: { shape: "object", rule: internal, fields: { TotalCount: scalar("Organisations") } } } } } },
  },
  orgList: {
    id: "tp-org-list",
    toolId: "sample.directory.organization_list",
    title: "Organisations matching “flinders”",
    source: "sample.directory.organization_list",
    value: {
      SampleProjects: {
        Edges: [{ Node: { Id: "cedarvale", Name: "Cedar Vale Collective" } }, { Node: { Id: "fic", Name: "Cedar Vale Council" } }, { Node: { Id: "fims", Name: "Cedar Vale Multi-Purpose Service" } }],
        PageInfo: { TotalCount: 3 },
      },
    },
    disclosure: {
      shape: "object",
      rule: internal,
      fields: {
        SampleProjects: {
          shape: "object",
          rule: internal,
          fields: {
            Edges: { shape: "list", rule: internal, maximumItems: 25, item: { shape: "object", rule: internal, fields: { Node: { shape: "object", rule: internal, fields: { Id: scalar(), Name: scalar("Name") } } } } },
            PageInfo: { shape: "object", rule: internal, fields: { TotalCount: scalar() } },
          },
        },
      },
    },
  },
  endpointList: {
    id: "tp-endpoint-list",
    toolId: "sample.endpoint_list",
    title: "Endpoints at Northstar Studio",
    source: "sample.endpoint_list",
    value: {
      SampleAssetPage: {
        Items: [
          { Id: "e1", Name: "NST-C106", ConnectionState: "Connected", AgentVersion: "6.8.0" },
          { Id: "e2", Name: "NST-C112", ConnectionState: "Disconnected", AgentVersion: "6.8.0" },
          { Id: "e3", Name: "NST-C118", ConnectionState: "Disconnected", AgentVersion: "6.7.2" },
          { Id: "e4", Name: "NST-REC01", ConnectionState: "Connected", AgentVersion: "6.8.0" },
          { Id: "e5", Name: "NST-DEPOT3", ConnectionState: "Disconnected", AgentVersion: "6.6.1" },
        ],
        TotalCount: 214,
      },
    },
    disclosure: {
      shape: "object",
      rule: internal,
      fields: {
        SampleAssetPage: {
          shape: "object",
          rule: internal,
          fields: {
            Items: { shape: "list", rule: internal, maximumItems: 25, item: { shape: "object", rule: internal, fields: { Name: scalar("Endpoint"), ConnectionState: scalar("Connection"), AgentVersion: scalar("Agent") } } },
            TotalCount: scalar(),
          },
        },
      },
    },
  },
  endpointDetails: {
    id: "tp-endpoint-details",
    toolId: "sample.endpoint_details",
    title: "NST-C106",
    source: "sample.endpoint_details",
    value: {
      SampleAssetSummary: {
        Id: "e1",
        Name: "NST-C106",
        AuthorizationState: "Authorized",
        ConnectionState: "Connected",
        ConnectionTime: "13 Oct, 10:12 am",
        AgentVersion: "6.8.0",
        DeviceInformation: { CsName: "NST-C106", CsDomain: "AzureAD", CsManufacturer: "HP", CsModel: "HP EliteOne 1000 G2 27-in 4K UHD AiO", WindowsVersion: "Windows 11 Business 10.0.26300" },
      },
    },
    disclosure: {
      shape: "object",
      rule: internal,
      fields: {
        SampleAssetSummary: {
          shape: "object",
          rule: internal,
          fields: {
            Id: scalar(),
            Name: scalar(),
            AuthorizationState: scalar("Authorisation"),
            ConnectionState: scalar("Connection"),
            ConnectionTime: scalar("Connected since"),
            AgentVersion: scalar("Agent"),
            DeviceInformation: { shape: "object", rule: internal, fields: { CsDomain: scalar("Domain"), CsManufacturer: scalar("Manufacturer"), CsModel: scalar("Model"), WindowsVersion: scalar("Windows") } },
          },
        },
      },
    },
  },
  ticketList: {
    id: "tp-ticket-list",
    toolId: "sample.ticket_list",
    title: "Open Glass UX tickets",
    source: "sample.ticket_list",
    value: {
      SampleTickets: [
        { Id: "7102", EndpointId: "NST-C106", Status: "Open", Priority: "High", Summary: "Power outage — North studio", UpdatedAt: "13 Oct, 10:31 am" },
        { Id: "7105", EndpointId: "LMN-7B73", Status: "Waiting", Priority: "Normal", Summary: "Dispatch printer not responding", UpdatedAt: "13 Oct, 9:02 am" },
        { Id: "4836", EndpointId: "CDV-CLINIC02", Status: "Open", Priority: "Normal", Summary: "KB5044284 pending restart", UpdatedAt: "12 Oct, 4:40 pm" },
      ],
    },
    disclosure: {
      shape: "object",
      rule: internal,
      fields: {
        SampleTickets: { shape: "list", rule: internal, maximumItems: 25, item: { shape: "object", rule: internal, fields: { Id: scalar("Ticket"), Summary: scalar("Summary"), Status: scalar("Status"), Priority: scalar("Priority"), EndpointId: scalar("Endpoint"), UpdatedAt: scalar("Updated") } } },
      },
    },
  },
  jimJob: {
    id: "tp-jim",
    toolId: "sample.work.job_details",
    title: "Project job 830017",
    source: "sample.work.job_details · Confidential preview",
    previewCap: "Confidential",
    value: { JimJob: { JobNo: "830017", Status: "In progress", Priority: "2", ItemDesc: "Reception PC", FaultDesc: "Will not print to the Ricoh", OurRef: "KS-2210", DateIn: "8 Oct", DateDue: "15 Oct", Location: "Harbourlight Goods · Mossbridge" } },
    disclosure: {
      shape: "object",
      rule: confidential,
      fields: {
        JimJob: {
          shape: "object",
          rule: confidential,
          fields: {
            JobNo: scalar("Job", confidential),
            Status: scalar("Status", confidential),
            Priority: scalar("Priority", confidential),
            ItemDesc: scalar("Item", confidential),
            FaultDesc: scalar("Fault", confidential),
            DateDue: scalar("Due", confidential),
            Location: scalar("Location", confidential),
          },
        },
      },
    },
  },
  currentUser: {
    id: "tp-user",
    toolId: "sample.identity.current_user_context",
    title: "Your identity and roles",
    source: "sample.identity.current_user_context",
    value: { GlassUxAiCurrentUserContext: { UserId: "u-1", Name: "Avery Quinn", Email: "avery.quinn@orbit.example.com.au", Roles: ["Technician", "Administrator"] } },
    disclosure: { shape: "object", rule: confidential, fields: { GlassUxAiCurrentUserContext: { shape: "object", rule: confidential, fields: { Name: scalar("Name", confidential), Email: scalar("Email", confidential) } } } },
  },
} satisfies Record<string, ToolPreview>
