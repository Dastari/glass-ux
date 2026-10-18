import { Checkbox } from "../checkbox/index.js"

/**
 * The row, card and header selection box: the shared Checkbox, adapted to the table. It
 * reports Shift so a click can select a range (R11.8). The change details carry the click
 * Base UI forwards to its hidden input, modifiers included.
 */
export interface SelectCheckboxProps {
  /** Controlled checked state. The type specifies whether mixed state is supported. */
  checked: boolean
  indeterminate?: boolean
  label: string
  /** Called with the new checked state when the person toggles the box, and whether Shift was held (to select a range). */
  onToggle: (checked: boolean, modifiers: { shift: boolean }) => void
  tabIndex?: number
}

export function SelectCheckbox({ checked, indeterminate = false, label, onToggle, tabIndex }: SelectCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      indeterminate={indeterminate}
      aria-label={label}
      tabIndex={tabIndex}
      data-dt-interactive=""
      onCheckedChange={(next, details) => {
        const event = details.event as Partial<MouseEvent> | undefined
        onToggle(next, { shift: Boolean(event?.shiftKey) })
      }}
    />
  )
}
