/**
 * TransferList's list logic, kept pure: filtering, grouping into rows, moving values between
 * the two lists, reordering and range selection.
 */
import type { ReactNode } from "react"
import { getLocale } from "../../lib/locale/locale.js"

/** One item that can be assigned. */
export interface TransferItem {
  /** Unique among the items; what the value lists. */
  value: string
  label: string
  /** A second line of data: an identifier, an email address. */
  description?: string
  /** Leading icon. Pass the icon without a size. */
  icon?: ReactNode
  /** Text the search also matches that the row does not show. */
  keywords?: readonly string[]
  /** Items with the same group are listed together under its name (in Available). */
  group?: string
  /** The item cannot be moved; it stays where it is. */
  disabled?: boolean
  /** Why it cannot be moved: the row's tooltip and description (R11.3). */
  disabledReason?: string
}

/** A row of a list: a group heading, or an item. */
export type TransferRow = { kind: "group"; label: string; key: string } | { kind: "item"; item: TransferItem; key: string }

/** Items whose label, description or keywords contain the query (ignoring case by the locale's rules). */
export function filterTransferItems(items: readonly TransferItem[], query: string, locale = getLocale()): TransferItem[] {
  const q = query.trim().toLocaleLowerCase(locale)
  if (!q) return [...items]
  const has = (text: string | undefined) => text !== undefined && text.toLocaleLowerCase(locale).includes(q)
  return items.filter((item) => has(item.label) || has(item.description) || item.keywords?.some(has))
}

/**
 * Rows in display order. With `grouped`, items gather under their group's heading in the
 * order groups first appear; items without a group come first, under no heading.
 */
export function transferRows(items: readonly TransferItem[], grouped: boolean): TransferRow[] {
  if (!grouped || !items.some((item) => item.group)) return items.map((item) => ({ kind: "item", item, key: item.value }))
  const order: string[] = []
  const byGroup = new Map<string, TransferItem[]>()
  for (const item of items) {
    const group = item.group ?? ""
    if (!byGroup.has(group)) {
      byGroup.set(group, [])
      order.push(group)
    }
    byGroup.get(group)!.push(item)
  }
  order.sort((a, b) => (a === "" ? -1 : b === "" ? 1 : 0))
  const rows: TransferRow[] = []
  for (const group of order) {
    if (group) rows.push({ kind: "group", label: group, key: `group:${group}` })
    for (const item of byGroup.get(group)!) rows.push({ kind: "item", item, key: item.value })
  }
  return rows
}

/** Assign values: appended after the assigned ones, in the items' order, skipping any already assigned. */
export function assignValues(assigned: readonly string[], values: Iterable<string>, items: readonly TransferItem[]): string[] {
  const adding = new Set(values)
  const have = new Set(assigned)
  return [...assigned, ...items.filter((item) => adding.has(item.value) && !have.has(item.value)).map((item) => item.value)]
}

/** Unassign values, keeping the order of the rest. */
export function unassignValues(assigned: readonly string[], values: Iterable<string>): string[] {
  const removing = new Set(values)
  return assigned.filter((value) => !removing.has(value))
}

/** Move one value from one index to another. */
export function reorderValues(values: readonly string[], from: number, to: number): string[] {
  if (from === to || from < 0 || from >= values.length) return [...values]
  const next = [...values]
  const [moved] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(next.length, to)), 0, moved!)
  return next
}

/** The enabled values between two keys of a list of items, inclusive (Shift-click and Shift+arrow). */
export function rangeValues(items: readonly TransferItem[], from: string, to: string): string[] {
  const a = items.findIndex((item) => item.value === from)
  const b = items.findIndex((item) => item.value === to)
  if (a < 0 || b < 0) return b < 0 ? [] : items[b]!.disabled ? [] : [to]
  const [start, end] = a < b ? [a, b] : [b, a]
  return items.slice(start, end + 1).filter((item) => !item.disabled).map((item) => item.value)
}
