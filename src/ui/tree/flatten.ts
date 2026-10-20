/**
 * Tree flattening and filtering, kept pure so it is cheap to test and cheap to run on
 * thousands of nodes. The virtualised Tree renders the flat rows this returns. Matching
 * ignores case by the rules of a BCP 47 locale (default `getLocale()`).
 */
import { getLocale } from "../../lib/locale/locale.js"

export interface TreeNodeLike<T extends TreeNodeLike<T>> {
  id: string
  label: string
  description?: string
  /** Text the search also matches that the row does not show: an IP address, a short code. */
  keywords?: readonly string[]
  children?: readonly T[]
}

export interface FlatRow<T extends TreeNodeLike<T>> {
  node: T
  /** 1-based depth (aria-level). */
  level: number
  parentId: string | null
  /** 1-based position among visible siblings (aria-posinset) and their count (aria-setsize). */
  posinset: number
  setsize: number
  hasChildren: boolean
  expanded: boolean
  /** Leaf descendants (filtered while searching) — the group's count. */
  leaves: number
  /** Character range of the query in the label / description, for highlighting. */
  labelMatch: readonly [number, number] | null
  descriptionMatch: readonly [number, number] | null
  /**
   * The keyword that matched when the label and description did not, with its range: the
   * row shows it as its second line so the match is visible.
   */
  keywordMatch: KeywordMatch | null
}

export interface KeywordMatch {
  /** Plain text rendered or copied by the component. */
  text: string
  /** Visible range or selected value interval. */
  range: readonly [number, number]
}

const find = (text: string | undefined, query: string, locale: string): readonly [number, number] | null => {
  if (!text || !query) return null
  const index = text.toLocaleLowerCase(locale).indexOf(query)
  return index < 0 ? null : [index, index + query.length]
}

const findKeyword = (keywords: readonly string[] | undefined, query: string, locale: string): KeywordMatch | null => {
  if (!keywords || !query) return null
  for (const text of keywords) {
    const range = find(text, query, locale)
    if (range) return { text, range }
  }
  return null
}

/**
 * Visible rows in display order. With a query, a node stays when it or a descendant
 * matches, and every group on the way to a match opens (the "reveal" rule). A group that
 * matches by name shows all of its children.
 */
export function flattenTree<T extends TreeNodeLike<T>>(nodes: readonly T[], expanded: ReadonlySet<string>, query = "", locale = getLocale()): FlatRow<T>[] {
  const rows: FlatRow<T>[] = []

  const visit = (list: readonly T[], level: number, parentId: string | null, q: string): void => {
    type Kept = Pick<FlatRow<T>, "node" | "leaves" | "labelMatch" | "descriptionMatch" | "keywordMatch"> & { self: boolean }
    const kept: Kept[] = []
    for (const node of list) {
      const labelMatch = find(node.label, q, locale)
      const descriptionMatch = find(node.description, q, locale)
      const keywordMatch = labelMatch || descriptionMatch ? null : findKeyword(node.keywords, q, locale)
      const self = q !== "" && (labelMatch !== null || descriptionMatch !== null || keywordMatch !== null)
      const leaves = countLeaves(node, self ? "" : q, locale)
      if (!q || self || leaves > 0) kept.push({ node, leaves, self, labelMatch, descriptionMatch, keywordMatch })
    }
    kept.forEach(({ node, leaves, self, labelMatch, descriptionMatch, keywordMatch }, index) => {
      const hasChildren = Boolean(node.children?.length)
      const open = hasChildren && (q ? true : expanded.has(node.id))
      rows.push({ node, level, parentId, posinset: index + 1, setsize: kept.length, hasChildren, expanded: open, leaves, labelMatch, descriptionMatch, keywordMatch })
      if (open && node.children) visit(node.children, level + 1, node.id, self ? "" : q)
    })
  }

  visit(nodes, 1, null, query.trim().toLocaleLowerCase(locale))
  return rows
}

function matches<T extends TreeNodeLike<T>>(node: T, q: string, locale: string): boolean {
  return find(node.label, q, locale) !== null || find(node.description, q, locale) !== null || findKeyword(node.keywords, q, locale) !== null
}

/** Leaf descendants of `node` that match `q` (all of them when `q` is empty). */
function countLeaves<T extends TreeNodeLike<T>>(node: T, q: string, locale: string): number {
  if (!node.children?.length) return 0
  let total = 0
  for (const child of node.children) {
    if (child.children?.length) total += matches(child, q, locale) && q ? countLeaves(child, "", locale) : countLeaves(child, q, locale)
    else if (!q || matches(child, q, locale)) total += 1
  }
  return total
}

/**
 * Typeahead: the next visible row (after `from`, wrapping) whose label starts with `buffer`.
 */
export function typeahead<T extends TreeNodeLike<T>>(rows: readonly FlatRow<T>[], from: number, buffer: string, locale = getLocale()): number {
  const needle = buffer.toLocaleLowerCase(locale)
  for (let step = 1; step <= rows.length; step++) {
    const index = (from + step) % rows.length
    if (rows[index]?.node.label.toLocaleLowerCase(locale).startsWith(needle)) return index
  }
  return -1
}
