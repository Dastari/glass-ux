import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar"
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react"
import { IconMoreHorizontal } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { readingKey } from "../../lib/direction.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { observeElementSizes } from "../../lib/resize-observer.js"
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

/** The direction the controls run: a row, or a column such as a tool rail. */
export type ToolbarOrientation = "horizontal" | "vertical"

/** Inside the More menu, items render as menu items instead of buttons. */
const MenuMode = /* @__PURE__ */ createContext(false)
const SizeContext = /* @__PURE__ */ createContext<ToolbarSize>("sm")
const OrientationContext = /* @__PURE__ */ createContext<ToolbarOrientation>("horizontal")

/** The single-choice group a button or flyout sits in: the chosen tool's value and how to choose one. */
interface ChoiceState {
  value: string | undefined
  choose: (value: string) => void
}
const ChoiceContext = /* @__PURE__ */ createContext<ChoiceState | null>(null)

/** The key a tool has in the toolbar's folded set: its group's unit and its own key. */
const itemKey = (unit: string, item: string) => `${unit}\u0000${item}`

/** What a single-choice group needs from its toolbar to fold item by item. */
interface FoldState {
  folded: ReadonlySet<string>
  /** Each group's choice, from its copy in the row, so its copy in More reads and sets the same one. */
  choices: { current: Map<string, ChoiceState> }
  /** Fold again: the chosen tool has changed, and it has to be showing. */
  refold: () => void
}
const FoldContext = /* @__PURE__ */ createContext<FoldState | null>(null)
const UnitContext = /* @__PURE__ */ createContext("")

export interface ToolbarProps {
  /** Names the toolbar for assistive technology ("Formatting"). Required: toolbars are landmarks of controls. */
  "aria-label": string
  /** sm (default) for panel headers and editors, md beside fields. */
  size?: ToolbarSize
  /**
   * `horizontal` (default) is a row; `vertical` is a column, such as a tool rail. In a column Up and
   * Down Arrow move between the controls (Left and Right stay free for a flyout), items fold into
   * More by height, so give it a bounded height, and More and flyouts open at the inline end.
   */
  orientation?: ToolbarOrientation
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
 * A row or column of controls with one tab stop: arrow keys move between them (Base UI's toolbar
 * pattern). When the row runs out of room, items fold into a trailing More menu — low
 * priority first, the last ones first — where each reads as a menu item (toggles as checkbox
 * items). A folded item keeps the width it last showed at, so the row does not flicker at its
 * edge. Groups fold as a whole and show in More between separators. A single-choice group folds
 * one tool at a time, the last first, and keeps the chosen tool showing: that tool folds only when
 * nothing else is left to fold.
 */
function ToolbarRoot({ "aria-label": label, size = "sm", orientation = "horizontal", overflow = true, disabled, children, labels, className }: ToolbarProps) {
  const vertical = orientation === "vertical"
  const t = useMessages(toolbarMessages, { labels })
  const root = useRef<HTMLDivElement>(null)
  const more = useRef<HTMLDivElement>(null)
  const units: UnitInfo[] = Children.toArray(children)
    .filter(isValidElement)
    .map((element, index) => ({ key: String(element.key ?? index), priority: priorityOf(element), element }))
  const widths = useRef(new Map<string, number>())
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set())
  const choices = useRef(new Map<string, ChoiceState>())

  const measure = () => {
    const box = root.current
    if (!box) return
    for (const node of box.querySelectorAll<HTMLElement>(":scope > [data-toolbar-unit]")) {
      // A spacer stretches into whatever is left, so it takes no room of its own.
      if (!node.hidden) {
        const rect = node.getBoundingClientRect()
        widths.current.set(node.dataset.toolbarUnit!, node.dataset.kind === "spacer" ? 0 : vertical ? rect.height : rect.width)
      }
    }
    // A single-choice group's tools, last first as they fold: each keeps the size it last showed at.
    const toolsOf = new Map<string, { key: string; chosen: boolean }[]>()
    let groupGap = 0
    for (const node of box.querySelectorAll<HTMLElement>(":scope > [data-toolbar-unit] > .fa-toolbar-group[data-choice]")) {
      const unit = node.parentElement!.dataset.toolbarUnit!
      const tools: { key: string; chosen: boolean }[] = []
      for (const tool of node.querySelectorAll<HTMLElement>(":scope > [data-group-item]")) {
        const key = itemKey(unit, tool.dataset.groupItem!)
        if (!tool.hidden && !node.parentElement!.hidden) {
          const rect = tool.getBoundingClientRect()
          widths.current.set(key, vertical ? rect.height : rect.width)
        }
        tools.unshift({ key, chosen: tool.dataset.chosen !== undefined })
      }
      toolsOf.set(unit, tools)
      const groupStyle = getComputedStyle(node)
      groupGap = parseFloat(vertical ? groupStyle.rowGap : groupStyle.columnGap) || 0
    }
    if (!overflow) return setFolded((prev) => (prev.size ? new Set() : prev))
    const style = getComputedStyle(box)
    const gap = parseFloat(vertical ? style.rowGap : style.columnGap) || 0
    const available = vertical ? box.clientHeight : box.clientWidth
    const width = (key: string) => widths.current.get(key) ?? 0
    const total = (hidden: Set<string>, withMore: boolean) => {
      const shown = units.filter((unit) => !hidden.has(unit.key))
      // Folding a tool takes its own size and one gap off its group's.
      const sum = shown.reduce((acc, unit) => acc + width(unit.key) - (toolsOf.get(unit.key) ?? []).reduce((off, tool) => off + (hidden.has(tool.key) ? width(tool.key) + groupGap : 0), 0), 0)
      const moreRect = withMore ? more.current?.getBoundingClientRect() : undefined
      const moreWidth = moreRect ? (vertical ? moreRect.height : moreRect.width) : 0
      return sum + moreWidth + gap * Math.max(0, shown.length - (withMore ? 0 : 1))
    }
    const next = new Set<string>()
    if (total(next, false) > available) {
      const order = [
        ...units.filter((unit) => unit.priority === "low").reverse(),
        ...units.filter((unit) => unit.priority === "high").reverse(),
      ]
      const fits = () => total(next, true) <= available
      for (const unit of order) {
        if (fits()) break
        const tools = toolsOf.get(unit.key)
        if (!tools) {
          next.add(unit.key)
          continue
        }
        for (const tool of tools) {
          if (fits()) break
          if (!tool.chosen) next.add(tool.key)
        }
      }
      // Still too long with every other tool folded: a group's chosen tool goes too, and More lists them all.
      for (const unit of order) {
        if (fits()) break
        const tools = toolsOf.get(unit.key)
        if (!tools) continue
        for (const tool of tools) next.delete(tool.key)
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
  }
  // Rendering makes a new `units` array every time, so measurement follows a signature of what
  // it depends on instead, and always runs the latest closure.
  const latestMeasure = useRef(measure)
  useIsomorphicLayoutEffect(() => {
    latestMeasure.current = measure
  })
  const signature = `${overflow}|${size}|${orientation}|${units.map((unit) => `${unit.key}:${unit.priority}`).join("|")}`

  // Measure when the units or their settings change; later size changes of the row, a unit
  // (a label or icon changing its width) or the More button arrive through the observer.
  useIsomorphicLayoutEffect(() => {
    latestMeasure.current()
    const box = root.current
    if (!box) return
    const observer = observeElementSizes(() => latestMeasure.current())
    observer.observe(box)
    for (const node of box.querySelectorAll(":scope > [data-toolbar-unit]")) observer.observe(node)
    if (more.current) observer.observe(more.current)
    return () => observer.disconnect()
  }, [signature])

  const foldedUnits = units.filter((unit) => unit.priority !== "separator" && (folded.has(unit.key) || [...folded].some((key) => key.startsWith(itemKey(unit.key, "")))))
  return (
    <SizeContext.Provider value={size}>
      <OrientationContext.Provider value={orientation}>
      <FoldContext.Provider value={{ folded, choices, refold: () => latestMeasure.current() }}>
      <BaseToolbar.Root ref={root} aria-label={label} orientation={orientation} disabled={disabled} className={cx("fa-toolbar", className)} data-size={size}>
        {units.map((unit) => (
          <div key={unit.key} className="fa-toolbar-unit" data-toolbar-unit={unit.key} data-kind={unit.priority} hidden={folded.has(unit.key)}>
            <UnitContext.Provider value={unit.key}>{unit.element}</UnitContext.Provider>
          </div>
        ))}
        {/* Always rendered so its width is known; invisible (and unfocusable) until something folds. */}
        <div ref={more} className="fa-toolbar-more" data-idle={foldedUnits.length ? undefined : ""}>
          <Menu.Root>
            <BaseToolbar.Button
              render={<Menu.Trigger render={<Button variant="ghost" size={size} icon={<IconMoreHorizontal />} aria-label={t.more} />} />}
            />
            <Menu.Popup side={vertical ? "inline-end" : undefined} align={vertical ? "start" : "end"}>
              <MenuMode.Provider value>
                {foldedUnits.map((unit, index) => (
                  <MoreSection key={unit.key} separated={index > 0 && separatedFrom(units, foldedUnits[index - 1]!, unit)}>
                    <UnitContext.Provider value={unit.key}>{unit.element}</UnitContext.Provider>
                  </MoreSection>
                ))}
              </MenuMode.Provider>
            </Menu.Popup>
          </Menu.Root>
        </div>
      </BaseToolbar.Root>
      </FoldContext.Provider>
      </OrientationContext.Provider>
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
  /**
   * This tool's value inside a single-choice `Toolbar.Group` (one with `value` or `defaultValue`).
   * Choosing it makes it the group's value; it reads as a radio button, checked while chosen.
   */
  value?: string
}

/** A button (or toggle) in a toolbar; in the More menu it is a menu item (a checkbox item for toggles). */
function ToolbarButton({ label, showLabel = false, icon, pressed, onPressedChange, priority: _priority, onSelect, onClick, disabled, shortcut, value, ...rest }: ToolbarButtonProps) {
  const inMenu = useContext(MenuMode)
  const size = useContext(SizeContext)
  const choice = useContext(ChoiceContext)
  const choosing = choice !== null && value !== undefined
  const toggle = !choosing && pressed !== undefined
  // A reason alone means disabled, as on Button. The toolbar's own button sets aria-disabled.
  const isDisabled = Boolean(disabled || rest.disabledReason)
  if (inMenu) {
    if (choosing)
      return (
        <Menu.RadioItem value={value} disabled={isDisabled} shortcut={shortcut} closeOnClick>
          {label}
        </Menu.RadioItem>
      )
    if (toggle)
      return (
        <Menu.CheckboxItem checked={pressed} disabled={isDisabled} shortcut={shortcut} onCheckedChange={(next) => onPressedChange?.(next)}>
          {label}
        </Menu.CheckboxItem>
      )
    return (
      <Menu.Item icon={icon} disabled={isDisabled} disabledReason={rest.disabledReason} shortcut={shortcut} onClick={() => (onSelect ? onSelect() : onClick?.(undefined as never))}>
        {label}
      </Menu.Item>
    )
  }
  return (
    <BaseToolbar.Button
      disabled={isDisabled}
      render={
        <Button
          {...rest}
          variant="ghost"
          size={size}
          icon={icon}
          shortcut={shortcut}
          aria-label={showLabel ? undefined : label}
          role={choosing ? "radio" : undefined}
          aria-checked={choosing ? choice.value === value : undefined}
          aria-pressed={toggle ? pressed : undefined}
          data-pressed-state={toggle ? (pressed ? "on" : "off") : choosing ? (choice.value === value ? "on" : "off") : undefined}
          onClick={(event) => {
            onClick?.(event)
            if (toggle) onPressedChange?.(!pressed)
            else if (choosing) choice.choose(value)
          }}
        >
          {showLabel ? label : undefined}
        </Button>
      }
    />
  )
}

export interface ToolbarGroupProps {
  /** Names the group ("Alignment"); also its heading in the More menu when it folds. Required for a single-choice group. */
  "aria-label"?: string
  priority?: ToolbarPriority
  /**
   * Make this a single-choice group: exactly one tool is chosen, and `Toolbar.Button`s with a
   * `value` (and flyout tools) are its choices. Controlled with `onValueChange`.
   */
  value?: string
  /** The tool chosen at first, uncontrolled. Without it the group starts on its first button's value. */
  defaultValue?: string
  /** Called with the chosen tool's value. */
  onValueChange?: (value: string) => void
  children: ReactNode
  className?: string
}

/** The value of the first `Toolbar.Button` or flyout tool among `children`, the choice a group starts on. */
function firstChoice(children: ReactNode): string | undefined {
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue
    const props = child.props as { value?: unknown; tools?: Array<{ value: string }> }
    if (child.type === ToolbarFlyout && props.tools?.[0]) return props.tools[0].value
    if (child.type === ToolbarButton && typeof props.value === "string") return props.value
  }
  return undefined
}

/** Whether a group's child is the chosen tool, or a flyout with the chosen tool behind it. */
function holdsChoice(child: ReactElement, value: string | undefined) {
  const props = child.props as { value?: unknown; tools?: Array<{ value: string }> }
  return value !== undefined && (props.value === value || Boolean(props.tools?.some((tool) => tool.value === value)))
}

/**
 * Related toolbar controls that sit and fold together. Give it `value`, `defaultValue` or
 * `onValueChange` and it is a single-choice group: a `radiogroup` of radio buttons, exactly
 * one chosen. Arrow keys still move between the toolbar's controls (the toolbar owns them), and
 * Space or Enter chooses the focused tool, so passing over a tool never switches to it. It folds
 * tool by tool, the last first, and the chosen tool stays showing; choosing one from More brings
 * it back into the row.
 */
function ToolbarGroup({ "aria-label": label, priority: _priority, value: valueProp, defaultValue, onValueChange, children, className }: ToolbarGroupProps) {
  const inMenu = useContext(MenuMode)
  const single = valueProp !== undefined || defaultValue !== undefined || onValueChange !== undefined
  const [value, setValue] = useControllable<string | undefined>(valueProp, defaultValue ?? (single ? firstChoice(children) : undefined), onValueChange as ((next: string | undefined) => void) | undefined)
  const own: ChoiceState | null = single ? { value, choose: (next) => setValue(next) } : null
  const fold = useContext(FoldContext)
  const unit = useContext(UnitContext)
  // The copy in the row holds the choice; the copy in More reads and sets that one.
  const choice = own && inMenu ? (fold?.choices.current.get(unit) ?? own) : own
  useIsomorphicLayoutEffect(() => {
    if (!own || inMenu) return
    fold?.choices.current.set(unit, own)
  })
  useIsomorphicLayoutEffect(() => {
    if (single && !inMenu) fold?.refold()
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only a new choice can change what has to show
  }, [value])
  const tools = single ? Children.toArray(children).filter(isValidElement) : []
  const isFolded = (key: string) => Boolean(fold?.folded.has(itemKey(unit, String(key))))
  if (inMenu)
    return (
      <Menu.Group>
        {label ? <Menu.GroupLabel>{label}</Menu.GroupLabel> : null}
        {choice ? (
          <ChoiceContext.Provider value={choice}>
            <Menu.RadioGroup value={choice.value ?? ""} onValueChange={(next) => choice.choose(String(next))}>
              {/* Part of the group folded: only those tools. All of it folded: every tool. */}
              {tools.some((tool) => isFolded(String(tool.key))) ? tools.filter((tool) => isFolded(String(tool.key))) : children}
            </Menu.RadioGroup>
          </ChoiceContext.Provider>
        ) : (
          children
        )}
      </Menu.Group>
    )
  return (
    <BaseToolbar.Group aria-label={label} role={choice ? "radiogroup" : undefined} className={cx("fa-toolbar-group", className)} data-choice={choice ? "" : undefined}>
      {choice ? (
        <ChoiceContext.Provider value={choice}>
          {tools.map((tool) => (
            <div key={tool.key} className="fa-toolbar-group-item" data-group-item={tool.key ?? undefined} data-chosen={holdsChoice(tool, value) ? "" : undefined} hidden={isFolded(String(tool.key))}>
              {tool}
            </div>
          ))}
        </ChoiceContext.Provider>
      ) : (
        children
      )}
    </BaseToolbar.Group>
  )
}

export interface ToolbarFlyoutTool {
  /** The tool's value: what the group or the flyout chooses. */
  value: string
  /** Its name: the button's accessible name and tooltip while shown, and its row in the popup. */
  label: string
  /** Shown on the toolbar button while this is the flyout's tool. */
  icon?: ReactNode
  /** Keyboard shortcut shown beside it in the popup. */
  shortcut?: string
  disabled?: boolean
}

export interface ToolbarFlyoutProps {
  /** Names the set of tools ("Selection tools"): the popup's name, and its heading in the More menu. */
  label: string
  /** The related tools. The button shows the chosen one, else the last one used, else the first. */
  tools: ToolbarFlyoutTool[]
  /** Outside a single-choice group: the tool the button shows. Inside one, the group's value decides. */
  value?: string
  /** The tool shown at first, uncontrolled. Outside a single-choice group only. */
  defaultValue?: string
  /** Called with the tool chosen from the popup, outside a single-choice group. */
  onValueChange?: (value: string) => void
  /** Called with the tool's value when the button is pressed, or a tool is chosen from the popup, outside a single-choice group. */
  onActivate?: (value: string) => void
  priority?: ToolbarPriority
  disabled?: boolean
}

/** Hold the button this long to open the flyout. */
const LONG_PRESS_MS = 450

/**
 * A tool button with related tools behind it. A press uses the tool it shows; holding it, the
 * context-menu gesture, or Arrow Down (Arrow Right at the reading end of a vertical toolbar)
 * opens a popup of the others, beside the button at the inline end of a vertical toolbar and
 * below it otherwise. A small corner mark shows the button has more. In a single-choice group
 * its tools are choices of the group, and the button reads as a radio button; outside one it is
 * a menu button. In More it lists its tools.
 */
function ToolbarFlyout({ label, tools, value: valueProp, defaultValue, onValueChange, onActivate, priority: _priority, disabled }: ToolbarFlyoutProps) {
  const inMenu = useContext(MenuMode)
  const size = useContext(SizeContext)
  const orientation = useContext(OrientationContext)
  const choice = useContext(ChoiceContext)
  const t = useMessages(toolbarMessages)
  const [own, setOwn] = useControllable<string | undefined>(valueProp, defaultValue, onValueChange as ((next: string | undefined) => void) | undefined)
  const [last, setLast] = useState<string | undefined>()
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const held = useRef(false)
  const hintId = useId()
  useEffect(() => () => clearTimeout(timer.current), [])

  const current = choice ? choice.value : own
  const chosen = tools.find((tool) => tool.value === current)
  const shown = chosen ?? tools.find((tool) => tool.value === last) ?? tools[0]
  if (!shown) return null

  const pick = (value: string) => {
    setLast(value)
    if (choice) choice.choose(value)
    else {
      setOwn(value)
      onActivate?.(value)
    }
  }

  if (inMenu) {
    const items = tools.map((tool) =>
      choice ? (
        <Menu.RadioItem key={tool.value} value={tool.value} disabled={Boolean(tool.disabled || disabled)} shortcut={tool.shortcut} closeOnClick>
          {tool.label}
        </Menu.RadioItem>
      ) : (
        <Menu.Item key={tool.value} icon={tool.icon} disabled={Boolean(tool.disabled || disabled)} shortcut={tool.shortcut} onClick={() => pick(tool.value)}>
          {tool.label}
        </Menu.Item>
      ),
    )
    return choice ? <>{items}</> : <Menu.Group><Menu.GroupLabel>{label}</Menu.GroupLabel>{items}</Menu.Group>
  }

  const vertical = orientation === "vertical"
  const cancel = () => clearTimeout(timer.current)
  const openFlyout = () => {
    cancel()
    held.current = true
    setOpen(true)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const key = readingKey(event.key, event.currentTarget)
    if (vertical ? key === "ArrowRight" : event.key === "ArrowDown") {
      event.preventDefault()
      event.stopPropagation()
      held.current = false
      setOpen(true)
    }
  }
  const checked = chosen !== undefined

  return (
    <Menu.Root
      open={open}
      onOpenChange={setOpen}
    >
      <BaseToolbar.Button
        disabled={Boolean(disabled)}
        render={
          <Button
            ref={button}
            variant="ghost"
            size={size}
            icon={
              <>
                {shown.icon}
                <span className="fa-toolbar-flyout-mark" aria-hidden />
              </>
            }
            aria-label={shown.label}
            aria-describedby={hintId}
            role={choice ? "radio" : undefined}
            aria-checked={choice ? checked : undefined}
            aria-haspopup={choice ? undefined : "menu"}
            aria-expanded={choice ? undefined : open}
            data-flyout=""
            data-pressed-state={choice ? (checked ? "on" : "off") : undefined}
            onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
              if (event.button !== 0) return
              held.current = false
              cancel()
              timer.current = setTimeout(openFlyout, LONG_PRESS_MS)
            }}
            onPointerUp={cancel}
            onPointerCancel={cancel}
            onPointerLeave={cancel}
            onContextMenu={(event: React.MouseEvent) => {
              event.preventDefault()
              openFlyout()
            }}
            onKeyDown={onKeyDown}
            onClick={() => {
              // The press that finished a hold opened the popup already.
              if (held.current) held.current = false
              else pick(shown.value)
            }}
          />
        }
      />
      <span id={hintId} hidden>
        {t.relatedTools}
      </span>
      <Menu.Popup anchor={button} finalFocus={button} side={vertical ? "inline-end" : "bottom"} align="start" aria-label={label}>
        <Menu.RadioGroup value={current ?? shown.value}>
          {tools.map((tool) => (
            <Menu.RadioItem key={tool.value} value={tool.value} disabled={Boolean(tool.disabled)} shortcut={tool.shortcut} closeOnClick onClick={() => pick(tool.value)}>
              {tool.label}
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </Menu.Popup>
    </Menu.Root>
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
 * A toolbar: `Root`, `Button` (with toggles), `Group` (also single-choice), `Flyout` (a tool
 * with related tools), `Item` (any control), `Separator` and `Spacer`, plus Base UI's `Input` and `Link` for text fields and links in the row.
 */
export const Toolbar = /* @__PURE__ */ Object.assign(ToolbarRoot, {
  Root: ToolbarRoot,
  Button: ToolbarButton,
  Group: ToolbarGroup,
  Flyout: ToolbarFlyout,
  Item: ToolbarItem,
  Separator: ToolbarSeparator,
  Spacer: ToolbarSpacer,
  Input: BaseToolbar.Input,
  Link: BaseToolbar.Link,
})
