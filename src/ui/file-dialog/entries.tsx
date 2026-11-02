import { defaultRangeExtractor, useVirtualizer, type Range } from "@tanstack/react-virtual"
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactElement, type Ref } from "react"
import type { FileEntry, FileProvider } from "../../file-provider/index.js"
import { IconCheck, IconMoreHorizontal } from "../../icons/generated/icons.js"
import type { ActionSet } from "../../lib/actions/actions.js"
import { readingKey } from "../../lib/direction.js"
import { foldText } from "../../lib/fold.js"
import { useMessages } from "../../lib/i18n/index.js"
import { dateTimeFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"
import { ActionContextMenu, ActionMenu } from "../actions/index.js"
import { actionsMessages } from "../actions/messages.js"
import { Button } from "../button/index.js"
import { FileIcon } from "../file-icon/index.js"
import { formatBytes } from "../file-drop/files.js"
import { Image } from "../image/index.js"
import { ProgressRing } from "../progress/index.js"
import { Skeleton } from "../skeleton/index.js"
import { TruncatedText } from "../truncated-text/index.js"
import { VisuallyHidden } from "../visually-hidden/index.js"
import { fileDialogMessages } from "./messages.js"
import { useThumbnail, type ThumbnailStore } from "./thumbnails.js"
import type { FileDialogView } from "./types.js"

const TYPEAHEAD_RESET_MS = 500
/** Rows from the end at which the next page loads. */
const END_ROWS = 6
const SKELETON_ROWS = 9
const SKELETON_TILES = 8

/** A row the host's commands can run on. */
export type EntryCommand = "rename" | "delete"

/** Moves focus into the entries. */
export interface EntriesHandle {
  /** Focus the row last focused, else the first selected, else the first. */
  focus: () => void
  /** Focus the row at `index`, the nearest there is. */
  focusAt: (index: number) => void
}

export interface EntriesProps {
  provider: FileProvider
  entries: readonly FileEntry[]
  view: FileDialogView
  /** Several files can be chosen (R11.8). */
  multiple: boolean
  /** Selected URIs. */
  selected: ReadonlySet<string>
  /** Why an entry can't be chosen, or null. It stays focusable, and says so (R11.3). */
  blocked: (entry: FileEntry) => string | null
  /** The rows' menu, or null when the location has no such commands. */
  actions: ActionSet<FileEntry> | null
  store: ThumbnailStore
  /** The folder has more to load. */
  hasMore: boolean
  /** The folder's size, when known. */
  total: number | undefined
  /** The state of the next page. */
  more: "idle" | "loading" | "error"
  /** Names the grid. */
  "aria-label": string
  onLoadMore: () => void
  /** Called with the whole selection after each change. */
  onSelectedChange: (uris: readonly string[]) => void
  /** Enter, a double press, or a tap on a folder. */
  onActivate: (entry: FileEntry) => void
  /** Backspace: up a level. */
  onParent: () => void
  /** F2 and Delete, when the entry allows them. */
  onCommand: (command: EntryCommand, entry: FileEntry) => void
  /** Called with a blocked entry's reason as it is reached, and null as it is left. */
  onHint: (hint: string | null) => void
  ref?: Ref<EntriesHandle>
}

/** A thumbnail or `FileIcon` in a box of fixed size. The picture swaps in place (R9.1). */
function EntryPicture({ entry, provider, store }: { entry: FileEntry; provider: FileProvider; store: ThumbnailStore }) {
  const { frame, source } = useThumbnail(store, provider, entry)
  const icon = <FileIcon name={entry.name} mime={entry.mime} kind={entry.kind === "directory" ? "folder" : undefined} />
  return (
    <span ref={frame} className="fa-file-dialog-picture">
      {source ? <Image src={source} alt="" ratio="square" radius="media" frame={false} fallback={icon} /> : icon}
    </span>
  )
}

/** Rows and tiles at the loaded geometry, box for box (R9.3). */
export function EntriesSkeleton({ view }: { view: FileDialogView }) {
  if (view === "grid") {
    return (
      <div className="fa-file-dialog-tiles" data-flow="" aria-hidden>
        {Array.from({ length: SKELETON_TILES }, (_, index) => (
          <div key={index} className="fa-file-dialog-tile">
            <Skeleton.Block className="fa-file-dialog-picture" radius="item" />
            <Skeleton.Text type="body" width="70%" />
            <Skeleton.Text type="caption" width="40%" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div aria-hidden>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="fa-item fa-file-dialog-row" data-flow="">
          <span className="fa-file-dialog-cell" data-cell="name">
            <Skeleton.Block className="fa-file-dialog-picture" radius="item" />
            <Skeleton.Text type="body" width={`${40 + (index % 4) * 12}%`} />
          </span>
          <span className="fa-file-dialog-cell" data-cell="size">
            <Skeleton.Text type="body" width="70%" />
          </span>
          <span className="fa-file-dialog-cell" data-cell="date">
            <Skeleton.Text type="body" width="70%" />
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * A folder's entries as one tab stop (R11.5), virtualised, in one column or as a grid of tiles.
 * The rows carry `role="grid"` so a row's ⋯ button is legal inside it: listbox options cannot
 * hold controls. Rows keep the provider's order and later pages join the end, so nothing moves
 * under the pointer (R9). Selection is a set of URIs, with R11.8's ranges and toggles.
 */
export function Entries({ provider, entries, view, multiple, selected, blocked, actions, store, hasMore, total, more, onLoadMore, onSelectedChange, onActivate, onParent, onCommand, onHint, "aria-label": label, ref }: EntriesProps) {
  const messages = useMessages(fileDialogMessages)
  const actionWords = useMessages(actionsMessages)
  const locale = useLocale()
  const scroller = useRef<HTMLDivElement>(null)
  const rowProbe = useRef<HTMLDivElement>(null)
  const tileProbe = useRef<HTMLDivElement>(null)
  const edges = useScrollEdges(scroller)
  const width = useElementSize(scroller, { box: "client" }).width
  const rowHeight = useElementSize(rowProbe).height || 36
  const tileSize = useElementSize(tileProbe)
  const tileHeight = tileSize.height || 180
  const tileWidth = tileSize.width || 136
  const gap = useMemo(() => (width && tileProbe.current?.parentElement ? Number.parseFloat(getComputedStyle(tileProbe.current.parentElement).columnGap) || 0 : 0), [width])
  const grid = view === "grid"
  const columns = grid && width ? Math.max(1, Math.floor((width + gap) / (tileWidth + gap))) : 1
  const rowCount = Math.ceil(entries.length / columns)
  const count = rowCount + (hasMore ? 1 : 0)
  const size = grid ? tileHeight + gap : rowHeight

  // ── Focus: keyed by URI, so it survives pages, a refresh and a change of view ──
  const [focusUri, setFocusUri] = useState<string | null>(null)
  const indexByUri = useMemo(() => new Map(entries.map((entry, index) => [entry.uri, index])), [entries])
  const lastIndex = useRef(0)
  const knownIndex = focusUri !== null ? indexByUri.get(focusUri) : undefined
  const focusIndex = entries.length ? Math.min(knownIndex ?? lastIndex.current, entries.length - 1) : -1
  if (knownIndex !== undefined) lastIndex.current = knownIndex
  const focusRow = focusIndex < 0 ? -1 : Math.floor(focusIndex / columns)
  const rowRef = useRef(focusRow)
  rowRef.current = focusRow
  const shouldFocus = useRef(false)
  const within = useRef(false)

  // oxlint-disable-next-line react/incompatible-library -- the app does not use the React Compiler; TanStack Virtual is the sanctioned virtualiser
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scroller.current,
    estimateSize: () => size,
    overscan: 4,
    // The focused row stays mounted, so keyboard focus is never lost.
    rangeExtractor: (range: Range) => {
      const indexes = defaultRangeExtractor(range)
      if (rowRef.current >= 0 && !indexes.includes(rowRef.current)) indexes.push(rowRef.current)
      return indexes.toSorted((a, b) => a - b)
    },
  })
  useEffect(() => {
    virtualizer.measure()
  }, [virtualizer, size, columns])

  useLayoutEffect(() => {
    const lost = within.current && focusUri !== null && knownIndex === undefined && !scroller.current?.contains(document.activeElement)
    if ((!shouldFocus.current && !lost) || focusIndex < 0) return
    shouldFocus.current = false
    const target = entries[focusIndex]
    if (target && target.uri !== focusUri) setFocusUri(target.uri)
    scroller.current?.querySelector<HTMLElement>(`[data-index="${focusIndex}"]`)?.focus({ preventScroll: true })
  })

  const moveTo = useCallback(
    (index: number) => {
      const entry = entries[index]
      if (!entry) return
      shouldFocus.current = true
      setFocusUri(entry.uri)
      onHint(blocked(entry))
      virtualizer.scrollToIndex(Math.floor(index / columns), { align: "auto" })
    },
    [blocked, columns, entries, onHint, virtualizer]
  )
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        const first = entries.findIndex((entry) => selectedRef.current.has(entry.uri))
        moveTo(knownIndex ?? (first >= 0 ? first : 0))
      },
      focusAt: (index) => moveTo(Math.max(0, Math.min(entries.length - 1, index))),
    }),
    [entries, knownIndex, moveTo]
  )

  // ── The next page ──────────────────────────────────────────────────────
  const items = virtualizer.getVirtualItems()
  const lastShown = items.at(-1)?.index ?? -1
  useEffect(() => {
    if (hasMore && more === "idle" && lastShown >= count - 1 - END_ROWS) onLoadMore()
  }, [count, hasMore, lastShown, more, onLoadMore])

  // ── Selection ──────────────────────────────────────────────────────────
  const anchor = useRef<string | null>(null)
  const pickable = (entry: FileEntry) => entry.kind === "file" && blocked(entry) === null
  const selectOnly = (entry: FileEntry) => {
    anchor.current = entry.uri
    onSelectedChange([entry.uri])
  }
  const toggle = (entry: FileEntry) => {
    anchor.current = entry.uri
    onSelectedChange(selected.has(entry.uri) ? [...selected].filter((uri) => uri !== entry.uri) : [...[...selected].filter((uri) => !isFolder(uri)), entry.uri])
  }
  const isFolder = (uri: string) => entries[indexByUri.get(uri) ?? -1]?.kind === "directory"
  const selectRange = (to: number) => {
    const from = anchor.current === null ? to : (indexByUri.get(anchor.current) ?? to)
    onSelectedChange(
      entries
        .slice(Math.min(from, to), Math.max(from, to) + 1)
        .filter(pickable)
        .map((entry) => entry.uri)
    )
  }

  const pointer = useRef("mouse")
  // The last two rows pressed. A tap that replaces the list leaves a new row under the finger,
  // and the browser counts the next tap as a double-tap on it, which must not open anything.
  const pressed = useRef<[string | null, string | null]>([null, null])
  const press = (entry: FileEntry, index: number, event: MouseEvent<HTMLElement>) => {
    pressed.current = [pressed.current[1], entry.uri]
    setFocusUri(entry.uri)
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest(".fa-file-dialog-menu")) return
    const reason = blocked(entry)
    onHint(reason)
    if (reason) return
    const touch = pointer.current === "touch"
    if (entry.kind === "directory") return touch ? onActivate(entry) : selectOnly(entry)
    if (!multiple) return selectOnly(entry)
    if (event.shiftKey) return selectRange(index)
    if (event.ctrlKey || event.metaKey || touch || target?.closest(".fa-file-dialog-check")) return toggle(entry)
    selectOnly(entry)
  }

  // ── Keyboard ───────────────────────────────────────────────────────────
  const buffer = useRef({ text: "", timer: 0 as ReturnType<typeof setTimeout> | 0 })
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("button")) return
    const entry = entries[focusIndex]
    if (!entry) return
    const key = readingKey(event.key, event.currentTarget)
    const page = Math.max(1, Math.floor((scroller.current?.clientHeight ?? size) / size)) * columns
    const last = entries.length - 1
    const extending = multiple && event.shiftKey
    const go = (index: number) => {
      const to = Math.max(0, Math.min(last, index))
      moveTo(to)
      if (extending) selectRange(to)
    }
    if (multiple && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault()
      onSelectedChange(entries.filter(pickable).map((item) => item.uri))
      return
    }
    switch (key) {
      case "ArrowDown":
        go(focusIndex + columns)
        break
      case "ArrowUp":
        go(focusIndex - columns)
        break
      case "ArrowRight":
        if (columns === 1) return
        go(focusIndex + 1)
        break
      case "ArrowLeft":
        if (columns === 1) return
        go(focusIndex - 1)
        break
      case "PageDown":
        go(focusIndex + page)
        break
      case "PageUp":
        go(focusIndex - page)
        break
      case "Home":
        go(0)
        break
      case "End":
        go(last)
        break
      case "Enter":
        if (blocked(entry)) onHint(blocked(entry))
        else onActivate(entry)
        break
      case " ":
        if (blocked(entry)) onHint(blocked(entry))
        else if (multiple && entry.kind === "file") toggle(entry)
        else selectOnly(entry)
        break
      case "Backspace":
        onParent()
        break
      case "F2":
        if (event.shiftKey || !provider.rename) return
        onCommand("rename", entry)
        break
      case "Delete":
        if (!provider.delete) return
        onCommand("delete", entry)
        break
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
        clearTimeout(buffer.current.timer)
        buffer.current.text += event.key
        buffer.current.timer = setTimeout(() => (buffer.current.text = ""), TYPEAHEAD_RESET_MS)
        const wanted = foldText(buffer.current.text, locale)
        const start = buffer.current.text.length > 1 ? focusIndex : focusIndex + 1
        for (let step = 0; step < entries.length; step += 1) {
          const at = (start + step) % entries.length
          if (foldText(entries[at]!.name, locale).startsWith(wanted)) {
            moveTo(at)
            break
          }
        }
      }
    }
    event.preventDefault()
  }

  const dates = dateTimeFormat(locale, { dateStyle: "medium" })
  const sizeText = (entry: FileEntry) => (entry.kind === "file" && entry.size !== null ? formatBytes(entry.size, locale) : "")
  const dateText = (entry: FileEntry) => (entry.modified ? dates.format(entry.modified) : "")

  const mark = (entry: FileEntry, chosen: boolean) =>
    multiple ? (
      entry.kind === "file" ? (
        <span className="fa-file-dialog-check" aria-hidden data-checked={chosen ? "" : undefined}>
          {chosen ? <IconCheck /> : null}
        </span>
      ) : (
        <span className="fa-file-dialog-check" aria-hidden data-none="" />
      )
    ) : null
  const menu = (entry: FileEntry) =>
    actions ? (
      <span className="fa-file-dialog-menu">
        <ActionMenu set={actions} targets={[entry]} label={entry.name} trigger={<Button variant="ghost" size="sm" tabIndex={-1} icon={<IconMoreHorizontal />} aria-label={actionWords.actionsFor(entry.name)} />} />
      </span>
    ) : null
  const wrap = (entry: FileEntry, element: ReactElement, key: string) =>
    actions ? (
      <ActionContextMenu key={key} set={actions} targets={[entry]} label={entry.name}>
        {element}
      </ActionContextMenu>
    ) : (
      element
    )

  /** What a focusable row or tile carries. */
  const itemProps = (entry: FileEntry, index: number) => {
    const reason = blocked(entry)
    const chosen = selected.has(entry.uri)
    return {
      tabIndex: index === focusIndex ? 0 : -1,
      "data-index": index,
      "data-uri": entry.uri,
      "data-kind": entry.kind,
      "data-selected": chosen ? "" : undefined,
      "data-disabled": reason ? "" : undefined,
      "aria-selected": reason ? undefined : chosen,
      "aria-disabled": reason ? true : undefined,
      onFocus: () => {
        setFocusUri(entry.uri)
        onHint(reason)
      },
      onPointerEnter: reason ? () => onHint(reason) : undefined,
      onPointerLeave: reason ? () => onHint(null) : undefined,
      onClick: (event: MouseEvent<HTMLElement>) => press(entry, index, event),
      onDoubleClick: (event: MouseEvent<HTMLElement>) => {
        if (reason || (event.target instanceof Element && event.target.closest(".fa-file-dialog-menu"))) return
        if (pressed.current[0] !== entry.uri) return
        onActivate(entry)
      },
    }
  }

  const listRow = (entry: FileEntry, index: number, start: number) => {
    const reason = blocked(entry)
    const row = (
      // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled once on the grid (roving focus)
      <div key={entry.uri} {...itemProps(entry, index)} role="row" aria-rowindex={index + 1} className="fa-item fa-file-dialog-row" style={{ transform: `translateY(${start}px)` }}>
        <span role="gridcell" className="fa-file-dialog-cell" data-cell="name">
          {mark(entry, selected.has(entry.uri))}
          <EntryPicture entry={entry} provider={provider} store={store} />
          <TruncatedText className="fa-file-dialog-name">{entry.name}</TruncatedText>
          {reason ? <VisuallyHidden>{reason}</VisuallyHidden> : null}
        </span>
        <span role="gridcell" className="fa-file-dialog-cell" data-cell="size" data-numeric>
          {sizeText(entry)}
        </span>
        <span role="gridcell" className="fa-file-dialog-cell" data-cell="date" data-numeric>
          {dateText(entry)}
        </span>
        {actions ? (
          <span role="gridcell" className="fa-file-dialog-cell" data-cell="menu">
            {menu(entry)}
          </span>
        ) : null}
      </div>
    )
    return wrap(entry, row, entry.uri)
  }

  const tile = (entry: FileEntry, index: number) => {
    const reason = blocked(entry)
    const cell = (
      // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled once on the grid (roving focus)
      <div key={entry.uri} {...itemProps(entry, index)} role="gridcell" className="fa-item fa-file-dialog-tile">
        <EntryPicture entry={entry} provider={provider} store={store} />
        {mark(entry, selected.has(entry.uri))}
        <TruncatedText className="fa-file-dialog-name">{entry.name}</TruncatedText>
        <span className="fa-file-dialog-detail" data-numeric>
          {sizeText(entry) || dateText(entry)}
        </span>
        {menu(entry)}
        {reason ? <VisuallyHidden>{reason}</VisuallyHidden> : null}
      </div>
    )
    return wrap(entry, cell, entry.uri)
  }

  const moreRow = (start: number, rowIndex: number) => (
    <div key="more" role="row" aria-rowindex={rowIndex + 1} className="fa-file-dialog-more" style={{ transform: `translateY(${start}px)`, height: rowHeight }}>
      <span role="gridcell" className="fa-file-dialog-more-cell">
        {more === "error" ? (
          <>
            <span>{messages.loadMoreFailed}</span>
            <Button variant="ghost" size="sm" onClick={onLoadMore}>
              {messages.retry}
            </Button>
          </>
        ) : (
          <>
            <ProgressRing value={null} size="sm" aria-label={messages.loadingMore} />
            <span>{messages.loadingMore}</span>
          </>
        )}
      </span>
    </div>
  )

  const rowsKnown = total === undefined ? (hasMore ? -1 : rowCount) : Math.ceil(total / columns)
  return (
    <div className="fa-file-dialog-entries-frame" data-scrolled-top={edges.top ? "" : undefined} data-scrolled-bottom={edges.bottom ? "" : undefined}>
      <div
        ref={scroller}
        className="fa-file-dialog-entries"
        role="grid"
        aria-label={label}
        aria-rowcount={rowsKnown}
        aria-colcount={grid ? columns : actions ? 4 : 3}
        aria-multiselectable={multiple || undefined}
        tabIndex={-1}
        data-view={view}
        data-scroll-container
        onKeyDown={onKeyDown}
        onPointerDownCapture={(event) => (pointer.current = event.pointerType)}
        onFocusCapture={() => (within.current = true)}
        onBlurCapture={(event) => {
          // A row removed while focused blurs with no target: the grid keeps focus to hand on.
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) within.current = false
        }}
      >
        <div role="presentation" className="fa-file-dialog-canvas" style={{ height: virtualizer.getTotalSize() }}>
          {items.map((item) => {
            if (item.index >= rowCount) return moreRow(item.start, item.index)
            if (!grid) return listRow(entries[item.index]!, item.index, item.start)
            const first = item.index * columns
            return (
              <div key={`row-${item.index}`} role="row" aria-rowindex={item.index + 1} className="fa-file-dialog-tiles" style={{ transform: `translateY(${item.start}px)`, "--_columns": columns } as CSSProperties}>
                {entries.slice(first, first + columns).map((entry, offset) => tile(entry, first + offset))}
              </div>
            )
          })}
        </div>
      </div>
      {/* Probes: one row and one tile, so virtual sizes follow tokens and density. */}
      <div className="fa-file-dialog-probes" aria-hidden>
        <div ref={rowProbe} className="fa-item fa-file-dialog-row" data-flow="" />
        <div className="fa-file-dialog-tiles" data-flow="">
          <div ref={tileProbe} className="fa-file-dialog-tile">
            <span className="fa-file-dialog-picture" />
            <span className="fa-file-dialog-name">&nbsp;</span>
            <span className="fa-file-dialog-detail">&nbsp;</span>
          </div>
        </div>
      </div>
    </div>
  )
}
