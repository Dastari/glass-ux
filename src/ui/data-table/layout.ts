/**
 * Column layout for DataTable: which columns fit the container (R16.2) and the CSS custom
 * properties that size them. Everything here is pure and measured in rem, so it scales
 * with --ui-scale and is unit-tested without a DOM.
 *
 * Rules
 *   - Required columns (pinned, or priority 1) always show, even if that means scrolling.
 *   - The rest join in priority order (1 → 5, then definition order) while their minimum
 *     widths fit. The first one that does not fit hides, and so does every column after
 *     it, so a narrowing container always hides the lowest-priority column first.
 *   - A user-sized column is fixed at its width: it never grows or shrinks, so a resize
 *     never moves under the pointer.
 *   - Flexible columns start at their preferred width, shrink towards their minimum when
 *     space is short and share spare space (up to their maximum) when it is plentiful.
 */

export interface LayoutColumn {
  id: string
  /** 1 = never hide … 5 = hide first. Pinned columns behave as priority 1. */
  priority: number
  /** Preferred width (rem): the user's width when `fixed`, otherwise the default. */
  width: number
  minWidth: number
  maxWidth: number
  /** Pinned to the start edge. */
  pinned: boolean
  /** Sized by the user (fixed width). */
  fixed: boolean
  /** Hidden from the column menu; never shown, never counted. */
  userHidden: boolean
  /** May take a share of spare width. */
  grow: boolean
}

export interface LayoutResult {
  /** Visible column ids in display order (pinned first). */
  visible: string[]
  /** Columns hidden for lack of room, in display order. Shown in the "+N" detail. */
  autoHidden: string[]
  /** Smallest width (rem) the visible columns need; the row's min-width. */
  minTotal: number
}

/** The width a column needs before it counts as fitting. */
export function columnNeed(column: LayoutColumn) {
  return column.fixed || column.pinned ? column.width : Math.min(column.minWidth, column.width)
}

/** Display order: start-pinned columns (in pin order), then the rest in definition order. */
export function orderColumns<C extends { id: string }>(columns: readonly C[], pinned: readonly string[]): C[] {
  const byId = new Map(columns.map((column) => [column.id, column]))
  const head = pinned.flatMap((id) => {
    const column = byId.get(id)
    return column ? [column] : []
  })
  const pinnedSet = new Set(pinned)
  return [...head, ...columns.filter((column) => !pinnedSet.has(column.id))]
}

/**
 * Decide which columns are visible in `available` rem (the container width minus the
 * selection and trailing cells). `columns` must already be in display order.
 */
export function computeColumnLayout(columns: readonly LayoutColumn[], available: number): LayoutResult {
  const candidates = columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => !column.userHidden)
  const required = candidates.filter(({ column }) => column.pinned || column.priority <= 1)
  const optional = candidates
    .filter(({ column }) => !(column.pinned || column.priority <= 1))
    .toSorted((a, b) => a.column.priority - b.column.priority || a.index - b.index)

  const shown = new Set<string>()
  let used = 0
  for (const { column } of required) {
    shown.add(column.id)
    used += columnNeed(column)
  }
  for (const { column } of optional) {
    const need = columnNeed(column)
    if (used + need > available + 1e-6) break
    shown.add(column.id)
    used += need
  }

  const visible: string[] = []
  const autoHidden: string[] = []
  for (const { column } of candidates) {
    if (shown.has(column.id)) visible.push(column.id)
    else autoHidden.push(column.id)
  }
  return { visible, autoHidden, minTotal: round(used) }
}

/* ── CSS custom properties ─────────────────────────────────────────────────────── */

/** A column id made safe for a custom property name. */
export function columnKey(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_")
}

export const cssVar = {
  width: (key: string) => `--fa-dt-c-${key}-w`,
  min: (key: string) => `--fa-dt-c-${key}-min`,
  max: (key: string) => `--fa-dt-c-${key}-max`,
  grow: (key: string) => `--fa-dt-c-${key}-g`,
  shrink: (key: string) => `--fa-dt-c-${key}-s`,
  start: (key: string) => `--fa-dt-c-${key}-x`,
}

const rem = (value: number) => `${round(value)}rem`
function round(value: number) {
  return Math.round(value * 1000) / 1000
}

/**
 * The custom properties for the root element. Computed once per render; cells only
 * reference the variable names, so a resize never re-renders a row.
 */
export function columnVars(
  columns: readonly LayoutColumn[],
  visible: readonly string[],
  options: { selectWidth: string | null }
): Record<string, string> {
  const vars: Record<string, string> = {}
  const byId = new Map(columns.map((column) => [column.id, column]))
  const startOffsets: string[] = options.selectWidth ? ["var(--fa-dt-select-w)"] : []
  for (const id of visible) {
    const column = byId.get(id)
    if (!column) continue
    const key = columnKey(id)
    const still = column.fixed || column.pinned
    vars[cssVar.width(key)] = rem(column.width)
    vars[cssVar.min(key)] = rem(still ? column.width : Math.min(column.minWidth, column.width))
    vars[cssVar.max(key)] = rem(still ? column.width : Math.max(column.maxWidth, column.width))
    vars[cssVar.grow(key)] = still || !column.grow ? "0" : "1"
    vars[cssVar.shrink(key)] = still ? "0" : "1"
    if (column.pinned) {
      vars[cssVar.start(key)] = startOffsets.length ? `calc(${startOffsets.join(" + ")})` : "0"
      startOffsets.push(`var(${cssVar.width(key)})`)
    }
  }
  return vars
}

/** Inline style for a cell or header cell; references only variable names. */
const styleCache = new Map<string, Record<string, string>>()
export function columnStyle(id: string, pinned: boolean) {
  const cacheKey = `${id}\u0000${pinned ? 1 : 0}`
  let style = styleCache.get(cacheKey)
  if (!style) {
    const key = columnKey(id)
    style = {
      flexGrow: `var(${cssVar.grow(key)})`,
      flexShrink: `var(${cssVar.shrink(key)})`,
      flexBasis: `var(${cssVar.width(key)})`,
      minWidth: `var(${cssVar.min(key)})`,
      maxWidth: `var(${cssVar.max(key)})`,
      ...(pinned ? { insetInlineStart: `var(${cssVar.start(key)})` } : {}),
    }
    styleCache.set(cacheKey, style)
  }
  return style
}

/**
 * Height (rem) of the expanded detail line that lists auto-hidden fields under a row:
 * an auto-fill grid of label/value pairs.
 */
export function detailHeight(fieldCount: number, width: number, metrics: DetailMetrics) {
  if (fieldCount <= 0) return 0
  const perRow = Math.max(1, Math.floor((width - metrics.inset + metrics.gap) / (metrics.field + metrics.gap)))
  const lines = Math.ceil(fieldCount / perRow)
  return round(metrics.padTop + metrics.padBottom + lines * metrics.line + (lines - 1) * metrics.gapY)
}

export interface DetailMetrics {
  /** Minimum width of one label/value pair. */
  field: number
  gap: number
  gapY: number
  /** Height of one pair (label line + value line). */
  line: number
  padTop: number
  padBottom: number
  /** Start inset (selection cell). */
  inset: number
}
