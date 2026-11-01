import type { FileProvider, FileUri } from "../../file-provider/index.js"
import { memoryFiles, type MemorySeed } from "../../file-provider/memory.js"
import { SCENE_IMAGES } from "./scenes.js"

/** Fixed dates, so every specimen reads the same on every load. */
const DAY = 86_400_000
const EPOCH = Date.UTC(2026, 2, 16, 9, 30)
const daysAgo = (days: number) => EPOCH - days * DAY
const bytes = (size: number) => "x".repeat(size)

const pictures: MemorySeed = Object.fromEntries(
  Object.entries(SCENE_IMAGES).map(([name, url], index) => [`Pictures/${name}.svg`, { content: url, mime: "image/svg+xml", modified: daysAgo(index + 3), thumbnail: { url } }])
)

const WORKSPACE: MemorySeed = {
  "Pictures/": { modified: daysAgo(2) },
  "Reports/": { modified: daysAgo(4) },
  "Reports/Drafts/": { modified: daysAgo(6) },
  "Reports/Drafts/Outline.txt": { content: "Headings for the second quarter", mime: "text/plain", modified: daysAgo(6) },
  "Reports/First quarter summary.pdf": { content: bytes(48_213), mime: "application/pdf", modified: daysAgo(11) },
  "Reports/Second quarter summary.pdf": { content: bytes(52_870), mime: "application/pdf", modified: daysAgo(4) },
  "Reports/Regional figures.xlsx": { content: bytes(18_450), modified: daysAgo(5) },
  "Restricted/": { modified: daysAgo(30), denied: { read: "Ask a workspace owner for access" } },
  "Shared/": { modified: daysAgo(9), denied: { write: "Shared is read-only for your role", create: "Shared is read-only for your role" } },
  "Shared/Handbook.pdf": { content: bytes(204_112), mime: "application/pdf", modified: daysAgo(40) },
  "Budget.xlsx": { content: bytes(22_048), modified: daysAgo(1) },
  "Meeting notes.txt": { content: "Agenda and actions", mime: "text/plain", modified: daysAgo(2) },
  "Plan.txt": { content: "The plan as it stands", mime: "text/plain", modified: daysAgo(3) },
  "Policy.pdf": { content: bytes(9_204), mime: "application/pdf", modified: daysAgo(60), denied: { read: "Held for review until Friday", write: "Held for review until Friday", rename: "Held for review until Friday", delete: "Held for review until Friday" } },
  "Style guide.docx": { content: bytes(31_337), modified: daysAgo(14), denied: { write: "Only the editor can replace this file" } },
  ...pictures,
}

/** The sample workspace: folders, documents and pictures, with denied entries. Every name is fictional. */
export const sampleWorkspace = (scheme = "workspace", label = "Workspace") => memoryFiles(WORKSPACE, { scheme, label })

/** A location with one folder of `count` files, paged. */
export const longFolder = (count: number, pageSize: number) =>
  memoryFiles(Object.fromEntries(Array.from({ length: count }, (_, index) => [`Scan ${String(index + 1).padStart(4, "0")}.png`, { content: bytes(1024 + index * 11), mime: "image/png", modified: daysAgo(index % 28) }])), { scheme: "scans", label: "Scans", pageSize })

/** A copy of `provider` without the named methods: a backend that lacks them. */
export function without<K extends keyof FileProvider>(provider: FileProvider, ...methods: K[]): Omit<FileProvider, K> {
  const copy = { ...provider }
  for (const method of methods) delete copy[method]
  return copy
}

/** Waits `ms`, or rejects with the signal's reason. */
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener("abort", () => (clearTimeout(timer), reject(signal.reason)), { once: true })
  })

/** A copy of `provider` whose listings take `ms`. `onAbort` runs for each listing abandoned. */
export function slowListing(provider: ReturnType<typeof memoryFiles>, ms: number, onAbort?: (uri: FileUri) => void): ReturnType<typeof memoryFiles> {
  return {
    ...provider,
    readDirectory: async (uri, options) => {
      const stop = () => onAbort?.(uri)
      options.signal.addEventListener("abort", stop, { once: true })
      await wait(ms, options.signal)
      options.signal.removeEventListener("abort", stop)
      return provider.readDirectory(uri, options)
    },
  }
}

/** A provider whose listing rejects: with a `code`, or never settles for `null`. */
export function stuckListing(provider: ReturnType<typeof memoryFiles>, code: "denied" | "unavailable" | null, message = ""): ReturnType<typeof memoryFiles> {
  return {
    ...provider,
    readDirectory: (_uri, { signal }) =>
      new Promise((_resolve, reject) => {
        if (code) reject(Object.assign(new Error(message), { code }))
        signal.addEventListener("abort", () => reject(signal.reason), { once: true })
      }),
  }
}
