/**
 * The storage contract shared across packages: types only, with no imports and no runtime
 * code, so a worker can use it and it costs nothing in a bundle. It compiles against the
 * WebWorker lib as well as DOM (`file-provider.test.ts` proves both).
 *
 * The contract has no authentication, session or transport: a provider arrives already able to
 * do its job. Requests and results are plain data, so they survive `postMessage` and JSON.
 * Provider objects stay in the realm that made them.
 *
 * Only `scheme`, `label`, `stat` and `read` are required. Every other method is optional, and an
 * absent method means the command does not exist.
 */

/** Opaque to the library: an ETag, a revision, or size plus modified time. Equal means unchanged. */
export type FileVersion = string

/**
 * `scheme://authority/path`, with each path segment percent-encoded. A string, so it survives
 * `postMessage` and JSON. A folder's child is its URI, `/` and the encoded name.
 */
export type FileUri = string

/** A span of bytes in a file. */
export interface ByteRange {
  /** Bytes from the start of the file. */
  offset: number
  /** Bytes wanted. */
  length: number
}

/** One change to a file's bytes. It knows nothing of lines or encodings. */
export interface ByteEdit {
  /** Where the edit starts, in the base version's bytes. */
  offset: number
  /** Bytes of the base version to remove. */
  deleteLength: number
  /** Bytes to put in their place. */
  insert: Uint8Array
}

/** What an entry can refuse. */
export type FileAction = "read" | "write" | "create" | "rename" | "delete"

/** One file or folder, as a listing gives it. */
export interface FileEntry {
  /** Where it is. Stable while the entry exists, and unique within the provider. */
  uri: FileUri
  /** The name as a person reads it, not percent-encoded. */
  name: string
  /** A file holds bytes; a directory holds entries. */
  kind: "file" | "directory"
  /** Bytes. Null when unknown, and for most directories. */
  size: number | null
  /** Optional in a listing, where a backend may not have it cheaply. */
  version?: FileVersion
  /** Epoch milliseconds. */
  modified?: number
  /** MIME type, when the backend knows it. */
  mime?: string
  /** Absent means allowed. A string says why, and the dialog shows it (R12.3). */
  denied?: Partial<Record<FileAction, true | string>>
}

/** An entry whose version is known: what `stat` and a write return. */
export interface FileStat extends FileEntry {
  /** The version now. Use it as the `WriteBase` of a later write. */
  version: FileVersion
}

/** One page of a directory listing. */
export interface DirectoryPage {
  /** The entries, in the provider's order. */
  entries: readonly FileEntry[]
  /** Pass back for the next page. Null on the last page. */
  cursor: string | null
  /** Total entries, when the backend knows. */
  total?: number
}

/** What every request carries. */
export interface FileRequest {
  /** Abort rejects with the signal's reason, as fetch does. */
  signal: AbortSignal
}

/** Options of `read`. */
export interface ReadOptions extends FileRequest {
  /** Fail with `changed` if the file is no longer this version, so pages never mix. */
  version?: FileVersion
}

/** Options of `readDirectory`. */
export interface ListOptions extends FileRequest {
  /** The `cursor` of the page before. Omit for the first page. */
  cursor?: string | null
  /** A hint. A provider may return fewer. */
  limit?: number
}

/**
 * What a write requires. There is no default, so a blind overwrite is always explicit.
 * `version`: only if unchanged. `absent`: only if nothing is there. `overwrite`: unconditionally.
 */
export type WriteBase = { version: FileVersion } | { absent: true } | { overwrite: true }

/** Options of `write`. */
export interface WriteOptions extends FileRequest {
  /** What the write requires. The check must be atomic at the backend. */
  base: WriteBase
  /** Total bytes, when known. */
  size?: number
  /** MIME type of the content. */
  mime?: string
  /** Called with the bytes written so far. */
  onProgress?: (bytesWritten: number) => void
}

/** A conflict is an expected answer, not a failure. `current` is null if the file has gone. */
export type WriteResult = { status: "written"; stat: FileStat } | { status: "conflict"; current: FileStat | null }

/** Options of `thumbnail`. */
export interface ThumbnailOptions extends FileRequest {
  /** Largest width wanted, in device pixels. */
  width: number
  /** Largest height wanted, in device pixels. */
  height: number
  /** The version the picture should show. */
  version?: FileVersion
}

/** Shown through an `img` element only. */
export type FileThumbnail = { url: string; width?: number; height?: number } | { bytes: Uint8Array; mime: string; width?: number; height?: number }

/** One change `watch` reports. */
export interface FileChange {
  /** What happened to the entry. */
  type: "created" | "changed" | "deleted"
  /** The entry it happened to. */
  uri: FileUri
  /** Its version now, when the backend knows. */
  version?: FileVersion
}

/**
 * Thrown or rejected with. It is a shape with a `code` rather than a class because error classes
 * are lost at a worker boundary. Abort rejects with the signal's reason, as fetch does.
 */
export interface FileProviderError extends Error {
  /** What went wrong. `message` holds the provider's own sentence for `denied` and `unavailable`. */
  code: "not-found" | "denied" | "exists" | "changed" | "unavailable" | "too-large" | "unsupported"
}

/**
 * A storage location. Implement `stat` and `read`, and whichever optional methods the backend
 * can honour: the dialog and other consumers adapt to what is present, with no flags.
 */
export interface FileProvider {
  /** Unique among the providers in use. Two accounts are two schemes. */
  readonly scheme: string
  /** Application text naming the location. */
  readonly label: string
  /** Where browsing starts. Default `${scheme}:///`. */
  readonly root?: FileUri

  /** What is at `uri`, with its version. Rejects with `not-found` when nothing is. */
  stat(uri: FileUri, options: FileRequest): Promise<FileStat>
  /** Exactly `range`, shorter only at the end of the file. */
  read(uri: FileUri, range: ByteRange, options: ReadOptions): Promise<Uint8Array>

  // Everything below is optional. An absent method means the command does not exist.

  /** One page of a folder. */
  readDirectory?(uri: FileUri, options: ListOptions): Promise<DirectoryPage>
  /** Writes a file, and creates it when `base` is `{ absent: true }`. */
  write?(uri: FileUri, source: ReadableStream<Uint8Array>, options: WriteOptions): Promise<WriteResult>
  /** `edits` address `base`, are ascending and do not overlap. */
  applyEdits?(uri: FileUri, base: FileVersion, edits: readonly ByteEdit[], options: FileRequest): Promise<WriteResult>
  /** Null when this file has none, and the dialog shows `FileIcon`. */
  thumbnail?(uri: FileUri, options: ThumbnailOptions): Promise<FileThumbnail | null>
  /** Ends when `signal` aborts. */
  watch?(uri: FileUri, listener: (change: FileChange) => void, options: FileRequest): void
  /** Creates a folder. */
  createDirectory?(uri: FileUri, options: FileRequest): Promise<FileStat>
  /** Moves an entry, a folder with everything in it. */
  rename?(from: FileUri, to: FileUri, options: FileRequest): Promise<FileStat>
  /** Removes an entry, a folder with everything in it. */
  delete?(uri: FileUri, options: FileRequest): Promise<void>
}
