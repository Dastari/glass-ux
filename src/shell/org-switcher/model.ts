/**
 * The organisation switcher's model, pure: the parent/child tree, what a scope includes,
 * search, and the rows the popup lists. No React, so it is unit-tested on its own.
 */

/** Identity tints 1–8: the categorical hues at tile strength (org-switcher.css). */
export type OrgTint = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface SwitcherOrganisation {
  id: string
  name: string
  /** The parent's id. Choosing a parent includes its children (R6.9). */
  parentId?: string | null
  /** A logo. Without one the avatar is initials on a tint. */
  avatarSrc?: string
  /** One or two letters. Default: from the name. */
  initials?: string
  /**
   * The short code a narrow top bar shows beside the avatar ("NST"), up to six characters.
   * Default: from the name (orgCode).
   */
  code?: string
  /** Default: derived from the id, so an organisation keeps its colour everywhere. */
  tint?: OrgTint
  /** Trailing data in the list: "214 devices". */
  meta?: string
  /** Also searched: a short name, a domain ("northstar.example"), an old name. */
  keywords?: readonly string[]
}

export interface OrgTree<O extends SwitcherOrganisation = SwitcherOrganisation> {
  byId: ReadonlyMap<string, O>
  /** Tree order: roots by name, each followed by its children by name, at any depth. */
  ordered: ReadonlyArray<{ org: O; depth: number }>
  childrenOf: (id: string) => readonly O[]
  /** Every organisation below this one, at any depth. */
  descendantsOf: (id: string) => readonly O[]
  /** The ancestors of this one, nearest first. */
  ancestorsOf: (id: string) => readonly O[]
}

const byName = (a: SwitcherOrganisation, b: SwitcherOrganisation) => a.name.localeCompare(b.name, "en-AU", { sensitivity: "base" })

/**
 * Builds the organisation tree from a flat list. An organisation whose parent is missing
 * from the list (or is itself) becomes a root; roots and siblings sort by name; cycles are
 * drawn once. Descendant lookups are cached.
 */
export function buildOrgTree<O extends SwitcherOrganisation>(organisations: readonly O[]): OrgTree<O> {
  const byId = new Map(organisations.map((org) => [org.id, org]))
  const children = new Map<string, O[]>()
  const roots: O[] = []
  for (const org of organisations) {
    // A parent the user cannot see makes this a root, not an orphan.
    const parent = org.parentId && byId.has(org.parentId) && org.parentId !== org.id ? org.parentId : null
    if (parent) {
      const list = children.get(parent) ?? []
      list.push(org)
      children.set(parent, list)
    } else roots.push(org)
  }
  for (const list of children.values()) list.sort(byName)
  roots.sort(byName)

  const ordered: Array<{ org: O; depth: number }> = []
  const seen = new Set<string>()
  const visit = (org: O, depth: number) => {
    if (seen.has(org.id)) return // a cycle in the data: draw each organisation once
    seen.add(org.id)
    ordered.push({ org, depth })
    for (const child of children.get(org.id) ?? []) visit(child, depth + 1)
  }
  for (const root of roots) visit(root, 0)

  const descendants = new Map<string, O[]>()
  const descendantsOf = (id: string): O[] => {
    const cached = descendants.get(id)
    if (cached) return cached
    const result: O[] = []
    const walk = (parent: string, trail: Set<string>) => {
      for (const child of children.get(parent) ?? []) {
        if (trail.has(child.id)) continue
        result.push(child)
        walk(child.id, new Set([...trail, child.id]))
      }
    }
    walk(id, new Set([id]))
    descendants.set(id, result)
    return result
  }
  const ancestorsOf = (id: string): O[] => {
    const result: O[] = []
    let current = byId.get(id)?.parentId
    while (current && byId.has(current) && !result.some((org) => org.id === current) && current !== id) {
      const parent = byId.get(current)!
      result.push(parent)
      current = parent.parentId
    }
    return result
  }
  return { byId, ordered, childrenOf: (id) => children.get(id) ?? [], descendantsOf, ancestorsOf }
}

/** The organisation ids a scope covers: the organisation and everything below it. null = all. */
export function scopeIds(tree: OrgTree, scope: string | null): ReadonlySet<string> | null {
  if (scope === null) return null
  if (!tree.byId.has(scope)) return new Set()
  return new Set([scope, ...tree.descendantsOf(scope).map((org) => org.id)])
}

/** "Northstar Studio" → "GS"; "Orbit Workspace" → "FA"; "Hobart" → "HO". */
export function orgInitials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/[\s-]+/)
    .filter((word) => word && !/^(of|the|and|for|&)$/i.test(word))
  if (!words.length) return "?"
  const [first = "", second] = words
  return (second ? `${first[0]}${second[0]}` : first.slice(0, 2)).toUpperCase()
}

/**
 * The short code: the initials of the significant words, up to four ("Northstar Studio
 * Council" → "NST"), or the first four letters of a one-word name ("Tasmania" → "TASM").
 */
export function orgCode(org: Pick<SwitcherOrganisation, "name" | "code">): string {
  if (org.code) return org.code.slice(0, 6).toUpperCase()
  const words = org.name
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/[\s-]+/)
    .filter((word) => word && !/^(of|the|and|for|&)$/i.test(word))
  if (!words.length) return "?"
  if (words.length === 1) return words[0]!.slice(0, 4).toUpperCase()
  return words
    .slice(0, 4)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

/** A stable tint from the id. */
export function orgTint(org: Pick<SwitcherOrganisation, "id" | "tint">): OrgTint {
  if (org.tint) return org.tint
  let hash = 0
  for (const char of org.id) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0
  return ((hash % 8) + 1) as OrgTint
}

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()

/** How well an organisation matches a query: lower is better, null is no match. */
export function matchRank(org: SwitcherOrganisation, query: string): number | null {
  const q = fold(query.trim())
  if (!q) return 0
  const name = fold(org.name)
  if (name.startsWith(q)) return 0
  const words = name.split(/[\s-]+/)
  if (words.some((word) => word.startsWith(q))) return 1
  const acronym = words.map((word) => word[0] ?? "").join("")
  if (acronym.startsWith(q.replace(/\s+/g, ""))) return 2
  if (name.includes(q)) return 3
  if (org.keywords?.some((keyword) => fold(keyword).includes(q))) return 4
  return null
}

export type SwitcherRowKind = "all" | "organisation"

export interface SwitcherRow<O extends SwitcherOrganisation = SwitcherOrganisation> {
  /** Unique across the list: an organisation can appear under Recent and in the tree. */
  key: string
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: SwitcherRowKind
  /** The scope this row chooses: an organisation id, or null for all. */
  value: string | null
  label: string
  org?: O
  /** Indent level in the tree. Search results and recents are flat (0). */
  depth: number
  /** Second line: the parent, when a child is listed away from it. */
  detail?: string
  /** How many organisations it includes besides itself. */
  includes: number
}

// A type alias (not an interface) so it satisfies Base UI's Group<Item> index signature.
export type SwitcherGroup<O extends SwitcherOrganisation = SwitcherOrganisation> = {
  /** Group label; "" for the leading "All organisations" row. */
  value: string
  items: Array<SwitcherRow<O>>
}

export interface SwitcherLabels {
  all: string
  /** All organisations in a narrow bar, beside its glyph. */
  allShort: string
  recent: string
  organisations: string
}

/** The switcher's English group and scope labels, used when `labels` is not supplied. */
export const DEFAULT_SWITCHER_LABELS: SwitcherLabels = {
  all: "All organisations",
  allShort: "All",
  recent: "Recent",
  organisations: "Organisations",
}

/**
 * The popup's groups. Without a query: All organisations, Recent (most recent first, the
 * current scope left out), then the whole tree. With a query: matches ranked (name prefix,
 * word prefix, initials, anywhere, keywords), each child naming its parent.
 */
export function switcherGroups<O extends SwitcherOrganisation>(
  tree: OrgTree<O>,
  { query = "", recent = [], value = null, recentLimit = 4, labels = DEFAULT_SWITCHER_LABELS }: {
    /** Current search text or typed query state. */
    query?: string
    recent?: readonly string[]
    value?: string | null
    recentLimit?: number
    /** Display and accessibility labels supplied by the application. */
    labels?: SwitcherLabels
  } = {}
): Array<SwitcherGroup<O>> {
  const row = (org: O, depth: number, prefix: string, flat: boolean): SwitcherRow<O> => {
    const parent = org.parentId ? tree.byId.get(org.parentId) : undefined
    return {
      key: `${prefix}:${org.id}`,
      kind: "organisation",
      value: org.id,
      label: org.name,
      org,
      depth: flat ? 0 : depth,
      detail: flat && parent ? parent.name : undefined,
      includes: tree.descendantsOf(org.id).length,
    }
  }
  const all: SwitcherRow<O> = { key: "all", kind: "all", value: null, label: labels.all, depth: 0, includes: tree.byId.size }
  const q = query.trim()
  if (q) {
    const matches = tree.ordered
      .map(({ org }, index) => ({ org, index, rank: matchRank(org, q) }))
      .filter((match): match is { org: O; index: number; rank: number } => match.rank !== null)
      .toSorted((a, b) => a.rank - b.rank || a.index - b.index)
      .map(({ org }) => row(org, 0, "org", true))
    const allMatches = matchRank({ id: "all", name: labels.all }, q) !== null
    return [
      ...(allMatches ? [{ value: "", items: [all] }] : []),
      ...(matches.length ? [{ value: labels.organisations, items: matches }] : []),
    ]
  }
  const recents = recent
    .filter((id, index) => id !== value && tree.byId.has(id) && recent.indexOf(id) === index)
    .slice(0, recentLimit)
    .map((id) => row(tree.byId.get(id)!, 0, "recent", true))
  return [
    { value: "", items: [all] },
    ...(recents.length ? [{ value: labels.recent, items: recents }] : []),
    { value: labels.organisations, items: tree.ordered.map(({ org, depth }) => row(org, depth, "org", false)) },
  ]
}

/** Move an id to the front of a recent list, capped. */
export function pushRecent(recent: readonly string[], id: string | null, limit = 6): string[] {
  if (!id) return [...recent]
  return [id, ...recent.filter((item) => item !== id)].slice(0, limit)
}
