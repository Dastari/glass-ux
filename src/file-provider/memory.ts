import type {
  ByteEdit,
  ByteRange,
  DirectoryPage,
  FileAction,
  FileChange,
  FileEntry,
  FileProvider,
  FileProviderError,
  FileRequest,
  FileStat,
  FileThumbnail,
  FileUri,
  FileVersion,
  ListOptions,
  ReadOptions,
  ThumbnailOptions,
  WriteBase,
  WriteOptions,
  WriteResult,
} from "./index.js"
import { childUri, parentUri, rootUri, trimUri, uriName } from "./uri.js"

/** One file or folder in a seed. */
export interface MemorySeedEntry {
  /** The file's bytes; a string is written as UTF-8. Ignored on a folder. */
  content?: string | Uint8Array
  /** MIME type. */
  mime?: string
  /** Epoch milliseconds. Default 0, so a seeded tree renders the same every time. */
  modified?: number
  /** Which actions the entry refuses, and why. Enforced as well as listed. */
  denied?: FileEntry["denied"]
  /** What `thumbnail` returns. Without it an `image/*` file gives its own bytes, others null. */
  thumbnail?: FileThumbnail
}

/**
 * The files to start with, by path from the root. A path ending in `/` is a folder; folders on
 * the way to a path are made for it.
 *
 * @example
 * ```ts
 * { "Reports/": {}, "Reports/summary.txt": "Second quarter", "cover.png": { content: bytes, mime: "image/png" } }
 * ```
 */
export type MemorySeed = Readonly<Record<string, string | Uint8Array | MemorySeedEntry>>

/** Options of {@link memoryFiles}. */
export interface MemoryFilesOptions {
  /** Unique among the providers in use. Default `memory`. */
  scheme?: string
  /** Application text naming the location. Default the scheme. */
  label?: string
  /** The most entries one `readDirectory` returns. Default 100. */
  pageSize?: number
}

interface Node {
  kind: FileEntry["kind"]
  bytes: Uint8Array
  version: FileVersion
  modified: number
  mime?: string
  denied?: FileEntry["denied"]
  thumbnail?: FileThumbnail
}

const NO_BYTES = new Uint8Array(0)

/** Stops with the signal's reason while `task` runs. */
function untilAborted<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const stop = () => reject(signal.reason)
    if (signal.aborted) return stop()
    signal.addEventListener("abort", stop, { once: true })
    task.then(resolve, reject).finally(() => signal.removeEventListener("abort", stop))
  })
}

function failure(code: FileProviderError["code"], message: string): FileProviderError {
  return Object.assign(new Error(message), { name: "FileProviderError", code })
}

/** One turn of the event loop, as a backend would take, with abort checked on both sides of it. */
async function turn(signal: AbortSignal) {
  signal.throwIfAborted()
  await Promise.resolve()
  signal.throwIfAborted()
}

const toBytes = (content: string | Uint8Array | undefined) => (content === undefined ? NO_BYTES : typeof content === "string" ? new TextEncoder().encode(content) : content.slice())

/**
 * A provider held in memory, with every optional method, for tests and demonstrations. It does
 * no I/O and works in a worker. Writes and edits check their base and commit in one synchronous
 * step, so conflicts behave as they must at a real backend.
 *
 * Its error messages are for developers, apart from a seeded `denied` reason, which is passed on
 * so the dialog can show it. The methods are plain functions: spread the result and leave one out
 * to stand for a backend without that capability.
 *
 * @example
 * ```ts
 * import { memoryFiles } from "glass-ux/file-provider/memory"
 *
 * const files = memoryFiles({ "Reports/summary.txt": "Second quarter" }, { label: "Sample files" })
 * const { write, applyEdits, ...readOnly } = files
 * ```
 */
export function memoryFiles(seed: MemorySeed = {}, options: MemoryFilesOptions = {}) {
  const scheme = options.scheme ?? "memory"
  const pageSize = options.pageSize ?? 100
  const root = rootUri({ scheme })
  const nodes = new Map<string, Node>()
  const watchers = new Set<{ uri: string; listener: (change: FileChange) => void }>()
  let clock = 0

  const key = trimUri
  const nextVersion = () => `v${++clock}`
  const nodeAt = (uri: FileUri) => nodes.get(key(uri))
  const parentOf = (uri: FileUri) => parentUri(uri, root)

  const entryOf = (uri: string, node: Node): FileStat => ({
    uri,
    name: key(uri) === key(root) ? (options.label ?? scheme) : uriName(uri),
    kind: node.kind,
    size: node.kind === "file" ? node.bytes.length : null,
    version: node.version,
    modified: node.modified,
    ...(node.mime ? { mime: node.mime } : null),
    ...(node.denied ? { denied: { ...node.denied } } : null),
  })

  const refuse = (node: Node | undefined, action: FileAction) => {
    const reason = node?.denied?.[action]
    if (reason) throw failure("denied", typeof reason === "string" ? reason : "")
  }
  const existing = (uri: FileUri): Node => {
    const node = nodeAt(uri)
    if (!node) throw failure("not-found", `Nothing at ${uri}`)
    return node
  }
  const requireFile = (uri: FileUri): Node => {
    const node = existing(uri)
    if (node.kind !== "file") throw failure("unsupported", `${uri} is a folder`)
    return node
  }
  const requireFolder = (uri: FileUri): Node => {
    const node = existing(uri)
    if (node.kind !== "directory") throw failure("unsupported", `${uri} is a file`)
    return node
  }

  const notify = (change: FileChange) => {
    const parent = parentOf(change.uri)
    for (const watcher of watchers) {
      if (key(watcher.uri) === key(change.uri) || (parent !== null && key(watcher.uri) === key(parent))) queueMicrotask(() => watcher.listener(change))
    }
  }

  const put = (uri: string, node: Node) => nodes.set(key(uri), node)
  const makeFolders = (uri: string) => {
    for (let at: string | null = uri; at !== null && !nodes.has(key(at)); at = parentOf(at)) put(at, { kind: "directory", bytes: NO_BYTES, version: nextVersion(), modified: 0 })
  }

  put(root, { kind: "directory", bytes: NO_BYTES, version: nextVersion(), modified: 0 })
  for (const [path, value] of Object.entries(seed)) {
    const folder = path.endsWith("/")
    const uri = path.split("/").filter(Boolean).reduce<string>(childUri, root)
    const entry: MemorySeedEntry = typeof value === "string" || value instanceof Uint8Array ? { content: value } : value
    const parent = parentOf(uri)
    if (parent !== null) makeFolders(parent)
    put(uri, {
      kind: folder ? "directory" : "file",
      bytes: folder ? NO_BYTES : toBytes(entry.content),
      version: nextVersion(),
      modified: entry.modified ?? 0,
      ...(entry.mime ? { mime: entry.mime } : null),
      ...(entry.denied ? { denied: entry.denied } : null),
      ...(entry.thumbnail ? { thumbnail: entry.thumbnail } : null),
    })
  }

  /** The children of a folder: folders first, then files, each by name. */
  const childrenOf = (uri: string) => {
    const folder = key(uri)
    const prefix = folder === key(root) ? root : `${folder}/`
    const found: FileStat[] = []
    for (const [at, node] of nodes) {
      if (at !== folder && at.startsWith(prefix) && !at.slice(prefix.length).includes("/")) found.push(entryOf(at, node))
    }
    return found.sort((a, b) => (a.kind === b.kind ? (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) : a.kind === "directory" ? -1 : 1))
  }

  /** The conflict a base meets now, or null when the write may go ahead. */
  const conflictWith = (uri: FileUri, base: WriteBase): WriteResult | null => {
    const node = nodeAt(uri)
    if ("overwrite" in base) return null
    if ("absent" in base) return node ? { status: "conflict", current: entryOf(uri, node) } : null
    if (!node) return { status: "conflict", current: null }
    return node.version === base.version ? null : { status: "conflict", current: entryOf(uri, node) }
  }

  const commit = (uri: FileUri, bytes: Uint8Array, mime: string | undefined): FileStat => {
    const before = nodeAt(uri)
    const node: Node = { ...before, kind: "file", bytes, version: nextVersion(), modified: Date.now(), ...(mime ? { mime } : null) }
    put(uri, node)
    notify({ type: before ? "changed" : "created", uri, version: node.version })
    return entryOf(uri, node)
  }

  const refuseWrite = (uri: FileUri) => {
    const node = nodeAt(uri)
    if (node) {
      if (node.kind === "directory") throw failure("exists", `${uri} is a folder`)
      return refuse(node, "write")
    }
    const parent = parentOf(uri)
    if (parent === null) throw failure("not-found", `${uri} has no parent`)
    const folder = requireFolder(parent)
    refuse(folder, "write")
    refuse(folder, "create")
  }

  return {
    scheme,
    label: options.label ?? scheme,
    root,

    async stat(uri: FileUri, { signal }: FileRequest): Promise<FileStat> {
      await turn(signal)
      return entryOf(uri, existing(uri))
    },

    async read(uri: FileUri, { offset, length }: ByteRange, { signal, version }: ReadOptions): Promise<Uint8Array> {
      await turn(signal)
      const node = requireFile(uri)
      refuse(node, "read")
      if (version !== undefined && node.version !== version) throw failure("changed", `${uri} is no longer version ${version}`)
      return node.bytes.slice(offset, offset + length)
    },

    async readDirectory(uri: FileUri, { signal, cursor, limit }: ListOptions): Promise<DirectoryPage> {
      await turn(signal)
      refuse(requireFolder(uri), "read")
      const all = childrenOf(uri)
      const start = cursor ? Number(cursor) : 0
      const end = start + Math.min(limit ?? pageSize, pageSize)
      return { entries: all.slice(start, end), cursor: end < all.length ? String(end) : null, total: all.length }
    },

    async write(uri: FileUri, source: ReadableStream<Uint8Array>, { base, signal, mime, onProgress }: WriteOptions): Promise<WriteResult> {
      signal.throwIfAborted()
      refuseWrite(uri)
      const early = conflictWith(uri, base)
      if (early) {
        await source.cancel()
        return early
      }
      const reader = source.getReader()
      const chunks: Uint8Array[] = []
      let written = 0
      try {
        for (;;) {
          const { done, value } = await untilAborted(reader.read(), signal)
          if (done) break
          chunks.push(value.slice())
          written += value.length
          onProgress?.(written)
        }
      } catch (error) {
        await reader.cancel().catch(() => undefined)
        throw error
      }
      // The check and the commit are one synchronous step, so the write is atomic.
      signal.throwIfAborted()
      const late = conflictWith(uri, base)
      if (late) return late
      const bytes = new Uint8Array(written)
      let at = 0
      for (const chunk of chunks) {
        bytes.set(chunk, at)
        at += chunk.length
      }
      return { status: "written", stat: commit(uri, bytes, mime) }
    },

    async applyEdits(uri: FileUri, base: FileVersion, edits: readonly ByteEdit[], { signal }: FileRequest): Promise<WriteResult> {
      await turn(signal)
      const node = nodeAt(uri)
      if (!node) return { status: "conflict", current: null }
      if (node.kind !== "file") throw failure("unsupported", `${uri} is a folder`)
      refuse(node, "write")
      if (node.version !== base) return { status: "conflict", current: entryOf(uri, node) }
      const parts: Uint8Array[] = []
      let at = 0
      for (const edit of edits) {
        if (edit.offset < at || edit.offset + edit.deleteLength > node.bytes.length) throw failure("unsupported", "Edits must be ascending, must not overlap and must stay inside the file")
        parts.push(node.bytes.subarray(at, edit.offset), edit.insert)
        at = edit.offset + edit.deleteLength
      }
      parts.push(node.bytes.subarray(at))
      const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
      let written = 0
      for (const part of parts) {
        bytes.set(part, written)
        written += part.length
      }
      return { status: "written", stat: commit(uri, bytes, node.mime) }
    },

    async thumbnail(uri: FileUri, { signal, version }: ThumbnailOptions): Promise<FileThumbnail | null> {
      await turn(signal)
      const node = requireFile(uri)
      if (version !== undefined && node.version !== version) throw failure("changed", `${uri} is no longer version ${version}`)
      if (node.thumbnail) return node.thumbnail
      return node.mime?.startsWith("image/") ? { bytes: node.bytes.slice(), mime: node.mime } : null
    },

    watch(uri: FileUri, listener: (change: FileChange) => void, { signal }: FileRequest): void {
      if (signal.aborted) return
      const watcher = { uri, listener }
      watchers.add(watcher)
      signal.addEventListener("abort", () => watchers.delete(watcher), { once: true })
    },

    async createDirectory(uri: FileUri, { signal }: FileRequest): Promise<FileStat> {
      await turn(signal)
      if (nodeAt(uri)) throw failure("exists", `${uri} already exists`)
      const parent = parentOf(uri)
      if (parent === null) throw failure("not-found", `${uri} has no parent`)
      refuse(requireFolder(parent), "create")
      const node: Node = { kind: "directory", bytes: NO_BYTES, version: nextVersion(), modified: Date.now() }
      put(uri, node)
      notify({ type: "created", uri, version: node.version })
      return entryOf(uri, node)
    },

    async rename(from: FileUri, to: FileUri, { signal }: FileRequest): Promise<FileStat> {
      await turn(signal)
      const node = existing(from)
      refuse(node, "rename")
      if (key(from) === key(root)) throw failure("unsupported", "The root cannot be renamed")
      if (nodeAt(to)) throw failure("exists", `${to} already exists`)
      const parent = parentOf(to)
      if (parent === null) throw failure("not-found", `${to} has no parent`)
      refuse(requireFolder(parent), "create")
      const oldKey = key(from)
      for (const [at, moved] of Array.from(nodes)) {
        if (at !== oldKey && !at.startsWith(`${oldKey}/`)) continue
        nodes.delete(at)
        nodes.set(`${key(to)}${at.slice(oldKey.length)}`, moved)
      }
      notify({ type: "deleted", uri: from })
      notify({ type: "created", uri: to, version: node.version })
      return entryOf(to, node)
    },

    async delete(uri: FileUri, { signal }: FileRequest): Promise<void> {
      await turn(signal)
      refuse(existing(uri), "delete")
      if (key(uri) === key(root)) throw failure("unsupported", "The root cannot be deleted")
      const gone = key(uri)
      for (const at of Array.from(nodes.keys())) if (at === gone || at.startsWith(`${gone}/`)) nodes.delete(at)
      notify({ type: "deleted", uri })
    },
  } satisfies FileProvider
}
