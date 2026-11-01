import type { ByteEdit, DirectoryPage, FileProvider, FileProviderError, FileStat, FileUri, WriteBase } from "../file-provider/index.js"
import { childUri, rootUri } from "../file-provider/uri.js"

/** Options of {@link testFileProvider}. */
export interface FileProviderConformanceOptions {
  /** A file of at least 8 bytes to read. Default the first file found under the root; with `write`, a file the suite writes. */
  file?: FileUri
  /** The folder to list, and to write in. Default the provider's root. */
  folder?: FileUri
}

/** One check of the suite. */
export interface FileProviderCheck {
  /** What was checked: "read: short at the end of the file". */
  name: string
  /** `skipped` when the provider has no such method, or the suite has nothing to run it on. */
  status: "passed" | "failed" | "skipped"
  /** Why it failed. */
  message?: string
}

/** The outcome of {@link testFileProvider}. */
export interface FileProviderReport {
  /** Every check, in order. */
  checks: FileProviderCheck[]
  /** The checks that failed. Assert this is empty. */
  failed: FileProviderCheck[]
}

const live = (): { signal: AbortSignal } => ({ signal: new AbortController().signal })
const stream = (bytes: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
const SAMPLE = new TextEncoder().encode("0123456789abcdef")
const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((value, index) => value === b[index])

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

/** The rejection of a promise, or a failure when it resolves. */
async function rejection(task: Promise<unknown>, expected: string): Promise<unknown> {
  try {
    await task
  } catch (error) {
    return error
  }
  throw new Error(`Expected ${expected}, and it resolved`)
}

/** A call made with an aborted signal rejects with that signal's reason. */
async function abortsWithReason(call: (signal: AbortSignal) => Promise<unknown>) {
  const reason = new Error("stop")
  const error = await rejection(call(AbortSignal.abort(reason)), "the signal's reason")
  assert(error === reason, "Aborting did not reject with the signal's reason")
}

const hasCode = (error: unknown, code: FileProviderError["code"]) => (error as Partial<FileProviderError> | null)?.code === code

/** The first readable file under a folder, looking through folders breadth first. */
async function findFile(provider: FileProvider, root: FileUri): Promise<FileStat | null> {
  if (!provider.readDirectory) return null
  const queue = [root]
  for (let visited = 0; visited < 50; visited += 1) {
    const folder = queue.shift()
    if (folder === undefined) return null
    let cursor: string | null = null
    do {
      const page: DirectoryPage = await provider.readDirectory(folder, { ...live(), cursor })
      for (const entry of page.entries) {
        if (entry.kind === "file" && !entry.denied?.read && (entry.size === null || entry.size >= 8)) return provider.stat(entry.uri, live())
        if (entry.kind === "directory" && !entry.denied?.read) queue.push(entry.uri)
      }
      cursor = page.cursor
    } while (cursor !== null)
  }
  return null
}

/**
 * The conformance suite for a provider's adapter: ranged and short reads, version pinning,
 * conflicts on all three `WriteBase` forms, abort, cursors and `applyEdits`. Methods the provider
 * does not have are reported as `skipped`, so a read-only adapter passes on what it implements.
 * Test frameworks differ, so it reports rather than asserts. A provider with `write` gets
 * temporary files in `folder`, removed afterwards when it has `delete`.
 *
 * @example
 * ```ts
 * import { testFileProvider } from "glass-ux/testing"
 *
 * it("conforms", async () => {
 *   const { failed } = await testFileProvider(myProvider)
 *   expect(failed).toEqual([])
 * })
 * ```
 */
export async function testFileProvider(provider: FileProvider, options: FileProviderConformanceOptions = {}): Promise<FileProviderReport> {
  const checks: FileProviderCheck[] = []
  const check = async (name: string, ready: boolean, run: () => Promise<void>) => {
    if (!ready) return void checks.push({ name, status: "skipped" })
    try {
      await run()
      checks.push({ name, status: "passed" })
    } catch (error) {
      checks.push({ name, status: "failed", message: error instanceof Error ? error.message : String(error) })
    }
  }

  const folder = options.folder ?? rootUri(provider)
  const created: FileUri[] = []
  const scratch = (name: string) => {
    const uri = childUri(folder, `conformance-${Date.now()}-${name}`)
    created.push(uri)
    return uri
  }
  const { write, applyEdits, readDirectory } = provider
  const put = async (uri: FileUri, bytes: Uint8Array, base: WriteBase) => write!.call(provider, uri, stream(bytes), { ...live(), base, size: bytes.length })

  await check("names itself", true, async () => {
    assert(provider.scheme, "scheme is empty")
    assert(provider.label, "label is empty")
  })

  // ── Reading ─────────────────────────────────────────────────────────────────
  let sample: FileStat | null = null
  try {
    sample = options.file ? await provider.stat(options.file, live()) : write ? null : await findFile(provider, folder)
    if (!sample && write) {
      const uri = scratch("read")
      const result = await put(uri, SAMPLE, { absent: true })
      if (result.status === "written") sample = result.stat
    }
  } catch (error) {
    checks.push({ name: "finds a file to read", status: "failed", message: error instanceof Error ? error.message : String(error) })
  }
  const file = sample

  await check("stat: gives a version", file !== null, async () => {
    const stat = await provider.stat(file!.uri, live())
    assert(stat.version, "stat has no version")
    assert(stat.uri, "stat has no uri")
    assert(stat.kind === "file", "stat of a file is not a file")
  })
  await check("stat: not-found for nothing there", true, async () => {
    const error = await rejection(provider.stat(childUri(folder, `conformance-missing-${Date.now()}`), live()), "not-found")
    assert(hasCode(error, "not-found"), "stat of nothing did not reject with code not-found")
  })
  await check("stat: aborts", true, () => abortsWithReason((signal) => provider.stat(folder, { signal })))
  await check("read: exactly the range", file !== null, async () => {
    const whole = await provider.read(file!.uri, { offset: 0, length: 8 }, live())
    assert(whole.length === 8, `read 8 bytes and got ${whole.length}`)
    const part = await provider.read(file!.uri, { offset: 2, length: 3 }, live())
    assert(equal(part, whole.subarray(2, 5)), "offset 2, length 3 are not the same bytes as in a read from 0")
  })
  await check("read: short only at the end of the file", file !== null && file.size !== null, async () => {
    const tail = await provider.read(file!.uri, { offset: file!.size! - 2, length: 8 }, live())
    assert(tail.length === 2, `read past the end gave ${tail.length} bytes, not 2`)
    const past = await provider.read(file!.uri, { offset: file!.size! + 8, length: 8 }, live())
    assert(past.length === 0, "a read wholly past the end was not empty")
  })
  await check("read: a pinned version that has gone fails with changed", file !== null, async () => {
    const error = await rejection(provider.read(file!.uri, { offset: 0, length: 1 }, { ...live(), version: "conformance-no-such-version" }), "changed")
    assert(hasCode(error, "changed"), "read with an old version did not reject with code changed")
  })
  await check("read: aborts", file !== null, () => abortsWithReason((signal) => provider.read(file!.uri, { offset: 0, length: 1 }, { signal })))

  // ── Listing ─────────────────────────────────────────────────────────────────
  await check("readDirectory: cursors reach every entry once", Boolean(readDirectory), async () => {
    const seen = new Set<string>()
    let cursor: string | null = null
    let pages = 0
    do {
      const page: DirectoryPage = await readDirectory!.call(provider, folder, { ...live(), cursor, limit: 2 })
      for (const entry of page.entries) {
        assert(!seen.has(entry.uri), `${entry.uri} came twice`)
        seen.add(entry.uri)
      }
      if (page.total !== undefined && page.cursor === null) assert(page.total === seen.size, `total says ${page.total} and the pages gave ${seen.size}`)
      cursor = page.cursor
      pages += 1
      assert(pages < 100_000, "the cursor never ended")
    } while (cursor !== null)
  })
  await check("readDirectory: aborts", Boolean(readDirectory), () => abortsWithReason((signal) => readDirectory!.call(provider, folder, { signal })))

  // ── Writing ─────────────────────────────────────────────────────────────────
  await check("write: absent writes, and conflicts when something is there", Boolean(write), async () => {
    const uri = scratch("absent")
    const first = await put(uri, SAMPLE, { absent: true })
    assert(first.status === "written", "absent over nothing did not write")
    const again = await put(uri, SAMPLE, { absent: true })
    assert(again.status === "conflict", "absent over a file did not conflict")
    assert(again.current?.version === first.stat.version, "the conflict's current is not the file as it is")
  })
  await check("write: version writes when equal, and conflicts when not", Boolean(write), async () => {
    const uri = scratch("version")
    const first = await put(uri, SAMPLE, { absent: true })
    assert(first.status === "written", "the first write did not write")
    const second = await put(uri, SAMPLE.subarray(0, 4), { version: first.stat.version })
    assert(second.status === "written", "writing at the current version did not write")
    assert(second.stat.version !== first.stat.version, "a write did not change the version")
    const stale = await put(uri, SAMPLE, { version: first.stat.version })
    assert(stale.status === "conflict", "writing at an old version did not conflict")
    assert(stale.current?.version === second.stat.version, "the conflict's current is not the winning write")
  })
  await check("write: a version on a file that has gone conflicts with null", Boolean(write), async () => {
    const stale = await put(scratch("gone"), SAMPLE, { version: "conformance-no-such-version" })
    assert(stale.status === "conflict" && stale.current === null, "a version on nothing did not conflict with current null")
  })
  await check("write: overwrite always writes", Boolean(write), async () => {
    const uri = scratch("overwrite")
    await put(uri, SAMPLE, { absent: true })
    const forced = await put(uri, SAMPLE.subarray(0, 2), { overwrite: true })
    assert(forced.status === "written", "overwrite did not write")
    assert(forced.stat.size === 2, `overwrite left ${forced.stat.size} bytes, not 2`)
  })
  await check("write: aborts", Boolean(write), () => abortsWithReason((signal) => write!.call(provider, scratch("abort"), stream(SAMPLE), { signal, base: { overwrite: true } })))

  // ── Edits ───────────────────────────────────────────────────────────────────
  await check("applyEdits: applies to its base, and conflicts on an old one", Boolean(applyEdits && write), async () => {
    const uri = scratch("edits")
    const first = await put(uri, SAMPLE, { absent: true })
    assert(first.status === "written", "the first write did not write")
    const edits: ByteEdit[] = [
      { offset: 0, deleteLength: 2, insert: new TextEncoder().encode("X") },
      { offset: 4, deleteLength: 0, insert: new TextEncoder().encode("YY") },
    ]
    const edited = await applyEdits!.call(provider, uri, first.stat.version, edits, live())
    assert(edited.status === "written", "edits at the current version did not write")
    const bytes = await provider.read(uri, { offset: 0, length: 64 }, live())
    assert(new TextDecoder().decode(bytes) === "X23YY456789abcdef", "edits did not produce the expected bytes")
    const stale = await applyEdits!.call(provider, uri, first.stat.version, edits, live())
    assert(stale.status === "conflict", "edits at an old version did not conflict")
    assert(stale.current?.version === edited.stat.version, "the conflict's current is not the winning edit")
  })
  await check("applyEdits: aborts", Boolean(applyEdits && file), () => abortsWithReason((signal) => applyEdits!.call(provider, file!.uri, file!.version, [], { signal })))

  if (provider.delete) for (const uri of created) await provider.delete(uri, live()).catch(() => undefined)
  return { checks, failed: checks.filter((item) => item.status === "failed") }
}
