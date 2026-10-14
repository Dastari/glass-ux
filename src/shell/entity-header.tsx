/**
 * EntityHeader — the primary window's app bar, directly on the canvas (no glass): the
 * entity's tile icon, title, status, a data subtitle (R2.2), actions, and the L2 tabs
 * below (R6.1). It is EntityIdentity's header tier (src/ui/entity), so a page header is
 * the same object as the entity's row, chip and icon. It steps down with its width (48rem,
 * 30rem) and in short windows (R7): the icon steps down, the title drops a size, and
 * actions stay on the title row (the ActionBar collapses itself).
 *
 * Kept for screens that pass ready-made parts; new code renders EntityIdentity (or a
 * domain wrapper such as an application's device identity) with tier="header".
 */
import type { ComponentProps, ReactNode } from "react"
import { EntityIdentity } from "../ui/entity/index.js"

export interface EntityHeaderProps extends Omit<ComponentProps<"header">, "title" | "ref"> {
  /** The entity's icon (IconEndpoint, IconOrganisation…). */
  icon?: ReactNode
  /** A StatusDot on the icon's corner. */
  iconStatus?: ReactNode
  title: ReactNode
  /** A StatusBadge beside the title. */
  status?: ReactNode
  /** Data only: model, owner, path. Never a description of the page. */
  subtitle?: ReactNode
  /** ActionBar: header actions, primary right-most. */
  actions?: ReactNode
  /** L2 Tabs. */
  tabs?: ReactNode
}

/** A responsive page heading for an entity, with identity, status, supporting metadata and host-defined actions. */
export function EntityHeader({ icon, iconStatus, title, status, subtitle, actions, tabs, ...rest }: EntityHeaderProps) {
  return (
    <EntityIdentity
      {...rest}
      tier="header"
      name={typeof title === "string" ? title : ""}
      title={typeof title === "string" ? undefined : title}
      icon={icon}
      facts={subtitle}
      tabs={tabs}
      slots={{ badge: iconStatus ?? null, state: status ?? null, actions: actions ?? null }}
    />
  )
}

/** The header's loading state: the same boxes as the loaded header (R9.3). */
export function EntityHeaderSkeleton({ subtitle = true, tabs = false }: { subtitle?: boolean; tabs?: boolean }) {
  return <EntityIdentity.Skeleton tier="header" facts={subtitle} tabs={tabs} />
}
