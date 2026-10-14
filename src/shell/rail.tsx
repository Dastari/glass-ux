/**
 * Rail — L1 navigation (R6.1) as an icon-only column directly on the canvas. Every item
 * has an accessible name and a tooltip with its label and shortcut. The active section is
 * an accent-soft tile; clicking it again collapses or expands the section drawer (the
 * VS Code activity-bar model). On phones the rail is replaced by the TabBar.
 *
 * Shortcuts are two-key sequences ("g e": press G, then E) so they never collide with the
 * browser's own Ctrl/Alt bindings or with text entry.
 */
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react"
import { cx } from "../lib/cx.js"
import { BrandMark } from "../ui/brand/index.js"
import { Kbd } from "../ui/kbd/index.js"
import { Tooltip } from "../ui/tooltip/index.js"
import { useOptionalShell } from "./app-shell.js"

/** A sequence's target: the element to click (a rail item), or a command. */
type ShortcutRegistry = Map<string, () => Pick<HTMLElement, "click"> | null>
const RailShortcuts = createContext<ShortcutRegistry | null>(null)

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
}

function Root({ className, children, ...rest }: RailProps) {
  const [registry] = useState<ShortcutRegistry>(() => new Map())
  useSequenceShortcuts(registry)
  return (
    <RailShortcuts.Provider value={registry}>
      <nav {...rest} className={cx("fa-shell-rail", className)}>
        <ul className="fa-shell-rail-list">{children}</ul>
      </nav>
    </RailShortcuts.Provider>
  )
}

/** The keys of a shortcut, as keycaps: "g e" → G E; "mod+k" → Ctrl K. */
export function ShortcutKeys({ shortcut }: { shortcut: string }) {
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
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!shortcut || !registry) return
    const key = shortcut.toLowerCase()
    registry.set(key, () => ref.current)
    return () => {
      if (registry.get(key)) registry.delete(key)
    }
  }, [registry, shortcut])

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabledReason) {
      event.preventDefault()
      return
    }
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
    <li className="fa-shell-rail-entry">
      <Tooltip
        side="right"
        content={
          <span className="fa-shell-tip">
            <span>{disabledReason ?? label}</span>
            {shortcut && !disabledReason ? <ShortcutKeys shortcut={shortcut} /> : null}
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
  return <li className="fa-shell-rail-spacer" aria-hidden />
}

/**
 * A rail-wide sequence shortcut with no item of its own ("g m" switches the product's
 * module). It shares the rail's sequence handling, so it never collides with an item's.
 */
function Shortcut({ keys, onTrigger }: { keys: string; onTrigger: () => void }) {
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

/** Compose the primary application navigation rail from accessible items, separators and flexible spacers. */
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
    <Tooltip side="right" content={label}>
      {element}
    </Tooltip>
  )
}
