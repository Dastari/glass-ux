import { Select } from "@base-ui/react/select"
import { useState, type ComponentProps } from "react"
import { IconCheck, IconChevronLeft, IconChevronRight, IconChevronsUpDown, IconPageFirst, IconPageLast } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button } from "../button/index.js"
import { Skeleton } from "../skeleton/index.js"
import { formatRange, pageCountOf } from "./range.js"

export interface PaginationCursor {
  hasNext: boolean
  hasPrevious: boolean
  /** Called when next occurs. The callback type specifies its arguments. */
  onNext: () => void
  /** Called when previous occurs. The callback type specifies its arguments. */
  onPrevious: () => void
  /** Called when first occurs. The callback type specifies its arguments. */
  onFirst?: () => void
}

export interface PaginationProps extends Omit<ComponentProps<"nav">, "children"> {
  /** Zero-based page index. */
  pageIndex: number
  /** Number of records per page. */
  pageSize: number
  /** Rows on the current page (the last page may be short). */
  pageRows: number
  /** Total rows on the server; omit when unknown (cursor pages). */
  rowCount?: number
  /** Page-size choices offered by pagination. */
  pageSizes?: readonly number[]
  /** Called when page change occurs. The callback type specifies its arguments. */
  onPageChange?: (pageIndex: number) => void
  /** Called when page size change occurs. The callback type specifies its arguments. */
  onPageSizeChange?: (pageSize: number) => void
  /** Cursor mode: next/previous only, no last page or page jump. */
  cursor?: PaginationCursor
  /** One line: the range and previous/next only (short containers, card lists). */
  compact?: boolean
  /** Names the navigation landmark, e.g. "Endpoint pages". */
  label?: string
  disabled?: boolean
  /** First load: the range is a placeholder and the buttons wait. */
  loading?: boolean
}

/**
 * The pager that sits in a table's status bar. "1–25 of 1,284", the page size, first /
 * previous / page jump / next / last. It adapts to its own width (container queries): the
 * page size, then the jump field, then the first/last buttons fold away.
 */
export function Pagination({
  pageIndex,
  pageSize,
  pageRows,
  rowCount,
  pageSizes = [25, 50, 100],
  onPageChange,
  onPageSizeChange,
  cursor,
  compact = false,
  label = "Pages",
  disabled: disabledProp = false,
  loading = false,
  className,
  ...rest
}: PaginationProps) {
  const disabled = disabledProp || loading
  const pageCount = rowCount === undefined ? undefined : pageCountOf(rowCount, pageSize)
  const hasPrevious = cursor ? cursor.hasPrevious : pageIndex > 0
  const hasNext = cursor ? cursor.hasNext : pageCount !== undefined && pageIndex < pageCount - 1
  const go = (index: number) => onPageChange?.(index)
  const range = formatRange(pageIndex, pageSize, pageRows, rowCount)

  return (
    <nav {...rest} aria-label={label} className={cx("fa-pager", className)} data-compact={compact ? "" : undefined} data-cursor={cursor ? "" : undefined}>
      <span className="fa-pager-range" aria-live="polite" data-numeric>
        {loading ? <Skeleton.Text type="label" className="fa-pager-range-skeleton" /> : range}
      </span>
      {!compact && onPageSizeChange && pageSizes.length > 1 ? (
        <PageSizeSelect value={pageSize} options={pageSizes} onChange={onPageSizeChange} disabled={disabled} />
      ) : null}
      <span className="fa-pager-buttons">
        {!compact && (cursor ? cursor.onFirst : true) ? (
          <Button
            variant="ghost"
            size="sm"
            className="fa-pager-edge"
            icon={<IconPageFirst />}
            aria-label="First page"
            disabled={disabled || !hasPrevious}
            onClick={() => (cursor ? cursor.onFirst?.() : go(0))}
          />
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          icon={<IconChevronLeft />}
          aria-label="Previous page"
          disabled={disabled || !hasPrevious}
          onClick={() => (cursor ? cursor.onPrevious() : go(pageIndex - 1))}
        />
        {!compact && !cursor && pageCount !== undefined && pageCount > 1 ? (
          <PageJump pageIndex={pageIndex} pageCount={pageCount} onChange={go} disabled={disabled} />
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          icon={<IconChevronRight />}
          aria-label="Next page"
          disabled={disabled || !hasNext}
          onClick={() => (cursor ? cursor.onNext() : go(pageIndex + 1))}
        />
        {!compact && !cursor ? (
          <Button
            variant="ghost"
            size="sm"
            className="fa-pager-edge"
            icon={<IconPageLast />}
            aria-label="Last page"
            disabled={disabled || !hasNext || pageCount === undefined}
            onClick={() => pageCount !== undefined && go(pageCount - 1)}
          />
        ) : null}
      </span>
    </nav>
  )
}

function PageSizeSelect({
  value,
  options,
  onChange,
  disabled,
}: {
  value: number
  options: readonly number[]
  /** Called when change occurs. The callback type specifies its arguments. */
  onChange: (value: number) => void
  disabled: boolean
}) {
  const items = options.map((option) => ({ value: option, label: `${option} per page` }))
  return (
    <Select.Root items={items} value={value} onValueChange={(next) => next !== null && onChange(next as number)} disabled={disabled}>
      <Select.Trigger className="fa-control fa-pager-size" data-size="sm" aria-label="Rows per page">
        <Select.Value className="fa-pager-size-value" />
        <Select.Icon className="fa-pager-size-icon">
          <IconChevronsUpDown />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="fa-pager-positioner" sideOffset={6} alignItemWithTrigger={false} side="top" align="end">
          <Select.Popup className="glass-overlay fa-popup fa-pager-popup">
            <Select.List>
              {items.map((item) => (
                <Select.Item key={item.value} value={item.value} className="fa-item">
                  <Select.ItemText className="fa-item-label">{item.label}</Select.ItemText>
                  <Select.ItemIndicator className="fa-pager-check">
                    <IconCheck />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}

function PageJump({
  pageIndex,
  pageCount,
  onChange,
  disabled,
}: {
  pageIndex: number
  pageCount: number
  /** Called when change occurs. The callback type specifies its arguments. */
  onChange: (pageIndex: number) => void
  disabled: boolean
}) {
  // The typed page while editing; otherwise the field shows the current page.
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    const page = Number.parseInt(draft ?? "", 10)
    setDraft(null)
    if (!Number.isInteger(page)) return
    const clamped = Math.min(Math.max(page, 1), pageCount)
    if (clamped - 1 !== pageIndex) onChange(clamped - 1)
  }
  return (
    <span className="fa-pager-jump">
      <span className="fa-control fa-pager-jump-field" data-size="sm">
        <input
          className="fa-control-input"
          inputMode="numeric"
          aria-label={`Page, of ${pageCount}`}
          value={draft ?? String(pageIndex + 1)}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ""))}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit()
            if (event.key === "Escape") setDraft(null)
          }}
          onFocus={(event) => event.target.select()}
        />
      </span>
      <span className="fa-pager-of" data-numeric>
        of {pageCount.toLocaleString("en-AU")}
      </span>
    </span>
  )
}
