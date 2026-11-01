import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react"
import type { FileEntry, FileProvider, FileStat, FileUri, WriteBase } from "../../file-provider/index.js"
import { childUri, parentUri, rootUri, trimUri, uriScheme, uriTrail } from "../../file-provider/uri.js"
import { useAnnounce } from "../../hooks/use-announce.js"
import { IconDesktop, IconEdit, IconError, IconFolder, IconFolderPlus, IconGrid, IconList, IconLock, IconRefresh, IconTrash } from "../../icons/generated/icons.js"
import { defineActions, type ActionSet } from "../../lib/actions/actions.js"
import { useMessages } from "../../lib/i18n/index.js"
import { listFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { remPx } from "../../lib/rem.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { AlertDialog } from "../alert-dialog/index.js"
import { Breadcrumb } from "../breadcrumb/index.js"
import { Button } from "../button/index.js"
import { Dialog } from "../dialog/index.js"
import { EmptyState } from "../empty-state/index.js"
import { Field } from "../field/index.js"
import { describeAccept, describeRejections, matchesAccept } from "../file-drop/files.js"
import { FileDrop } from "../file-drop/index.js"
import { getFileDropMessages } from "../file-drop/messages.js"
import { Input } from "../input/index.js"
import { Progress } from "../progress/index.js"
import { Segmented } from "../segmented/index.js"
import { Select } from "../select/index.js"
import { FileConflictDialog, type FileConflictChoice } from "./conflict-dialog.js"
import { Entries, EntriesSkeleton, type EntriesHandle, type EntryCommand } from "./entries.js"
import { copyName, deniedReason, describeFailure, failureCode, splitName, withExtension } from "./failure.js"
import { FolderTree } from "./folder-tree.js"
import { fileDialogMessages } from "./messages.js"
import { NameDialog } from "./name-dialog.js"
import { createThumbnailStore } from "./thumbnails.js"
import type { FileDialogProps, FileDialogView, FileRunContext, SaveTarget } from "./types.js"
import { useDirectory } from "./use-directory.js"

/** The last place used in this session, for a dialog with no `defaultUri`. */
let lastPlace: FileUri | null = null
const DEVICE = "device"
/** Stat requests at once when confirming a selection. */
const STAT_BATCH = 8
/** Below this width in rem the folders give way to the path line. */
const TREE_MIN_REM = 38

interface Place {
  provider: FileProvider
  uri: FileUri
}

type NameStep = { kind: "new-folder" } | { kind: "rename"; entry: FileEntry }

async function statAll(provider: FileProvider, uris: readonly FileUri[], signal: AbortSignal): Promise<FileStat[]> {
  const stats: FileStat[] = []
  for (let at = 0; at < uris.length; at += STAT_BATCH) stats.push(...(await Promise.all(uris.slice(at, at + STAT_BATCH).map((uri) => provider.stat(uri, { signal })))))
  return stats
}

export interface FileBrowserHandle {
  /** The element a keyboard open focuses. */
  initialFocus: () => HTMLElement | null
}

export interface FileBrowserProps {
  props: FileDialogProps
  /** Closes the dialog. */
  onClose: () => void
  /** Keeps the run's controller where the dialog's dismissal can reach it. */
  run: { current: AbortController | null }
  /** A static preview takes no focus. */
  preview?: boolean
  ref?: Ref<FileBrowserHandle>
}

/** The whole of a file dialog: everything inside the surface. */
export function FileBrowser({ props, onClose, run, preview = false, ref }: FileBrowserProps) {
  const messages = useMessages(fileDialogMessages)
  const locale = useLocale()
  const announce = useAnnounce()
  const saving = props.mode === "save"
  const open = props.mode === "open" ? props : null
  const save = props.mode === "save" ? props : null
  const multiple = open?.multiple ?? false
  const accept = open?.accept
  const device = open?.device ?? false

  // ── Where we are ───────────────────────────────────────────────────────
  const providers = useMemo(() => props.providers.filter((provider) => !saving || provider.write), [props.providers, saving])
  const [place, setPlace] = useState<Place | null>(() => {
    const start = props.defaultUri ?? lastPlace
    const scheme = start ? uriScheme(start) : null
    const provider = providers.find((candidate) => candidate.scheme === scheme)
    if (start && provider) return { provider, uri: start }
    return providers[0] ? { provider: providers[0], uri: rootUri(providers[0]) } : null
  })
  const [onDevice, setOnDevice] = useState(!place && device)
  const provider = onDevice ? null : (place?.provider ?? null)
  const uri = onDevice ? null : (place?.uri ?? null)
  const root = provider ? rootUri(provider) : ""
  const { directory, loadMore, refresh, patch } = useDirectory(provider, uri)
  const browsing = Boolean(provider?.readDirectory)
  const [view, setView] = useControllable<FileDialogView>(props.view, props.defaultView ?? "list", props.onViewChange)
  const canGrid = Boolean(provider?.thumbnail)
  const shownView = canGrid ? view : "list"

  useEffect(() => {
    if (uri !== null && !preview) lastPlace = uri
  }, [preview, uri])

  const body = useRef<HTMLDivElement>(null)
  const entriesRef = useRef<EntriesHandle>(null)
  const entriesFrame = useRef<HTMLDivElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const bodyWidth = useElementSize(body).width

  // ── Selection and name ─────────────────────────────────────────────────
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [name, setName] = useState(save?.defaultName ?? "")
  const [format, setFormat] = useState<string | null>(() => {
    if (!save?.formats?.length) return null
    const { extension } = splitName(save.defaultName)
    const wanted = extension.slice(1).toLowerCase()
    return (save.formats.find((item) => item.extension.replace(/^\./, "").toLowerCase() === wanted) ?? save.formats[0]!).extension
  })
  const selectStem = useRef(true)
  const [hint, setHint] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [step, setStep] = useState<NameStep | null>(null)
  const [naming, setNaming] = useState(false)
  const [removing, setRemoving] = useState<FileEntry | null>(null)
  const [replacing, setReplacing] = useState<{ target: SaveTarget; base: WriteBase } | null>(null)
  const [conflict, setConflict] = useState<{ target: SaveTarget; current: FileStat | null } | null>(null)
  const [resolved, setResolved] = useState<FileStat | null>(null)
  const [locationText, setLocationText] = useState("")
  const [locationError, setLocationError] = useState<string | null>(null)
  const refocus = useRef<number | null>(null)

  const shown = resolved && !browsing ? [resolved] : directory.entries
  const store = useMemo(() => createThumbnailStore(), [])
  useEffect(() => () => store.dispose(), [store])
  useImperativeHandle(ref, () => ({ initialFocus: () => (saving ? nameInput.current : (entriesFrame.current?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]') ?? entriesFrame.current)) }), [saving])

  const clearState = () => {
    setSelected(new Set())
    setHint(null)
    setMessage(null)
    setNameError(null)
    setResolved(null)
    setLocationError(null)
  }
  const navigate = (next: FileUri, focus = false) => {
    if (!provider) return
    clearState()
    setPlace({ provider, uri: next })
    if (focus) entriesFrame.current?.focus({ preventScroll: true })
  }
  const parent = uri !== null ? parentUri(uri, root) : null
  const crumbs = useMemo(() => {
    if (!provider || uri === null) return []
    return uriTrail(uri, root).map((step, index) => ({ id: step.uri, label: index === 0 ? provider.label : step.name, onSelect: () => navigate(step.uri, true) }))
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- navigate closes over nothing that changes the crumbs
  }, [provider, uri, root])

  // A keyboard person waits on the frame while a folder loads, and lands on its first row.
  const ready = directory.status === "ready"
  useEffect(() => {
    if (ready && directory.entries.length > 0 && document.activeElement === entriesFrame.current) entriesRef.current?.focus()
  }, [ready, directory.entries])
  useEffect(() => {
    const folderName = crumbs.at(-1)?.label
    if (!ready || !folderName) return
    const count = directory.total ?? (directory.hasMore ? null : directory.entries.length)
    announce(count === null ? folderName : messages.folderItems({ folder: folderName, items: messages.items(count, locale) }), { key: "file-dialog-folder" })
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once for each folder reached
  }, [ready, uri])

  // ── What can be done here ──────────────────────────────────────────────
  const folderDenied = saving ? (deniedReason(directory.folder?.denied?.write ?? directory.folder?.denied?.create, messages.folderDenied)) : null
  const createDenied = deniedReason(directory.folder?.denied?.create, messages.createDenied)
  const accepted = accept ? describeAccept(accept, locale, getFileDropMessages(locale)) : ""
  const blocked = useCallback(
    (entry: FileEntry) => {
      if (entry.kind === "directory") return deniedReason(entry.denied?.read, messages.readDenied)
      if (saving) return null
      const denied = deniedReason(entry.denied?.read, messages.readDenied)
      if (denied) return denied
      return accept && !matchesAccept({ name: entry.name, type: entry.mime ?? "" }, accept) ? messages.notAccepted(accepted) : null
    },
    [accept, accepted, messages, saving]
  )
  const askName = useCallback((next: NameStep) => {
    setStep(next)
    setNaming(true)
  }, [])
  const actions = useMemo<ActionSet<FileEntry> | null>(() => {
    if (!provider?.rename && !provider?.delete) return null
    return defineActions<FileEntry>("file", [
      ...(provider.rename
        ? [{ id: "rename", label: messages.rename, icon: IconEdit, group: "manage" as const, shortcut: "f2", shortcutScoped: true, disabledReason: ([entry]: readonly FileEntry[]) => deniedReason(entry?.denied?.rename, messages.renameDenied), run: ([entry]: readonly FileEntry[]) => (entry ? askName({ kind: "rename", entry }) : undefined) }]
        : []),
      ...(provider.delete
        ? [{ id: "delete", label: messages.delete, icon: IconTrash, group: "danger" as const, disabledReason: ([entry]: readonly FileEntry[]) => deniedReason(entry?.denied?.delete, messages.deleteDenied), run: ([entry]: readonly FileEntry[]) => (entry ? setRemoving(entry) : undefined) }]
        : []),
    ])
  }, [askName, messages, provider])
  const command = (kind: EntryCommand, entry: FileEntry) => {
    const reason = kind === "rename" ? deniedReason(entry.denied?.rename, messages.renameDenied) : deniedReason(entry.denied?.delete, messages.deleteDenied)
    if (reason) return setHint(reason)
    if (kind === "rename") askName({ kind: "rename", entry })
    else setRemoving(entry)
  }

  // ── Runs: the host's work, abortable, in place ─────────────────────────
  useEffect(
    () => () => {
      run.current?.abort()
      run.current = null
    },
    [run]
  )
  const perform = async (task: (context: FileRunContext) => Promise<boolean | void>): Promise<void> => {
    const controller = new AbortController()
    const { signal } = controller
    run.current = controller
    setBusy(true)
    setMessage(null)
    setProgress(null)
    const context: FileRunContext = { signal, setProgress: (fraction) => (signal.aborted ? undefined : setProgress(fraction === null ? null : Math.min(1, Math.max(0, fraction)))) }
    let finished = false
    try {
      finished = (await task(context)) !== false
    } catch (error) {
      if (!signal.aborted) {
        const text = describeFailure(error, messages)
        setMessage(text)
        announce(text)
      }
    }
    if (run.current === controller) run.current = null
    setBusy(false)
    setProgress(null)
    if (finished && !signal.aborted) onClose()
    else if (signal.aborted) announce(messages.canceled)
  }

  const openFiles = (uris: readonly FileUri[]) => {
    if (!provider || !open) return
    void perform(async (context) => {
      const files = await statAll(provider, uris, context.signal)
      const denied = files.find((file) => file.denied?.read)
      if (denied) throw new Error(deniedReason(denied.denied?.read, messages.readDenied) ?? "")
      await open.onOpen({ provider, files }, context)
      announce(messages.opened(listFormat(locale).format(files.map((file) => file.name))))
    })
  }
  const openFromDevice = (files: File[]) => {
    if (!open) return
    void perform(async (context) => {
      await open.onOpen({ files }, context)
    })
  }

  /** The host writes. A conflict keeps the dialog open at its conflict step. */
  const writeTo = async (target: SaveTarget, context: FileRunContext): Promise<boolean> => {
    const result = await save!.onSave(target, context)
    if (result.status === "conflict") {
      setConflict({ target, current: result.current })
      return false
    }
    announce(messages.saved(target.name))
    return true
  }
  const commitSave = (target: SaveTarget) => void perform((context) => writeTo(target, context))
  const confirmSave = () => {
    if (!provider || uri === null || !save || busy) return
    const typed = name.trim()
    if (!typed) return setNameError(messages.nameRequired)
    if (typed === "." || typed === ".." || /[/\\\0]/.test(typed)) return setNameError(messages.nameInvalid)
    if (folderDenied) return setMessage(folderDenied)
    setNameError(null)
    const listed = directory.entries.find((entry) => entry.name === typed)
    const targetUri = listed?.uri ?? childUri(uri, typed)
    void perform(async (context) => {
      let existing: FileStat | null = null
      try {
        existing = await provider.stat(targetUri, { signal: context.signal })
      } catch (error) {
        if (failureCode(error) !== "not-found") throw error
      }
      const target: SaveTarget = { provider, uri: targetUri, name: typed, ...(format !== null ? { format } : null), base: { absent: true } }
      if (!existing) return writeTo(target, context)
      if (existing.kind === "directory") {
        setNameError(messages.isFolder(typed))
        return false
      }
      const refused = deniedReason(existing.denied?.write, messages.writeDenied)
      if (refused) {
        setNameError(refused)
        return false
      }
      const base: WriteBase = { version: existing.version }
      if (save.base === existing.version) return writeTo({ ...target, base }, context)
      setReplacing({ target, base })
      return false
    })
  }
  const activate = (entry: FileEntry) => {
    if (entry.kind === "directory") return navigate(entry.uri, true)
    if (saving) {
      setName(entry.name)
      setSelected(new Set([entry.uri]))
      return
    }
    openFiles(selected.has(entry.uri) ? [...selected] : [entry.uri])
  }
  const chosenFiles = useMemo(() => shown.filter((entry) => selected.has(entry.uri) && entry.kind === "file"), [selected, shown])
  const chosenFolder = chosenFiles.length === 0 ? shown.find((entry) => selected.has(entry.uri) && entry.kind === "directory") : undefined
  const confirm = () => {
    if (busy) return
    if (saving) return confirmSave()
    if (chosenFolder) return navigate(chosenFolder.uri, true)
    if (chosenFiles.length) openFiles(chosenFiles.map((entry) => entry.uri))
  }
  const onSelectedChange = (uris: readonly string[]) => {
    setSelected(new Set(uris))
    setMessage(null)
    if (saving && uris.length === 1) {
      const entry = shown.find((item) => item.uri === uris[0])
      if (entry?.kind === "file") {
        setName(entry.name)
        setNameError(null)
      }
    }
  }
  const resolveConflict = (choice: FileConflictChoice) => {
    const current = conflict
    setConflict(null)
    if (!current || choice === "cancel") return
    if (choice === "replace") return commitSave({ ...current.target, base: { overwrite: true } })
    const taken = new Set(directory.entries.map((entry) => entry.name))
    setName(copyName(current.target.name, taken))
    selectStem.current = true
    requestAnimationFrame(() => nameInput.current?.focus())
  }

  // ── Commands ───────────────────────────────────────────────────────────
  const siblingUri = (entry: FileEntry, next: string) => childUri(parentUri(entry.uri, root) ?? root, next)
  const submitName = async (value: string): Promise<string | null> => {
    if (!provider || uri === null || !step) return null
    if (!value) return messages.nameRequired
    if (value === "." || value === ".." || /[/\\\0]/.test(value)) return messages.nameInvalid
    const { signal } = new AbortController()
    try {
      if (step.kind === "new-folder") {
        const created = await provider.createDirectory!(childUri(uri, value), { signal })
        patch((entries) => [created, ...entries.filter((entry) => entry.uri !== created.uri)])
        refocus.current = 0
        return null
      }
      const at = shown.indexOf(step.entry)
      refocus.current = at
      if (value === step.entry.name) return null
      const moved = await provider.rename!(step.entry.uri, siblingUri(step.entry, value), { signal })
      // A row keeps its place, whichever way a watch reported the move.
      patch((entries) => entries.filter((entry) => entry.uri !== step.entry.uri && entry.uri !== moved.uri).toSpliced(at, 0, moved))
      setSelected(new Set())
      return null
    } catch (error) {
      return failureCode(error) === "exists" ? messages.nameTaken(value) : describeFailure(error, messages)
    }
  }
  const remove = async () => {
    const entry = removing
    if (!provider || !entry) return
    const at = shown.indexOf(entry)
    setRemoving(null)
    try {
      await provider.delete!(entry.uri, { signal: new AbortController().signal })
      patch((entries) => entries.filter((item) => item.uri !== entry.uri))
      setSelected((current) => new Set([...current].filter((item) => item !== entry.uri)))
      refocus.current = at
    } catch (error) {
      setMessage(describeFailure(error, messages))
    }
  }
  /**
   * After a row was added, moved or removed. The control that had focus may be gone, so Base UI's
   * return can land outside the dialog: this runs a frame after it.
   */
  const restoreFocus = () => {
    const at = refocus.current
    refocus.current = null
    if (at !== null) requestAnimationFrame(() => entriesRef.current?.focusAt(at))
  }
  // A nested alert keeps its words while it leaves.
  const lastRemoving = useRef(removing)
  if (removing) lastRemoving.current = removing
  const lastReplacing = useRef(replacing)
  if (replacing) lastReplacing.current = replacing

  // ── A location with no listing ─────────────────────────────────────────
  const resolveLocation = async () => {
    const text = locationText.trim()
    if (!provider || !text) return
    setLocationError(null)
    await perform(async ({ signal }) => {
      try {
        const stat = await provider.stat(text, { signal })
        if (saving) {
          if (stat.kind === "file") setLocationError(messages.isFile(stat.name))
          else setPlace({ provider, uri: stat.uri })
        } else if (stat.kind === "directory") setLocationError(messages.isFolder(stat.name))
        else {
          setResolved(stat)
          setSelected(new Set([stat.uri]))
        }
      } catch (error) {
        if (!signal.aborted) setLocationError(describeFailure(error, messages))
      }
      return false
    })
  }

  // ── Layout ─────────────────────────────────────────────────────────────
  const locationValue = onDevice ? DEVICE : (provider?.scheme ?? "")
  const locationOptions = [...providers.map((item) => ({ value: item.scheme, label: item.label })), ...(device ? [{ value: DEVICE, label: messages.thisDevice, icon: <IconDesktop /> }] : [])]
  const chooseLocation = (value: string | null) => {
    if (value === null) return
    clearState()
    if (value === DEVICE) return setOnDevice(true)
    setOnDevice(false)
    const next = providers.find((item) => item.scheme === value)
    if (next && next !== provider) setPlace({ provider: next, uri: rootUri(next) })
  }
  const atRoot = provider !== null && uri !== null && trimUri(uri) === trimUri(root)
  const noFolders = atRoot && directory.status === "ready" && !directory.hasMore && !directory.entries.some((entry) => entry.kind === "directory")
  const treeShown = browsing && !noFolders && provider !== null && uri !== null && bodyWidth / remPx() >= TREE_MIN_REM
  const failure = directory.status === "error" ? directory.error : null
  const refused = failureCode(failure) === "denied"
  const total = directory.total ?? (directory.hasMore ? null : directory.entries.length)
  const statusLine = message ?? hint ?? (selected.size > 0 && (multiple || chosenFolder === undefined) ? messages.selected(selected.size, locale) : browsing && directory.status === "ready" && total !== null ? messages.items(total, locale) : "")

  const main = (): ReactNode => {
    if (providers.length === 0 && !device) return <EmptyState icon={<IconFolder />}>{messages.noLocations}</EmptyState>
    if (onDevice) return <FileDrop onFiles={(files, rejected) => (rejected.length ? setMessage(describeRejections(rejected) ?? null) : openFromDevice(files))} accept={accept} multiple={multiple} disabled={busy} aria-label={messages.thisDevice} className="fa-file-dialog-drop" />
    if (!provider) return null
    if (!browsing) {
      return (
        <div className="fa-file-dialog-location">
          <Field label={messages.location} error={locationError ?? undefined}>
            <Input
              value={locationText}
              autoComplete="off"
              spellCheck={false}
              trailing={
                <Button variant="ghost" size="sm" disabled={busy || !locationText.trim()} onClick={() => void resolveLocation()}>
                  {messages.go}
                </Button>
              }
              onChange={(event) => setLocationText(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return
                event.preventDefault()
                void resolveLocation()
              }}
            />
          </Field>
          {resolved ? (
            <Entries ref={entriesRef} provider={provider} entries={[resolved]} view="list" multiple={false} selected={selected} blocked={blocked} actions={null} store={store} hasMore={false} total={1} more="idle" aria-label={messages.files} onLoadMore={loadMore} onSelectedChange={onSelectedChange} onActivate={activate} onParent={() => undefined} onCommand={() => undefined} onHint={setHint} />
          ) : null}
        </div>
      )
    }
    if (failure) {
      return refused ? (
        <EmptyState icon={<IconLock />}>{describeFailure(failure, messages)}</EmptyState>
      ) : (
        <EmptyState
          icon={<IconError />}
          tone="danger"
          action={
            <Button size="sm" onClick={refresh}>
              {messages.retry}
            </Button>
          }
        >
          {describeFailure(failure, messages, messages.errorList)}
        </EmptyState>
      )
    }
    if (directory.status === "loading") return <EntriesSkeleton view={shownView} />
    if (directory.entries.length === 0) return <EmptyState icon={<IconFolder />}>{messages.emptyFolder}</EmptyState>
    return (
      <Entries
        ref={entriesRef}
        provider={provider}
        entries={directory.entries}
        view={shownView}
        multiple={multiple}
        selected={selected}
        blocked={blocked}
        actions={actions}
        store={store}
        hasMore={directory.hasMore}
        total={directory.total}
        more={directory.more}
        aria-label={messages.files}
        onLoadMore={loadMore}
        onSelectedChange={onSelectedChange}
        onActivate={activate}
        onParent={() => (parent !== null ? navigate(parent, true) : undefined)}
        onCommand={command}
        onHint={setHint}
      />
    )
  }

  const title = props.title ?? (saving ? messages.saveTitle : multiple ? messages.openFilesTitle : messages.openTitle)
  const confirmLabel = saving ? messages.save : messages.open
  const confirmReason = providers.length === 0 ? messages.noLocations : saving ? (folderDenied ?? undefined) : chosenFiles.length === 0 && !chosenFolder ? messages.chooseFirst : undefined
  return (
    <>
      <Dialog.Header title={title} />
      <Dialog.Body flush className="fa-file-dialog-body">
        <div ref={body} className="fa-file-dialog-layout" aria-busy={directory.status === "loading" || busy}>
          {(locationOptions.length > 1 || browsing || canGrid) && (
            <div className="fa-file-dialog-bar">
              {locationOptions.length > 1 ? <Select className="fa-file-dialog-places" aria-label={messages.location} options={locationOptions} value={locationValue} onValueChange={chooseLocation} size="sm" /> : null}
              {browsing && !onDevice ? <Breadcrumb className="fa-file-dialog-path" size="xs" aria-label={messages.path} items={crumbs} /> : <span className="fa-file-dialog-path" />}
              {browsing && !onDevice ? (
                <div className="fa-file-dialog-commands">
                  {provider?.createDirectory ? <Button variant="ghost" size="sm" icon={<IconFolderPlus />} aria-label={messages.newFolder} disabledReason={createDenied ?? undefined} onClick={() => askName({ kind: "new-folder" })} /> : null}
                  <Button variant="ghost" size="sm" icon={<IconRefresh />} aria-label={messages.refresh} onClick={refresh} />
                  {canGrid ? (
                    <Segmented
                      aria-label={messages.view}
                      size="sm"
                      iconOnly
                      collapse="none"
                      value={shownView}
                      onValueChange={setView}
                      options={[
                        { value: "list", label: messages.listView, icon: <IconList /> },
                        { value: "grid", label: messages.gridView, icon: <IconGrid /> },
                      ]}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
          <div className="fa-file-dialog-panes">
            {treeShown ? (
              <div className="fa-file-dialog-folders">
                <FolderTree key={provider.scheme} provider={provider} uri={uri} onNavigate={(next) => navigate(next)} />
              </div>
            ) : null}
            <div
              ref={entriesFrame}
              className="fa-file-dialog-main"
              tabIndex={-1}
              onFocus={(event) => {
                if (event.target === event.currentTarget) entriesRef.current?.focus()
              }}
            >
              {main()}
            </div>
          </div>
          {save ? (
            <div className="fa-file-dialog-name-row">
              <Field label={messages.name} error={nameError ?? undefined} className="fa-file-dialog-name-field">
                <Input
                  ref={nameInput}
                  value={name}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => {
                    setName(event.currentTarget.value)
                    setNameError(null)
                  }}
                  onKeyDown={(event) => {
                    // A Select beside the field stops the form submitting on Enter by itself.
                    if (event.key !== "Enter" || event.nativeEvent.isComposing) return
                    event.preventDefault()
                    confirmSave()
                  }}
                  onFocus={(event) => {
                    if (!selectStem.current) return
                    selectStem.current = false
                    event.currentTarget.setSelectionRange(0, splitName(event.currentTarget.value).stem.length)
                  }}
                />
              </Field>
              {save.formats?.length ? (
                <Field label={messages.format} nativeLabel={false} className="fa-file-dialog-format-field">
                  <Select
                    options={save.formats.map((item) => ({ value: item.extension, label: item.label }))}
                    value={format}
                    onValueChange={(value) => {
                      setFormat(value)
                      if (value !== null) setName((current) => withExtension(current, value))
                    }}
                  />
                </Field>
              ) : null}
            </div>
          ) : null}
          <p className="fa-file-dialog-status" data-tone={message ? "danger" : undefined} data-numeric>
            {statusLine}
          </p>
        </div>
      </Dialog.Body>
      <Dialog.Footer
        start={
          progress !== null ? (
            <span className="fa-file-dialog-progress">
              <Progress value={progress * 100} size="sm" showValue={false} aria-label={messages.progress} />
            </span>
          ) : undefined
        }
      >
        <Button variant="ghost" onClick={() => (run.current ? run.current.abort() : onClose())}>
          {messages.cancel}
        </Button>
        {onDevice ? null : (
          <Button variant="primary" status={busy ? "pending" : "idle"} pendingLabel={saving ? messages.saving : messages.opening} statusAnnouncement={false} disabledReason={confirmReason} onClick={confirm}>
            {confirmLabel}
          </Button>
        )}
      </Dialog.Footer>
      {step ? (
        <NameDialog
          key={step.kind === "rename" ? step.entry.uri : step.kind}
          open={naming}
          title={step.kind === "rename" ? messages.renameTitle(step.entry.name) : messages.newFolder}
          initial={step.kind === "rename" ? step.entry.name : ""}
          confirmLabel={step.kind === "rename" ? messages.rename : messages.create}
          onSubmit={submitName}
          onClose={() => setNaming(false)}
          onClosed={() => {
            setStep(null)
            restoreFocus()
          }}
        />
      ) : null}
      <AlertDialog
        open={removing !== null}
        onOpenChange={(next) => (next ? undefined : setRemoving(null))}
        onOpenChangeComplete={(next) => (next ? undefined : restoreFocus())}
        title={messages.deleteTitle(lastRemoving.current?.name ?? "")}
        description={lastRemoving.current?.kind === "directory" ? messages.deleteFolderBody : messages.deleteFileBody}
        confirmLabel={messages.delete}
        cancelLabel={messages.cancel}
        tone="danger"
        onConfirm={() => void remove()}
      />
      <AlertDialog
        open={replacing !== null}
        onOpenChange={(next) => (next ? undefined : setReplacing(null))}
        title={messages.replaceTitle(lastReplacing.current?.target.name ?? "")}
        description={messages.replaceBody(crumbs.at(-1)?.label ?? "")}
        confirmLabel={messages.replace}
        cancelLabel={messages.cancel}
        tone="warning"
        onConfirm={() => {
          const answer = replacing
          setReplacing(null)
          if (answer) commitSave({ ...answer.target, base: answer.base })
        }}
      />
      {save ? <FileConflictDialog open={conflict !== null} name={conflict?.target.name ?? ""} current={conflict?.current ?? null} onResolve={resolveConflict} onCompare={save.onCompare} /> : null}
    </>
  )
}
