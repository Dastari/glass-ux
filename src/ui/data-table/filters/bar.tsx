import { useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import { IconClose, IconFilter } from "../../../icons/generated/icons.js"
import { useElementSize } from "../../../lib/use-element-size.js"
import { Button } from "../../button/index.js"
import { Menu } from "../../menu/index.js"
import { Popover } from "../../popover/index.js"
import { TruncatedText } from "../../truncated-text/index.js"
import { ToolbarSearch, type ToolbarSearchBinding } from "../search/toolbar-search.js"
import type { DataTableFilterToggle } from "../types.js"
import type { ActiveFilter, FilterController } from "./controller.js"
import { remPx } from "../../../lib/rem.js"

/** The search field's width (rem), mirrored from search.css (`.fa-dt-search` --_w). */
const SEARCH_FIELD_REM = 16
/** Room the chips need beside the field before it gives way to an icon: about one folded chip. */
const CHIP_ROOM_REM = 7
/** The "Search: …" chip's share of a narrow line (search.css caps it at 12rem, past this it truncates). */
const SEARCH_CHIP_REM = 8
/** Below this room a single filter chip folds into "1 filter" instead of truncating. */
const SINGLE_CHIP_MIN_REM = 8

const formatFilters = (count: number) => `${count} ${count === 1 ? "filter" : "filters"}`

/** One active filter: the summary opens its editor here; ✕ removes it. */
function FilterChip({
  filter,
  controller,
  onOpen,
  anchor,
}: {
  filter: ActiveFilter
  controller: FilterController
  /** Called before the editor opens (the folded list closes itself). */
  onOpen?: () => void
  /** Where the editor anchors and focus returns, when not this chip (the "N filters" chip). */
  anchor?: () => HTMLElement | null
}) {
  const ref = useRef<HTMLSpanElement>(null)
  return (
    <span ref={ref} className="fa-dt-filter-chip" data-col={filter.column.key}>
      <button
        type="button"
        className="fa-dt-filter-chip-body fa-pressable"
        aria-label={`Edit filter: ${filter.summary}`}
        aria-haspopup="dialog"
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          onOpen?.()
          const elsewhere = anchor?.()
          if (elsewhere) controller.open(filter.column.id, elsewhere, elsewhere)
          else controller.open(filter.column.id, ref.current, event.currentTarget)
        }}
      >
        <TruncatedText className="fa-dt-filter-chip-label">{filter.summary}</TruncatedText>
      </button>
      <Button
        variant="ghost"
        size="xs"
        shape="circle"
        className="fa-dt-filter-chip-remove"
        icon={<IconClose />}
        aria-label={`Remove filter: ${filter.summary}`}
        onClick={() => controller.setFilter(filter.column.id, undefined)}
      />
    </span>
  )
}

/** A toggle that is on, as a chip: its summary opens nothing; ✕ turns it off. */
function ToggleChip({ toggle }: { toggle: DataTableFilterToggle }) {
  return (
    <span className="fa-dt-filter-chip" data-toggle={toggle.id}>
      <span className="fa-dt-filter-chip-body">
        <TruncatedText className="fa-dt-filter-chip-label">{toggle.summary ?? toggle.label}</TruncatedText>
      </span>
      <Button
        variant="ghost"
        size="xs"
        shape="circle"
        className="fa-dt-filter-chip-remove"
        icon={<IconClose />}
        aria-label={`Remove filter: ${toggle.summary}`}
        onClick={() => toggle.onCheckedChange(false)}
      />
    </span>
  )
}

const NO_TOGGLES: readonly DataTableFilterToggle[] = []

/**
 * The toolbar strip (R16.7, R16.8): the search field, a Filters button listing every
 * filterable column (hidden ones too) and any on/off toggles ("Show hidden"), a chip per
 * active filter and Clear filters. Chips stay on one line; when they do not fit, they fold
 * into one "N filters" chip that lists them, with Clear filters. When the field and room
 * for the chips do not fit, the field gives way to an icon button (or a "Search: …" chip
 * while a query is active) that opens it over the line. The strip's height never changes,
 * so searching or filtering never moves the table.
 */
export function FilterBar({
  controller,
  toggles = NO_TOGGLES,
  search,
}: {
  controller: FilterController
  toggles?: readonly DataTableFilterToggle[]
  /** Search definition or controlled search value. */
  search?: ToolbarSearchBinding
}) {
  const { columns } = controller
  const hasFilters = columns.length > 0 || toggles.length > 0
  const onToggles = toggles.filter((toggle) => toggle.checked && toggle.summary)
  const anyOn = controller.active.length > 0 || toggles.some((toggle) => toggle.checked)
  // Toggles that are on count as active filters for the strip (chips, the fold, Clear).
  const active = controller.active
  const chipCount = active.length + onToggles.length
  const clearAll = () => {
    for (const toggle of toggles) if (toggle.checked) toggle.onCheckedChange(false)
    controller.clearAll()
  }
  const barRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const { width } = useElementSize(barRef)
  const [folded, setFolded] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const countRef = useRef<HTMLButtonElement>(null)
  const menuOpening = useRef(false)
  const summaryKey = [...active.map((filter) => filter.summary), ...onToggles.map((toggle) => toggle.summary)].join("\u0000")
  const searchOpen = narrow && expanded
  const query = search?.value ?? ""
  const hasSearch = Boolean(search)

  // Clear filters leaves the line while the chips are folded (it moves into their list), so
  // its width is remembered from when it was last drawn.
  const clearWidth = useRef(0)

  useLayoutEffect(() => {
    const bar = barRef.current
    const layer = measureRef.current
    const strip = stripRef.current
    // While the field is open over the line, the line underneath keeps its last layout.
    if (!bar || !layer || !strip || width === 0 || searchOpen) return
    const slot = searchRef.current
    const rem = remPx()
    const barGap = Number.parseFloat(getComputedStyle(bar).columnGap) || 0
    const widthOf = (element: Element) => element.getBoundingClientRect().width
    const clear = bar.querySelector(":scope > .fa-dt-filters-clear")
    if (clear) clearWidth.current = widthOf(clear)
    // The controls always on the line (Filters), then Clear filters as if the chips showed.
    // Named, not every child: an open menu adds focus guards beside its trigger.
    const filtersButton = bar.querySelector(":scope > .fa-dt-filters-button")
    const fixed = filtersButton ? widthOf(filtersButton) + barGap : 0
    const clearSpan = anyOn ? clearWidth.current + barGap : 0
    if (hasSearch) {
      const needed = fixed + clearSpan + SEARCH_FIELD_REM * rem + barGap + (chipCount ? CHIP_ROOM_REM * rem + barGap : 0)
      const nextNarrow = width < needed - 0.5
      if (nextNarrow !== narrow) {
        // Measure the chips again once the field (or its button) is drawn.
        setNarrow(nextNarrow)
        if (!nextNarrow) setExpanded(false)
        return
      }
    }
    // The room the chips may take: the bar less its other controls and gaps. On a narrow
    // line the "Search: …" chip keeps a fixed share (it truncates past it), so the fold never
    // depends on how far the search chip shrank.
    const slotSpan = !slot ? 0 : narrow && query ? SEARCH_CHIP_REM * rem + barGap : widthOf(slot) + barGap
    const available = width - fixed - clearSpan - slotSpan
    const chips = [...layer.children].map((node) => widthOf(node))
    const gap = Number.parseFloat(getComputedStyle(strip).columnGap) || 0
    const total = chips.reduce((sum, chip) => sum + chip, 0) + gap * Math.max(0, chips.length - 1)
    const over = total > available + 0.5
    // Several chips fold as soon as they do not fit; a single one truncates, and folds only
    // when too little of it would show.
    setFolded(chips.length > 1 ? over : chips.length === 1 ? over && available < SINGLE_CHIP_MIN_REM * rem : false)
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- summaryKey and the query: re-measure when the chips change
  }, [width, summaryKey, narrow, searchOpen, query, hasSearch, chipCount, anyOn])

  const collapsed = folded && chipCount > 0

  return (
    <div ref={barRef} className="fa-dt-filterbar" data-search={search ? (searchOpen ? "open" : narrow ? "collapsed" : "field") : undefined}>
      {search ? <ToolbarSearch ref={searchRef} binding={search} narrow={narrow} expanded={expanded} onExpandedChange={setExpanded} /> : null}
      {hasFilters ? (
        <Menu.Root
          onOpenChange={(open) => {
            if (open) menuOpening.current = false
          }}
        >
          <Menu.Trigger
            render={
              <Button size="sm" variant="secondary" className="fa-dt-filters-button" icon={<IconFilter />}>
                Filters
              </Button>
            }
          />
          <Menu.Popup align="start" aria-label="Filters" finalFocus={() => !menuOpening.current}>
            {columns.length ? (
              <Menu.Group>
                {columns.map((column) => (
                  <Menu.Item
                    key={column.id}
                    icon={<IconFilter />}
                    trail={controller.hintOf(column.id) ?? undefined}
                    onClick={() => {
                      menuOpening.current = true
                      const button = controller.filtersButton()
                      controller.open(column.id, button, button)
                    }}
                  >
                    {column.label}
                  </Menu.Item>
                ))}
              </Menu.Group>
            ) : null}
            {toggles.length ? (
              <Menu.Group>
                {toggles.map((toggle) => (
                  <Menu.CheckboxItem key={toggle.id} checked={toggle.checked} onCheckedChange={(checked) => toggle.onCheckedChange(checked)} closeOnClick={false}>
                    {toggle.label}
                  </Menu.CheckboxItem>
                ))}
              </Menu.Group>
            ) : null}
            {anyOn ? (
              <Menu.Group>
                <Menu.Item icon={<IconClose />} onClick={clearAll}>
                  Clear filters
                </Menu.Item>
              </Menu.Group>
            ) : null}
          </Menu.Popup>
        </Menu.Root>
      ) : null}

      <div ref={stripRef} className="fa-dt-filter-chips" role="list" aria-label="Active filters">
        <div ref={measureRef} className="fa-dt-filter-measure" aria-hidden>
          {[...active.map((filter) => ({ key: filter.column.id, summary: filter.summary })), ...onToggles.map((toggle) => ({ key: `toggle:${toggle.id}`, summary: toggle.summary }))].map((chip) => (
            <span key={chip.key} className="fa-dt-filter-chip" data-measure="">
              <span className="fa-dt-filter-chip-body">
                <span className="fa-dt-filter-chip-label">{chip.summary}</span>
              </span>
              <span className="fa-dt-filter-chip-remove-space" />
            </span>
          ))}
        </div>
        {collapsed ? (
          <span role="listitem" className="fa-dt-filter-item">
            <Popover.Root open={listOpen} onOpenChange={setListOpen}>
              <Popover.Trigger
                render={
                  <button
                    ref={countRef}
                    type="button"
                    className="fa-dt-filter-chip fa-dt-filter-chip-body fa-dt-filter-count fa-pressable"
                    aria-label={`${formatFilters(chipCount)}: show all`}
                  >
                    <IconFilter />
                    <span className="fa-dt-filter-chip-label">{formatFilters(chipCount)}</span>
                  </button>
                }
              />
              <Popover.Popup size="md" align="start" aria-label="Active filters" className="fa-dt-filter-list-popover">
                <div className="fa-dt-filter-list" role="list">
                  {active.map((filter) => (
                    <span key={filter.column.id} role="listitem" className="fa-dt-filter-item">
                      <FilterChip filter={filter} controller={controller} onOpen={() => setListOpen(false)} anchor={() => countRef.current} />
                    </span>
                  ))}
                  {onToggles.map((toggle) => (
                    <span key={toggle.id} role="listitem" className="fa-dt-filter-item">
                      <ToggleChip toggle={toggle} />
                    </span>
                  ))}
                </div>
                {/* Folded, Clear filters lives here (and in the Filters menu), off the line. */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="fa-dt-filter-list-clear"
                  onClick={() => {
                    setListOpen(false)
                    clearAll()
                  }}
                >
                  Clear filters
                </Button>
              </Popover.Popup>
            </Popover.Root>
          </span>
        ) : (
          <>
            {active.map((filter) => (
              <span key={filter.column.id} role="listitem" className="fa-dt-filter-item">
                <FilterChip filter={filter} controller={controller} />
              </span>
            ))}
            {onToggles.map((toggle) => (
              <span key={toggle.id} role="listitem" className="fa-dt-filter-item">
                <ToggleChip toggle={toggle} />
              </span>
            ))}
          </>
        )}
      </div>
      {anyOn && !collapsed ? (
        <Button size="sm" variant="ghost" className="fa-dt-filters-clear" onClick={clearAll}>
          Clear filters
        </Button>
      ) : null}
    </div>
  )
}
