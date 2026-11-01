# FileDialog and FileProvider

`glass-ux/file-dialog` · `glass-ux/file-provider` · `glass-ux/file-provider/memory` ·
[Live component catalogue](https://dastari.github.io/glass-ux/components/file-dialog)

`FileProvider` is a storage contract, and `FileDialog` is open and save dialogs over it. One adapter
works in any package that takes a provider.

The dialog lists and chooses. It never reads file contents or writes them: the host does that in
`onOpen` and `onSave`, with `{ signal, setProgress }`, so the library still never uploads.

```tsx
import { FileDialog } from "glass-ux/file-dialog"
import type { FileProvider } from "glass-ux/file-provider"

<FileDialog
  mode="open"
  multiple
  accept="image/*"
  providers={[assets]}
  trigger={<Button>Add pictures</Button>}
  onOpen={async (selection, { signal, setProgress }) => {
    if (!("provider" in selection)) return attach(selection.files) // From this device
    for (const file of selection.files) {
      const bytes = await selection.provider.read(file.uri, { offset: 0, length: file.size ?? 0 }, { signal, version: file.version })
      attach(bytes)
    }
  }}
/>

<FileDialog
  mode="save"
  providers={[assets]}
  defaultName="cover.webp"
  base={document.version}
  onSave={async (target, { signal, setProgress }) => {
    const blob = await editor.export({ type: "image/webp" })
    return target.provider.write!(target.uri, blob.stream(), {
      base: target.base,
      size: blob.size,
      signal,
      onProgress: (sent) => setProgress(sent / blob.size),
    })
  }}
/>
```

## The contract

`glass-ux/file-provider` holds types only, with no imports and no runtime code, so a worker can use
it and it costs nothing in a bundle. It compiles against the WebWorker lib as well as DOM.

Only `scheme`, `label`, `stat` and `read` are required. Everything else is an optional method, and
an absent method means the command does not exist. There are no capability flags.

| Method | What it promises |
| --- | --- |
| `stat(uri, { signal })` | The entry with its `version`. Rejects with `not-found` when nothing is there. |
| `read(uri, range, { signal, version })` | Exactly `range`, shorter only at the end of the file. `version` fails with `changed` rather than mixing two versions. |
| `readDirectory(uri, { signal, cursor, limit })` | One page. `cursor` is opaque and null on the last page; `limit` is a hint. |
| `write(uri, source, { base, signal, … })` | A `WriteResult`. The check against `base` must be atomic at the backend. |
| `applyEdits(uri, base, edits, { signal })` | A byte patch: ascending, not overlapping, addressed to `base`. Returns a `WriteResult`. |
| `thumbnail(uri, { signal, width, height, version })` | A URL or bytes, shown through `img`. Null when the file has none. |
| `watch(uri, listener, { signal })` | Changes to the entry and its children, until `signal` aborts. |
| `createDirectory`, `rename`, `delete` | As named. A folder moves and goes with what is in it. |

**A blind overwrite is always explicit.** `WriteBase` has no default: `{ version }` writes only if
unchanged, `{ absent: true }` only if nothing is there, and `{ overwrite: true }` unconditionally.

**A conflict is a result, not an error.** `write` resolves `{ status: "conflict", current }`, so it
can't be missed and it survives a worker boundary, where error classes are lost. For the same
reason `FileProviderError` is a shape with a `code`, not a class. Requests and results are plain
data; provider objects stay in the realm that made them.

**Abort rejects with the signal's reason**, as `fetch` does.

**No authentication.** The contract has no sign-in, token or session concept, because a provider
arrives already able to do its job. A lapsed session is `denied` or `unavailable` with the
provider's own message, and the dialog shows that sentence without prompting. Only those two codes
show the provider's message; the others use the dialog's words, so a transport error stays off the
screen (R2.4).

A URI is `scheme://authority/path` with each path segment percent-encoded. The dialog works out
parents from the path, and a new file's URI from its folder's URI, `/` and the encoded name. Pass
`root` for a provider that starts below the authority.

## What the dialog does with what a provider has

| Absent | Effect |
| --- | --- |
| `readDirectory` | No browser for that provider. It shows a location field, resolved with `stat`. A URL source is this case. |
| `write` | The provider is not offered in Save. |
| `thumbnail` | List view only, with `FileIcon` from `fileKind`. `defaultView="grid"` falls back to the list. |
| `createDirectory` | No New folder command. |
| `rename`, `delete` | No such commands in the row menu. With neither, no row menu. |
| `watch` | The list refreshes when reopened or on Refresh. With it, rows patch in place. |
| `total` on a page | No count until the last page. |

An entry's `denied` disables the action and shows the reason (R12.3). A folder that denies `write`
can't be a Save target, and a string reason is shown as given. One location hides the location
list. A provider with no folders hides the tree.

`accept` uses FileDrop's syntax. Files it rules out stay listed, dimmed, with the reason. Hiding them
would mean filtering one page as if it were the folder (R16.7).

## Open

Choose a location, browse, select. On confirm the dialog calls `stat` for each file, so each has the
version to use as a later write's base, then `onOpen`. It stays open and pending until that settles.
Cancel and Escape abort the run through `signal` and leave the dialog open; a rejection shows in
place.

`device` adds a This device location, which is `FileDrop`. It needs no provider, and `onOpen` gets
`{ files }` with `File` objects.

## Save

Choose a folder and a name. If the name exists, `stat` finds it and the dialog asks before replacing,
unless `base` already matches. `onSave` receives a `SaveTarget`, whose `base` is what the write must
use, and the host writes.

| What it finds | `target.base` |
| --- | --- |
| Nothing at that name | `{ absent: true }` |
| The file, and the person chose Replace | `{ version }`, the version the question was about |
| The file at the version in `base` | `{ version }`, with no question |
| A conflict, and the person chose Replace | `{ overwrite: true }` |

So a rival write between the question and the save still conflicts. On `conflict` the dialog shows
its conflict step: Replace, Save a copy (back to the name, with `report (2).pdf` suggested), Compare
when `onCompare` is set, or Cancel. Edits are never lost, because nothing has closed. Use
`FileConflictDialog` alone for a plain Save that opens no dialog.

## Stability

- The dialog's height is fixed, so changing folder, loading and errors never move the footer.
- Rows keep the provider's order, and late pages join the end. There is no client sort, because a
  page can't be sorted as if it were the folder.
- A refresh keeps the rows until the new first page replaces them (R17.1).
- Thumbnail cells have a fixed size and swap in place. At most four requests run at once, a request
  stops when its row leaves the virtual window, and results are cached by URI and version.
- Skeleton rows match loaded rows box for box.

## Keyboard

| Key | Action |
| --- | --- |
| Arrows, Home, End, Page Up, Page Down | Move. The grid view's horizontal arrows follow the reading direction. |
| Enter, double press | Open a folder, or confirm a file. A tap opens a folder on touch. |
| Space | Select. With `multiple`, toggle. |
| Shift + movement or click | Extend from the last selected row. |
| ⌘/Ctrl + click | Toggle. |
| ⌘/Ctrl + A | Select every loaded file that can be chosen. |
| Backspace | Up a level. |
| F2, Delete | Rename, delete. |
| Shift+F10, Menu | The row's menu, the same one as its ⋯ button (R11.6). |
| Letters | Jump to a name in what has loaded. |
| Escape | Close. During a run, cancel the run and stay open. |

Focus returns to the control that opened the dialog. After a row is added, moved or removed, focus
goes to that row or its neighbour.

## Phones

Dialog already becomes a bottom sheet (R13.4). The tree gives way to the path line below 38rem of
width, and isn't rendered, so a phone doesn't load it. A tap opens a folder, a tap on a file toggles
it with `multiple`, and row menus are always showing (R11.7). Date, then size, give way in a narrow
box (R7.4).

## memoryFiles

`glass-ux/file-provider/memory` is a provider held in memory for tests and demonstrations. It has
every optional method, enforces `denied`, does no I/O and works in a worker. Spread it and leave a
method out to stand for a backend without that capability.

```ts
import { memoryFiles } from "glass-ux/file-provider/memory"

const files = memoryFiles(
  {
    "Reports/summary.txt": "Second quarter",
    "Reports/Archive/": {},
    "cover.png": { content: pngBytes, mime: "image/png" },
    "Locked/": { denied: { read: "Ask the owner for access" } },
  },
  { label: "Sample files", pageSize: 50 },
)
const { write, applyEdits, ...readOnly } = files
```

## Testing an adapter

`testFileProvider` in `glass-ux/testing` is the conformance suite: ranged and short reads, version
pinning, conflicts on all three `WriteBase` forms, abort, cursors and `applyEdits`. It skips what a
provider doesn't have, and reports rather than asserts, so it fits any test runner.

```ts
import { testFileProvider } from "glass-ux/testing"

it("conforms", async () => {
  const { failed } = await testFileProvider(myProvider)
  expect(failed).toEqual([])
})
```

## Left out

Authentication, sessions and sharing. Upload queues and resumable transfer. An HTTP or RPC client.
Copy, trash and search, which can arrive later as optional methods. Client-side thumbnails. Text
concepts: `ByteEdit` knows nothing of lines or encodings. Browser storage and local file providers.
