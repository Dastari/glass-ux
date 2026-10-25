import { IconCheck, IconMinus } from "../../icons/generated/icons.js"
import type { CheckState } from "./check.js"

/**
 * The Checkbox's box drawn inside a row that is itself the control (a treeitem, an option,
 * a menu item carrying aria-checked): same fill, tick and mixed bar, no focus or role of
 * its own. Internal to the pickers.
 */
export function CheckMark({ state, disabled }: { state: CheckState; disabled?: boolean }) {
  return (
    <span
      className="fa-check fa-check-mark"
      data-checked={state === "checked" ? "" : undefined}
      data-indeterminate={state === "mixed" ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      aria-hidden
    >
      {state === "unchecked" ? null : <span className="fa-check-indicator">{state === "mixed" ? <IconMinus /> : <IconCheck />}</span>}
    </span>
  )
}
