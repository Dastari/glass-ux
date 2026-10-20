import type { ComponentProps, ReactNode } from "react"
import { IconSpinner } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info"
export type BadgeSize = "sm" | "md"
/** What sits before the label: nothing, a solid dot, a hollow ring (paused), a pulsing
 *  dot (live / connecting) or a spinner (work in progress). */
export type BadgeMarker = "none" | "dot" | "ring" | "pulse" | "spinner"

export interface BadgeProps extends ComponentProps<"span"> {
  tone?: BadgeTone
  size?: BadgeSize
  /** Leading marker. `dot` is the common case ("● Online"). */
  marker?: BadgeMarker
  /** Leading icon instead of a marker. Pass the icon without a size. */
  icon?: ReactNode
}

/**
 * A soft pill that labels state or category. Tone carries meaning (R3.3): status tones only
 * for status, accent for brand or selection, neutral for everything else.
 */
export function Badge({ tone = "neutral", size = "md", marker = "none", icon, className, children, ...rest }: BadgeProps) {
  return (
    <span {...rest} className={cx("fa-badge", className)} data-tone={tone} data-size={size}>
      {icon ? <span className="fa-badge-icon">{icon}</span> : <BadgeMarkerGlyph marker={marker} />}
      <span className="fa-badge-label">{children}</span>
    </span>
  )
}

function BadgeMarkerGlyph({ marker }: { marker: BadgeMarker }) {
  if (marker === "none") return null
  if (marker === "spinner") return <IconSpinner className="fa-badge-spinner" />
  return <span className="fa-badge-dot" data-marker={marker} aria-hidden />
}

// ── Status ──────────────────────────────────────────────────────────────────

/** A connection or operational state shown by `StatusBadge`, `StatusDot` and tree rows. */
export type StatusKind =
  | "online"
  | "offline"
  | "warning"
  | "error"
  | "installing"
  | "maintenance"
  | "connecting"
  | "live"

interface StatusSpec {
  tone: BadgeTone
  marker: Exclude<BadgeMarker, "none">
  label: string
}

/** One definition of how each status looks, shared by badges, dots and the tree. */
export const STATUS: Record<StatusKind, StatusSpec> = {
  online: { tone: "success", marker: "dot", label: "Online" },
  offline: { tone: "neutral", marker: "dot", label: "Offline" },
  warning: { tone: "warning", marker: "dot", label: "Warning" },
  error: { tone: "danger", marker: "dot", label: "Error" },
  installing: { tone: "info", marker: "spinner", label: "Installing" },
  maintenance: { tone: "neutral", marker: "ring", label: "Maintenance" },
  connecting: { tone: "info", marker: "pulse", label: "Connecting" },
  live: { tone: "success", marker: "pulse", label: "Live" },
}

export interface StatusBadgeProps extends Omit<BadgeProps, "tone" | "marker" | "icon"> {
  /** Current operation or connection status. */
  status: StatusKind
}

/** A status as a badge. The label defaults to the state name. */
export function StatusBadge({ status, children, ...rest }: StatusBadgeProps) {
  const spec = STATUS[status]
  return (
    <Badge {...rest} tone={spec.tone} marker={spec.marker} data-status={status}>
      {children ?? spec.label}
    </Badge>
  )
}

export interface StatusDotProps extends Omit<ComponentProps<"span">, "children"> {
  /** Current operation or connection status. */
  status: StatusKind
  /** Accessible name. Omit when a visible label already says the state. */
  label?: string
  /** Sit on the corner of an icon or avatar, ringed in the surface colour. */
  overlay?: boolean
}

/** The bare status dot: tree rows, dock icons, avatar presence, table cells. */
export function StatusDot({ status, label, overlay = false, className, ...rest }: StatusDotProps) {
  const spec = STATUS[status]
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
      className={cx("fa-status-dot", className)}
      data-tone={spec.tone}
      data-marker={spec.marker === "spinner" ? "pulse" : spec.marker}
      data-status={status}
      data-overlay={overlay ? "" : undefined}
    />
  )
}

// ── Counts ──────────────────────────────────────────────────────────────────

export interface CountBadgeProps extends Omit<ComponentProps<"span">, "children"> {
  value: number
  /** Above this, show "max+". */
  max?: number
  tone?: Extract<BadgeTone, "neutral" | "accent" | "danger">
  /**
   * It sits on another element's corner (an avatar, a rail or dock icon, an entity tile):
   * a solid fill and a ring in the colour beneath, never the soft tint. Position it from
   * the outside.
   */
  overlay?: boolean
}

/** A number beside a navigation item or group ("Endpoints 12"), or on a corner (overlay). Tabular figures. */
export function CountBadge({ value, max = 999, tone = "neutral", overlay = false, className, ...rest }: CountBadgeProps) {
  const number = numberFormat(useLocale())
  const text = value > max ? `${number.format(max)}+` : number.format(value)
  return (
    <span {...rest} className={cx("fa-count", className)} data-tone={tone} data-overlay={overlay ? "" : undefined} data-numeric>
      {text}
    </span>
  )
}

export interface NotificationDotProps extends Omit<ComponentProps<"span">, "children"> {
  /** Accessible name, e.g. "3 unread notifications". */
  label: string
  tone?: Extract<BadgeTone, "accent" | "danger">
}

/** A small dot on the corner of an icon button (unread notifications). The parent must be
 *  positioned. */
export function NotificationDot({ label, tone = "accent", className, ...rest }: NotificationDotProps) {
  return <span role="img" aria-label={label} {...rest} className={cx("fa-notify-dot", className)} data-tone={tone} />
}
