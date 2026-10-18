/**
 * The context switcher's model, pure: the parent/child tree, what a context includes,
 * search, the rows the popup lists and its labels. The contexts are whatever the host
 * switches between (organisations, projects, workspaces). No React, so it is unit-tested
 * on its own.
 */
import type { ReactNode } from "react"

/** Identity tints 1–8: the categorical hues at tile strength (context-switcher.css). */
export type ContextTint = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/** One context the switcher can choose: an organisation, a project, a workspace. */
export interface ContextItem {
  /** Stable id: the switcher's value, the recent list's key and the tint's seed. */
  id: string
  /** The name shown in the trigger and the list, and searched. */
  name: string
  /** The parent's id. Choosing a parent includes its children (R6.9). */
  parentId?: string | null
  /** A logo. Without one the avatar is `icon`, or initials on a tint. */
  avatarSrc?: string
  /** A glyph on the tint instead of initials, such as a project's folder icon. */
  icon?: ReactNode
  /** One or two letters. Default: from the name. */
  initials?: string
  /**
   * The short code a narrow top bar shows beside the avatar ("NST"), up to six characters.
   * Default: from the name (contextCode).
   */
  code?: string
  /** Default: derived from the id, so a context keeps its colour everywhere. */
  tint?: ContextTint
  /** Trailing data in the list: "214 devices". */
  meta?: string
  /** Also searched: a short name, a domain ("northstar.example"), an old name. */
  keywords?: readonly string[]
}

/** The contexts as a tree, built once from a flat list by `buildContextTree`. */
export interface ContextTree<I extends ContextItem = ContextItem> {
  /** Every context by id. */
  byId: ReadonlyMap<string, I>
  /** Tree order: roots by name, each followed by its children by name, at any depth. */
  ordered: ReadonlyArray<{ item: I; depth: number }>
  /** The direct children of this context, by name. */
  childrenOf: (id: string) => readonly I[]
  /** Every context below this one, at any depth. */
  descendantsOf: (id: string) => readonly I[]
  /** The ancestors of this one, nearest first. */
  ancestorsOf: (id: string) => readonly I[]
}

const byName = (a: ContextItem, b: ContextItem) => a.name.localeCompare(b.name, "en-AU", { sensitivity: "base" })

/**
 * Builds the context tree from a flat list. A context whose parent is missing from the list
 * (or is itself) becomes a root; roots and siblings sort by name; cycles are drawn once.
 * Descendant lookups are cached.
 */
export function buildContextTree<I extends ContextItem>(items: readonly I[]): ContextTree<I> {
  const byId = new Map(items.map((item) => [item.id, item]))
  const children = new Map<string, I[]>()
  const roots: I[] = []
  for (const item of items) {
    // A parent the user cannot see makes this a root, not an orphan.
    const parent = item.parentId && byId.has(item.parentId) && item.parentId !== item.id ? item.parentId : null
    if (parent) {
      const list = children.get(parent) ?? []
      list.push(item)
      children.set(parent, list)
    } else roots.push(item)
  }
  for (const list of children.values()) list.sort(byName)
  roots.sort(byName)

  const ordered: Array<{ item: I; depth: number }> = []
  const seen = new Set<string>()
  const visit = (item: I, depth: number) => {
    if (seen.has(item.id)) return // a cycle in the data: draw each context once
    seen.add(item.id)
    ordered.push({ item, depth })
    for (const child of children.get(item.id) ?? []) visit(child, depth + 1)
  }
  for (const root of roots) visit(root, 0)

  const descendants = new Map<string, I[]>()
  const descendantsOf = (id: string): I[] => {
    const cached = descendants.get(id)
    if (cached) return cached
    const result: I[] = []
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
  const ancestorsOf = (id: string): I[] => {
    const result: I[] = []
    let current = byId.get(id)?.parentId
    while (current && byId.has(current) && !result.some((item) => item.id === current) && current !== id) {
      const parent = byId.get(current)!
      result.push(parent)
      current = parent.parentId
    }
    return result
  }
  return { byId, ordered, childrenOf: (id) => children.get(id) ?? [], descendantsOf, ancestorsOf }
}

/** The context ids a scope covers: the context and everything below it. null = all. */
export function scopeIds(tree: ContextTree, scope: string | null): ReadonlySet<string> | null {
  if (scope === null) return null
  if (!tree.byId.has(scope)) return new Set()
  return new Set([scope, ...tree.descendantsOf(scope).map((item) => item.id)])
}

/** Two letters from a name: "Northstar Studio" → "NS"; "Orbit Workspace" → "OW"; "Hobart" → "HO". */
export function contextInitials(name: string): string {
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
export function contextCode(item: Pick<ContextItem, "name" | "code">): string {
  if (item.code) return item.code.slice(0, 6).toUpperCase()
  const words = item.name
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

/** A stable tint from the id, unless the context sets its own. */
export function contextTint(item: Pick<ContextItem, "id" | "tint">): ContextTint {
  if (item.tint) return item.tint
  let hash = 0
  for (const char of item.id) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0
  return ((hash % 8) + 1) as ContextTint
}

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()

/** How well a context matches a query: lower is better, null is no match. */
export function matchRank(item: Pick<ContextItem, "name" | "keywords">, query: string): number | null {
  const q = fold(query.trim())
  if (!q) return 0
  const name = fold(item.name)
  if (name.startsWith(q)) return 0
  const words = name.split(/[\s-]+/)
  if (words.some((word) => word.startsWith(q))) return 1
  const acronym = words.map((word) => word[0] ?? "").join("")
  if (acronym.startsWith(q.replace(/\s+/g, ""))) return 2
  if (name.includes(q)) return 3
  if (item.keywords?.some((keyword) => fold(keyword).includes(q))) return 4
  return null
}

/** A row in the list: the "all" row, or a context. */
export type SwitcherRowKind = "all" | "item"

/** One row of the switcher's list. */
export interface SwitcherRow<I extends ContextItem = ContextItem> {
  /** Unique across the list: a context can appear under Recent and in the tree. */
  key: string
  /** `all` for the row that clears the scope, `item` for a context. */
  kind: SwitcherRowKind
  /** The scope this row chooses: a context id, or null for all. */
  value: string | null
  /** The row's text: the context's name, or the "all" label. */
  label: string
  /** The context, absent on the "all" row. */
  item?: I
  /** Indent level in the tree. Search results and recents are flat (0). */
  depth: number
  /** Second line: the parent, when a child is listed away from it. */
  detail?: string
  /** How many contexts it includes besides itself. */
  includes: number
}

// A type alias (not an interface) so it satisfies Base UI's Group<Item> index signature.
/** A labelled group of rows: the "all" row, Recent, or the contexts. */
export type SwitcherGroup<I extends ContextItem = ContextItem> = {
  /** Group label; "" for the leading "all" row. */
  value: string
  /** The group's rows, in display order. */
  items: Array<SwitcherRow<I>>
}

/** Every word the switcher shows or announces. `switcherLabels` builds them from a noun. */
export interface SwitcherLabels {
  /** The row and trigger text for no single context: "All organisations". */
  all: string
  /** "All" in a narrow bar, beside its glyph. */
  allShort: string
  /** The Recent group's label. */
  recent: string
  /** The contexts' group label: "Organisations". */
  group: string
  /** What one context is called, capitalised: the phone sheet's title and the trigger's
   *  accessible name ("Organisation: Northstar Studio"). */
  title: string
  /** The trigger's text when nothing is chosen and there is no "all" row: "Choose an organisation". */
  choose: string
  /** The search field's placeholder: "Find an organisation". */
  placeholder: string
  /** The search field's accessible name: "Search organisations". */
  search: string
  /** The popup's accessible name: "Choose an organisation". */
  popup: string
  /** The value is not among the contexts: "Organisation unavailable". */
  missing: string
  /** A remote directory is loading: "Loading organisations". */
  loading: string
  /** A remote directory failed: "Organisation directory unavailable". */
  unavailable: string
  /** A remote directory returned nothing: "No organisations returned". */
  none: string
  /** The remote directory's next page: "Load more organisations". */
  loadMore: string
  /** No context matches the query: "No organisations match “cedar”". */
  noMatch: (query: string) => string
  /** The trigger's accessible name for a parent: "Northstar Studio and 3 organisations under it". */
  includes: (name: string, count: number) => string
  /** Announced when the scope changes from elsewhere: "Now in Northstar Studio". */
  changed: (name: string) => string
}

/** The noun the switcher's English labels are built from. */
export interface SwitcherNoun {
  /** Singular, lower case: "project". */
  one: string
  /** Plural, lower case: "projects". */
  other: string
  /** The article before the singular: "a" or "an". Default: "an" before a vowel. */
  article?: string
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * The switcher's English labels for a noun: `switcherLabels({ one: "project", other:
 * "projects" })` gives "All projects", "Find a project", "Project: Atlas" and the rest.
 * Override single labels by spreading the result.
 */
export function switcherLabels({ one, other, article = /^[aeiou]/i.test(one) ? "an" : "a" }: SwitcherNoun): SwitcherLabels {
  return {
    all: `All ${other}`,
    allShort: "All",
    recent: "Recent",
    group: capitalise(other),
    title: capitalise(one),
    choose: `Choose ${article} ${one}`,
    placeholder: `Find ${article} ${one}`,
    search: `Search ${other}`,
    popup: `Choose ${article} ${one}`,
    missing: `${capitalise(one)} unavailable`,
    loading: `Loading ${other}`,
    unavailable: `${capitalise(one)} directory unavailable`,
    none: `No ${other} returned`,
    loadMore: `Load more ${other}`,
    noMatch: (query) => `No ${other} match “${query}”`,
    includes: (name, count) => `${name} and ${count} ${count === 1 ? one : other} under it`,
    changed: (name) => `Now in ${name}`,
  }
}

/** The switcher's labels when `labels` is not supplied: organisations. */
export const DEFAULT_SWITCHER_LABELS: SwitcherLabels = switcherLabels({ one: "organisation", other: "organisations" })

/**
 * The popup's groups. Without a query: the "all" row (unless `all` is false), Recent (most
 * recent first, the current scope left out), then the whole tree. With a query: matches
 * ranked (name prefix, word prefix, initials, anywhere, keywords), each child naming its
 * parent.
 */
export function switcherGroups<I extends ContextItem>(
  tree: ContextTree<I>,
  { query = "", recent = [], value = null, recentLimit = 4, labels = DEFAULT_SWITCHER_LABELS, all: withAll = true }: {
    /** Current search text. */
    query?: string
    /** Recently chosen ids, most recent first. */
    recent?: readonly string[]
    /** The current scope, left out of Recent. */
    value?: string | null
    /** How many recents to list (default 4). */
    recentLimit?: number
    /** The labels the groups and the "all" row use. */
    labels?: SwitcherLabels
    /** Lead with the "all" row (default true). */
    all?: boolean
  } = {}
): Array<SwitcherGroup<I>> {
  const row = (item: I, depth: number, prefix: string, flat: boolean): SwitcherRow<I> => {
    const parent = item.parentId ? tree.byId.get(item.parentId) : undefined
    return {
      key: `${prefix}:${item.id}`,
      kind: "item",
      value: item.id,
      label: item.name,
      item,
      depth: flat ? 0 : depth,
      detail: flat && parent ? parent.name : undefined,
      includes: tree.descendantsOf(item.id).length,
    }
  }
  const allRow: SwitcherRow<I> = { key: "all", kind: "all", value: null, label: labels.all, depth: 0, includes: tree.byId.size }
  const q = query.trim()
  if (q) {
    const matches = tree.ordered
      .map(({ item }, index) => ({ item, index, rank: matchRank(item, q) }))
      .filter((match): match is { item: I; index: number; rank: number } => match.rank !== null)
      .toSorted((a, b) => a.rank - b.rank || a.index - b.index)
      .map(({ item }) => row(item, 0, "item", true))
    const allMatches = withAll && matchRank({ name: labels.all }, q) !== null
    return [
      ...(allMatches ? [{ value: "", items: [allRow] }] : []),
      ...(matches.length ? [{ value: labels.group, items: matches }] : []),
    ]
  }
  const recents = recent
    .filter((id, index) => id !== value && tree.byId.has(id) && recent.indexOf(id) === index)
    .slice(0, recentLimit)
    .map((id) => row(tree.byId.get(id)!, 0, "recent", true))
  return [
    ...(withAll ? [{ value: "", items: [allRow] }] : []),
    ...(recents.length ? [{ value: labels.recent, items: recents }] : []),
    { value: labels.group, items: tree.ordered.map(({ item, depth }) => row(item, depth, "item", false)) },
  ]
}

/** Move an id to the front of a recent list, capped. */
export function pushRecent(recent: readonly string[], id: string | null, limit = 6): string[] {
  if (!id) return [...recent]
  return [id, ...recent.filter((item) => item !== id)].slice(0, limit)
}
