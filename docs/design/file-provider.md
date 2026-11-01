# File provider and FileDialog: design (item 27)

Status: approved 2026-11-01 with the recommended defaults, and built. See
[FileDialog and FileProvider](../components/file-dialog.md) for the shipped API.

## Decision

The contract lives in glass-ux as **types only**, in a new entry `glass-ux/file-provider` with no
runtime code and no imports. `FileDialog` is a separate entry, `glass-ux/file-dialog`.

The dialog lists and chooses. It never reads file contents or writes them: the host does that in
`onOpen` and `onSave`, with `{ signal, setProgress }`, the same contract as `EditableAvatar`. So the
library still never uploads.

This is a generic storage interface with no business entities and no transport, so it fits AGENTS.md.
Security, authentication and transport belong to the host. A provider arrives already able to do its
job, and the contract has no sign-in, token or session concept.

## Contract

```ts
/** Opaque to the library: an ETag, a revision, or size plus modified time. Equal means unchanged. */
export type FileVersion = string
/** `scheme://authority/path`. A string, so it survives postMessage and JSON. */
export type FileUri = string

export interface ByteRange { offset: number; length: number }
export interface ByteEdit { offset: number; deleteLength: number; insert: Uint8Array }

export type FileAction = "read" | "write" | "create" | "rename" | "delete"

export interface FileEntry {
  uri: FileUri
  name: string
  kind: "file" | "directory"
  /** Bytes. Null when unknown, and for most directories. */
  size: number | null
  /** Optional in a listing, where a backend may not have it cheaply. */
  version?: FileVersion
  /** Epoch milliseconds. */
  modified?: number
  mime?: string
  /** Absent means allowed. A string says why, and the dialog shows it (R12.3). */
  denied?: Partial<Record<FileAction, true | string>>
}

export interface FileStat extends FileEntry {
  version: FileVersion
}

export interface DirectoryPage {
  entries: readonly FileEntry[]
  /** Pass back for the next page. Null on the last page. */
  cursor: string | null
  /** Total entries, when the backend knows. */
  total?: number
}

export interface FileRequest { signal: AbortSignal }

export interface ReadOptions extends FileRequest {
  /** Fail with `changed` if the file is no longer this version, so pages never mix. */
  version?: FileVersion
}

export interface ListOptions extends FileRequest {
  cursor?: string | null
  /** A hint. A provider may return fewer. */
  limit?: number
}

/**
 * What a write requires. There is no default, so a blind overwrite is always explicit.
 * `version`: only if unchanged. `absent`: only if nothing is there. `overwrite`: unconditionally.
 */
export type WriteBase = { version: FileVersion } | { absent: true } | { overwrite: true }

export interface WriteOptions extends FileRequest {
  base: WriteBase
  /** Total bytes, when known. */
  size?: number
  mime?: string
  onProgress?: (bytesWritten: number) => void
}

/** A conflict is an expected answer, not a failure. `current` is null if the file has gone. */
export type WriteResult =
  | { status: "written"; stat: FileStat }
  | { status: "conflict"; current: FileStat | null }

export interface ThumbnailOptions extends FileRequest {
  /** Largest size wanted, in device pixels. */
  width: number
  height: number
  version?: FileVersion
}

/** Shown through an `img` element only. */
export type FileThumbnail =
  | { url: string; width?: number; height?: number }
  | { bytes: Uint8Array; mime: string; width?: number; height?: number }

export interface FileChange {
  type: "created" | "changed" | "deleted"
  uri: FileUri
  version?: FileVersion
}

/** Thrown or rejected with. Abort rejects with the signal's reason, as fetch does. */
export interface FileProviderError extends Error {
  code: "not-found" | "denied" | "exists" | "changed" | "unavailable" | "too-large" | "unsupported"
}

export interface FileProvider {
  /** Unique among the providers in use. Two accounts are two schemes. */
  readonly scheme: string
  /** Application text naming the location. */
  readonly label: string
  /** Where browsing starts. Default `${scheme}:///`. */
  readonly root?: FileUri

  stat(uri: FileUri, options: FileRequest): Promise<FileStat>
  /** Exactly `range`, shorter only at the end of the file. */
  read(uri: FileUri, range: ByteRange, options: ReadOptions): Promise<Uint8Array>

  // Everything below is optional. An absent method means the command does not exist.
  readDirectory?(uri: FileUri, options: ListOptions): Promise<DirectoryPage>
  write?(uri: FileUri, source: ReadableStream<Uint8Array>, options: WriteOptions): Promise<WriteResult>
  /** `edits` address `base`, are ascending and do not overlap. */
  applyEdits?(uri: FileUri, base: FileVersion, edits: readonly ByteEdit[], options: FileRequest): Promise<WriteResult>
  /** Null when this file has none, and the dialog shows `FileIcon`. */
  thumbnail?(uri: FileUri, options: ThumbnailOptions): Promise<FileThumbnail | null>
  /** Ends when `signal` aborts. */
  watch?(uri: FileUri, listener: (change: FileChange) => void, options: FileRequest): void
  createDirectory?(uri: FileUri, options: FileRequest): Promise<FileStat>
  rename?(from: FileUri, to: FileUri, options: FileRequest): Promise<FileStat>
  delete?(uri: FileUri, options: FileRequest): Promise<void>
}
```

## How each requirement is met

| Requirement | How |
| --- | --- |
| Ranged reads, AbortSignal | `read(uri, range, { signal })`, and `version` stops a multi-page read mixing two versions of a file. |
| Version and conflict | Required on `FileStat`. `write` and `applyEdits` return `WriteResult`, and the check must be atomic at the backend. |
| Optional `applyEdits` | As above. It is a byte patch, not a text concept, so any incremental format can use it. |
| Paged listings | `readDirectory` with an opaque cursor, feeding Tree's `onLoadMore`. |
| Permissions | Per entry through `denied`. A provider with `write` can still hold read-only files. |
| Capability absence | Optional methods only, with no flags. See the dialog table. |
| No DOM or React | No imports. `AbortSignal`, `ReadableStream` and `Uint8Array` exist in both the DOM and WebWorker libs. A test compiles the file with `lib: ["ES2023", "WebWorker"]` and `types: []`. |
| Worker use | Requests and results are plain data. Provider objects stay in the realm that made them, so `onProgress` and `listener` closures do not need to cross. |
| Thumbnails | Optional `thumbnail`. The `url` form lets a host's own image service do the work. |
| No authentication | Nothing in the contract. A lapsed session is `denied` or `unavailable` with the provider's message, and the dialog shows it without prompting. |

A conflict is a result rather than a thrown error so that it cannot be missed, and so it survives a
worker boundary, where error classes are lost. For the same reason `FileProviderError` is a shape
with a `code`, not a class, and the contract stays free of runtime code.

## Changes from the IDE's FileSystemProvider

| IDE section 9 | Here | Why |
| --- | --- | --- |
| `Uri` | `string` | Cloneable, no class to share. |
| `readDirectory`, `write` required | Optional | The brief. It also fixes `httpFiles()`, which is read-only yet had to implement `write`. |
| `write` resolves `FileStat`, rejects on conflict | Resolves `WriteResult`, with a required `base` | Conflict as a result; no accidental overwrite. |
| `applyEdits(uri, base, edits)` | Adds `options`, returns `WriteResult` | Abort, and the same conflict path. |
| `read(uri, range, signal)` | `read(uri, range, { signal, version })` | Version pinning. |
| `watch` returns `Disposable` | Ends with `signal` | One cancellation idea, one type fewer. |
| `create(uri)` | `createDirectory`. Files are `write` with `{ absent: true }` | The old name was ambiguous. |
| Not present | `thumbnail`, `denied`, `root` | Image use, permissions, and a starting point. |

`scheme`, `label`, `stat` and ranged `read` are kept. DESIGN.md is read-only for this work, so its
section 9 needs the same edits.

## FileDialog

```ts
export interface FileSelection {
  provider: FileProvider
  /** Stat'ed on confirm, so each has the version to use as the later write's base. */
  files: readonly FileStat[]
}

export interface FileRunContext { signal: AbortSignal; setProgress: (fraction: number | null) => void }

interface FileDialogBaseProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  providers: readonly FileProvider[]
  /** Start here; otherwise the last place used in this session. */
  defaultUri?: FileUri
  /** `grid` needs `thumbnail` on at least one provider. */
  defaultView?: "list" | "grid"
  title?: string
}

export interface OpenFileDialogProps extends FileDialogBaseProps {
  mode: "open"
  /** Same syntax as FileDrop: ".png,image/*". */
  accept?: string
  multiple?: boolean
  /** Adds a From this device option, which is FileDrop. Needs no provider. */
  device?: boolean
  /** The dialog stays open and pending until this settles; a rejection shows in place. */
  onOpen: (selection: FileSelection | { files: readonly File[] }, context: FileRunContext) => unknown
}

export interface SaveFileDialogProps extends FileDialogBaseProps {
  mode: "save"
  defaultName: string
  /** Offered in a Select; choosing one changes the name's extension. */
  formats?: readonly { label: string; extension: string; mime: string }[]
  /** The version this document was opened at. Without it, an existing name asks before replacing. */
  base?: FileVersion
  /** The host writes. Returning a conflict moves the dialog to its conflict step. */
  onSave: (target: SaveTarget, context: FileRunContext) => Promise<WriteResult>
  /** Adds Compare to the conflict step. */
  onCompare?: (current: FileStat | null) => void
}

export interface SaveTarget {
  provider: FileProvider
  uri: FileUri
  name: string
  format?: string
  base: WriteBase
}

export type FileDialogProps = OpenFileDialogProps | SaveFileDialogProps
export function FileDialog(props: FileDialogProps): ReactElement

export interface FileConflictDialogProps {
  open: boolean
  name: string
  /** The file as it is now, or null if it has gone. */
  current: FileStat | null
  onResolve: (choice: "replace" | "copy" | "cancel") => void
  onCompare?: (current: FileStat | null) => void
}

/** The conflict step alone, for a plain Save that opens no dialog. */
export function FileConflictDialog(props: FileConflictDialogProps): ReactElement
```

**Open.** Choose a location, browse, select. On confirm the dialog calls `stat` for each file, then
`onOpen`. The host reads, and the dialog shows progress and any failure.

**Save.** Choose a folder and a name. If the name exists, `stat` finds it and the dialog asks before
replacing, unless `base` already matches. `onSave` receives the `WriteBase`, and the host writes.
On `conflict` the step shows who won: Replace (`onSave` again with `{ overwrite: true }`), Save a
copy (back to the name, with a suggested one), Compare if `onCompare` is set, Cancel. Edits are
never lost, because nothing has closed.

The dialog adapts to what is present:

| Absent | Effect |
| --- | --- |
| `readDirectory` | No browser for that provider. It shows a location field, resolved with `stat`. A URL source is this case. |
| `write` | The provider is not offered in Save. |
| `thumbnail` | List view only, with `FileIcon` from `fileKind`. |
| `createDirectory` | No New folder command. |
| `rename`, `delete` | No such commands in the row menu. |
| `watch` | The list refreshes when reopened or on Refresh. |
| `total` on a page | No count until the last page. |

An entry's `denied` disables the action and shows the reason, while a folder that denies `write`
can't be a Save target. One provider hides the location list. A provider with no folders hides the
tree.

Built from existing parts: Dialog (a bottom sheet on phones already, where the tree becomes the path
line), Tree with `onLoadChildren`, `onLoadMore` and item 22's reveal, VirtualList, FileIcon, FileDrop
and `matchesAccept`, `formatBytes`, Segmented for the view, Image for thumbnails.

Thumbnail cells have a fixed size and swap in place (R9.1). Late pages append below without moving
rows. Thumbnail requests are capped, aborted when a row leaves the virtual window, and cached by uri
and version.

## Built-in providers

`memoryFiles(seed?)`, in `glass-ux/file-provider/memory`, for tests and the catalogue demo. It does
no I/O and works in a worker. `testFileProvider(provider)`, in `glass-ux/testing`, is a conformance
suite for adapter authors: ranged reads, short reads, conflicts on all three `WriteBase` forms,
abort, cursors and `applyEdits`. It replaces the file half of the IDE's `testBackend`.

An HTTP provider stays out. Headers, credentials and URLs are transport, which belongs to the host.
The device route needs no provider, because it is FileDrop and returns `File` objects.

## How each uses it

```tsx
// Image editor: a host's asset store, with the device route and conflict handling.
<FileDialog
  mode="save"
  providers={[assets]}
  defaultName="cover.webp"
  base={document.version}
  onSave={async (target, { signal, setProgress }) => {
    const blob = await editor.export({ type: "image/webp" })
    return target.provider.write!(target.uri, blob.stream(), {
      base: target.base, size: blob.size, signal,
      onProgress: (sent) => setProgress(sent / blob.size),
    })
  }}
/>
```

```ts
// IDE: ranged reads page by page, and the cheap save path when it exists.
const page = await provider.read(uri, { offset, length: 65536 }, { signal, version })
const saved = provider.applyEdits
  ? await provider.applyEdits(uri, version, edits, { signal })
  : await provider.write!(uri, snapshot.stream(), { base: { version }, signal })
if (saved.status === "conflict") showConflict(saved.current)
```

A record system that attaches documents needs only `stat`, `read` and `readDirectory` for Open, and
never touches an image or code. `IdeBackend.files` and an image editor's `providers` take the same
objects, which is the point of the item.

## Left out

Authentication, sessions and sharing. Upload queues and resumable transfer. An HTTP or RPC client.
Copy, trash and search (each can arrive later as an optional method without breaking anyone).
Client-side thumbnail generation. Text concepts: `ByteEdit` knows nothing of lines or encodings.

## Open decisions

1. **Entry shape.** Recommended: types-only `glass-ux/file-provider`, because sister packages and
   workers can import it for no bundle cost. The alternative, exporting the types from
   `file-dialog`, drags a React entry's name into worker code.
2. **Browser storage providers.** Recommended: `memoryFiles` only for now. The IDE keeps
   `browserFiles()` and `localFiles()` until they are proven, then they move up to shared entries,
   since the image package wants the same two. Moving them first means designing against no use.
3. **Who writes.** Recommended: the host, in `onSave`. Having the dialog call `write` itself would be
   shorter but would need a byte source in its props, and would blur "the library never uploads".
4. **`denied` per entry.** Recommended: keep. Without it a read-only file only fails at save time.
5. **Name.** Recommended: `FileProvider`, since the contract is no longer only a file system's. The
   IDE can alias it.
