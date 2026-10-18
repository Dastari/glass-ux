/**
 * Shared, realistic Glass UX data for the navigation and data-display gallery sections
 * (tabs, breadcrumb, tree, metric…). Not a section itself: the registry only loads
 * `*.meta.ts` / `*.section.tsx`.
 */
import {
  IconActivity,
  IconBell,
  IconDashboard,
  IconRemoteControl,
  IconSettings,
  IconShield,
  IconSoftware,
  IconTerminal,
} from "../../icons/generated/icons.js"
import type { StatusKind } from "../../ui/badge/index.js"
import type { TabItem } from "../../ui/tabs/index.js"

export const ENDPOINT_TABS: TabItem[] = [
  { value: "overview", label: "Overview", icon: <IconDashboard /> },
  { value: "remote", label: "Remote control", icon: <IconRemoteControl /> },
  { value: "software", label: "Software", icon: <IconSoftware /> },
  { value: "activity", label: "Activity", icon: <IconActivity /> },
  { value: "alerts", label: "Alerts", icon: <IconBell />, count: 3 },
  { value: "scripts", label: "Scripts", icon: <IconTerminal /> },
  { value: "security", label: "Security", icon: <IconShield /> },
  { value: "settings", label: "Settings", icon: <IconSettings /> },
]

export const ORGANISATIONS = [
  "Northstar Studio",
  "Cedar Vale Collective",
  "Orbit Workspace",
  "Staging",
] as const

export interface DemoEndpoint {
  id: string
  name: string
  user: string
  /** Current operation or connection status. */
  status: StatusKind
  organisation: string
}

/** The hand-written endpoints from the mockups, then a deterministic long tail. */
export const ENDPOINTS: DemoEndpoint[] = [
  { id: "nst-c106", name: "NST-C106", user: "AzureAD\\MiraRowan", status: "online", organisation: ORGANISATIONS[0] },
  { id: "nst-3bb4", name: "NST-3BB4", user: "AzureAD\\MiraRowan", status: "online", organisation: ORGANISATIONS[0] },
  { id: "nst-server", name: "NST-SERVER", user: "NST-SERVER\\NST", status: "warning", organisation: ORGANISATIONS[0] },
  { id: "nst-l221", name: "NST-L221", user: "AzureAD\\RoryLake", status: "offline", organisation: ORGANISATIONS[0] },
  { id: "cedarvalei-6231", name: "CDV-6231", user: "AzureAD\\EllisPark", status: "online", organisation: ORGANISATIONS[1] },
  { id: "cedarvalei-7d02", name: "CDV-7D02", user: "AzureAD\\NoaFinch", status: "installing", organisation: ORGANISATIONS[1] },
  { id: "orb-4e5e", name: "LMN-4E5E", user: "LMN-4E5E\\Front Counter", status: "online", organisation: ORGANISATIONS[2] },
  { id: "orb-7c71", name: "LMN-7C71", user: "ANOTHER\\avery.quinn", status: "online", organisation: ORGANISATIONS[2] },
  { id: "win11-vm", name: "STUDIO-VM", user: "STUDIO-VM\\Avery Quinn", status: "maintenance", organisation: ORGANISATIONS[2] },
  { id: "bp-b329", name: "BP-B329", user: "BP-B329\\svc.backup", status: "warning", organisation: ORGANISATIONS[3] },
]

const PREFIXES = ["NST", "CDV", "ORB", "BP"] as const
const PEOPLE = ["MiraRowan", "EllisPark", "RoryLake", "NoaFinch", "CaseyReed", "SageWinter", "LiamHoward", "NoahPage"]
const STATES: StatusKind[] = ["online", "online", "online", "offline", "online", "warning", "online", "offline", "online", "installing"]

/** `count` endpoints spread over the organisations — enough to prove virtualisation. */
export function manyEndpoints(count: number): DemoEndpoint[] {
  const out: DemoEndpoint[] = []
  for (let index = 0; index < count; index++) {
    const org = index % ORGANISATIONS.length
    const prefix = PREFIXES[org] ?? "ORB"
    const serial = ((index * 2654435761) >>> 0).toString(16).slice(-4).toUpperCase().padStart(4, "0")
    out.push({
      id: `${prefix.toLowerCase()}-${index}`,
      name: `${prefix}-${serial}`,
      user: `AzureAD\\${PEOPLE[index % PEOPLE.length]}`,
      status: STATES[index % STATES.length] ?? "online",
      organisation: ORGANISATIONS[org] ?? ORGANISATIONS[0],
    })
  }
  return out
}

/** A smooth-ish, deterministic series for sparklines (percentages). */
export function series(length: number, seed: number, base = 40, swing = 25): number[] {
  const out: number[] = []
  let value = base
  for (let index = 0; index < length; index++) {
    const noise = Math.sin(index * 0.7 + seed) * 0.6 + Math.sin(index * 0.23 + seed * 2) * 0.9
    value = Math.max(2, Math.min(98, base + noise * swing * 0.6 + Math.sin(index / 3 + seed) * swing * 0.3))
    out.push(Math.round(value))
  }
  return out
}

/** "10:00" … for each sample of a series that ends at 11:00, one per `stepMinutes`. */
export function clockTimes(length: number, stepMinutes = 1, end = 11 * 60): string[] {
  return Array.from({ length }, (_, index) => {
    const minutes = end - (length - 1 - index) * stepMinutes
    const h = Math.floor(minutes / 60) % 24
    const m = ((minutes % 60) + 60) % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  })
}
