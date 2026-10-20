import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { createContext, use, useId, useRef, type FocusEvent, type ReactNode } from "react"
import { IconCheck, IconChevronDown } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useGlide } from "../../lib/glide.js"
import { fitForm, nextFitForm, overflowsOwnBox, useFitForm } from "../../lib/fit-form.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useScrollEdges } from "../../lib/use-scroll-edges.js"
import { Menu, MenuPrimitive } from "../menu/index.js"
import { useSettingRow } from "../setting-row/index.js"
import type { ChoiceTone } from "../field/index.js"

export type SegmentedSize = "sm" | "md" | "lg"

/**
 * How the control is drawn:
 *   full   every segment with its label (and icon)
 *   icons  every segment as its icon; labels become names and tooltips
 *   menu   one button showing the chosen option and a chevron ("RMM ▾"); the options are in
 *          a menu with a check on the chosen one
 */
export type SegmentedForm = "full" | "icons" | "menu"

/**
 * What the control does when its options do not fit:
 *   auto   (default) measure against the container: full → icons (when every option has an
 *          icon) → menu
 *   menu   always the menu: for a host that has already measured and decided (the top bar
 *          on a phone)
 *   none   never collapse: the segments scroll sideways inside the track
 */
export type SegmentedCollapse = "auto" | "menu" | "none"

export interface SegmentedOption<V extends string = string> {
  value: V
  label: string
  /** Pass the icon without a size. Needed for the icon-only step in narrow boxes. */
  icon?: ReactNode
  disabled?: boolean
}

export interface SegmentedProps<V extends string = string> {
  options: Array<SegmentedOption<V>>
  value?: V
  defaultValue?: V
  /** Called with the chosen option's `value` when the person picks a segment (or a menu item in the collapsed form); pressing the current segment does not deselect it. Pair with `value` to control it. */
  onValueChange?: (value: V) => void
  size?: SegmentedSize
  /** Show icons only; labels become accessible names. Still folds to the menu when even the icons do not fit. */
  iconOnly?: boolean
  /** Fill the container; segments share the width equally. A block never collapses. */
  block?: boolean
  /** What happens when the options do not fit. Default: the host's SegmentedCollapseContext, else "auto". */
  collapse?: SegmentedCollapse
  disabled?: boolean
  /** Invalid outside a Field. */
  invalid?: boolean
  /** The chosen segment's tint. Status tones only when the modes are statuses (R3.3). */
  tone?: ChoiceTone
  /** Called with the focus event when focus leaves the whole control, not when it moves between segments. For form libraries' touched state. */
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void
  /** Layout only. */
  className?: string
  id?: string
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  /** IDs of elements that provide the accessible name. */
  "aria-labelledby"?: string
}

/**
 * Lets a host decide the form for the controls inside it (Segmented and SwatchPicker): the
 * top bar folds its module switch to the menu on a phone. A `collapse` prop on the control
 * wins.
 */
export const SegmentedCollapseContext = createContext<SegmentedCollapse | undefined>(undefined)

export interface SegmentedFit {
  /** The width the container offers. */
  room: number
  /** The natural width of every segment with its label. */
  full: number
  /** The natural width of the icon-only form, or null when an option has no icon. */
  icons: number | null
}

/** The forms, widest first. */
const SEGMENTED_FORMS = ["full", "icons", "menu"] as const satisfies readonly SegmentedForm[]

/** The widest form that fits: full, then icons (when every option has one), then the menu. */
export function fitSegmented({ room, full, icons }: SegmentedFit): SegmentedForm {
  return fitForm(SEGMENTED_FORMS, { full, icons }, room)
}

/**
 * The next form, from what is shown now. `overflowing`: the shown form spills out of its own
 * box (a flex row whose siblings take part of the parent), so its own width is the room. A
 * form that overflowed is not tried again until the parent grows past the room it failed in,
 * so the control never flips back and forth. The shared `nextFitForm` (`glass-ux/fit-form`)
 * with the segmented control's forms.
 */
export function nextSegmentedForm(
  shown: SegmentedForm,
  fit: Omit<SegmentedFit, "room"> & { parentRoom: number; ownRoom: number; overflowing: boolean },
  failed: { form: SegmentedForm; room: number } | null
): { form: SegmentedForm; failed: { form: SegmentedForm; room: number } | null } {
  const { full, icons, parentRoom, ownRoom, overflowing } = fit
  return nextFitForm(SEGMENTED_FORMS, shown, { widths: { full, icons }, parentRoom, ownRoom, overflowing }, failed)
}

/**
 * One of two to five mutually exclusive modes ("Enabled | Disabled", "List | Grid", "RMM ·
 * PSA · CHAT"). A recessed glass track with a selected indicator that slides between segments.
 *
 * Container-aware (R7): measured against the box it is given, it steps down from every label,
 * to icons only (when every option has an icon), to one menu button showing the chosen option
 * ("RMM ▾") whose menu lists the options with a check on the chosen one. The value,
 * onValueChange and the group's accessible name are the same in every form.
 */
export function Segmented<V extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  size = "md",
  iconOnly = false,
  block = false,
  collapse: collapseProp,
  disabled,
  invalid,
  tone,
  onBlur,
  className,
  id,
  ...aria
}: SegmentedProps<V>) {
  const [current, setCurrent] = useControllable<V | undefined>(value ?? undefined, defaultValue ?? options[0]?.value, (next) => {
    if (next !== undefined) onValueChange?.(next)
  })
  const hostCollapse = use(SegmentedCollapseContext)
  const collapse = collapseProp ?? hostCollapse ?? "auto"
  const canIcons = options.every((option) => option.icon)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const edges = useScrollEdges(rootRef)
  // In a SettingRow, the row's label and description name the control.
  const row = useSettingRow()
  const valueId = useId()
  const signature = options.map((option) => `${option.value}:${option.label}:${option.icon ? 1 : 0}`).join("|")

  const auto = collapse === "auto" && !block
  // Container awareness: the widest form that fits the box (fitSegmented, through the shared
  // useFitForm). The natural widths come from an off-screen row, so they are known whatever
  // the form shown.
  const measured = useFitForm<SegmentedForm>({
    forms: SEGMENTED_FORMS,
    initial: iconOnly && canIcons ? "icons" : "full",
    enabled: auto,
    ref: rootRef,
    observe: [measureRef],
    signature: `${signature}|${iconOnly ? 1 : 0}`,
    measure: (root, shown) => {
      const pad = Number.parseFloat(getComputedStyle(root).paddingLeft) || 0
      const segment = root.clientHeight - pad * 2
      const full = iconOnly && canIcons ? Number.POSITIVE_INFINITY : (measureRef.current?.scrollWidth ?? 0)
      const icons = canIcons ? segment * options.length + pad * 2 : null
      // The segments' own extent: scrollWidth would also count the indicator mid-slide.
      const last = root.querySelector<HTMLElement>(":scope > .fa-segmented-item:last-of-type")
      return { widths: { full, icons }, overflowing: shown !== "menu" && overflowsOwnBox(root, last) }
    },
  })
  const form: SegmentedForm = collapse === "menu" ? "menu" : auto ? measured : iconOnly && canIcons ? "icons" : "full"
  const compact = form === "icons"

  const choose = (picked: V) => setCurrent(picked)

  // The indicator glides to the pressed segment (its own CSS variables; no re-render per frame).
  const indicatorRef = useRef<HTMLSpanElement | null>(null)
  const ready = useGlide(indicatorRef, "[data-pressed]", "x", [current, form, options.length])

  const shared = {
    id,
    "data-size": size,
    "data-form": form,
    "data-invalid": invalid ? "" : undefined,
    "data-tone": tone === "accent" ? undefined : tone,
  }
  // The natural width with labels, measured off-screen whatever the form (auto only).
  const measureRow = auto ? (
    <span className="fa-segmented-measure" aria-hidden>
      <span ref={measureRef} className="fa-segmented-measure-row">
        {options.map((option) => (
          <span key={option.value} className="fa-segmented-item">
            {option.icon}
            <span className="fa-segmented-label">{option.label}</span>
          </span>
        ))}
      </span>
    </span>
  ) : null

  if (form === "menu") {
    const chosen = options.find((option) => option.value === current) ?? options[0]
    const groupLabel = aria["aria-label"]
    const labelledBy = aria["aria-labelledby"] ?? (groupLabel ? undefined : row?.labelId)
    return (
      <div
        ref={rootRef}
        role="group"
        aria-label={groupLabel}
        aria-labelledby={labelledBy}
        aria-describedby={row?.descriptionId}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.(event)
        }}
        className={cx("fa-segmented", className)}
        {...shared}
        data-disabled={disabled ? "" : undefined}
      >
        <Menu.Root>
          <MenuPrimitive.Trigger
            className="fa-segmented-trigger fa-pressable"
            disabled={disabled}
            // The group's name and the chosen option, as the full form reads ("Module: RMM").
            aria-label={groupLabel ? `${groupLabel}: ${chosen?.label ?? ""}` : undefined}
            aria-labelledby={groupLabel ? undefined : cx(labelledBy, valueId) || undefined}
          >
            {chosen?.icon}
            <span id={valueId} className="fa-segmented-label">
              {chosen?.label}
            </span>
            <IconChevronDown className="fa-segmented-chevron" />
          </MenuPrimitive.Trigger>
          <Menu.Popup align="start" className="fa-segmented-menu">
            <MenuPrimitive.RadioGroup value={current} onValueChange={(next: V) => choose(next)}>
              {options.map((option) => (
                <MenuPrimitive.RadioItem
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  disabled={option.disabled}
                  closeOnClick
                  className="fa-item fa-menu-item"
                  data-selected={option.value === current ? "" : undefined}
                >
                  {option.icon}
                  <span className="fa-item-label">{option.label}</span>
                  <MenuPrimitive.RadioItemIndicator className="fa-segmented-check">
                    <IconCheck />
                  </MenuPrimitive.RadioItemIndicator>
                </MenuPrimitive.RadioItem>
              ))}
            </MenuPrimitive.RadioGroup>
          </Menu.Popup>
        </Menu.Root>
        {measureRow}
      </div>
    )
  }

  return (
    <ToggleGroup<V>
      aria-labelledby={aria["aria-label"] ? undefined : row?.labelId}
      aria-describedby={row?.descriptionId}
      {...aria}
      ref={rootRef}
      value={current === undefined ? [] : [current]}
      onValueChange={(next) => {
        const picked = next[0]
        if (picked === undefined) return
        choose(picked)
      }}
      disabled={disabled}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.(event)
      }}
      className={cx("fa-segmented", className)}
      {...shared}
      data-block={block ? "" : undefined}
      data-compact={compact ? "" : undefined}
      data-scroll={collapse === "none" ? "" : undefined}
      data-scroll-left={edges.left ? "" : undefined}
      data-scroll-right={edges.right ? "" : undefined}
      data-ready={ready ? "" : undefined}
    >
      <span ref={indicatorRef} className="fa-segmented-indicator fa-glide" aria-hidden hidden={!ready} />
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className="fa-segmented-item fa-lit"
          aria-label={compact ? option.label : undefined}
          title={compact ? option.label : undefined}
        >
          {option.icon}
          {compact ? null : <span className="fa-segmented-label">{option.label}</span>}
        </Toggle>
      ))}
      {measureRow}
    </ToggleGroup>
  )
}
