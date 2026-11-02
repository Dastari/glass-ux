// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { DirectoryPage, FileProvider, ListOptions } from "../../file-provider/index.js"
import { memoryFiles } from "../../file-provider/memory.js"
import { copyName, describeFailure, splitName, withExtension } from "./failure.js"
import { FileConflictDialog, FileDialog, FileDialogPreview } from "./index.js"
import { getFileDialogMessages } from "./messages.js"
import { createThumbnailStore } from "./thumbnails.js"

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }))
  // jsdom lays nothing out: the scroller gets a height so the virtualiser has a window to fill.
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400)
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600)
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, width: 600, height: 400, top: 0, left: 0, right: 600, bottom: 400, toJSON: () => null })
  HTMLElement.prototype.scrollTo = () => undefined
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const messages = getFileDialogMessages("en-US")
/** The primary button. In jsdom its reserved status faces are part of the name. */
const confirmButton = (label: string) => screen.getByRole("button", { name: new RegExp(`^${label}`) })
const stream = (text: string) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text))
      controller.close()
    },
  })
const SEED = { "Docs/": {}, "Docs/a.txt": "alpha", "b.txt": "beta", "c.png": { content: "c", mime: "image/png" } }

/** A provider whose listings wait until the test answers them. */
function controlledListing() {
  const files = memoryFiles(SEED, { label: "Samples" })
  const calls: Array<{ uri: string; options: ListOptions; answer: (page: DirectoryPage) => void; fail: (error: unknown) => void }> = []
  const provider: FileProvider = {
    ...files,
    readDirectory: (uri, options) =>
      new Promise((answer, fail) => {
        calls.push({ uri, options, answer, fail })
        options.signal.addEventListener("abort", () => fail(options.signal.reason), { once: true })
      }),
  }
  return { provider, calls }
}

const page = (names: string[], cursor: string | null = null, total?: number): DirectoryPage => ({
  entries: names.map((name) => ({ uri: `memory:///${name}`, name, kind: "file" as const, size: 1 })),
  cursor,
  ...(total === undefined ? null : { total }),
})

describe("helpers", () => {
  it("splits a name at its extension", () => {
    expect(splitName("report.final.pdf")).toEqual({ stem: "report.final", extension: ".pdf" })
    expect(splitName(".env")).toEqual({ stem: ".env", extension: "" })
  })

  it("swaps an extension, with or without the dot", () => {
    expect(withExtension("cover.png", ".webp")).toBe("cover.webp")
    expect(withExtension("cover", "webp")).toBe("cover.webp")
  })

  it("suggests a free name for a copy", () => {
    expect(copyName("plan.txt", new Set(["plan (2).txt"]))).toBe("plan (3).txt")
    expect(copyName("plan (2).txt", new Set())).toBe("plan (2).txt")
  })

  it("passes on the provider's sentence for denied and unavailable, and its own words otherwise", () => {
    const failure = (code: string, message = "") => Object.assign(new Error(message), { code })
    expect(describeFailure(failure("denied", "Your session has ended"), messages)).toBe("Your session has ended")
    expect(describeFailure(failure("unavailable", "Offline until 18:00"), messages)).toBe("Offline until 18:00")
    expect(describeFailure(failure("denied"), messages)).toBe(messages.errorDenied)
    expect(describeFailure(failure("not-found", "ENOENT /srv/x"), messages)).toBe(messages.errorNotFound)
    expect(describeFailure(new Error("Quota reached"), messages)).toBe("Quota reached")
    expect(describeFailure("nothing useful", messages)).toBe(messages.errorFailed)
  })
})

describe("listing", () => {
  it("aborts the old folder's request and drops its late answer", async () => {
    const user = userEvent.setup()
    const { provider, calls } = controlledListing()
    render(<FileDialogPreview mode="open" providers={[provider]} onOpen={() => undefined} />)
    const first = calls.find((call) => call.uri === "memory:///")!
    await act(async () => first.answer({ entries: [{ uri: "memory:///Docs", name: "Docs", kind: "directory", size: null }, ...page(["b.txt"]).entries], cursor: null, total: 2 }))
    await user.dblClick(await screen.findByRole("row", { name: /Docs/ }))
    await waitFor(() => expect(calls.some((call) => call.uri === "memory:///Docs")).toBe(true))
    const inner = calls.filter((call) => call.uri === "memory:///Docs").at(-1)!
    await user.click(screen.getAllByRole("button", { name: "Samples" })[0]!)
    await waitFor(() => expect(inner.options.signal.aborted).toBe(true))
    const again = calls.filter((call) => call.uri === "memory:///").at(-1)!
    await act(async () => again.answer(page(["fresh.txt"], null, 1)))
    expect(await screen.findByRole("row", { name: /fresh\.txt/ })).toBeTruthy()
  })

  it("loads the next page near the end, offers Retry when it fails, and shows no count until the last page", async () => {
    const user = userEvent.setup()
    const { provider, calls } = controlledListing()
    render(<FileDialogPreview mode="open" providers={[provider]} onOpen={() => undefined} />)
    await act(async () => {
      for (const call of calls.filter((item) => item.uri === "memory:///")) call.answer(page(["one.txt"], "next"))
    })
    const status = document.querySelector(".fa-file-dialog-status")!
    expect(status.textContent).toBe("")
    expect(screen.getByRole("grid", { name: messages.files }).getAttribute("aria-rowcount")).toBe("-1")
    await waitFor(() => expect(calls.some((call) => call.options.cursor === "next")).toBe(true))
    await act(async () => calls.find((call) => call.options.cursor === "next")!.fail(new Error("gone")))
    const retry = await screen.findByRole("button", { name: messages.retry })
    expect(screen.getByText(messages.loadMoreFailed)).toBeTruthy()
    const asked = calls.length
    await user.click(retry)
    await waitFor(() => expect(calls.length).toBeGreaterThan(asked))
    await act(async () => calls.at(-1)!.answer(page(["two.txt"])))
    await waitFor(() => expect(status.textContent).toBe("2 items"))
    expect(screen.getAllByRole("row")).toHaveLength(2)
  })

  it("shows a failed first page in its box with Retry, and a denied one without", async () => {
    const user = userEvent.setup()
    const { provider, calls } = controlledListing()
    const { unmount } = render(<FileDialogPreview mode="open" providers={[provider]} onOpen={() => undefined} />)
    await act(async () => calls.at(-1)!.fail(Object.assign(new Error("Offline until 18:00"), { code: "unavailable" })))
    expect((await screen.findByRole("alert")).textContent).toContain("Offline until 18:00")
    await user.click(screen.getByRole("button", { name: messages.retry }))
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
    unmount()
    const denied = controlledListing()
    render(<FileDialogPreview mode="open" providers={[denied.provider]} onOpen={() => undefined} />)
    await act(async () => denied.calls.at(-1)!.fail(Object.assign(new Error("Session ended"), { code: "denied" })))
    expect(await screen.findByText("Session ended")).toBeTruthy()
    expect(screen.queryByRole("button", { name: messages.retry })).toBeNull()
  })

  it("patches rows in place from watch, and joins new ones at the end", async () => {
    const files = memoryFiles(SEED)
    render(<FileDialogPreview mode="open" providers={[files]} onOpen={() => undefined} />)
    await screen.findByRole("row", { name: /b\.txt/ })
    await act(async () => {
      await files.write("memory:///new.txt", stream("new"), { signal: new AbortController().signal, base: { absent: true } })
      await files.delete("memory:///b.txt", { signal: new AbortController().signal })
    })
    await screen.findByRole("row", { name: /new\.txt/ })
    await waitFor(() => expect(screen.queryByRole("row", { name: /b\.txt/ })).toBeNull())
    expect(screen.getAllByRole("row").at(-1)!.textContent).toContain("new.txt")
  })
})

describe("runs", () => {
  it("is controlled: Cancel asks to close, and the dialog obeys open", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<FileDialog mode="open" open providers={[memoryFiles(SEED)]} onOpenChange={onOpenChange} onOpen={() => undefined} />)
    await user.click(await screen.findByRole("button", { name: messages.cancel }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.getByRole("dialog")).toBeTruthy()
  })

  it("a double press needs both presses on the same row", async () => {
    const onOpen = vi.fn()
    render(<FileDialog mode="open" open providers={[memoryFiles(SEED)]} onOpenChange={() => undefined} onOpen={onOpen} />)
    const row = async (name: string) => (await screen.findByText(name)).closest<HTMLElement>('[role="row"]')!
    const first = await row("b.txt")
    const second = await row("c.png")
    // A tap that replaces the list leaves a new row under the finger, and the browser sees a double-tap.
    fireEvent.click(first)
    fireEvent.click(second)
    fireEvent.doubleClick(second)
    expect(onOpen).not.toHaveBeenCalled()
    fireEvent.click(second)
    fireEvent.click(second)
    fireEvent.doubleClick(second)
    await waitFor(() => expect(onOpen).toHaveBeenCalledOnce())
  })

  it("is uncontrolled from a trigger, with the view from defaultView", async () => {
    const user = userEvent.setup()
    render(<FileDialog mode="open" trigger={<button>Choose</button>} defaultView="grid" providers={[memoryFiles(SEED)]} onOpen={() => undefined} />)
    expect(screen.queryByRole("dialog")).toBeNull()
    await user.click(screen.getByRole("button", { name: "Choose" }))
    const grid = await screen.findByRole("grid", { name: messages.files })
    expect(grid.getAttribute("data-view")).toBe("grid")
    await user.click(await within(screen.getByRole("dialog")).findByRole("button", { name: messages.cancel }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("stats on confirm, stays pending until onOpen settles, and shows a rejection in place", async () => {
    const user = userEvent.setup()
    const files = memoryFiles(SEED)
    let settle: (value?: unknown) => void = () => undefined
    const onOpen = vi.fn(() => new Promise((_, reject) => (settle = () => reject(new Error("The file is too old to import")))))
    const onOpenChange = vi.fn()
    render(<FileDialog mode="open" defaultOpen providers={[files]} onOpenChange={onOpenChange} onOpen={onOpen} />)
    await user.click(await screen.findByRole("row", { name: /b\.txt/ }))
    await user.click(confirmButton(messages.open))
    await waitFor(() => expect(onOpen).toHaveBeenCalled())
    const [selection, context] = onOpen.mock.calls[0] as unknown as [{ provider: FileProvider; files: { name: string; version: string }[] }, { signal: AbortSignal }]
    expect(selection.provider).toBe(files)
    expect(selection.files[0]).toMatchObject({ name: "b.txt", version: expect.any(String) })
    expect(context.signal.aborted).toBe(false)
    await act(async () => settle())
    expect(await screen.findByText("The file is too old to import")).toBeTruthy()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("cancels a run in place: Cancel aborts it, Escape too, and nothing closes", async () => {
    const user = userEvent.setup()
    const signals: AbortSignal[] = []
    const onOpen = vi.fn((_selection: unknown, { signal }: { signal: AbortSignal }) => {
      signals.push(signal)
      return new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)))
    })
    const onOpenChange = vi.fn()
    render(<FileDialog mode="open" defaultOpen providers={[memoryFiles(SEED)]} onOpenChange={onOpenChange} onOpen={onOpen} />)
    await user.click(await screen.findByRole("row", { name: /b\.txt/ }))
    await user.click(confirmButton(messages.open))
    await waitFor(() => expect(signals).toHaveLength(1))
    await user.click(screen.getByRole("button", { name: messages.cancel }))
    expect(signals[0]!.aborted).toBe(true)
    expect(onOpenChange).not.toHaveBeenCalled()
    await waitFor(() => expect(confirmButton(messages.open).getAttribute("data-status")).toBe("idle"))
    await user.click(confirmButton(messages.open))
    await waitFor(() => expect(signals).toHaveLength(2))
    await user.keyboard("{Escape}")
    expect(signals[1]!.aborted).toBe(true)
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeTruthy()
  })

  it("reports progress, clamped, and never touches contents itself", async () => {
    const user = userEvent.setup()
    const files = memoryFiles(SEED)
    const read = vi.spyOn(files, "read")
    const write = vi.spyOn(files, "write")
    let report: (fraction: number | null) => void = () => undefined
    let finish: (value: { status: "written"; stat: Awaited<ReturnType<typeof files.stat>> }) => void = () => undefined
    render(
      <FileDialog
        mode="save"
        defaultOpen
        defaultName="new.txt"
        providers={[files]}
        onSave={(_target, { setProgress }) => {
          report = setProgress
          return new Promise((resolve) => (finish = resolve))
        }}
      />
    )
    await screen.findByRole("row", { name: /b\.txt/ })
    await user.click(confirmButton(messages.save))
    await waitFor(() => expect(confirmButton(messages.save).getAttribute("data-status")).toBe("pending"))
    act(() => report(1.4))
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100")
    await act(async () => finish({ status: "written", stat: await files.stat("memory:///b.txt", { signal: new AbortController().signal }) }))
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })

  it("skips the question when base already matches, and passes that version on", async () => {
    const user = userEvent.setup()
    const files = memoryFiles(SEED)
    const { version } = await files.stat("memory:///b.txt", { signal: new AbortController().signal })
    const onSave = vi.fn(async () => ({ status: "written" as const, stat: await files.stat("memory:///b.txt", { signal: new AbortController().signal }) }))
    render(<FileDialog mode="save" defaultOpen defaultName="b.txt" base={version} providers={[files]} onSave={onSave} />)
    await screen.findByRole("row", { name: /b\.txt/ })
    await user.click(confirmButton(messages.save))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect((onSave.mock.calls[0] as unknown as [{ base: unknown }])[0].base).toEqual({ version })
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })
})

describe("a provider with write and no readDirectory", () => {
  it("saves into the folder its location field names, and refuses a file there", async () => {
    const user = userEvent.setup()
    const { readDirectory: _list, ...files } = memoryFiles(SEED)
    const onSave = vi.fn(async (target: { uri: string }) => {
      void target
      return { status: "written" as const, stat: await files.stat("memory:///b.txt", { signal: new AbortController().signal }) }
    })
    render(<FileDialog mode="save" defaultOpen defaultName="fresh.txt" providers={[files]} onSave={onSave} />)
    const location = await screen.findByRole("textbox", { name: messages.location })
    expect(screen.queryByRole("grid")).toBeNull()
    await user.type(location, "memory:///b.txt{Enter}")
    expect(await screen.findByText(messages.isFile("b.txt"))).toBeTruthy()
    await user.clear(location)
    await user.type(location, "memory:///Docs{Enter}")
    await waitFor(() => expect(screen.queryByText(messages.isFile("b.txt"))).toBeNull())
    await user.click(confirmButton(messages.save))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0]![0]).toMatchObject({ uri: "memory:///Docs/fresh.txt", base: { absent: true } })
  })
})

describe("FileConflictDialog", () => {
  it("offers Compare only with onCompare, and Save anyway when the file has gone", async () => {
    const user = userEvent.setup()
    const onResolve = vi.fn()
    const { rerender } = render(<FileConflictDialog open name="plan.txt" current={null} onResolve={onResolve} />)
    expect(screen.queryByRole("button", { name: messages.compare })).toBeNull()
    await user.click(screen.getByRole("button", { name: messages.saveAnyway }))
    expect(onResolve).toHaveBeenLastCalledWith("replace")
    const onCompare = vi.fn()
    const current = { uri: "memory:///plan.txt", name: "plan.txt", kind: "file" as const, size: 2048, version: "v2" }
    rerender(<FileConflictDialog open name="plan.txt" current={current} onResolve={onResolve} onCompare={onCompare} />)
    await user.click(screen.getByRole("button", { name: messages.compare }))
    expect(onCompare).toHaveBeenCalledWith(current)
    await user.click(screen.getByRole("button", { name: messages.saveCopy }))
    expect(onResolve).toHaveBeenLastCalledWith("copy")
  })
})

describe("thumbnails", () => {
  it("runs at most four at once, drops a request aborted while waiting, and caches by version", async () => {
    const store = createThumbnailStore()
    const answers: Array<(value: { url: string }) => void> = []
    const thumbnail = vi.fn(() => new Promise<{ url: string }>((resolve) => answers.push(resolve)))
    const provider = { ...memoryFiles(), thumbnail } as unknown as FileProvider
    const entry = (name: string, version = "v1") => ({ uri: `memory:///${name}`, name, kind: "file" as const, size: 1, version })
    const controllers = Array.from({ length: 6 }, () => new AbortController())
    const tasks = controllers.map((controller, index) => store.request(provider, entry(`f${index}`), 64, 64, controller.signal).catch((error: unknown) => error))
    expect(thumbnail).toHaveBeenCalledTimes(4)
    controllers[4]!.abort("left the window")
    await expect(tasks[4]).resolves.toBe("left the window")
    answers[0]!({ url: "/0.png" })
    await expect(tasks[0]).resolves.toBe("/0.png")
    await vi.waitFor(() => expect(thumbnail).toHaveBeenCalledTimes(5))
    expect((thumbnail.mock.calls.at(-1) as unknown as [string])[0]).toBe("memory:///f5")
    expect(store.peek(entry("f0"))).toBe("/0.png")
    expect(store.peek(entry("f0", "v2"))).toBeUndefined()
    store.dispose()
  })
})
