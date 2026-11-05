/**
 * Rail — L1 navigation (R6.1) as an icon-only column directly on the canvas. Every item
 * has an accessible name and a tooltip with its label and shortcut. The active section is
 * an accent-soft tile; clicking it again collapses or expands the section drawer (the
 * VS Code activity-bar model). On phones the rail is replaced by the TabBar.
 *
 * Items that do not fit its height move into a More menu (R6.6), or with `overflow="scroll"`
 * the column scrolls. In More they stay in the document, hidden, so a menu row or a shortcut
 * clicks the item itself: its router link, its handler and the drawer toggle all run as they
 * do from the rail. The current section stays visible.
 *
 * Shortcuts are two-key sequences ("g e": press G, then E) so they never collide with the
 * browser's own Ctrl/Alt bindings or with text entry. They are single-character shortcuts
 * (WCAG 2.1.4): `configureShortcuts({ characterKeys: false })` switches them off, and their
 * hints leave the tooltips.
 */
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react"
import { IconMoreHorizontal } from "../icons/generated/icons.js"
import { cx } from "../lib/cx.js"
import { useMessages } from "../lib/i18n/index.js"
import { observeElementSizes } from "../lib/resize-observer.js"
import { NotificationDot } from "../ui/badge/index.js"
import { BrandMark } from "../ui/brand/index.js"
import { Kbd, characterShortcutsEnabled, useCharacterShortcuts } from "../ui/kbd/index.js"
import { Menu } from "../ui/menu/index.js"
import { Tooltip } from "../ui/tooltip/index.js"
import { ShellFocusContext, useOptionalShell } from "./app-shell.js"
import { shellMessages } from "./messages.js"
import { railOverflow, type RailFitEntry } from "./rail-fit.js"

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/** A sequence's target: the element to click (a rail item), or a command. */
type ShortcutRegistry = Map<string, () => Pick<HTMLElement, "click"> | null>
const RailShortcuts = /* @__PURE__ */ createContext<ShortcutRegistry | null>(null)

/** What a hidden item's row in the More menu draws, and the item the row clicks. */
interface RailEntry {
  label: string
  icon: ReactNode
  badge: ReactNode
  shortcut: string | undefined
  disabledReason: string | undefined
  element: { current: HTMLElement | null }
}

interface RailOverflowActions {
  /** Keep an item's latest row. */
  update: (id: string, entry: RailEntry) => void
  remove: (id: string) => void
  /** Items came, went or changed section: fit the rail again. */
  changed: () => void
  /** A hidden item was used: bring it into the rail, in place of the last one shown. */
  promote: (id: string) => void
}

interface RailOverflowValue {
  actions: RailOverflowActions
  /** The items in More, in document order. */
  hidden: readonly string[]
  /** The first Spacer: More sits just before it, at the end of the main items. */
  host: Element | null
  rows: ReadonlyMap<string, RailEntry>
  /** Changes when a hidden item's row does, so the menu draws it again. */
  version: number
}

const RailOverflow = /* @__PURE__ */ createContext<RailOverflowValue | null>(null)

const SEQUENCE_TIMEOUT = 1200

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName) || Boolean(target.closest("[data-keyboard-capture]"))
}

/** Listen for "g x" sequences and click the matching rail item. */
function useSequenceShortcuts(registry: ShortcutRegistry) {
  useEffect(() => {
    let pending: string | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented || isEditable(event.target)) return
      if (!characterShortcutsEnabled()) {
        pending = null
        return
      }
      const key = event.key.toLowerCase()
      if (pending) {
        const sequence = `${pending} ${key}`
        pending = null
        clearTimeout(timer)
        const target = registry.get(sequence)?.()
        if (target) {
          event.preventDefault()
          target.click()
        }
        return
      }
      if ([...registry.keys()].some((sequence) => sequence.startsWith(`${key} `))) {
        pending = key
        timer = setTimeout(() => {
          pending = null
        }, SEQUENCE_TIMEOUT)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      clearTimeout(timer)
    }
  }, [registry])
}

export interface RailProps extends ComponentProps<"nav"> {
  /** Accessible name of the navigation landmark. */
  "aria-label": string
  /**
   * What happens to items that do not fit the rail's height. `more`: they move into a More menu,
   * and the current section stays visible. `scroll`: every item stays in the column, which
   * scrolls with no visible scrollbar.
   * @defaultValue "more"
   */
  overflow?: "more" | "scroll"
}

function Root({ overflow: mode = "more", className, children, ...rest }: RailProps) {
  const [registry] = useState<ShortcutRegistry>(() => new Map())
  useSequenceShortcuts(registry)
  const overflow = useRailOverflow(mode)
  return (
    <RailShortcuts.Provider value={registry}>
      <RailOverflow.Provider value={overflow.value}>
        <nav {...rest} className={cx("fa-shell-rail", className)}>
          <ul ref={overflow.listRef} className="fa-shell-rail-list">
            {children}
            {overflow.value.host ? null : <More />}
          </ul>
        </nav>
      </RailOverflow.Provider>
    </RailShortcuts.Provider>
  )
}

const px = (value: string) => Number.parseFloat(value) || 0

/** Fit the rail's items to its height, before paint and whenever a size changes. */
function useRailOverflow(mode: "more" | "scroll") {
  const listRef = useRef<HTMLUListElement>(null)
  const chosen = useRef<string | null>(null)
  const [rows] = useState(() => new Map<string, RailEntry>())
  const [hidden, setHidden] = useState<readonly string[]>([])
  const [host, setHost] = useState<Element | null>(null)
  const [version, setVersion] = useState(0)
  const [revision, setRevision] = useState(0)
  const hiddenNow = useRef(hidden)

  const measure = useCallback(() => {
    const list = listRef.current
    if (mode === "scroll") {
      setHost(null)
      hiddenNow.current = []
      setHidden((current) => (current.length ? [] : current))
      return
    }
    // No height: the rail is not laid out (the TabBar replaces it on phones). Keep what it had.
    if (!list?.clientHeight) return
    const style = getComputedStyle(list)
    const fixed: number[] = []
    const entries: RailFitEntry[] = []
    let spacer: Element | null = null
    for (const child of list.children) {
      if (child.hasAttribute("data-rail-more")) continue
      if (child.classList.contains("fa-shell-rail-spacer")) {
        spacer ??= child
        fixed.push(0)
        continue
      }
      const size = child.getBoundingClientRect().height
      const id = child.getAttribute("data-rail-id")
      if (!id) {
        fixed.push(size)
        continue
      }
      const pinned = id === chosen.current || Boolean(child.querySelector("[data-active]")) || child.contains(document.activeElement)
      entries.push({ id, size, foot: spacer !== null, pinned })
    }
    const next = railOverflow({ room: list.clientHeight - px(style.paddingBlockStart) - px(style.paddingBlockEnd), gap: px(style.rowGap), fixed, entries })
    setHost(spacer)
    if (next.join() === hiddenNow.current.join()) return
    hiddenNow.current = next
    setHidden(next)
  }, [mode])

  // Hidden items keep their height, so these measure the same whatever is in More.
  useIsoLayoutEffect(measure)
  useEffect(() => {
    const list = listRef.current
    if (!list || mode === "scroll") return
    const sizes = observeElementSizes(measure)
    sizes.observe(list)
    for (const child of list.children) if (child.hasAttribute("data-rail-id")) sizes.observe(child)
    return () => sizes.disconnect()
  }, [measure, mode, revision])

  const latestMeasure = useRef(measure)
  latestMeasure.current = measure
  const [actions] = useState<RailOverflowActions>(() => ({
    update: (id, entry) => {
      const before = rows.get(id)
      rows.set(id, entry)
      const same =
        before && before.label === entry.label && before.icon === entry.icon && before.badge === entry.badge && before.shortcut === entry.shortcut && before.disabledReason === entry.disabledReason
      if (!same && hiddenNow.current.includes(id)) setVersion((current) => current + 1)
    },
    remove: (id) => {
      rows.delete(id)
    },
    changed: () => setRevision((current) => current + 1),
    promote: (id) => {
      chosen.current = id
      latestMeasure.current()
    },
  }))
  const value = useMemo<RailOverflowValue>(() => ({ actions, hidden, host, rows, version }), [actions, hidden, host, rows, version])
  return { listRef, value }
}

/** The menu of what does not fit. Rows click the hidden item, so it behaves as it does from the rail. */
function More() {
  const overflow = useContext(RailOverflow)
  const messages = useMessages(shellMessages)
  const sequences = useCharacterShortcuts()
  if (!overflow?.hidden.length) return null
  const rows = overflow.hidden.flatMap((id) => {
    const row = overflow.rows.get(id)
    return row ? [{ id, ...row }] : []
  })
  return (
    <li className="fa-shell-rail-entry" data-rail-more="">
      <Menu.Root>
        <Tooltip side="inline-end" content={messages.more}>
          <Menu.Trigger className="fa-shell-rail-item fa-pressable" aria-label={messages.more}>
            <IconMoreHorizontal />
            {rows.some((row) => row.badge) ? <NotificationDot label="" aria-hidden /> : null}
          </Menu.Trigger>
        </Tooltip>
        <Menu.Popup side="inline-end">
          {rows.map((row) => {
            const keys = row.shortcut && sequences && !row.disabledReason ? <ShortcutKeys shortcut={row.shortcut} /> : null
            return (
              <Menu.Item
                key={row.id}
                icon={row.icon}
                disabledReason={row.disabledReason}
                trail={
                  row.badge || keys ? (
                    <span className="fa-shell-rail-menu-trail">
                      {row.badge}
                      {keys}
                    </span>
                  ) : undefined
                }
                onClick={(event) => {
                  const { altKey, ctrlKey, metaKey, shiftKey } = event
                  row.element.current?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, altKey, ctrlKey, metaKey, shiftKey }))
                }}
              >
                {row.label}
              </Menu.Item>
            )
          })}
        </Menu.Popup>
      </Menu.Root>
    </li>
  )
}

/** The keys of a shortcut, as keycaps: "g e" → G E; "mod+k" → Ctrl K. */
export function ShortcutKeys({ shortcut }: {
  /** The shortcut: space-separated steps of a sequence ("g e"), each a `+`-joined chord ("mod+k"). */
  shortcut: string
}) {
  return (
    <span className="fa-shell-keys">
      {shortcut.split(" ").map((part, index) => (
        <Kbd key={`${part}-${index}`} keys={part} size="sm" />
      ))}
    </span>
  )
}

export interface RailItemProps extends Omit<ComponentProps<"button">, "children"> {
  icon: ReactNode
  /** The destination's name: the accessible name and the tooltip. */
  label: string
  /** "g e" (press G, then E). Shown in the tooltip and handled by the rail. */
  shortcut?: string
  /** This is the current section. */
  active?: boolean
  /** Render as a router link: render={<Link to="/endpoints" />}. */
  render?: ReactElement
  /** A NotificationDot or count on the icon's corner. */
  badge?: ReactNode
  /**
   * Why the item does nothing here ("Choose an organisation to see its settings"). It stays
   * focusable (aria-disabled) and the tooltip and description give the reason (R12.3, R20.5).
   */
  disabledReason?: string
}

function Item({ icon, label, shortcut, active = false, render, badge, disabledReason, className, onClick, ...rest }: RailItemProps) {
  const shell = useOptionalShell()
  const registry = useContext(RailShortcuts)
  const focusTargets = useContext(ShellFocusContext)
  const ref = useRef<HTMLElement>(null)
  const sequences = useCharacterShortcuts()
  const id = useId()
  const overflow = useContext(RailOverflow)
  const actions = overflow?.actions
  const inMore = overflow?.hidden.includes(id) ?? false

  useIsoLayoutEffect(() => {
    actions?.update(id, { label, icon, badge, shortcut, disabledReason, element: ref })
  })
  useIsoLayoutEffect(() => {
    return () => actions?.remove(id)
  }, [actions, id])
  // Coming, going or becoming the current section changes what fits.
  useIsoLayoutEffect(() => {
    actions?.changed()
    return () => actions?.changed()
  }, [actions, active])

  // The current section's item reopens its drawer, so collapsing the drawer from inside
  // returns focus here (AppShell).
  useEffect(() => {
    const element = ref.current
    if (!active || !focusTargets || !element) return
    return focusTargets.registerDrawerReturn(element)
  }, [active, focusTargets])

  useEffect(() => {
    if (!shortcut || !registry || !sequences) return
    const key = shortcut.toLowerCase()
    registry.set(key, () => ref.current)
    return () => {
      if (registry.get(key)) registry.delete(key)
    }
  }, [registry, shortcut, sequences])

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabledReason) {
      event.preventDefault()
      return
    }
    // Used from More or by its shortcut: it joins the rail, so anything it opens has an anchor.
    if (inMore) actions?.promote(id)
    onClick?.(event)
    if (event.defaultPrevented || !shell?.hasDrawer) return
    if (active) {
      // The current section: toggle its drawer instead of navigating again.
      event.preventDefault()
      shell.toggleDrawer()
    } else if (shell.desktop && !shell.drawerOpen) {
      shell.setDrawerOpen(true)
    }
  }

  const element = useRender({
    defaultTagName: "button",
    render,
    ref,
    props: mergeProps<"button">(
      {
        className: cx("fa-shell-rail-item fa-pressable", className),
        "aria-label": label,
        "aria-current": active ? "page" : undefined,
        "aria-disabled": disabledReason ? true : undefined,
        "aria-description": disabledReason,
        type: render ? undefined : "button",
        onClick: handleClick,
        children: (
          <>
            {icon}
            {badge}
          </>
        ),
      },
      { ...rest, "data-active": active ? "" : undefined, "data-disabled": disabledReason ? "" : undefined } as ComponentProps<"button">
    ),
  })

  return (
    <li className="fa-shell-rail-entry" data-rail-id={id} data-overflowed={inMore ? "" : undefined}>
      <Tooltip
        side="inline-end"
        content={
          <span className="fa-shell-tip">
            <span>{disabledReason ?? label}</span>
            {shortcut && sequences && !disabledReason ? <ShortcutKeys shortcut={shortcut} /> : null}
          </span>
        }
      >
        {element}
      </Tooltip>
    </li>
  )
}

/** Pushes the following items to the foot of the rail (settings, help). */
function Spacer() {
  const overflow = useContext(RailOverflow)
  const [element, setElement] = useState<HTMLLIElement | null>(null)
  return (
    <>
      {element && overflow?.host === element ? <More /> : null}
      <li ref={setElement} className="fa-shell-rail-spacer" aria-hidden />
    </>
  )
}

/**
 * A rail-wide sequence shortcut with no item of its own ("g m" switches the product's
 * module). It shares the rail's sequence handling, so it never collides with an item's.
 */
function Shortcut({ keys, onTrigger }: {
  /** The two-key sequence, space-separated and case-insensitive ("g m": press G, then M). */
  keys: string
  /** Called when the person types the sequence outside a text field, without Ctrl, Alt or Meta held. */
  onTrigger: () => void
}) {
  const registry = useContext(RailShortcuts)
  const latest = useRef(onTrigger)
  useEffect(() => {
    latest.current = onTrigger
  })
  useEffect(() => {
    if (!registry) return
    const key = keys.toLowerCase()
    registry.set(key, () => ({ click: () => latest.current() }))
    return () => {
      registry.delete(key)
    }
  }, [registry, keys])
  return null
}

/** Compose the primary application navigation rail from accessible items, separators and flexible spacers. Items that do not fit its height move into a More menu, and the current section stays visible. */
export const Rail = { Root, Item, Spacer, Shortcut }

export interface ShellBrandProps extends Omit<ComponentProps<"a">, "children"> {
  /** Accessible name and tooltip: "Glass UX home, all organisations". */
  label: string
  /** The mark. Default: the product's configured mark (<BrandMark mark="product" />). */
  mark?: ReactNode
  /** Render as a router link. */
  render?: ReactElement
}

/**
 * The product mark in the top-left corner, centred over the rail: the home link. In Glass UX it
 * goes to the All organisations dashboard, so it also resets the scope (R5.2).
 */
export function ShellBrand({ label, mark, render, className, ...rest }: ShellBrandProps) {
  const element = useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">(
      { className: cx("fa-shell-mark fa-pressable", className), "aria-label": label, children: mark ?? <BrandMark mark="product" /> },
      rest
    ),
  })
  return (
    <Tooltip side="inline-end" content={label}>
      {element}
    </Tooltip>
  )
}
