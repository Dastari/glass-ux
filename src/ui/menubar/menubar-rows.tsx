import { createContext, use, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { IconError, IconRefresh } from "../../icons/generated/icons.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"
import { isCharacterShortcut, useCharacterShortcuts } from "../kbd/index.js"
import { useCommandBinding } from "../keymap/context.js"
import { Menu } from "../menu/index.js"
import { MenuLeading } from "../menu/menu.js"
import { Skeleton } from "../skeleton/index.js"
import type { menubarMessages } from "./messages.js"
import type {
  MenubarCheckEntry,
  MenubarCommandEntry,
  MenubarEntry,
  MenubarEntryOrSkip,
  MenubarMenu,
  MenubarRadioEntry,
  MenubarSubmenuEntry,
} from "./types.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect
const DEFAULT_LOADING_ROWS = 4
/** Stand-in label widths, varied so reserved rows read as a list. */
const SKELETON_WIDTHS = ["62%", "78%", "54%", "70%"]

/** Commands run after the menu closes, so focus is home before a dialog or window opens. */
const afterClose = (task: () => void) => setTimeout(task, 0)

export interface MenubarRowsContextValue {
  /** Runs a chosen command row. */
  run: (entry: MenubarCommandEntry) => void
  /** The rows the last load of each loaded menu returned, so the next open reserves as many. */
  rowCounts: Map<string, number>
  /** Says something through the bar's polite region. Empty clears it. */
  announce: (text: string) => void
  messages: typeof menubarMessages.defaults
}

export const MenubarRowsContext = /* @__PURE__ */ createContext<MenubarRowsContextValue | null>(null)

function useRowsContext(): MenubarRowsContextValue {
  const context = use(MenubarRowsContext)
  if (!context) throw new Error("Menubar rows must be inside a Menubar.")
  return context
}

/** The keys a row shows. A lookup only: it registers nothing and adds no listener. */
function useShownKeys(entry: { commandId?: string; shortcut?: string; shortcutScoped?: boolean }): string | undefined {
  const characterKeys = useCharacterShortcuts()
  const binding = useCommandBinding(entry.commandId, entry.shortcut)
  const { primary } = binding
  if (!primary) return undefined
  // Keys that only work elsewhere always show; a page-wide single key follows configureShortcuts.
  return binding.scoped || entry.shortcutScoped || characterKeys || !isCharacterShortcut(primary) ? primary : undefined
}

/** The label, and a disabled row's reason for a screen with no hover to show its tooltip (R21.4). */
function RowLabel({ label, reason }: { label: string; reason: string | null | undefined }) {
  return (
    <>
      {label}
      {reason ? (
        <span className="fa-menubar-reason" aria-hidden>
          {reason}
        </span>
      ) : null}
    </>
  )
}

function CommandRow({ entry }: { entry: MenubarCommandEntry }) {
  const { run } = useRowsContext()
  const shortcut = useShownKeys(entry)
  return (
    <Menu.Item
      icon={entry.icon && !entry.detail ? <MenuLeading>{entry.icon}</MenuLeading> : entry.icon}
      detail={entry.detail}
      trail={entry.trail}
      shortcut={shortcut}
      tone={entry.tone}
      disabled={entry.disabled}
      disabledReason={entry.disabledReason}
      label={entry.label}
      onClick={() => afterClose(() => run(entry))}
    >
      <RowLabel label={entry.label} reason={entry.disabledReason} />
    </Menu.Item>
  )
}

function CheckRow({ entry }: { entry: MenubarCheckEntry }) {
  const shortcut = useShownKeys(entry)
  return (
    <Menu.CheckboxItem
      checked={entry.checked}
      onCheckedChange={(checked) => entry.onCheckedChange(checked)}
      shortcut={shortcut}
      disabled={entry.disabled}
      disabledReason={entry.disabledReason}
      label={entry.label}
    >
      <RowLabel label={entry.label} reason={entry.disabledReason} />
    </Menu.CheckboxItem>
  )
}

function RadioOption({ option }: { option: MenubarRadioEntry["options"][number] }) {
  const shortcut = useShownKeys(option)
  return (
    <Menu.RadioItem value={option.value} shortcut={shortcut} disabled={option.disabled} disabledReason={option.disabledReason} label={option.label}>
      <RowLabel label={option.label} reason={option.disabledReason} />
    </Menu.RadioItem>
  )
}

function RadioRows({ entry }: { entry: MenubarRadioEntry }) {
  return (
    <Menu.RadioGroup aria-label={entry.hideLabel ? entry.label : undefined} value={entry.value} onValueChange={entry.onValueChange} className="fa-menu-group">
      {entry.hideLabel ? null : <Menu.GroupLabel>{entry.label}</Menu.GroupLabel>}
      {entry.options.map((option) => (
        <RadioOption key={option.value} option={option} />
      ))}
    </Menu.RadioGroup>
  )
}

/** A submenu row. Its popup, and so its loader, mounts only while it is open. */
export function SubmenuRow({ entry, path }: { entry: MenubarSubmenuEntry; path: string }) {
  return (
    <Menu.Submenu
      icon={entry.icon ? <MenuLeading>{entry.icon}</MenuLeading> : undefined}
      label={<RowLabel label={entry.label} reason={entry.disabledReason} />}
      tone={entry.tone}
      disabled={entry.disabled}
      disabledReason={entry.disabledReason}
      popupClassName="fa-menubar-popup"
    >
      <MenubarBody source={entry} path={`${path}/${entry.id}`} />
    </Menu.Submenu>
  )
}

/** Drops skipped rows, and a separator with nothing on one side of it. */
function present(entries: readonly MenubarEntryOrSkip[]): MenubarEntry[] {
  const rows = entries.filter((entry): entry is MenubarEntry => Boolean(entry))
  return rows.filter((entry, index) => {
    if (entry.kind !== "separator") return true
    return index > 0 && index < rows.length - 1 && rows[index - 1]!.kind !== "separator"
  })
}

function Rows({ entries, path }: { entries: readonly MenubarEntry[]; path: string }) {
  return entries.map((entry) => {
    switch (entry.kind) {
      case "separator":
        return <Menu.Separator key={entry.id} />
      case "group":
        return (
          <Menu.Group key={entry.id}>
            {entry.label ? <Menu.GroupLabel>{entry.label}</Menu.GroupLabel> : null}
            <Rows entries={present(entry.items)} path={`${path}/${entry.id}`} />
          </Menu.Group>
        )
      case "submenu":
        return <SubmenuRow key={entry.id} entry={entry} path={path} />
      case "check":
        return <CheckRow key={entry.id} entry={entry} />
      case "radio":
        return <RadioRows key={entry.id} entry={entry} />
      default:
        return <CommandRow key={entry.id} entry={entry} />
    }
  })
}

/**
 * A row that only states something (nothing here, still loading). It is not `disabled`: list
 * navigation passes over disabled rows when a menu opens, so a keyboard, and a screen reader,
 * would be left on the parent row hearing nothing. A press does nothing and closes nothing.
 */
function StatementRow({ label, children, ...rest }: { label: string; children?: ReactNode; "aria-label"?: string; "aria-busy"?: boolean; "data-loading"?: string; "data-empty"?: string }) {
  return (
    <Menu.Item closeOnClick={false} label={label} {...rest}>
      {children ?? label}
    </Menu.Item>
  )
}

function EmptyRow({ label }: { label?: string | undefined }) {
  const { messages } = useRowsContext()
  return <StatementRow label={label ?? messages.empty} data-empty="" />
}

/**
 * Marks for the scroll edges (R5.8): a popup taller than the space scrolls, and a hairline sits
 * at each edge with rows beyond it. The popup is the scroller, so the hairlines stick to it from
 * inside and move nothing. Mount a new one when the rows change: the hook observes the rows it
 * finds.
 */
function ScrollEdges({ children }: { children: ReactNode }) {
  const start = useRef<HTMLSpanElement>(null)
  const scroller = useRef<HTMLElement | null>(null)
  useIsomorphicLayoutEffect(() => {
    scroller.current = start.current?.closest<HTMLElement>(".fa-popup") ?? null
  }, [])
  const edges = useScrollEdges(scroller)
  return (
    <>
      <span ref={start} className="fa-menubar-edge" data-edge="start" data-shown={edges.top ? "" : undefined} aria-hidden />
      {children}
      <span className="fa-menubar-edge" data-edge="end" data-shown={edges.bottom ? "" : undefined} aria-hidden />
    </>
  )
}

type LoadState = { status: "loading" } | { status: "ready"; entries: MenubarEntry[] } | { status: "failed"; message: string }

const isPromise = <T,>(value: T | Promise<T>): value is Promise<T> => typeof (value as Promise<T> | null)?.then === "function"

/** First row a keyboard can land on in a list that replaced the one it was on. */
const firstRow = (rows: HTMLElement) => rows.querySelector<HTMLElement>('[role^="menuitem"]:not([data-disabled])') ?? rows.querySelector<HTMLElement>('[role^="menuitem"]')

function LoadingRows({ count }: { count: number }) {
  const { messages } = useRowsContext()
  return (
    <>
      {/* The one real row: a keyboard has somewhere to land, and it names what is happening. */}
      <StatementRow label={messages.loading} aria-label={messages.loading} aria-busy data-loading="">
        <Skeleton.Text width={SKELETON_WIDTHS[0]} />
      </StatementRow>
      {Array.from({ length: Math.max(0, count - 1) }, (_, index) => (
        <div key={index} className="fa-item fa-menu-item" data-loading="" aria-hidden>
          <span className="fa-item-label">
            <Skeleton.Text width={SKELETON_WIDTHS[(index + 1) % SKELETON_WIDTHS.length]} />
          </span>
        </div>
      ))}
    </>
  )
}

function LoadedRows({ source, path }: { source: MenubarBodySource; path: string }) {
  const { announce, messages, rowCounts } = useRowsContext()
  const { collisionPadding } = usePopupMetrics()
  const [state, setState] = useState<LoadState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  const rows = useRef<HTMLDivElement>(null)
  const refocus = useRef(false)
  // The newest loader, so a host re-render with a new function does not load again.
  const latest = useRef(source)
  latest.current = source

  /**
   * Holds the popup where it is as rows replace the placeholders (R9): it keeps the height it
   * had, and grows only as far as the screen lets it without shifting. A longer list scrolls.
   */
  const hold = () => {
    const box = rows.current
    const popup = box?.closest<HTMLElement>(".fa-popup")
    if (!box || !popup) return
    refocus.current = box.contains(document.activeElement)
    // Computed, not offsetHeight: a rounded height would itself resize the popup.
    const { height } = getComputedStyle(popup)
    const room = document.documentElement.clientHeight - collisionPadding - popup.getBoundingClientRect().top
    popup.style.minHeight = height
    popup.style.maxHeight = `${Math.max(Number.parseFloat(height), room)}px`
  }

  useIsomorphicLayoutEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const settle = (next: LoadState) => {
      if (signal.aborted) return
      hold()
      setState(next)
    }
    const ready = (entries: readonly MenubarEntryOrSkip[]): LoadState => {
      const shown = present(entries)
      rowCounts.set(path, Math.max(1, shown.length))
      return { status: "ready", entries: shown }
    }
    const fail = (error: unknown) => {
      const { loadError } = latest.current
      const message = (typeof loadError === "function" ? loadError(error) : loadError) ?? messages.loadFailed
      announce(message)
      settle({ status: "failed", message })
    }
    try {
      const result = latest.current.loadItems!({ signal })
      // Rows given at once are there before the popup paints, with nothing to hold in place.
      if (isPromise(result)) result.then((entries) => settle(ready(entries)), fail)
      else setState(ready(result))
    } catch (error) {
      fail(error)
    }
    return () => controller.abort()
    // Runs each time the popup opens and on each retry; `path` is fixed for a mounted popup.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  // The row that held focus is gone: the keyboard continues on the row that replaced it.
  useIsomorphicLayoutEffect(() => {
    if (!refocus.current || !rows.current) return
    refocus.current = false
    firstRow(rows.current)?.focus()
  }, [state])

  const retry = () => {
    announce("")
    hold()
    setState({ status: "loading" })
    setAttempt((value) => value + 1)
  }

  return (
    <div ref={rows} className="fa-menubar-rows" role="presentation">
      <ScrollEdges key={state.status}>
        {state.status === "loading" ? <LoadingRows count={rowCounts.get(path) ?? source.loadingRows ?? DEFAULT_LOADING_ROWS} /> : null}
        {state.status === "ready" ? state.entries.length ? <Rows entries={state.entries} path={path} /> : <EmptyRow label={source.emptyLabel} /> : null}
        {state.status === "failed" ? <FailedRows message={state.message} onRetry={retry} /> : null}
      </ScrollEdges>
    </div>
  )
}

function FailedRows({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { messages } = useRowsContext()
  return (
    <>
      <div className="fa-menubar-failure" role="presentation">
        <IconError />
        <span>{message}</span>
      </div>
      <Menu.Item icon={<IconRefresh />} closeOnClick={false} label={messages.retry} onClick={onRetry}>
        {messages.retry}
      </Menu.Item>
    </>
  )
}

type MenubarBodySource = Pick<MenubarMenu, "items" | "loadItems" | "loadingRows" | "loadError" | "emptyLabel">

/** The rows of a menu or submenu: as given, or fetched when it opens. */
export function MenubarBody({ source, path }: { source: MenubarBodySource; path: string }) {
  if (source.loadItems) return <LoadedRows source={source} path={path} />
  const entries = present(source.items ?? [])
  return <ScrollEdges>{entries.length ? <Rows entries={entries} path={path} /> : <EmptyRow label={source.emptyLabel} />}</ScrollEdges>
}

