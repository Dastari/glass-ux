import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar"
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"
import { IconMoreHorizontal } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { Button, type ButtonProps } from "../button/index.js"
import { Menu } from "../menu/index.js"
import { toolbarMessages } from "./messages.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/**
 * Which items give way first when the toolbar runs out of room:
 *   low     folds into More first (the last ones first)
 *   high    (default) folds once every low item has
 *   always  never folds
 */
export type ToolbarPriority = "low" | "high" | "always"

export type ToolbarSize = "sm" | "md"

/** Inside the More menu, items render as menu items instead of buttons. */
const MenuMode = createContext(false)
const SizeContext = createContext<ToolbarSize>("sm")

export interface ToolbarProps {
  /** Names the toolbar for assistive technology ("Formatting"). Required: toolbars are landmarks of controls. */
  "aria-label": string
  /** sm (default) for panel headers and editors, md beside fields. */
  size?: ToolbarSize
  /**
   * Fold items into a trailing More menu when they do not fit, by `priority` (default true).
   * Off, the toolbar never folds; give it room or let it scroll.
   */
  overflow?: boolean
  disabled?: boolean
  /** Toolbar.Button, Toolbar.Group, Toolbar.Item, Toolbar.Separator and Toolbar.Spacer. */
  children: ReactNode
  /** Wording overrides (the More button). */
  labels?: Partial<typeof toolbarMessages.defaults>
  /** Layout only. */
  className?: string
}

interface UnitInfo {
  key: string
  priority: ToolbarPriority | "separator" | "spacer"
  element: ReactElement
}

const priorityOf = (element: ReactElement): UnitInfo["priority"] => {
  if (element.type === ToolbarSeparator) return "separator"
  if (element.type === ToolbarSpacer) return "spacer"
  const props = element.props as { priority?: ToolbarPriority; menu?: ReactNode }
  // A custom item without a menu form cannot fold.
  if (element.type === ToolbarItem && props.menu === undefined) return "always"
  return props.priority ?? "high"
}

/**
 * A row of controls with one tab stop: arrow keys move between them (Base UI's toolbar
 * pattern). When the row runs out of room, items fold into a trailing More menu — low
 * priority first, the last ones first — where each reads as a menu item (toggles as checkbox
 * items). A folded item keeps the width it last showed at, so the row does not flicker at its
 * edge. Groups fold as a whole and show in More between separators.
 */
function ToolbarRoot({ "aria-label": label, size = "sm", overflow = true, disabled, children, labels, className }: ToolbarProps) {
  const t = useMessages(toolbarMessages, { labels })
  const root = useRef<HTMLDivElement>(null)
  const more = useRef<HTMLDivElement>(null)
  const units: UnitInfo[] = Children.toArray(children)
    .filter(isValidElement)
    .map((element, index) => ({ key: String(element.key ?? index), priority: priorityOf(element), element }))
  const widths = useRef(new Map<string, number>())
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set())

  const measure = useCallback(() => {
    const box = root.current
    if (!box) return
    for (const node of box.querySelectorAll<HTMLElement>(":scope > [data-toolbar-unit]")) {
      // A spacer stretches into whatever is left, so it takes no room of its own.
      if (!node.hidden) widths.current.set(node.dataset.toolbarUnit!, node.dataset.kind === "spacer" ? 0 : node.getBoundingClientRect().width)
    }
    if (!overflow) return setFolded((prev) => (prev.size ? new Set() : prev))
    const gap = parseFloat(getComputedStyle(box).columnGap) || 0
    const available = box.clientWidth
    const width = (key: string) => widths.current.get(key) ?? 0
    const total = (hidden: Set<string>, withMore: boolean) => {
      const shown = units.filter((unit) => !hidden.has(unit.key))
      const sum = shown.reduce((acc, unit) => acc + width(unit.key), 0)
      const moreWidth = withMore ? (more.current?.getBoundingClientRect().width ?? 0) : 0
      return sum + moreWidth + gap * Math.max(0, shown.length - (withMore ? 0 : 1))
    }
    const next = new Set<string>()
    if (total(next, false) > available) {
      const order = [
        ...units.filter((unit) => unit.priority === "low").reverse(),
        ...units.filter((unit) => unit.priority === "high").reverse(),
      ]
      for (const unit of order) {
        if (total(next, true) <= available) break
        next.add(unit.key)
      }
    }
    // A separator shows only between two shown items.
    units.forEach((unit, index) => {
      if (unit.priority !== "separator") return
      const before = units.slice(0, index).reverse().find((u) => u.priority !== "separator")
      const after = units.slice(index + 1).find((u) => u.priority !== "separator")
      if (!before || !after || next.has(before.key) || next.has(after.key)) next.add(unit.key)
    })
    setFolded((prev) => (prev.size === next.size && [...next].every((key) => prev.has(key)) ? prev : next))
  }, [overflow, units])

  useIsomorphicLayoutEffect(measure)
  useIsomorphicLayoutEffect(() => {
    const box = root.current
    if (!box || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => measure())
    observer.observe(box)
    return () => observer.disconnect()
  }, [measure])

  const foldedUnits = units.filter((unit) => folded.has(unit.key) && unit.priority !== "separator")
  return (
    <SizeContext.Provider value={size}>
      <BaseToolbar.Root ref={root} aria-label={label} disabled={disabled} className={cx("fa-toolbar", className)} data-size={size}>
        {units.map((unit) => (
          <div key={unit.key} className="fa-toolbar-unit" data-toolbar-unit={unit.key} data-kind={unit.priority} hidden={folded.has(unit.key)}>
            {unit.element}
          </div>
        ))}
        {/* Always rendered so its width is known; invisible (and unfocusable) until something folds. */}
        <div ref={more} className="fa-toolbar-more" data-idle={foldedUnits.length ? undefined : ""}>
          <Menu.Root>
            <BaseToolbar.Button
              render={<Menu.Trigger render={<Button variant="ghost" size={size} icon={<IconMoreHorizontal />} aria-label={t.more} />} />}
            />
            <Menu.Popup align="end">
              <MenuMode.Provider value>
                {foldedUnits.map((unit, index) => (
                  <MoreSection key={unit.key} separated={index > 0 && separatedFrom(units, foldedUnits[index - 1]!, unit)}>
                    {unit.element}
                  </MoreSection>
                ))}
              </MenuMode.Provider>
            </Menu.Popup>
          </Menu.Root>
        </div>
      </BaseToolbar.Root>
    </SizeContext.Provider>
  )
}

/** Whether the toolbar had a separator (or a group's edge) between two folded units, so More keeps it. */
function separatedFrom(units: UnitInfo[], previous: UnitInfo, unit: UnitInfo) {
  const from = units.indexOf(previous)
  const to = units.indexOf(unit)
  const between = units.slice(from + 1, to)
  return between.some((u) => u.priority === "separator") || previous.element.type === ToolbarGroup || unit.element.type === ToolbarGroup
}

function MoreSection({ separated, children }: { separated: boolean; children: ReactNode }) {
  return (
    <>
      {separated ? <Menu.Separator /> : null}
      {children}
    </>
  )
}

export interface ToolbarButtonProps extends Omit<ButtonProps, "children" | "aria-label" | "size" | "variant"> {
  /** The action's name: its tooltip and accessible name, and its More menu item. */
  label: string
  /** Show the label beside the icon instead of only in the tooltip. */
  showLabel?: boolean
  /** Make it a toggle: pressed or not. Pair with `onPressedChange`. */
  pressed?: boolean
  /** Called with the next pressed state of a toggle. */
  onPressedChange?: (pressed: boolean) => void
  priority?: ToolbarPriority
  /** Called when chosen from the More menu; defaults to the button's `onClick` action. */
  onSelect?: () => void
}

/** A button (or toggle) in a toolbar; in the More menu it is a menu item (a checkbox item for toggles). */
function ToolbarButton({ label, showLabel = false, icon, pressed, onPressedChange, priority: _priority, onSelect, onClick, disabled, shortcut, ...rest }: ToolbarButtonProps) {
  const inMenu = useContext(MenuMode)
  const size = useContext(SizeContext)
  const toggle = pressed !== undefined
  if (inMenu) {
    if (toggle)
      return (
        <Menu.CheckboxItem checked={pressed} disabled={Boolean(disabled)} shortcut={shortcut} onCheckedChange={(next) => onPressedChange?.(next)}>
          {label}
        </Menu.CheckboxItem>
      )
    return (
      <Menu.Item icon={icon} disabled={Boolean(disabled)} shortcut={shortcut} onClick={() => (onSelect ? onSelect() : onClick?.(undefined as never))}>
        {label}
      </Menu.Item>
    )
  }
  return (
    <BaseToolbar.Button
      disabled={Boolean(disabled)}
      render={
        <Button
          {...rest}
          variant="ghost"
          size={size}
          icon={icon}
          shortcut={shortcut}
          aria-label={showLabel ? undefined : label}
          aria-pressed={toggle ? pressed : undefined}
          data-pressed-state={toggle ? (pressed ? "on" : "off") : undefined}
          onClick={(event) => {
            onClick?.(event)
            if (toggle) onPressedChange?.(!pressed)
          }}
        >
          {showLabel ? label : undefined}
        </Button>
      }
    />
  )
}

export interface ToolbarGroupProps {
  /** Names the group ("Alignment"); also its heading in the More menu when it folds. */
  "aria-label"?: string
  priority?: ToolbarPriority
  children: ReactNode
  className?: string
}

/** Related toolbar controls that sit and fold together. */
function ToolbarGroup({ "aria-label": label, priority: _priority, children, className }: ToolbarGroupProps) {
  const inMenu = useContext(MenuMode)
  if (inMenu)
    return (
      <Menu.Group>
        {label ? <Menu.GroupLabel>{label}</Menu.GroupLabel> : null}
        {children}
      </Menu.Group>
    )
  return (
    <BaseToolbar.Group aria-label={label} className={cx("fa-toolbar-group", className)}>
      {children}
    </BaseToolbar.Group>
  )
}

export interface ToolbarItemProps {
  /** The control as it shows in the toolbar: a Segmented, a Select, a Menu trigger. Render focusable parts through `Toolbar.Button`'s pattern or Base UI's `Toolbar.Input`. */
  children: ReactNode
  /** Its form in the More menu (radio items, a submenu). Without it the item never folds. */
  menu?: ReactNode
  priority?: ToolbarPriority
}

/** Any control in a toolbar, with an optional More-menu form so it can fold. */
function ToolbarItem({ children, menu }: ToolbarItemProps) {
  const inMenu = useContext(MenuMode)
  return <>{inMenu ? menu : children}</>
}

/** A thin rule between groups; it hides when either side has folded. */
function ToolbarSeparator() {
  return <BaseToolbar.Separator className="fa-toolbar-separator" />
}

/** Pushes the items after it to the end of the toolbar. */
function ToolbarSpacer() {
  return <span className="fa-toolbar-spacer" aria-hidden />
}

/**
 * A toolbar: `Root`, `Button` (with toggles), `Group`, `Item` (any control), `Separator`
 * and `Spacer`, plus Base UI's `Input` and `Link` for text fields and links in the row.
 */
export const Toolbar = Object.assign(ToolbarRoot, {
  Root: ToolbarRoot,
  Button: ToolbarButton,
  Group: ToolbarGroup,
  Item: ToolbarItem,
  Separator: ToolbarSeparator,
  Spacer: ToolbarSpacer,
  Input: BaseToolbar.Input,
  Link: BaseToolbar.Link,
})
