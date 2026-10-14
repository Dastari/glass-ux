/**
 * Mock option sources for the form-control gallery (never imported by src/ui).
 * Latency is random within a range so loading and refreshing states are visible.
 */
import { IconEndpoint, IconLaptop, IconOrganisation, IconServer } from "../../icons/generated/icons.js"
import { StatusDot, type EndpointStatus } from "../../ui/badge/index.js"
import { filterOptions, type OptionItem, type OptionSource } from "../../ui/combobox/index.js"
import { ORGANISATIONS } from "./forms.fixtures.js"

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    })
  })

/** Deterministic pseudo-random numbers, so the mock fleet is the same on every load. */
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const SITES = [
  { prefix: "NST", org: "Northstar Studio", domain: "AzureAD" },
  { prefix: "ORB", org: "Northstar Studio", domain: "ORB" },
  { prefix: "CDV", org: "Cedar Vale Collective", domain: "AzureAD" },
  { prefix: "FA", org: "Orbit Workspace", domain: "AzureAD" },
  { prefix: "BMC", org: "Juniper Grove", domain: "BMC" },
  { prefix: "SPS", org: "Cloudmere Academy", domain: "AzureAD" },
  { prefix: "SHM", org: "St Helens Marina", domain: "SHM" },
]
const PEOPLE = ["MiraRowan", "EllisPark", "AveryQuinn", "Front Counter", "Reception", "JordanLee", "SamNguyen", "AlexChen", "PriyaShah", "Kiosk"]
const STATUSES: EndpointStatus[] = ["online", "online", "online", "offline", "warning", "online", "maintenance"]
const STATUS_LABEL: Record<string, string> = { online: "Online", offline: "Offline", warning: "Warning", maintenance: "Maintenance" }

export interface MockEndpoint extends OptionItem {
  /** Current operation or connection status. */
  status: EndpointStatus
}

/** 1,284 endpoints across the client organisations. */
export const FLEET: MockEndpoint[] = (() => {
  const random = seeded(1284)
  const fleet: MockEndpoint[] = []
  for (let index = 0; index < 1284; index++) {
    const site = SITES[Math.floor(random() * SITES.length)] ?? SITES[0]!
    const suffix = Math.floor(random() * 0xffff).toString(16).toUpperCase().padStart(4, "0")
    const kind = random()
    const name = kind > 0.94 ? `${site.prefix}-SERVER${(index % 9) + 1}` : `${site.prefix}-${suffix}`
    const status = STATUSES[Math.floor(random() * STATUSES.length)] ?? "online"
    const person = PEOPLE[Math.floor(random() * PEOPLE.length)] ?? "Reception"
    fleet.push({
      value: `ep-${index}`,
      label: name,
      description: `${site.domain}\\${person}`,
      icon: kind > 0.94 ? <IconServer /> : kind > 0.6 ? <IconLaptop /> : <IconEndpoint />,
      meta: <StatusDot status={status} label={STATUS_LABEL[status]} />,
      group: site.org,
      status,
    })
  }
  fleet.unshift({
    value: "nst-c106",
    label: "NST-C106",
    description: "AzureAD\\MiraRowan",
    icon: <IconEndpoint />,
    meta: <StatusDot status="online" label="Online" />,
    group: "Northstar Studio",
    status: "online",
  })
  return fleet
})()

const PAGE = 30

/** Endpoint search: 150–600 ms, the first 30 matches, and how many more there are. */
export const endpointSource: OptionSource = {
  debounceMs: 200,
  minChars: 1,
  suggestions: FLEET.slice(0, 4).map((endpoint) => ({ ...endpoint, group: "Recent" })),
  async search(query, { signal }) {
    await sleep(150 + Math.random() * 450, signal)
    const found = filterOptions(FLEET, query)
    return { items: found.slice(0, PAGE), more: Math.max(0, found.length - PAGE) }
  },
}

/** Organisations, searched with latency, at least 2 characters. */
export const organisationSource: OptionSource = {
  minChars: 2,
  async search(query, { signal }) {
    await sleep(150 + Math.random() * 450, signal)
    return filterOptions(
      ORGANISATIONS.map((organisation) => ({ ...organisation, icon: <IconOrganisation /> })),
      query
    )
  },
}

const attempts = new Map<string, number>()
/** Fails the first time for each query, succeeds on Retry. */
export const flakySource: OptionSource = {
  async search(query, { signal }) {
    await sleep(300, signal)
    const count = (attempts.get(query) ?? 0) + 1
    attempts.set(query, count)
    if (count === 1) throw new Error("Network unreachable")
    return filterOptions(FLEET, query).slice(0, 8)
  },
}

declare global {
  interface Window {
    glassUxSearchLog?: Array<{ query: string; done: boolean; aborted: boolean }>
  }
}

/**
 * For the "latest wins" test: one-character queries answer slowly, longer ones fast, and
 * every call is logged on window.glassUxSearchLog.
 */
export const raceSource: OptionSource = {
  debounceMs: 60,
  async search(query, { signal }) {
    const entry = { query, done: false, aborted: false }
    window.glassUxSearchLog = [...(window.glassUxSearchLog ?? []), entry]
    signal.addEventListener("abort", () => {
      entry.aborted = true
    })
    await sleep(query.length <= 1 ? 900 : 120, signal)
    entry.done = true
    return filterOptions(FLEET, query)
      .slice(0, 6)
      .map((item) => ({ ...item, group: undefined, meta: `“${query}”` }))
  },
}
