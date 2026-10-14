/**
 * Entity kinds for AI output: one glyph, one noun and one route per kind. The kinds belong
 * to the application, which registers them with the EntityResolver; context links, entity
 * chips, the composer's context picker and @-mentions all read the same registry, so an
 * endpoint looks the same wherever the assistant mentions it.
 */
import { IconLink } from "../icons/generated/icons.js"
import type { IconComponent } from "../ui/icon/index.js"
import type { EntityKind, EntityRef } from "./types.js"

export interface EntityKindSpec {
  icon: IconComponent
  /** Singular noun for accessible names ("Endpoint NST-C106"). */
  noun: string
  plural: string
  /** First path segment of the entity's route ("endpoints" → /endpoints/<id>). */
  segment: string
}

export type EntityKinds = Record<EntityKind, EntityKindSpec>

/** Declare the application's entity kinds once. */
export function defineEntityKinds<K extends EntityKinds>(kinds: K): K {
  return kinds
}

const UNKNOWN: EntityKindSpec = { icon: IconLink, noun: "Item", plural: "Items", segment: "" }

export function kindSpec(kinds: EntityKinds, kind: EntityKind): EntityKindSpec {
  return kinds[kind] ?? UNKNOWN
}

/** The entity's route: `/<segment>/<id>`. */
export function entityHref(kinds: EntityKinds, ref: Pick<EntityRef, "kind" | "id">) {
  const segment = kindSpec(kinds, ref.kind).segment
  return segment ? `/${segment}/${encodeURIComponent(ref.id)}` : "#"
}

/**
 * Recognise an internal link (`/endpoints/NST-C106`, `/tickets/4821`) in assistant
 * markdown. Returns null for anything else, which then renders as an ordinary link.
 */
export function parseEntityHref(kinds: EntityKinds, href: string | undefined): Pick<EntityRef, "kind" | "id"> | null {
  if (!href || !href.startsWith("/") || href.startsWith("//")) return null
  const [segment, rawId, ...rest] = href.slice(1).split(/[?#]/)[0]!.split("/")
  if (!segment || !rawId || rest.length > 0) return null
  const kind = Object.keys(kinds).find((key) => kinds[key]!.segment === segment)
  if (!kind) return null
  try {
    const id = decodeURIComponent(rawId)
    return id.length > 0 && id.length <= 128 ? { kind, id } : null
  } catch {
    return null
  }
}

/** Only https links leave the product; anything else renders as plain text. */
export function safeExternalHref(href: string | undefined): string | null {
  if (!href) return null
  try {
    const url = new URL(href)
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null
  } catch {
    return null
  }
}

export function hostOf(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "")
  } catch {
    return href
  }
}

/** Accessible name for an entity reference: "Endpoint NST-C106, online". */
export function entityName(kinds: EntityKinds, ref: EntityRef) {
  const parts = [`${kindSpec(kinds, ref.kind).noun} ${ref.label}`]
  if (ref.status) parts.push(ref.status)
  if (ref.meta) parts.push(ref.meta)
  if (ref.state) parts.push(ref.state.label)
  return parts.join(", ")
}
