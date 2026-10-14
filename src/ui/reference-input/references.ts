/**
 * The model behind ReferenceInput: what a link is, which relations it can take, and how
 * search results are ordered. Pure, so the rules are tested once (references.test.ts).
 *
 *   ReferenceTarget    one linkable entity: kind, id, label, second line, organisation
 *   ReferenceRelation  how the entity relates to the one being edited ("Assigned to")
 *   ReferenceLink      a target plus its relation
 */
import type { IconComponent } from "../icon/index.js"

/** A kind of entity that can be linked: people, devices, sites, tickets… */
export interface ReferenceKind {
  id: string
  /** Singular noun for accessible names: "Person". */
  noun: string
  /** Group label in results and the kind filter: "People". */
  plural: string
  icon: IconComponent
}

/** One linkable entity, with the identity fields a chip and a result row need. */
export interface ReferenceTarget {
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: string
  id: string
  label: string
  /** Second line in results: a UPN, a model, an address. */
  description?: string
  /** The entity's organisation. Results from the current one come first; others are labelled. */
  organisation?: { id: string; name: string }
  /** A picture of it: a person's photo (an authenticated, same-origin URL). */
  image?: string
}

/** How a linked entity relates to the one being edited. */
export interface ReferenceRelation<R extends string = string> {
  value: R
  /** Read before the chip: "Assigned to" Jamie Wells. */
  label: string
  /** Read before a backlink, from the other side: "Owns" FA-PHONE-204. Defaults to `label`. */
  inverseLabel?: string
  /** Only these kinds can take it (Assigned to: people). Default: every kind. */
  kinds?: readonly string[]
  /** At most one link carries it (the owner). Choosing it moves it off any other link. */
  exclusive?: boolean
}

export interface ReferenceLink<R extends string = string> {
  target: ReferenceTarget
  relation: R
}

/** Where results come from: a server search, optionally narrowed to one kind. */
export interface ReferenceSource {
  /** Search every kind, or one. The current organisation is the caller's to rank (orderTargets). */
  search(query: string, options: { kind?: string; signal: AbortSignal }): Promise<ReferenceTarget[] | { items: ReferenceTarget[]; more?: number }>
  /** Shown after @ before typing: recent or suggested entities. */
  suggestions?: readonly ReferenceTarget[]
  /** Wait this long after the last keystroke. Default 200 ms. */
  debounceMs?: number
  /** Characters needed before searching. Default 0. */
  minChars?: number
}

/** "user:jamie.wells": a link's identity. Two links to the same key are duplicates. */
export const referenceKey = (target: Pick<ReferenceTarget, "kind" | "id">) => `${target.kind}:${target.id}`

/** The relations a target can take, in declaration order. */
export function relationsFor<R extends string>(target: ReferenceTarget, relations: readonly ReferenceRelation<R>[]) {
  return relations.filter((relation) => !relation.kinds || relation.kinds.includes(target.kind))
}

/** The relation a new link starts with: the default when the target can take it, else its first. */
export function initialRelation<R extends string>(target: ReferenceTarget, relations: readonly ReferenceRelation<R>[], fallback: R): R {
  const allowed = relationsFor(target, relations)
  if (!allowed.length || allowed.some((relation) => relation.value === fallback)) return fallback
  return allowed[0]!.value
}

/** Add targets, skipping duplicates and anything past `max`. Returns the links and the skipped duplicates. */
export function addLinks<R extends string>(
  links: readonly ReferenceLink<R>[],
  targets: readonly ReferenceTarget[],
  relation: (target: ReferenceTarget) => R,
  max?: number
): { links: ReferenceLink<R>[]; duplicates: string[]; overLimit: boolean } {
  const next = [...links]
  const duplicates: string[] = []
  let overLimit = false
  for (const target of targets) {
    const key = referenceKey(target)
    if (next.some((link) => referenceKey(link.target) === key)) {
      duplicates.push(key)
      continue
    }
    if (max !== undefined && next.length >= max) {
      overLimit = true
      break
    }
    next.push({ target, relation: relation(target) })
  }
  return { links: next, duplicates, overLimit }
}

/**
 * Set one link's relation. An exclusive relation (the owner) moves: any other link that
 * carried it falls back to the default relation (or that link's first allowed one).
 */
export function setRelation<R extends string>(links: readonly ReferenceLink<R>[], key: string, relation: R, relations: readonly ReferenceRelation<R>[], fallback: R): ReferenceLink<R>[] {
  const exclusive = relations.find((entry) => entry.value === relation)?.exclusive ?? false
  return links.map((link) => {
    if (referenceKey(link.target) === key) return { ...link, relation }
    if (exclusive && link.relation === relation) return { ...link, relation: initialRelation(link.target, relations, fallback) }
    return link
  })
}

/** Remove duplicate keys, keeping the first. */
export function dedupeLinks<R extends string>(links: readonly ReferenceLink<R>[]): ReferenceLink<R>[] {
  const seen = new Set<string>()
  return links.filter((link) => {
    const key = referenceKey(link.target)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Results in display order: grouped by kind in the order the kinds are declared, the
 * current organisation's entities first within each kind, otherwise the source's order.
 */
export function orderTargets<T extends ReferenceTarget>(targets: readonly T[], kinds: readonly Pick<ReferenceKind, "id">[], currentOrganisation?: string): T[] {
  const rank = new Map(kinds.map((kind, index) => [kind.id, index]))
  return targets
    .map((target, index) => ({ target, index }))
    .toSorted((a, b) => {
      const byKind = (rank.get(a.target.kind) ?? rank.size) - (rank.get(b.target.kind) ?? rank.size)
      if (byKind) return byKind
      if (currentOrganisation) {
        const aHere = a.target.organisation?.id === currentOrganisation ? 0 : 1
        const bHere = b.target.organisation?.id === currentOrganisation ? 0 : 1
        if (aHere !== bHere) return aHere - bHere
      }
      return a.index - b.index
    })
    .map((entry) => entry.target)
}

/** The text after a leading @: "@sam" → "sam". The @ is the trigger, not part of the query. */
export const referenceQuery = (text: string) => text.replace(/^\s*@/, "").trim()

/** Step through the kind filter: null (every kind), then each kind, wrapping. */
export function stepKind(current: string | null, kinds: readonly Pick<ReferenceKind, "id">[], step: 1 | -1): string | null {
  const order = [null, ...kinds.map((kind) => kind.id)]
  const at = Math.max(0, order.indexOf(current))
  return order[(at + step + order.length) % order.length] ?? null
}
