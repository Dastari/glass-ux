/**
 * Realistic Glass UX data for the chart sections: NST-C106's telemetry, its processes, its C:
 * drive, patch compliance across Northstar Studio and alerts per hour. Fully
 * deterministic (a seeded generator), so screenshots and tests are stable.
 */

/** Mulberry32: a tiny seeded PRNG. */
export function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 11:00 on Tuesday 13 October 2026, Hobart time (the end of every series). */
export const NOW = new Date(2026, 9, 13, 11, 0, 0)
const MINUTE = 60_000

/** `count` timestamps, one per `stepMinutes`, ending at NOW. */
export function timeline(count: number, stepMinutes = 1, end = NOW): Date[] {
  return Array.from({ length: count }, (_, index) => new Date(end.getTime() - (count - 1 - index) * stepMinutes * MINUTE))
}

/** A bounded random walk with a pull back towards `base`, plus occasional spikes. */
export function walk(count: number, seed: number, { base = 40, swing = 8, min = 0, max = 100, spikes = 0.02, spike = 30, digits = 1 } = {}): number[] {
  const rand = random(seed)
  const out: number[] = []
  let value = base
  for (let index = 0; index < count; index++) {
    value += (rand() - 0.5) * swing + (base - value) * 0.08
    let sample = value
    if (rand() < spikes) sample += spike * (0.5 + rand() * 0.5)
    sample = Math.min(max, Math.max(min, sample))
    out.push(Math.round(sample * 10 ** digits) / 10 ** digits)
  }
  return out
}

// ── NST-C106, the last hour ─────────────────────────────────────────────────────────────

export const HOUR = timeline(60)
/** A Windows Update run from 10:46 pushes CPU through warning and briefly into critical. */
const SURGE = [0, 22, 38, 49, 56, 63, 66, 58, 44, 30, 12]
export const CPU = walk(60, 106, { base: 34, swing: 12, spikes: 0.06, spike: 40 }).map((v, i) => (i >= 45 && i < 45 + SURGE.length ? Math.min(98.4, v + SURGE[i - 45]!) : v))
export const MEMORY_GB = walk(60, 7, { base: 6.1, swing: 0.25, min: 0, max: 7.8, spikes: 0.03, spike: 0.8, digits: 2 })
export const DISK_PCT = walk(60, 31, { base: 12, swing: 9, spikes: 0.06, spike: 50 })
export const NET_IN = walk(60, 41, { base: 18, swing: 10, max: 900, spikes: 0.05, spike: 90 })
export const NET_OUT = walk(60, 42, { base: 6, swing: 4, max: 900, spikes: 0.04, spike: 40 })
/** Windows memory composition (GB) — parts of 7.8 GB installed. */
export const MEMORY_PARTS = (() => {
  const inUse = walk(60, 81, { base: 4.6, swing: 0.2, min: 3.5, max: 6, digits: 2 })
  const modified = walk(60, 82, { base: 0.35, swing: 0.05, min: 0.1, max: 0.8, digits: 2 })
  const standby = inUse.map((value, index) => Math.round((7.8 - value - modified[index]! - 0.45) * 100) / 100)
  const free = inUse.map((value, index) => Math.round((7.8 - value - modified[index]! - standby[index]!) * 100) / 100)
  return { inUse, modified, standby, free }
})()

export const CPU_MARKERS = [
  { x: HOUR[23]!, label: "Agent restarted" },
  { x: HOUR[46]!, label: "Windows Update", tone: "info" as const },
]

// ── Long series (decimated for drawing, exact in the readout) ─────────────────────────────

/** A week of CPU at one-minute resolution: 10,080 samples. */
export const WEEK = timeline(7 * 24 * 60)
export const WEEK_CPU = (() => {
  const rand = random(2026)
  return WEEK.map((date, index) => {
    const hour = date.getHours() + date.getMinutes() / 60
    const working = date.getDay() > 0 && date.getDay() < 6 && hour > 8 && hour < 17.5 ? 1 : 0
    const base = 12 + working * 30 + Math.sin(index / 37) * 4
    const spike = rand() < 0.004 ? 40 + rand() * 40 : 0
    return Math.round(Math.min(100, Math.max(1, base + (rand() - 0.5) * 16 + spike)) * 10) / 10
  })
})()

// ── Top processes by memory (MB) ───────────────────────────────────────────────────────────

export const PROCESSES = [
  { key: "chrome", label: "chrome.exe", value: 1843 },
  { key: "teams", label: "ms-teams.exe", value: 1126 },
  { key: "outlook", label: "OUTLOOK.EXE", value: 684 },
  { key: "msmpeng", label: "MsMpEng.exe", value: 412 },
  { key: "explorer", label: "explorer.exe", value: 268 },
  { key: "onedrive", label: "OneDrive.exe", value: 196 },
  { key: "glassUx", label: "glass-ux-endpoint-service.exe", value: 74 },
  { key: "searchhost", label: "SearchHost.exe", value: 61 },
]

/** Patches installed per day this week, by classification (stacked/grouped columns). */
export const PATCH_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
export const PATCH_SERIES = [
  { key: "security", label: "Security", data: [42, 118, 36, 21, 18, 4, 2] },
  { key: "cumulative", label: "Cumulative", data: [8, 64, 12, 6, 5, 0, 1] },
  { key: "drivers", label: "Drivers", data: [6, 9, 14, 11, 7, 2, 0] },
]

/** Endpoints per organisation, online vs offline (grouped bars). */
export const ORG_ENDPOINTS = [
  { key: "northstar", label: "Northstar Studio", online: 128, offline: 9 },
  { key: "cedarvale", label: "Cedar Vale Collective", online: 34, offline: 3 },
  { key: "fa", label: "Orbit Workspace", online: 22, offline: 1 },
  { key: "staging", label: "Staging", online: 6, offline: 4 },
]

// ── Part to whole ──────────────────────────────────────────────────────────────────────────

/** Patch compliance across Northstar Studio (137 endpoints). Status data. */
export const COMPLIANCE = [
  { key: "compliant", label: "Compliant", value: 112, tone: "success" as const },
  { key: "pending", label: "Pending reboot", value: 14, tone: "warning" as const },
  { key: "missing", label: "Missing updates", value: 8, tone: "danger" as const },
  { key: "unknown", label: "Not reporting", value: 3, tone: "neutral" as const },
]

/** Operating systems across the fleet (categorical). */
export const OPERATING_SYSTEMS = [
  { key: "w11-24h2", label: "Windows 11 24H2", value: 96 },
  { key: "w11-23h2", label: "Windows 11 23H2", value: 41 },
  { key: "w10-22h2", label: "Windows 10 22H2", value: 33 },
  { key: "server-2022", label: "Windows Server 2022", value: 12 },
  { key: "macos", label: "macOS 15", value: 7 },
]

/** Drives on NST-C106 (radial bars). */
export const RESOURCES = [
  { key: "cpu", label: "CPU", value: CPU[CPU.length - 1] ?? 41, max: 100 },
  { key: "memory", label: "Memory", value: 79, max: 100 },
  { key: "disk", label: "C:", value: 82, max: 100 },
]

// ── Disk usage: C:\ on NST-C106 (bytes) ──────────────────────────────────────────────────

export interface DiskNode {
  name: string
  size?: number
  /** Semantic content or control type. */
  type?: "system" | "apps" | "documents" | "media" | "cache" | "other"
  children?: DiskNode[]
}

const GB = 1024 ** 3
const MB = 1024 ** 2

export const DISK_TREE: DiskNode = {
  name: "C:\\",
  children: [
    {
      name: "Users",
      children: [
        {
          name: "MiraRowan",
          children: [
            { name: "OneDrive - Northstar Studio", type: "documents", size: 38.4 * GB },
            { name: "Downloads", type: "documents", size: 12.6 * GB },
            { name: "Pictures", type: "media", size: 9.8 * GB },
            { name: "Videos", type: "media", size: 7.1 * GB },
            {
              name: "AppData",
              children: [
                { name: "Local\\Google\\Chrome", type: "cache", size: 4.2 * GB },
                { name: "Local\\Microsoft\\Teams", type: "cache", size: 2.9 * GB },
                { name: "Local\\Microsoft\\Outlook", type: "documents", size: 6.4 * GB },
                { name: "Roaming", type: "apps", size: 1.3 * GB },
              ],
            },
            { name: "Documents", type: "documents", size: 3.2 * GB },
            { name: "Desktop", type: "documents", size: 1.1 * GB },
          ],
        },
        { name: "Public", type: "documents", size: 1.4 * GB },
        { name: "Default", type: "system", size: 0.6 * GB },
      ],
    },
    {
      name: "Windows",
      children: [
        { name: "WinSxS", type: "system", size: 11.2 * GB },
        { name: "System32", type: "system", size: 6.8 * GB },
        { name: "Installer", type: "cache", size: 4.9 * GB },
        { name: "SoftwareDistribution", type: "cache", size: 3.1 * GB },
        { name: "SysWOW64", type: "system", size: 1.9 * GB },
        { name: "Fonts", type: "system", size: 640 * MB },
        { name: "Temp", type: "cache", size: 820 * MB },
      ],
    },
    {
      name: "Program Files",
      children: [
        { name: "Microsoft Office", type: "apps", size: 4.6 * GB },
        { name: "Google", type: "apps", size: 0.9 * GB },
        { name: "Adobe", type: "apps", size: 2.4 * GB },
        { name: "Microsoft Teams", type: "apps", size: 1.2 * GB },
        { name: "Glass UX", type: "apps", size: 184 * MB },
      ],
    },
    {
      name: "Program Files (x86)",
      children: [
        { name: "Microsoft", type: "apps", size: 2.1 * GB },
        { name: "Common Files", type: "apps", size: 0.7 * GB },
      ],
    },
    { name: "ProgramData", children: [{ name: "Microsoft", type: "apps", size: 3.4 * GB }, { name: "Package Cache", type: "cache", size: 2.2 * GB }] },
    { name: "pagefile.sys", type: "system", size: 8 * GB },
    { name: "hiberfil.sys", type: "system", size: 6.2 * GB },
    { name: "$Recycle.Bin", type: "other", size: 1.8 * GB },
  ],
}

// ── Distribution ───────────────────────────────────────────────────────────────────────────

/** Alerts per hour over the last day, by category. */
export const ALERT_CATEGORIES = ["Disk", "CPU", "Memory", "Services", "Security", "Patching"]
export const ALERT_HOURS = timeline(24, 60)
export const ALERTS = ALERT_CATEGORIES.map((_, row) => {
  const rand = random(500 + row)
  return ALERT_HOURS.map((date) => {
    const hour = date.getHours()
    const busy = hour >= 8 && hour <= 17 ? 2.4 : 0.6
    const nightly = row === 5 && (hour === 2 || hour === 3) ? 9 : 0
    return Math.max(0, Math.round(rand() * busy * (row === 3 ? 3 : row === 0 ? 1.6 : 1.1) + nightly - 0.6))
  })
})

/** Agent check-in latency across the fleet (ms). */
export const LATENCIES = (() => {
  const rand = random(77)
  return Array.from({ length: 420 }, () => {
    const u = rand()
    const v = rand()
    const normal = Math.sqrt(-2 * Math.log(u || 1e-9)) * Math.cos(2 * Math.PI * v)
    return Math.max(4, Math.round(38 + normal * 11 + (rand() < 0.06 ? 60 + rand() * 120 : 0)))
  })
})()

/** Endpoints: CPU against memory, by organisation (scatter). */
export const FLEET = (() => {
  const rand = random(19)
  const orgs = [
    { key: "northstar", label: "Northstar Studio", count: 60, cpu: 34, mem: 62 },
    { key: "cedarvale", label: "Cedar Vale", count: 24, cpu: 22, mem: 48 },
    { key: "fa", label: "Orbit Workspace", count: 18, cpu: 48, mem: 71 },
  ]
  return orgs.map((org) => ({
    key: org.key,
    label: org.label,
    points: Array.from({ length: org.count }, (_, index) => ({
      x: Math.round(Math.min(98, Math.max(2, org.cpu + (rand() - 0.5) * 40)) * 10) / 10,
      y: Math.round(Math.min(98, Math.max(12, org.mem + (rand() - 0.5) * 36)) * 10) / 10,
      label: `${org.key.toUpperCase()}-${(index * 2654435761 >>> 0).toString(16).slice(-4).toUpperCase()}`,
    })),
  }))
})()
