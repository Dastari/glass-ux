/**
 * Deterministic Glass UX endpoints and a mock server for the DataTable gallery: sorting,
 * search and offset pages on the "server", 300–700 ms latency, a request log, and a live
 * ticker that flips statuses, moves CPU and enrols the odd new endpoint.
 */
import type { SortingState } from "@tanstack/react-table"

export type EndpointStatus = "online" | "offline" | "attention" | "error"

export interface Endpoint {
  id: string
  name: string
  /** Logged-in user, `AzureAD\MiraRowan`. */
  user: string
  organisation: string
  os: string
  osVersion: string
  /** Epoch ms. */
  lastSeen: number
  ip: string
  /** CPU % samples, one a minute, oldest first. Empty while offline. */
  cpu: number[]
  agentVersion: string
  /** Current operation or connection status. */
  status: EndpointStatus
  /** Selected assistant model or typed view model. */
  model: string
  memoryGb: number
  diskFreeGb: number
  serial: string
  uptimeDays: number | null
  domain: string
}

/* ── Deterministic randomness ──────────────────────────────────────────────────── */
function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
type Random = () => number
const pick = <T>(random: Random, list: readonly T[]): T => list[Math.floor(random() * list.length)] as T
function weighted<T>(random: Random, list: ReadonlyArray<readonly [T, number]>): T {
  const total = list.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = random() * total
  for (const [value, weight] of list) {
    roll -= weight
    if (roll <= 0) return value
  }
  return list[list.length - 1]![0]
}

const ORGANISATIONS = [
  { name: "Northstar Studio", prefix: "NST", domain: "AzureAD", weight: 5 },
  { name: "Cedar Vale Collective", prefix: "CDV", domain: "AzureAD", weight: 2 },
  { name: "Orbit Workspace", prefix: "FA", domain: "AzureAD", weight: 2 },
  { name: "Lumen Fieldworks", prefix: "ORB", domain: "WORKGROUP", weight: 3 },
  { name: "Mossbridge Workshop", prefix: "BODC", domain: "BODC", weight: 4 },
  { name: "Silver Fern Studio", prefix: "TCH", domain: "AzureAD", weight: 3 },
  { name: "Cloudmere Academy", prefix: "SPS", domain: "SPS", weight: 3 },
  { name: "Willowbank Supplies", prefix: "SHP", domain: "WORKGROUP", weight: 1 },
  { name: "Juniper Grove", prefix: "BMC", domain: "AzureAD", weight: 2 },
] as const

const PEOPLE = [
  "MiraRowan", "EllisPark", "AveryQuinn", "AnnaNguyen", "LiamOConnor", "PriyaSharma", "JackThompson",
  "ChloeWalker", "NoahWilliams", "IslaBrown", "OliverSmith", "MiaJones", "EthanTaylor", "GraceLee", "LucasWhite",
  "SophieMartin", "HenryClark", "ZoeHarris", "WilliamYoung", "RubyKing", "JamesWright", "EllaScott", "ThomasGreen",
  "AvaBaker", "SamuelAdams", "LilyHill", "BenjaminCampbell", "HarperMitchell", "LeoRoberts", "EmilyCarter",
] as const
const SHARED_LOGINS = ["Front Counter", "Reception", "Library", "Nurses Station", "Workshop", "Kiosk"] as const

const OPERATING_SYSTEMS = [
  [["Windows 11 Business", "10.0.26300"], 9],
  [["Windows 11 Pro", "10.0.26100"], 6],
  [["Windows 11 Enterprise", "10.0.22631"], 3],
  [["Windows 10 Pro", "10.0.19045"], 4],
  [["Windows Server 2022 Standard", "10.0.20348"], 2],
  [["Windows Server 2019 Standard", "10.0.17763"], 1],
] as const

const MODELS = [
  ["HP EliteOne 1000 G2 27-in 4K UHD AiO", 4],
  ["HP EliteBook 840 G9", 5],
  ["HP ProDesk 600 G6 SFF", 4],
  ["Dell OptiPlex 7090", 4],
  ["Dell Latitude 5440", 3],
  ["Lenovo ThinkPad T14 Gen 3", 4],
  ["Lenovo ThinkCentre M70q Gen 4", 3],
  ["Microsoft Surface Pro 9", 2],
  ["VMware Virtual Platform", 2],
] as const

const AGENT_VERSIONS = [
  ["6.8.0", 12],
  ["6.7.2", 5],
  ["6.7.0", 2],
  ["6.6.4", 1],
] as const

const STATUSES = [
  ["online", 70],
  ["offline", 18],
  ["attention", 8],
  ["error", 4],
] as const

const MEMORY = [7.8, 15.7, 15.7, 31.7, 63.7] as const
const HEX = "0123456789ABCDEF"
const ALNUM = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

function code(random: Random, used: Set<string>, prefix: string) {
  for (;;) {
    const style = random()
    const suffix =
      style < 0.45
        ? `${pick(random, ["A", "B", "C", "D", "L", "R", "S"])}${Math.floor(100 + random() * 900)}`
        : style < 0.85
          ? Array.from({ length: 4 }, () => pick(random, [...HEX])).join("")
          : `${Math.floor(1000 + random() * 9000)}`
    const name = `${prefix}-${suffix}`
    if (!used.has(name)) {
      used.add(name)
      return name
    }
  }
}

function cpuSeries(random: Random, length = 20) {
  const base = 6 + random() * 40
  const out: number[] = []
  let value = base
  for (let index = 0; index < length; index++) {
    value = Math.max(1, Math.min(99, value + (random() - 0.5) * 18 + (base - value) * 0.25))
    out.push(Math.round(value))
  }
  return out
}

function makeEndpoint(random: Random, used: Set<string>, now: number, index: number, forceStatus?: EndpointStatus): Endpoint {
  const organisation = weighted(random, ORGANISATIONS.map((org) => [org, org.weight] as const))
  const special = index % 97 === 0 ? (index % 2 ? "SERVER" : "VM") : null
  const name = special ? code(random, used, `${organisation.prefix}-${special}`) : code(random, used, organisation.prefix)
  const status = forceStatus ?? weighted<EndpointStatus>(random, STATUSES)
  const [os, osVersion] = weighted<readonly [string, string]>(random, OPERATING_SYSTEMS)
  const server = os.startsWith("Windows Server")
  const shared = !server && random() < 0.16
  const user =
    status === "offline"
      ? "—"
      : server
        ? `${name}\\Administrator`
        : shared
          ? `${name}\\${pick(random, SHARED_LOGINS)}`
          : `${organisation.domain}\\${pick(random, PEOPLE)}`
  const lastSeen = status === "offline" ? now - (60 * MINUTE + random() * 30 * DAY) : now - random() * 2 * MINUTE
  return {
    id: `ep_${(index + 1).toString(36).padStart(4, "0")}`,
    name,
    user,
    organisation: organisation.name,
    os,
    osVersion,
    lastSeen: Math.round(lastSeen),
    ip: `10.${ORGANISATIONS.indexOf(organisation) + 10}.${Math.floor(random() * 32)}.${2 + Math.floor(random() * 250)}`,
    cpu: status === "offline" ? [] : cpuSeries(random),
    agentVersion: weighted<string>(random, AGENT_VERSIONS),
    status,
    model: server ? (random() < 0.5 ? "Dell PowerEdge R650" : "VMware Virtual Platform") : weighted<string>(random, MODELS),
    memoryGb: server ? 63.7 : pick(random, MEMORY),
    diskFreeGb: Math.round(12 + random() * 460),
    serial: Array.from({ length: 10 }, () => pick(random, [...ALNUM])).join(""),
    uptimeDays: status === "offline" ? null : Math.floor(random() * 42),
    domain: organisation.domain === "AzureAD" ? "AzureAD" : organisation.domain === "WORKGROUP" ? "WORKGROUP" : `${organisation.domain}.LOCAL`,
  }
}

/** The reference NST-C106 from the mockups, always first in the set. */
function reference(now: number): Endpoint {
  return {
    id: "ep_0000",
    name: "NST-C106",
    user: "AzureAD\\MiraRowan",
    organisation: "Northstar Studio",
    os: "Windows 11 Business",
    osVersion: "10.0.26300",
    lastSeen: now - 40_000,
    ip: "10.10.4.21",
    cpu: [12, 14, 11, 18, 23, 19, 16, 22, 31, 27, 24, 21, 18, 20, 26, 29, 25, 22, 19, 23],
    agentVersion: "6.8.0",
    status: "online",
    model: "HP EliteOne 1000 G2 27-in 4K UHD AiO",
    memoryGb: 7.8,
    diskFreeGb: 184,
    serial: "8CC0481GWV",
    uptimeDays: 2,
    domain: "WORKGROUP",
  }
}

export function generateEndpoints(count = 1284, seed = 20261013, now = Date.now()) {
  const random = mulberry32(seed)
  const used = new Set<string>(["NST-C106"])
  const list = [reference(now)]
  for (let index = 1; index < count; index++) list.push(makeEndpoint(random, used, now, index))
  return list
}

/* ── Sorting on the "server" ───────────────────────────────────────────────────── */
const collator = new Intl.Collator("en-AU", { numeric: true, sensitivity: "base" })
const STATUS_RANK: Record<EndpointStatus, number> = { error: 0, attention: 1, online: 2, offline: 3 }
const ipValue = (ip: string) => ip.split(".").reduce((sum, part) => sum * 256 + Number(part), 0)
const lastCpu = (endpoint: Endpoint) => endpoint.cpu[endpoint.cpu.length - 1] ?? -1

const COMPARATORS: Record<string, (a: Endpoint, b: Endpoint) => number> = {
  name: (a, b) => collator.compare(a.name, b.name),
  status: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
  organisation: (a, b) => collator.compare(a.organisation, b.organisation),
  os: (a, b) => collator.compare(`${a.os} ${a.osVersion}`, `${b.os} ${b.osVersion}`),
  lastSeen: (a, b) => a.lastSeen - b.lastSeen,
  ip: (a, b) => ipValue(a.ip) - ipValue(b.ip),
  cpu: (a, b) => lastCpu(a) - lastCpu(b),
  agentVersion: (a, b) => collator.compare(a.agentVersion, b.agentVersion),
  model: (a, b) => collator.compare(a.model, b.model),
  memoryGb: (a, b) => a.memoryGb - b.memoryGb,
  diskFreeGb: (a, b) => a.diskFreeGb - b.diskFreeGb,
  serial: (a, b) => collator.compare(a.serial, b.serial),
  uptimeDays: (a, b) => (a.uptimeDays ?? -1) - (b.uptimeDays ?? -1),
  domain: (a, b) => collator.compare(a.domain, b.domain),
}

export const SORTABLE_COLUMNS = Object.keys(COMPARATORS)

export interface EndpointQuery {
  sorting: SortingState
  pageIndex: number
  /** Number of records per page. */
  pageSize: number
  /** Search definition or controlled search value. */
  search?: string
}

export interface EndpointPage {
  /** Records or matrix rows in display order. */
  rows: Endpoint[]
  rowCount: number
}

export interface RequestLogEntry extends EndpointQuery {
  /** Time associated with the record. */
  at: number
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function createEndpointServer(count = 1284) {
  const now = Date.now()
  let endpoints = generateEndpoints(count, 20261013, now)
  const random = mulberry32(42)
  const used = new Set(endpoints.map((endpoint) => endpoint.name))
  let enrolled = 0
  const log: RequestLogEntry[] = []
  const listeners = new Set<() => void>()

  function run({ sorting, pageIndex, pageSize, search }: EndpointQuery): EndpointPage {
    const needle = search?.trim().toLowerCase()
    let rows = needle
      ? endpoints.filter((endpoint) =>
          [endpoint.name, endpoint.user, endpoint.organisation, endpoint.ip, endpoint.model].some((value) => value.toLowerCase().includes(needle))
        )
      : endpoints.slice()
    if (sorting.length) {
      rows = rows.toSorted((a, b) => {
        for (const sort of sorting) {
          const compare = COMPARATORS[sort.id]
          if (!compare) continue
          const result = compare(a, b)
          if (result) return sort.desc ? -result : result
        }
        return collator.compare(a.name, b.name)
      })
    }
    const start = pageIndex * pageSize
    return { rows: rows.slice(start, start + pageSize), rowCount: rows.length }
  }

  return {
    /** A server round trip: 300–700 ms. */
    async query(query: EndpointQuery, options: { latency?: boolean } = {}): Promise<EndpointPage> {
      log.push({ ...query, at: Date.now() })
      for (const notify of listeners) notify()
      if (options.latency !== false) await wait(300 + Math.round(random() * 400))
      return run(query)
    },
    /** The most recent request, for the gallery's request readout and the e2e tests. */
    lastRequest: () => log[log.length - 1],
    onRequest(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    /**
     * One live tick: a few statuses flip, online CPU moves, and now and then a new
     * endpoint enrols. Unchanged rows keep their object identity, as a normalised cache
     * would, so only changed rows re-render.
     */
    tick({ enrol = true, prefer }: { enrol?: boolean | "always"; prefer?: readonly string[] } = {}) {
      const at = Date.now()
      const changes = new Map<number, Endpoint>()
      // Prefer the rows on screen so a demo tick is visible; otherwise the first few hundred.
      const preferred = prefer?.length ? new Set(prefer) : null
      const pool = endpoints.flatMap((endpoint, index) => (preferred ? (preferred.has(endpoint.id) ? [index] : []) : index < 120 ? [index] : []))
      for (let flips = 0; flips < 2 && pool.length; flips++) {
        const index = pool[Math.floor(random() * pool.length)]!
        const current = changes.get(index) ?? endpoints[index]!
        const status: EndpointStatus = current.status === "online" ? (random() < 0.5 ? "attention" : "offline") : "online"
        changes.set(index, {
          ...current,
          status,
          lastSeen: status === "offline" ? current.lastSeen : at,
          cpu: status === "offline" ? [] : current.cpu.length ? current.cpu : cpuSeries(random),
          user: status === "offline" ? "—" : current.user === "—" ? `AzureAD\\${pick(random, PEOPLE)}` : current.user,
          uptimeDays: status === "offline" ? null : (current.uptimeDays ?? 0),
        })
      }
      for (const index of pool) {
        if (random() > 0.3) continue
        const current = changes.get(index) ?? endpoints[index]!
        if (current.status === "offline") continue
        const next = Math.max(1, Math.min(99, (current.cpu[current.cpu.length - 1] ?? 20) + Math.round((random() - 0.5) * 30)))
        changes.set(index, { ...current, cpu: [...current.cpu.slice(1), next], lastSeen: at })
      }
      endpoints = endpoints.map((endpoint, index) => changes.get(index) ?? endpoint)
      if (enrol === "always" || (enrol && random() < 0.35)) {
        enrolled++
        // New enrolments sort to the top by name and by last seen, so they land on page 1.
        const name = code(random, used, "LMN-0")
        endpoints = [{ ...makeEndpoint(random, used, at, count + enrolled, "online"), id: `ep_new_${enrolled}`, name, lastSeen: at }, ...endpoints]
      }
      return changes.size
    },
  }
}

export type EndpointServer = ReturnType<typeof createEndpointServer>
