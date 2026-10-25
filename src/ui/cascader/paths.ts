/**
 * Cascader paths, kept pure: the columns along an active path, full-path search and the
 * middle truncation of a path in the trigger. A value is the path of option values from the
 * top level ("au", "nsw", "parramatta"), so equal values at different levels never clash.
 */
import type { ReactNode } from "react"
import { getLocale } from "../../lib/locale/locale.js"

/** One option at one level of a Cascader. */
export interface CascaderOption {
  /** Unique among its siblings. */
  value: string
  label: string
  /** Shown before the label in its column. Pass the icon without a size. */
  icon?: ReactNode
  /** Text the search also matches that the row does not show: a code, an old name. */
  keywords?: readonly string[]
  /** The next level. */
  children?: CascaderOption[]
  /**
   * The option has a next level that is not loaded: with `children` undefined it opens a
   * column that loads through `onLoadChildren`. False makes it a leaf.
   */
  hasChildren?: boolean
  disabled?: boolean
}

/** Joins a path's values into one key (the check logic's node id). */
export const PATH_SEPARATOR = "\u001f"
/** The key of a value path. */
export const pathKey = (path: readonly string[]) => path.join(PATH_SEPARATOR)
/** The value path of a key. */
export const keyPath = (key: string) => (key === "" ? [] : key.split(PATH_SEPARATOR))

/** Whether an option opens a next level (loaded or not). */
export const opens = (option: CascaderOption) => Boolean(option.children?.length) || (option.children === undefined && option.hasChildren === true)

/** The options along a value path, as far as it resolves. */
export function resolvePath(options: readonly CascaderOption[], path: readonly string[]): CascaderOption[] {
  const out: CascaderOption[] = []
  let level: readonly CascaderOption[] | undefined = options
  for (const value of path) {
    const option: CascaderOption | undefined = level?.find((item) => item.value === value)
    if (!option) break
    out.push(option)
    level = option.children
  }
  return out
}

/**
 * The columns to show for an active path: the top level, then the children of each option
 * on the path that opens. A column whose options are not loaded yet is `null`.
 */
export function columnsFor(options: readonly CascaderOption[], active: readonly string[]): Array<readonly CascaderOption[] | null> {
  const columns: Array<readonly CascaderOption[] | null> = [options]
  for (const option of resolvePath(options, active)) {
    if (!opens(option)) break
    columns.push(option.children?.length ? option.children : null)
  }
  return columns
}

/** One search result: the options from the top to the match, and each label's match range. */
export interface CascaderMatch {
  path: CascaderOption[]
  /** The [start, end) of the query in each label, or null where that label did not match. */
  ranges: Array<readonly [number, number] | null>
}

/**
 * Full paths whose labels (or keywords) contain the query, in tree order: paths to leaves,
 * or with `anyLevel` to every option. A disabled option and everything under it is left
 * out. Branches that are not loaded are not searched. Returns at most `limit` matches and
 * the total count.
 */
export function searchPaths(
  options: readonly CascaderOption[],
  query: string,
  { anyLevel = false, limit = 50, locale = getLocale() }: { anyLevel?: boolean; limit?: number; locale?: string } = {},
): { matches: CascaderMatch[]; total: number } {
  const q = query.trim().toLocaleLowerCase(locale)
  const matches: CascaderMatch[] = []
  let total = 0
  if (!q) return { matches, total }
  const find = (text: string): readonly [number, number] | null => {
    const at = text.toLocaleLowerCase(locale).indexOf(q)
    return at < 0 ? null : [at, at + q.length]
  }
  const visit = (level: readonly CascaderOption[], trail: CascaderOption[]) => {
    for (const option of level) {
      if (option.disabled) continue
      const path = [...trail, option]
      const leaf = !opens(option)
      if (leaf || anyLevel) {
        const ranges = path.map((item) => find(item.label))
        const hit = ranges.some(Boolean) || path.some((item) => item.keywords?.some((keyword) => find(keyword)))
        if (hit) {
          total += 1
          if (matches.length < limit) matches.push({ path, ranges })
        }
      }
      if (option.children?.length) visit(option.children, path)
    }
  }
  visit(options, [])
  return { matches, total }
}

/** A node for the check logic: id is the path key. */
export interface CascaderCheckNode {
  id: string
  disabled?: boolean
  children?: CascaderCheckNode[]
}

/** The options as check nodes keyed by path, for `multiple`. */
export function toCheckNodes(options: readonly CascaderOption[], trail: readonly string[] = []): CascaderCheckNode[] {
  return options.map((option) => {
    const path = [...trail, option.value]
    return {
      id: pathKey(path),
      disabled: option.disabled,
      children: option.children?.length ? toCheckNodes(option.children, path) : undefined,
    }
  })
}

/**
 * Which segments of a path fit a width, dropping from the middle: the first `head` and the
 * last `tail` segments show, with an ellipsis segment between when any are dropped. When
 * even the first and last do not fit, the first goes too (and the last truncates in CSS).
 */
export function fitPath(widths: readonly number[], available: number, separator: number, ellipsis: number): { head: number; tail: number } {
  const count = widths.length
  const total = widths.reduce((sum, width) => sum + width, 0) + separator * Math.max(0, count - 1)
  if (total <= available || count <= 2) return { head: count, tail: 0 }
  let used = widths[0]! + separator + ellipsis + separator + widths[count - 1]!
  if (used > available) return { head: 0, tail: 1 }
  let tail = 1
  for (let at = count - 2; at >= 1; at--) {
    if (used + widths[at]! + separator > available) break
    used += widths[at]! + separator
    tail += 1
  }
  return { head: 1, tail }
}
