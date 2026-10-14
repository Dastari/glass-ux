import { createContext, useContext, type ReactNode } from "react"
import type { ActionSet } from "../../lib/actions/actions.js"
import type { EntityKinds } from "../entities.js"
import type { EntityKind, EntityRef } from "../types.js"

/**
 * Where an entity is drawn, smallest to largest:
 *   icon     the glyph (option rows, source marks, card tiles)
 *   chip     a context link in prose, the composer, approval targets
 *   row      a plain link in a table cell or list row
 *   preview  the hover card's content
 *   card     a tool result about one entity (inside the AI card frame)
 */
export type EntityTier = "icon" | "chip" | "row" | "preview" | "card"

export interface EntityRenderOptions {
  /** chip: inline (in prose) or sm (rows, composer). */
  size?: "inline" | "sm"
  /** chip: a removable chip (composer context, picked entities). */
  onRemove?: () => void
  /** chip/row: open the preview on hover and focus. */
  preview?: boolean
  /** card: the facts the tool returned and the data subtitle. */
  facts?: Array<{ label: string; value: string }>
  /** Data shown beneath or beside the title. */
  subtitle?: string
  className?: string
}

/**
 * THE swap point for entity identity. When the application supplies `render`, every
 * entity in AI output (chips, rows, glyphs, previews, entity result cards) is drawn by
 * it — so a device looks identical in an answer and on its own page. Return `undefined`
 * to keep the built-in rendering for that kind or tier.
 */
export type EntityRenderer = (entity: EntityRef, tier: EntityTier, options: EntityRenderOptions) => ReactNode | undefined

/** What a preview card shows for one entity. Supplied by the application that owns the data. */
export interface EntityPreview {
  /** Data subtitle (R2.2): "HP EliteOne 1000 G2 · Windows 11 Business". */
  subtitle?: string
  /** Three or four key facts. */
  facts?: Array<{ label: string; value: string }>
}

/**
 * The seam between AI output and the application's data. Chips, cards and the composer ask
 * the resolver for the kind registry (glyph, noun, route), previews, the entity's action set
 * (R12: the same definition its own pages use) and how to open it.
 *
 * SWAP POINT: the application root provides the real resolver (fragments, the router, the
 * window manager); the gallery and the templates provide fixtures.
 */
export interface EntityResolver {
  kinds: EntityKinds
  /** Preview content or its availability. */
  preview: (ref: EntityRef) => EntityPreview | undefined
  /** Supporting actions rendered in the action slot. */
  actions: (kind: EntityKind) => ActionSet<EntityRef> | undefined
  /** Navigate to the entity's page. */
  open: (ref: EntityRef) => void
  /** Open the entity in a secondary window (R14). */
  openWindow: (ref: EntityRef) => void
  /** Search for the composer's context picker and @-mentions. */
  search?: (query: string, kind?: EntityKind) => EntityRef[]
  /**
   * Recognise a tool result object as an entity (by its GraphQL type name or its fields),
   * so generic results upgrade to entity cards and lists (results/generic.tsx).
   */
  recognise?: (value: Record<string, unknown>, typename?: string) => EntityRef | null
  /** Draw entities with the application's identity system (see EntityRenderer). */
  render?: EntityRenderer
}

const NOOP: EntityResolver = {
  kinds: {},
  preview: () => undefined,
  actions: () => undefined,
  open: (ref) => console.info(`[ai] open ${ref.kind}/${ref.id}`),
  openWindow: (ref) => console.info(`[ai] openWindow ${ref.kind}/${ref.id}`),
}

const ResolverContext = createContext<EntityResolver>(NOOP)

/** Connect entity kinds, names, destinations, previews, search and actions to host-defined adapters. */
export function EntityResolverProvider({ resolver, children }: { resolver: EntityResolver; children: ReactNode }) {
  return <ResolverContext value={resolver}>{children}</ResolverContext>
}

export function useEntityResolver() {
  return useContext(ResolverContext)
}
