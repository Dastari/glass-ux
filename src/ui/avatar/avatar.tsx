import { Avatar as BaseAvatar } from "@base-ui/react/avatar"
import type { ComponentProps } from "react"
import { cx } from "../../lib/cx.js"

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"
export type Presence = "online" | "away" | "busy" | "offline"

/** Fallback tints: the eight identity colours (src/styles/identity.css), shared with organisations. */
const TINTS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const

const PRESENCE: Record<Presence, { tone: string; marker: "dot" | "ring"; label: string }> = {
  online: { tone: "success", marker: "dot", label: "Online" },
  away: { tone: "warning", marker: "dot", label: "Away" },
  busy: { tone: "danger", marker: "dot", label: "Busy" },
  offline: { tone: "neutral", marker: "ring", label: "Offline" },
}

/** "Avery Quinn" → "TM", "AzureAD\EllisPark" → "CW", "Front Counter" → "FC". */
export function initials(name: string): string {
  const base = name.split("\\").pop() ?? name
  const words = base
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s._-]+/)
    .filter(Boolean)
  if (words.length === 0) return "?"
  const first = words[0] ?? ""
  const last = words.length > 1 ? (words.at(-1) ?? "") : ""
  return (last ? `${first[0] ?? ""}${last[0] ?? ""}` : first.slice(0, 2)).toUpperCase()
}

/** A stable tint for a name, so the same person is always the same colour. */
export function tintFor(name: string): (typeof TINTS)[number] {
  let hash = 0
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0
  return TINTS[hash % TINTS.length] ?? "1"
}

export interface AvatarProps extends Omit<ComponentProps<"span">, "children"> {
  /** The person's (or account's) name: drives the initials, tint and accessible name. */
  name: string
  /** Image URL; the component uses its fallback when it is absent or fails. */
  src?: string
  size?: AvatarSize
  /** The person’s live availability, drawn as a presence indicator. */
  presence?: Presence
  /** Hide from assistive tech when a visible name sits beside it. */
  decorative?: boolean
}

/**
 * A person or account. The image falls back to initials on a deterministic tint drawn from
 * the palette, so a missing photo still identifies someone at a glance.
 */
export function Avatar({ name, src, size = "md", presence, decorative = false, className, ...rest }: AvatarProps) {
  const spec = presence ? PRESENCE[presence] : undefined
  const label = spec ? `${name} · ${spec.label}` : name
  return (
    <span
      {...rest}
      className={cx("fa-avatar", className)}
      data-size={size}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      title={rest.title ?? label}
    >
      <BaseAvatar.Root className="fa-avatar-face" data-tint={tintFor(name)}>
        {src ? <BaseAvatar.Image className="fa-avatar-image" src={src} alt="" /> : null}
        <BaseAvatar.Fallback className="fa-avatar-initials" delay={src ? 400 : 0}>
          {initials(name)}
        </BaseAvatar.Fallback>
      </BaseAvatar.Root>
      {spec ? <span className="fa-status-dot" data-overlay="" data-tone={spec.tone} data-marker={spec.marker} aria-hidden /> : null}
    </span>
  )
}

export interface AvatarGroupProps extends Omit<ComponentProps<"span">, "children"> {
  /** The people rendered in the avatar group, in display order. */
  people: Array<{ name: string; src?: string }>
  /** Show at most this many faces, then "+N". */
  max?: number
  size?: AvatarSize
}

/** Overlapping faces for "who is here" (watchers, active sessions). */
export function AvatarGroup({ people, max = 4, size = "sm", className, ...rest }: AvatarGroupProps) {
  const shown = people.slice(0, people.length > max ? max - 1 : max)
  const others = people.slice(shown.length)
  return (
    <span {...rest} role="group" aria-label={`${people.length} people`} className={cx("fa-avatar-group", className)} data-size={size}>
      {shown.map((person) => (
        <Avatar key={person.name} name={person.name} src={person.src} size={size} />
      ))}
      {others.length > 0 ? (
        <span
          className="fa-avatar fa-avatar-more"
          data-size={size}
          role="img"
          aria-label={`${others.length} more: ${others.map((person) => person.name).join(", ")}`}
          title={others.map((person) => person.name).join(", ")}
        >
          <span className="fa-avatar-face" data-tint="neutral">
            <span className="fa-avatar-initials">+{others.length}</span>
          </span>
        </span>
      ) : null}
    </span>
  )
}

/** Placeholder with the avatar's exact box. */
export function AvatarSkeleton({ size = "md", className }: { size?: AvatarSize; className?: string }) {
  return (
    <span className={cx("fa-avatar", className)} data-size={size} aria-hidden>
      <span className="fa-skel fa-avatar-face" />
    </span>
  )
}
