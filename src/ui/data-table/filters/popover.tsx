import { useRef, useState } from "react"
import { Popover } from "../../popover/index.js"
import type { FilterController, FilterTarget } from "./controller.js"
import { FilterEditor } from "./editors.js"

const focusable = (element: HTMLElement) => element.tabIndex >= 0 && !element.closest("[aria-hidden='true']") && element.getClientRects().length > 0

/** The first control to type or choose in: a text box, else the chosen option, else the first control. */
function firstControl(popup: HTMLElement | null): HTMLElement | true {
  const body = popup?.querySelector(".fa-popover-body")
  if (!body) return true
  const find = (selector: string) => [...body.querySelectorAll<HTMLElement>(selector)].find(focusable)
  return (
    find("input:not([type='hidden']):not([disabled])") ??
    find("[role='radio'][aria-checked='true'], [aria-pressed='true']") ??
    find("button:not([disabled]), [tabindex='0']") ??
    true
  )
}

/**
 * One filter editor per table, in a popover anchored to whatever opened it: the column's
 * header cell, a chip or the Filters button (a menu cannot hold form fields, R13.5). Esc
 * closes it and discards a half-typed value; a click outside applies it. Focus returns to
 * the header's menu button (or the chip, or the Filters button).
 */
export function FilterPopover({ controller }: { controller: FilterController }) {
  const { target, setFilter, learnLabels, close } = controller
  // Keep the last target through the exit animation.
  const [shown, setShown] = useState<FilterTarget | null>(target)
  if (target && target !== shown) setShown(target)
  const current = target ?? shown
  const column = current ? controller.column(current.columnId) : undefined
  const flush = useRef<(() => void) | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  return (
    <Popover.Root
      open={target !== null}
      onOpenChange={(open, details) => {
        if (open) return
        if (details.reason !== "escape-key") flush.current?.()
        flush.current = null
        close()
      }}
    >
      {current && column ? (
        <Popover.Popup
          ref={popupRef}
          anchor={current.anchor}
          side="bottom"
          align="start"
          size={column.spec.kind === "date" ? "lg" : "md"}
          title={column.label}
          className="fa-dt-filter-popover"
          data-kind={column.spec.kind}
          aria-label={`Filter ${column.label}`}
          initialFocus={() => firstControl(popupRef.current)}
          finalFocus={() => {
            const back = current.returnFocus
            if (back?.isConnected) return back
            return controller.filtersButton() ?? true
          }}
        >
          <FilterEditor
            key={current.session}
            spec={column.spec}
            label={column.label}
            value={controller.valueOf(column.id)}
            onChange={(value) => setFilter(column.id, value)}
            onCommit={(value) => {
              flush.current = null
              setFilter(column.id, value)
              close()
            }}
            onFlush={(apply) => {
              flush.current = apply
            }}
            onLabels={(pairs) => learnLabels(column.id, pairs)}
          />
        </Popover.Popup>
      ) : null}
    </Popover.Root>
  )
}
