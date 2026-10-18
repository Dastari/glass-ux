import { Combobox as BaseCombobox } from "@base-ui/react/combobox"
import type { ReactNode } from "react"
import { IconClose } from "../../icons/generated/icons.js"
import { Button } from "../button/index.js"
import { Tooltip } from "../tooltip/index.js"
import { TruncatedText } from "../truncated-text/index.js"

export interface OptionChipProps {
  label: string
  /** Leading icon. Pass it without a size. */
  icon?: ReactNode
  /** Why this value is not valid: the chip turns danger and the reason is its tooltip. */
  invalid?: string
  /** Flash once (an attempt to add it again). */
  flash?: boolean
  /** Plain text: nothing to focus or remove. */
  readOnly?: boolean
  /** Enter or double-click edits the chip in place. */
  onEdit?: () => void
}

/**
 * The one chip used by MultiSelect and TagInput: optional icon, a label that truncates
 * with a tooltip, and a remove button named "Remove …". Chips are reachable with ← → from
 * the input; Backspace or Delete removes the focused one.
 */
export function OptionChip({ label, icon, invalid, flash, readOnly, onEdit }: OptionChipProps) {
  if (readOnly) {
    return (
      <span className="fa-chip" data-invalid={invalid ? "" : undefined}>
        {icon}
        <TruncatedText className="fa-chip-label">{label}</TruncatedText>
      </span>
    )
  }
  const chip = (
    <BaseCombobox.Chip
      className="fa-chip"
      aria-label={invalid ? `${label}, ${invalid}` : label}
      data-invalid={invalid ? "" : undefined}
      data-flash={flash ? "" : undefined}
      onDoubleClick={onEdit}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || !onEdit) return
        event.preventBaseUIHandler()
        event.preventDefault()
        onEdit()
      }}
    >
      {icon}
      {invalid ? <span className="fa-chip-label">{label}</span> : <TruncatedText className="fa-chip-label">{label}</TruncatedText>}
      <BaseCombobox.ChipRemove
        render={<Button variant="ghost" size="sm" shape="circle" className="fa-chip-remove" icon={<IconClose />} aria-label={`Remove ${label}`} />}
      />
    </BaseCombobox.Chip>
  )
  return invalid ? (
    <Tooltip content={invalid} describe={false}>
      {chip}
    </Tooltip>
  ) : (
    chip
  )
}

/** A chip-shaped twin used only to measure how many chips fit (no behaviour, hidden). */
export function ChipMeasure({ label, icon, removable = true }: {
  label: string
  icon?: ReactNode
  /** Reserve the remove button's width (default true); false for read-only chips. */
  removable?: boolean
}) {
  return (
    <span className="fa-chip" data-measure="chip">
      {icon}
      <span className="fa-chip-label">{label}</span>
      {removable ? <span className="fa-chip-remove-space" /> : null}
    </span>
  )
}
