import { Popover as BasePopover } from "@base-ui/react/popover"
import { useEffect, useMemo, type ComponentProps, type CSSProperties, type ReactNode, type RefObject } from "react"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { OptionRow } from "../combobox/index.js"
import type { OptionItem } from "../combobox/index.js"
import { Popover, type PopoverSize } from "../popover/index.js"
import { VisuallyHidden } from "../visually-hidden/index.js"
import { typeaheadMessages } from "./messages.js"
import type { TypeaheadCloseReason, TypeaheadState } from "./use-typeahead.js"

/** A rectangle in viewport coordinates: a caret, a selection or any box. */
export interface TypeaheadRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * What a typeahead hangs from: an element or a ref to one, a rectangle, or a function that
 * returns the rectangle each time it is needed, so the list follows the anchor as the page
 * scrolls. Take a caret rectangle where the trigger was typed, not where the caret is now,
 * or the list slides along as the person types.
 */
export type TypeaheadAnchor = Element | RefObject<HTMLElement | null> | TypeaheadRect | (() => TypeaheadRect)

const isRect = (anchor: object): anchor is TypeaheadRect => "x" in anchor && "width" in anchor

function virtualAnchor(rect: () => TypeaheadRect) {
  return {
    getBoundingClientRect: () => {
      const { x, y, width, height } = rect()
      return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height, toJSON: () => undefined }
    },
  }
}

export interface TypeaheadPopupProps {
  /** Whether the popup is showing. */
  open: boolean
  /** Called when a press outside dismisses it. Set `open` to false in response. */
  onClose: (reason: TypeaheadCloseReason) => void
  /** What the popup hangs from. */
  anchor: TypeaheadAnchor
  /** Accessible name of the popup. */
  label: string
  /** Preferred side of the anchor; collision handling may choose another. @defaultValue "bottom" */
  side?: "top" | "bottom"
  /** Alignment against the anchor. @defaultValue "start" */
  align?: "start" | "center" | "end"
  /** Popup width. @defaultValue "md" */
  size?: PopoverSize
  /** Layout classes for the popup. */
  className?: string
  /** Attributes for the popup element. */
  popupProps?: Pick<ComponentProps<"div">, "onMouseDown"> & { "data-detail"?: string }
  /** The list. */
  children: ReactNode
}

/**
 * The floating box of a typeahead, positioned against an element or a rectangle. It never
 * takes focus: Base UI's menus do, which text entry cannot allow.
 */
export function TypeaheadPopup({
  open,
  onClose,
  anchor,
  label,
  side = "bottom",
  align = "start",
  size = "md",
  className,
  popupProps,
  children,
}: TypeaheadPopupProps) {
  const positioned = useMemo(() => {
    if (typeof anchor === "function") return virtualAnchor(anchor)
    return !("current" in anchor) && !(anchor instanceof Element) && isRect(anchor) ? virtualAnchor(() => anchor) : anchor
  }, [anchor])
  return (
    <BasePopover.Root open={open} onOpenChange={(next) => (next ? undefined : onClose("outside-press"))}>
      <Popover.Popup
        {...popupProps}
        side={side}
        align={align}
        className={className}
        size={size}
        anchor={positioned}
        aria-label={label}
        initialFocus={false}
        finalFocus={false}
      >
        {children}
      </Popover.Popup>
    </BasePopover.Root>
  )
}

export interface TypeaheadOptionProps {
  /** The listbox id. Rows are `${listId}-${index}`, which `aria-activedescendant` names. */
  listId: string
  /** The row's position. */
  index: number
  /** Whether this is the highlighted row. */
  active: boolean
  /** Whether the row is selected. Default: while it is highlighted. Pass a value when the list marks picks. */
  selected?: boolean
  /** Called on a click, Enter or Space. */
  onPick: () => void
  /** Called with the row's index as the pointer moves over it. */
  onActive: (index: number) => void
  /** The id of the text describing the row. */
  describedBy?: string
  /** Row classes. Default: the shared menu row. */
  className?: string
  /** The row's content, usually `OptionRow`. */
  children: ReactNode
}

/**
 * One row of a typeahead. A press does not take focus from the text, and the highlight
 * follows pointer movement, not hover, so a list scrolling under a still pointer leaves it
 * where the keyboard put it.
 */
export function TypeaheadOption({ listId, index, active, selected = active, onPick, onActive, describedBy, className = "fa-item", children }: TypeaheadOptionProps) {
  return (
    <div
      id={`${listId}-${index}`}
      role="option"
      aria-selected={selected}
      aria-describedby={describedBy}
      className={className}
      data-highlighted={active ? "" : undefined}
      tabIndex={-1}
      onPointerMove={() => onActive(index)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onPick()
      }}
    >
      {children}
    </div>
  )
}

/** The fields the default row reads. */
export interface TypeaheadItem {
  id: string
  label: string
  /** Second line. */
  description?: string
  /** Leading icon. Pass it without a size. */
  icon?: ReactNode
  /** Trailing data. */
  meta?: string
}

export interface TypeaheadProps<Item> {
  /** The state from `useTypeahead`. */
  state: TypeaheadState<Item>
  /** What the list hangs from: an element, a caret rectangle or any rectangle. */
  anchor: TypeaheadAnchor
  /** Accessible name of the list. */
  label: string
  /** A row's content. Default: `OptionRow` from the item's `label`, `description`, `icon` and `meta`. */
  renderItem?: (item: Item) => ReactNode
  /** The highlighted row's detail, in a pane beside the list that moves under it in a narrow box. */
  renderDetail?: (item: Item) => ReactNode
  /** Results are on their way. Reserve their room with `reserveRows`. */
  loading?: boolean
  /** Text when there are no rows. Default "No results". */
  empty?: string
  /** Hold this many rows of height from the start, for results that arrive late: the popup keeps its size and its place. */
  reserveRows?: number
  /** Preferred side of the anchor. @defaultValue "bottom" */
  side?: "top" | "bottom"
  /** Alignment against the anchor. @defaultValue "start" */
  align?: "start" | "center" | "end"
  /** Layout classes for the popup. */
  className?: string
}

const defaultRow = (item: unknown, query: string) => <OptionRow item={asOption(item as TypeaheadItem)} query={query} />

function asOption({ id, label, description, icon, meta }: TypeaheadItem): OptionItem {
  return { value: id, label, description, icon, meta }
}

/**
 * A listbox at a caret or any rectangle, with focus staying in the text
 * (`aria-activedescendant`). Build it with `useTypeahead`; it needs no particular editor.
 * The result count is announced from a polite region that stays mounted (R20.9).
 *
 * Width  two panes when `renderDetail` is given; below 28rem the detail moves under the list.
 */
export function Typeahead<Item>({
  state,
  anchor,
  label,
  renderItem,
  renderDetail,
  loading = false,
  empty,
  reserveRows,
  side,
  align,
  className,
}: TypeaheadProps<Item>) {
  const messages = useMessages(typeaheadMessages)
  const locale = useLocale()
  const { id, open, items, activeIndex, activeItem, activeDescendant, navigated, query, setActiveIndex, pick, close, listProps } = state
  const count = items.length
  const emptyText = empty ?? messages.noResults
  const announcement = !open ? "" : loading && !count ? messages.searching : count ? messages.resultCount(count, locale) : emptyText
  const detailId = `${id}-detail`
  const hasDetail = Boolean(renderDetail)

  useEffect(() => {
    if (navigated && activeDescendant) document.getElementById(activeDescendant)?.scrollIntoView({ block: "nearest" })
  }, [navigated, activeDescendant])

  return (
    <>
      <VisuallyHidden role="status">{announcement}</VisuallyHidden>
      <TypeaheadPopup
        open={open}
        onClose={close}
        anchor={anchor}
        label={label}
        side={side}
        align={align}
        className={cx("fa-typeahead", className)}
        popupProps={{ "data-detail": hasDetail ? "" : undefined, onMouseDown: (event) => event.preventDefault() }}
      >
        <div className="fa-typeahead-panes">
          <div
            {...listProps}
            className="fa-typeahead-scroll"
            data-reserve={reserveRows ? "" : undefined}
            style={reserveRows ? ({ "--_rows": reserveRows } as CSSProperties) : undefined}
          >
            {count ? (
              <div id={id} role="listbox" aria-label={label} aria-busy={loading || undefined} className="fa-typeahead-list">
                {items.map((item, index) => (
                  <TypeaheadOption
                    key={index}
                    listId={id}
                    index={index}
                    active={index === activeIndex}
                    describedBy={hasDetail && index === activeIndex ? detailId : undefined}
                    onPick={() => pick(item)}
                    onActive={setActiveIndex}
                  >
                    {renderItem ? renderItem(item) : defaultRow(item, query)}
                  </TypeaheadOption>
                ))}
              </div>
            ) : (
              <div className="fa-typeahead-empty">{loading ? messages.searching : emptyText}</div>
            )}
          </div>
          {renderDetail ? (
            <div id={detailId} className="fa-typeahead-detail">
              {activeItem === undefined ? null : renderDetail(activeItem)}
            </div>
          ) : null}
        </div>
      </TypeaheadPopup>
    </>
  )
}
