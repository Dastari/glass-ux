/**
 * Devices for the filters demo, and a mock server that is genuinely server-side: it
 * receives the graphql-orm `Where` object the table produced, evaluates it over every
 * row with graphql-orm's semantics (evaluateWhere), sorts, and returns one page.
 */
import type { SortingState } from "@tanstack/react-table"
import { evaluateWhere, type WhereInput } from "../../adapters/graphql-orm/index.js"
import type { OptionItem, OptionSource } from "../../ui/combobox/index.js"

export interface Device {
  id: string
  hostname: string
  /** Signed-in user, or null when nobody is. */
  user: string | null
  os: string
  /** Epoch seconds, as `LastSeenEpoch` is stored. */
  lastSeen: number
  /** Memory in use as a fraction 0–1 (the cell shows %). Null when the agent has not reported. */
  memoryUsed: number | null
  online: boolean
  serial: string
  site: string | null
  cpu: number[]
}

export const OPERATING_SYSTEMS = [
  "Windows 11 Business 24H2",
  "Windows 11 Pro 24H2",
  "Windows 11 Enterprise 23H2",
  "Windows 10 Pro 22H2",
  "Windows 10 Enterprise LTSC 2021",
  "Windows Server 2022 Standard",
  "Windows Server 2019 Standard",
  "Windows Server 2016 Standard",
  "macOS 15 Sequoia",
  "macOS 14 Sonoma",
  "Ubuntu 24.04 LTS",
  "ChromeOS 129",
] as const

export const SITES = ["Mossbridge", "Cedar Annex", "Orford", "Bicheno", "St Helens", "Hobart"] as const

const PREFIXES = ["NST", "NST", "CDV", "ORB", "BODC", "TCH"] as const
const PEOPLE = ["MiraRowan", "EllisPark", "AveryQuinn", "AnnaNguyen", "LiamOConnor", "PriyaSharma", "JackThompson", "ChloeWalker", "IslaBrown", "GraceLee"] as const
const ALNUM = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"
const HEX = "0123456789abcdef"

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

const DAY_S = 86_400

/** 400 devices, the same on every load (seeded), relative to `now`. */
export function generateDevices(count = 400, now = Date.now()): Device[] {
  const random = mulberry32(20261013)
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)] as T
  const used = new Set<string>()
  const nowS = Math.floor(now / 1000)
  return Array.from({ length: count }, (_, index) => {
    let hostname = ""
    do hostname = `${pick(PREFIXES)}-${pick(["C", "L", "S", "R"])}${Math.floor(100 + random() * 900)}`
    while (used.has(hostname))
    used.add(hostname)
    const os = index === 0 ? "Windows 11 Business 24H2" : pick(OPERATING_SYSTEMS)
    const online = index === 0 ? true : random() < 0.62
    // Online devices checked in within minutes; offline ones anything up to 200 days ago.
    const age = online ? random() * 300 : 3600 + Math.pow(random(), 1.6) * 200 * DAY_S
    const memory = random() < 0.06 ? null : Math.round((0.18 + random() * 0.8) * 1000) / 1000
    return {
      id: Array.from({ length: 32 }, (__, at) => (at === 12 ? "4" : pick([...HEX])))
        .join("")
        .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5"),
      hostname: index === 0 ? "NST-C106" : hostname,
      user: online ? (index === 0 ? "AzureAD\\MiraRowan" : `AzureAD\\${pick(PEOPLE)}`) : null,
      os,
      lastSeen: Math.round(nowS - age),
      memoryUsed: index === 0 ? 0.62 : memory,
      online,
      serial: index === 0 ? "8CC0481GWV" : Array.from({ length: 10 }, () => pick([...ALNUM])).join(""),
      site: random() < 0.08 ? null : pick(SITES),
      cpu: online ? Array.from({ length: 20 }, () => Math.round(4 + random() * 60)) : [],
    }
  })
}

/** The row as graphql-orm sees it: the `Where` field names. */
export function deviceRecord(device: Device): Record<string, unknown> {
  return {
    Hostname: device.hostname,
    SignedInUser: device.user,
    Os: device.os,
    LastSeenEpoch: device.lastSeen,
    MemoryUsed: device.memoryUsed,
    Online: device.online,
    Serial: device.serial,
    Site: device.site,
  }
}

const collator = new Intl.Collator("en-AU", { numeric: true, sensitivity: "base" })
const COMPARE: Record<string, (a: Device, b: Device) => number> = {
  hostname: (a, b) => collator.compare(a.hostname, b.hostname),
  os: (a, b) => collator.compare(a.os, b.os),
  lastSeen: (a, b) => a.lastSeen - b.lastSeen,
  memoryUsed: (a, b) => (a.memoryUsed ?? -1) - (b.memoryUsed ?? -1),
  online: (a, b) => Number(a.online) - Number(b.online),
  serial: (a, b) => collator.compare(a.serial, b.serial),
  site: (a, b) => collator.compare(a.site ?? "", b.site ?? ""),
}
export const SORTABLE = Object.keys(COMPARE)

export interface DeviceQuery {
  where: WhereInput | undefined
  sorting: SortingState
  page: { limit: number; offset: number }
}

export interface DevicePage {
  /** Records or matrix rows in display order. */
  rows: Device[]
  rowCount: number
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function createDeviceServer(count = 400) {
  const devices = generateDevices(count)
  const records = new Map(devices.map((device) => [device.id, deviceRecord(device)]))
  const random = mulberry32(7)
  return {
    devices,
    /** One round trip: evaluate Where, sort, page (250–550 ms). */
    async query(query: DeviceQuery, { latency = true }: { latency?: boolean } = {}): Promise<DevicePage> {
      if (latency) await wait(250 + Math.round(random() * 300))
      let rows = devices.filter((device) => evaluateWhere(query.where, records.get(device.id) ?? {}))
      rows = rows.toSorted((a, b) => {
        for (const sort of query.sorting) {
          const result = COMPARE[sort.id]?.(a, b) ?? 0
          if (result) return sort.desc ? -result : result
        }
        return collator.compare(a.hostname, b.hostname)
      })
      return { rows: rows.slice(query.page.offset, query.page.offset + query.page.limit), rowCount: rows.length }
    },
  }
}

/** The OS list as a server would load it (about 400 ms), searchable. */
export const osSource: OptionSource = {
  async search(query, { signal }) {
    await wait(400)
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    const needle = query.trim().toLowerCase()
    const items: OptionItem[] = OPERATING_SYSTEMS.filter((os) => os.toLowerCase().includes(needle)).map((os) => ({ value: os, label: os }))
    return { items }
  },
}
