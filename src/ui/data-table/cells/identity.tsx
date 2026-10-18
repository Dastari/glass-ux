import type { ReactNode } from "react"
import { IconEndpoint } from "../../../icons/generated/icons.js"
import { STATUS, type StatusKind } from "../../badge/index.js"
import { EntityIdentity } from "../../entity/index.js"

export interface IdentityCellProps {
  /** The entity's name: a record, person or organisation. */
  title: ReactNode
  /** Data only (R2.2): an owner, path or identifier, never a description. */
  subtitle?: ReactNode
  /** Entity glyph. Defaults to a generic monitor glyph; pass the entity's own icon without a size. */
  icon?: ReactNode
  /** Live state, drawn as the shared status dot on the glyph's corner. */
  status?: StatusKind
  /** Accessible text for the status dot. Defaults to the state's name ("Online"). */
  statusLabel?: string
}

/**
 * The two-line identity cell: a status-dotted glyph, the name, and a data subtitle. It is
 * EntityIdentity's row tier, so a table's identity column is the same object as the
 * entity's header, tree row and chip. The row owns the actions (⋯ and right-click), so the
 * cell is passive. Used as the title column of entity tables and as the card title.
 */
export function IdentityCell({ title, subtitle, icon, status, statusLabel }: IdentityCellProps) {
  const spec = status ? STATUS[status] : undefined
  return (
    <EntityIdentity
      tier="row"
      name={typeof title === "string" ? title : ""}
      title={typeof title === "string" ? undefined : title}
      icon={icon ?? <IconEndpoint />}
      secondary={subtitle}
      state={
        status && spec
          ? { id: status, label: statusLabel ?? spec.label, tone: spec.tone, activity: spec.marker === "pulse" || spec.marker === "spinner", paused: spec.marker === "ring" }
          : undefined
      }
    />
  )
}
