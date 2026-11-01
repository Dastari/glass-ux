import { describe, expect, it, vi } from "vitest"
import { testFileProvider } from "../testing/file-provider.js"
import type { FileChange, FileProvider, FileProviderError } from "./index.js"
import { memoryFiles } from "./memory.js"
import { childUri, parentUri, uriName, uriTrail } from "./uri.js"

const live = () => ({ signal: new AbortController().signal })
const text = (value: string) => new TextEncoder().encode(value)
const read = (bytes: Uint8Array) => new TextDecoder().decode(bytes)
const stream = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(text(chunk))
      controller.close()
    },
  })
const code = async (task: Promise<unknown>) => task.then(() => "resolved", (error: FileProviderError) => error.code)

const SEED = {
  "Reports/summary.txt": "Second quarter",
  "Reports/Drafts/": {},
  "notes.md": { content: "Plain notes", mime: "text/markdown", modified: 100 },
  "Locked/": { denied: { read: "Ask the owner for access", create: true } },
  "held.txt": { content: "kept", denied: { write: "Held for review", delete: true, rename: true } },
}

describe("uri helpers", () => {
  it("walks a folder's segments and stops at the root", () => {
    expect(parentUri("memory:///a/b", "memory:///")).toBe("memory:///a")
    expect(parentUri("memory:///a", "memory:///")).toBe("memory:///")
    expect(parentUri("memory:///", "memory:///")).toBeNull()
    expect(parentUri("s3://bucket/base/a", "s3://bucket/base")).toBe("s3://bucket/base")
    expect(uriTrail("memory:///a/b", "memory:///").map((step) => step.uri)).toEqual(["memory:///", "memory:///a", "memory:///a/b"])
  })

  it("encodes a name in a child and reads it back", () => {
    const uri = childUri("memory:///", "a b/c.txt")
    expect(uri).toBe("memory:///a%20b%2Fc.txt")
    expect(uriName(uri)).toBe("a b/c.txt")
  })
})

describe("memoryFiles", () => {
  it("stats a file with a version, and the root", async () => {
    const files = memoryFiles(SEED, { label: "Samples" })
    const stat = await files.stat("memory:///notes.md", live())
    expect(stat).toMatchObject({ name: "notes.md", kind: "file", size: 11, mime: "text/markdown", modified: 100 })
    expect(stat.version).toBeTruthy()
    expect(await files.stat("memory:///", live())).toMatchObject({ name: "Samples", kind: "directory" })
    expect(await code(files.stat("memory:///none", live()))).toBe("not-found")
  })

  it("reads exactly a range, short only at the end", async () => {
    const files = memoryFiles(SEED)
    expect(read(await files.read("memory:///Reports/summary.txt", { offset: 7, length: 3 }, live()))).toBe("qua")
    expect(read(await files.read("memory:///Reports/summary.txt", { offset: 10, length: 100 }, live()))).toBe("rter")
    expect((await files.read("memory:///Reports/summary.txt", { offset: 100, length: 4 }, live())).length).toBe(0)
  })

  it("pins a read to a version, so pages never mix", async () => {
    const files = memoryFiles(SEED)
    const uri = "memory:///notes.md"
    const { version } = await files.stat(uri, live())
    await files.write(uri, stream("changed"), { ...live(), base: { overwrite: true } })
    expect(await code(files.read(uri, { offset: 0, length: 1 }, { ...live(), version }))).toBe("changed")
  })

  it("rejects with the signal's reason when aborted", async () => {
    const files = memoryFiles(SEED)
    const reason = new Error("left the folder")
    const signal = AbortSignal.abort(reason)
    await expect(files.stat("memory:///notes.md", { signal })).rejects.toBe(reason)
    await expect(files.read("memory:///notes.md", { offset: 0, length: 1 }, { signal })).rejects.toBe(reason)
    await expect(files.readDirectory("memory:///", { signal })).rejects.toBe(reason)
    await expect(files.write("memory:///x", stream("x"), { signal, base: { absent: true } })).rejects.toBe(reason)
  })

  it("rejects a request aborted while it was in flight", async () => {
    const files = memoryFiles(SEED)
    const controller = new AbortController()
    const task = files.read("memory:///notes.md", { offset: 0, length: 1 }, { signal: controller.signal })
    controller.abort("gone")
    await expect(task).rejects.toBe("gone")
  })

  it("stops a write that is still reading its stream, and leaves nothing behind", async () => {
    const files = memoryFiles(SEED)
    const controller = new AbortController()
    const cancelled = vi.fn()
    const never = new ReadableStream<Uint8Array>({ pull: () => new Promise(() => undefined), cancel: cancelled })
    const task = files.write("memory:///late.txt", never, { signal: controller.signal, base: { absent: true } })
    await Promise.resolve()
    controller.abort("stop")
    await expect(task).rejects.toBe("stop")
    expect(await code(files.stat("memory:///late.txt", live()))).toBe("not-found")
  })

  it("pages a listing with an opaque cursor, folders first", async () => {
    const files = memoryFiles(Object.fromEntries(Array.from({ length: 7 }, (_, index) => [`f${index}.txt`, "x"])), { pageSize: 3 })
    const first = await files.readDirectory("memory:///", live())
    expect(first.entries.map((entry) => entry.name)).toEqual(["f0.txt", "f1.txt", "f2.txt"])
    expect(first.total).toBe(7)
    const second = await files.readDirectory("memory:///", { ...live(), cursor: first.cursor, limit: 2 })
    expect(second.entries.map((entry) => entry.name)).toEqual(["f3.txt", "f4.txt"])
    const last = await files.readDirectory("memory:///", { ...live(), cursor: second.cursor })
    expect(last.entries.map((entry) => entry.name)).toEqual(["f5.txt", "f6.txt"])
    expect(last.cursor).toBeNull()
    const mixed = await memoryFiles(SEED).readDirectory("memory:///", live())
    expect(mixed.entries.map((entry) => entry.name)).toEqual(["Locked", "Reports", "held.txt", "notes.md"])
  })

  it("resolves a conflict on each WriteBase rather than rejecting", async () => {
    const files = memoryFiles(SEED)
    const uri = "memory:///notes.md"
    const stat = await files.stat(uri, live())
    expect(await files.write(uri, stream("a"), { ...live(), base: { absent: true } })).toMatchObject({ status: "conflict", current: { uri } })
    const won = await files.write(uri, stream("b"), { ...live(), base: { version: stat.version } })
    expect(won.status).toBe("written")
    expect(await files.write(uri, stream("c"), { ...live(), base: { version: stat.version } })).toMatchObject({ status: "conflict", current: { version: won.status === "written" ? won.stat.version : "" } })
    expect(await files.write("memory:///gone.txt", stream("d"), { ...live(), base: { version: "v1" } })).toEqual({ status: "conflict", current: null })
    expect((await files.write(uri, stream("e"), { ...live(), base: { overwrite: true } })).status).toBe("written")
  })

  it("makes the check and the commit one step: a write that lost the race conflicts", async () => {
    const files = memoryFiles(SEED)
    const uri = "memory:///notes.md"
    const { version } = await files.stat(uri, live())
    let release = () => {}
    const slow = new ReadableStream<Uint8Array>({
      start: (controller) => {
        controller.enqueue(text("slow"))
        release = () => controller.close()
      },
    })
    const task = files.write(uri, slow, { ...live(), base: { version } })
    await files.write(uri, stream("quick"), { ...live(), base: { version } })
    release()
    expect((await task).status).toBe("conflict")
    expect(read(await files.read(uri, { offset: 0, length: 8 }, live()))).toBe("quick")
  })

  it("reports progress and creates a file in a folder", async () => {
    const files = memoryFiles(SEED)
    const progress: number[] = []
    const result = await files.write("memory:///Reports/new.txt", stream("ab", "cde"), { ...live(), base: { absent: true }, mime: "text/plain", onProgress: (sent) => progress.push(sent) })
    expect(progress).toEqual([2, 5])
    expect(result).toMatchObject({ status: "written", stat: { name: "new.txt", size: 5, mime: "text/plain" } })
    expect(await code(files.write("memory:///Nowhere/new.txt", stream("x"), { ...live(), base: { absent: true } }))).toBe("not-found")
  })

  it("applies ascending edits to a base, and conflicts on an old one", async () => {
    const files = memoryFiles({ "a.txt": "hello world" })
    const uri = "memory:///a.txt"
    const { version } = await files.stat(uri, live())
    const edited = await files.applyEdits(uri, version, [
      { offset: 0, deleteLength: 1, insert: text("H") },
      { offset: 6, deleteLength: 5, insert: text("there") },
    ], live())
    expect(edited.status).toBe("written")
    expect(read(await files.read(uri, { offset: 0, length: 32 }, live()))).toBe("Hello there")
    expect((await files.applyEdits(uri, version, [], live())).status).toBe("conflict")
    const current = await files.stat(uri, live())
    await expect(files.applyEdits(uri, current.version, [
      { offset: 4, deleteLength: 0, insert: text("x") },
      { offset: 1, deleteLength: 0, insert: text("y") },
    ], live())).rejects.toMatchObject({ code: "unsupported" })
  })

  it("enforces denied entries with the seeded reason", async () => {
    const files = memoryFiles(SEED)
    await expect(files.readDirectory("memory:///Locked", live())).rejects.toMatchObject({ code: "denied", message: "Ask the owner for access" })
    await expect(files.write("memory:///held.txt", stream("x"), { ...live(), base: { overwrite: true } })).rejects.toMatchObject({ code: "denied", message: "Held for review" })
    await expect(files.delete("memory:///held.txt", live())).rejects.toMatchObject({ code: "denied" })
    await expect(files.createDirectory("memory:///Locked/inner", live())).rejects.toMatchObject({ code: "denied" })
    expect((await files.stat("memory:///held.txt", live())).denied).toEqual({ write: "Held for review", delete: true, rename: true })
  })

  it("gives a seeded thumbnail, an image's own bytes, or null", async () => {
    const picture = new Uint8Array([1, 2, 3])
    const files = memoryFiles({ "a.png": { content: picture, mime: "image/png" }, "b.bin": { thumbnail: { url: "/b.png" } }, "c.txt": "x" })
    const options = { ...live(), width: 64, height: 64 }
    expect(await files.thumbnail("memory:///a.png", options)).toEqual({ bytes: picture, mime: "image/png" })
    expect(await files.thumbnail("memory:///b.bin", options)).toEqual({ url: "/b.png" })
    expect(await files.thumbnail("memory:///c.txt", options)).toBeNull()
  })

  it("watches a folder until the signal aborts", async () => {
    const files = memoryFiles(SEED)
    const changes: FileChange[] = []
    const controller = new AbortController()
    files.watch("memory:///Reports", (change) => changes.push(change), { signal: controller.signal })
    await files.write("memory:///Reports/x.txt", stream("x"), { ...live(), base: { absent: true } })
    await files.write("memory:///notes.md", stream("x"), { ...live(), base: { overwrite: true } })
    await Promise.resolve()
    expect(changes.map((change) => [change.type, change.uri])).toEqual([["created", "memory:///Reports/x.txt"]])
    controller.abort()
    await files.delete("memory:///Reports/x.txt", live())
    await Promise.resolve()
    expect(changes).toHaveLength(1)
  })

  it("creates, renames and deletes, moving a folder with what is in it", async () => {
    const files = memoryFiles(SEED)
    await files.createDirectory("memory:///Archive", live())
    expect(await code(files.createDirectory("memory:///Archive", live()))).toBe("exists")
    const moved = await files.rename("memory:///Reports", "memory:///Archive/Reports", live())
    expect(moved.name).toBe("Reports")
    expect(read(await files.read("memory:///Archive/Reports/summary.txt", { offset: 0, length: 6 }, live()))).toBe("Second")
    expect(await code(files.stat("memory:///Reports/summary.txt", live()))).toBe("not-found")
    expect(await code(files.rename("memory:///notes.md", "memory:///held.txt", live()))).toBe("exists")
    await files.delete("memory:///Archive", live())
    expect(await code(files.stat("memory:///Archive/Reports", live()))).toBe("not-found")
  })

  it("leaves out a method by spreading, for a backend without it", async () => {
    const { write: _write, applyEdits: _edits, ...readOnly } = memoryFiles(SEED)
    const provider: FileProvider = readOnly
    expect(provider.write).toBeUndefined()
    expect((await provider.stat("memory:///notes.md", live())).size).toBe(11)
  })

  it("hands back plain data that survives structured clone", async () => {
    const files = memoryFiles(SEED)
    const page = await files.readDirectory("memory:///", live())
    expect(structuredClone(page)).toEqual(page)
    const result = await files.write("memory:///notes.md", stream("x"), { ...live(), base: { absent: true } })
    expect(structuredClone(result)).toEqual(result)
  })
})

describe("testFileProvider", () => {
  it("passes memoryFiles on every check", async () => {
    const report = await testFileProvider(memoryFiles())
    expect(report.failed).toEqual([])
    expect(report.checks.filter((check) => check.status === "skipped")).toEqual([])
    expect(report.checks.length).toBeGreaterThan(14)
  })

  it("skips what a read-only provider lacks and finds a file by itself", async () => {
    const { write: _write, applyEdits: _edits, delete: _delete, ...readOnly } = memoryFiles({ "docs/long.txt": "0123456789" })
    const report = await testFileProvider(readOnly)
    expect(report.failed).toEqual([])
    expect(report.checks.find((check) => check.name.startsWith("read: exactly"))?.status).toBe("passed")
    expect(report.checks.find((check) => check.name.startsWith("write: overwrite"))?.status).toBe("skipped")
  })

  it("removes its own files", async () => {
    const files = memoryFiles({ "keep.txt": "0123456789" })
    await testFileProvider(files)
    expect((await files.readDirectory("memory:///", live())).entries.map((entry) => entry.name)).toEqual(["keep.txt"])
  })

  it("fails a provider that rejects a conflict instead of returning it", async () => {
    const files = memoryFiles()
    const broken: FileProvider = {
      ...files,
      write: async (uri, source, options) => {
        const result = await files.write(uri, source, options)
        if (result.status === "conflict") throw new Error("conflict")
        return result
      },
    }
    const { failed } = await testFileProvider(broken)
    expect(failed.map((check) => check.name)).toContain("write: absent writes, and conflicts when something is there")
  })
})
