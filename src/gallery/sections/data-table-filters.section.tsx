import type { ColumnFiltersState, SortingState } from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"
import { Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { toWhere, type WhereInput } from "../../adapters/graphql-orm/index.js"
import { Disclosure } from "../../ui/accordion/index.js"
import { DataTable, FilterEditor, filterColumns, useTableUrlState, type DataTableState, type FilterSpec } from "../../ui/data-table/index.js"
import { Popover } from "../../ui/popover/index.js"
import { deviceColumns, deviceSearch, ORDER_FIELDS } from "./data-table-filters.columns.js"
import { createDeviceServer, SORTABLE, type Device, type DevicePage, type DeviceQuery } from "./data-table-filters.fixtures.js"

const server = createDeviceServer()
const getRowId = (device: Device) => device.id
const PAGE_SIZES = [25, 50, 100] as const
const NOUN = { one: "device", other: "devices" }
const DEFAULT_SORTING: SortingState = [{ id: "hostname", desc: false }]

/** Fetch a page like a Query-backed view: first load, then stale-while-revalidate. */
function useDevicePage(query: DeviceQuery, latency = true) {
  const key = JSON.stringify(query)
  const [result, setResult] = useState<{ key: string; page: DevicePage; at: number } | null>(null)
  useEffect(() => {
    let cancelled = false
    void server.query(JSON.parse(key) as DeviceQuery, { latency }).then((page) => {
      if (!cancelled) setResult({ key, page, at: Date.now() })
    })
    return () => {
      cancelled = true
    }
  }, [key, latency])
  return { page: result?.page ?? null, pending: !result || result.key !== key, updatedAt: result?.at }
}

/** The request as graphql-orm receives it: Where, OrderBy and Page. */
function request(where: WhereInput | undefined, sorting: SortingState, pageIndex: number, pageSize: number) {
  return {
    ...(where ? { Where: where } : {}),
    OrderBy: Object.fromEntries(sorting.map((sort) => [ORDER_FIELDS[sort.id] ?? sort.id, sort.desc ? "DESC" : "ASC"])),
    Page: { Limit: pageSize, Offset: pageIndex * pageSize },
  }
}

function DevicesDemo() {
  const url = useTableUrlState({
    prefix: "dev",
    sortable: SORTABLE,
    pageSizes: PAGE_SIZES,
    defaultPageSize: 25,
    defaultSorting: DEFAULT_SORTING,
    columns: deviceColumns,
  })
  const { sorting, filters, pagination, search } = url.state
  // Presets are computed from the local day when the query is built; the search is the
  // first And entry.
  const where = useMemo(() => toWhere(filters, deviceColumns, { search: { query: search, spec: deviceSearch } }), [filters, search])
  const query = useMemo<DeviceQuery>(() => ({ where, sorting, page: { limit: pagination.pageSize, offset: pagination.pageIndex * pagination.pageSize } }), [where, sorting, pagination])
  const { page, pending, updatedAt } = useDevicePage(query)
  const sent = request(where, sorting, pagination.pageIndex, pagination.pageSize)

  return (
    <div className="dtf-demo">
      <div className="dtf-frame" data-testid="dtf-main">
        <DataTable<Device>
          id="gallery-devices-filters"
          label="Devices"
          rows={page?.rows ?? []}
          rowCount={page?.rowCount}
          columns={deviceColumns}
          getRowId={getRowId}
          state={url.state}
          onStateChange={url.onStateChange}
          search={deviceSearch}
          pageSizes={PAGE_SIZES}
          loading={!page}
          refetching={Boolean(page) && pending}
          emptyMessage="No devices enrolled"
          getRowLabel={(device) => device.hostname}
          updatedAt={updatedAt}
          noun={NOUN}
        />
      </div>
      <Disclosure title="Server query" meta={page ? `${page.rowCount.toLocaleString("en-AU")} of ${server.devices.length} rows` : undefined} className="dtf-query">
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll region must be keyboard scrollable (R20.6) */}
        <div className="dtf-json" role="region" tabIndex={0} aria-label="GraphQL variables" data-scroll-container="">
          <pre data-testid="dtf-where">{JSON.stringify(sent, null, 2)}</pre>
        </div>
      </Disclosure>
    </div>
  )
}

/**
 * The same table in a narrow pane: cards, the search gives way to its "Search: …" chip, and
 * the filter chips fold into "4 filters".
 */
const NARROW_FILTERS: ColumnFiltersState = [
  { id: "os", value: { op: "in", values: ["Windows 11 Business 24H2", "Windows 11 Pro 24H2"] } },
  { id: "lastSeen", value: { op: "olderThan", days: 30 } },
  { id: "memoryUsed", value: { op: "gt", value: 50 } },
  { id: "site", value: { op: "in", values: ["Mossbridge", "Cedar Annex"] } },
]

function NarrowDemo() {
  const [state, setState] = useState<DataTableState>({ sorting: DEFAULT_SORTING, filters: NARROW_FILTERS, search: "orb", pagination: { pageIndex: 0, pageSize: 25 }, selection: {} })
  const where = useMemo(() => toWhere(state.filters, deviceColumns, { search: { query: state.search, spec: deviceSearch } }), [state.filters, state.search])
  const { page, pending } = useDevicePage({ where, sorting: state.sorting, page: { limit: 25, offset: state.pagination.pageIndex * 25 } }, false)
  return (
    <div className="gallery-lab-frame dtf-narrow" data-lab-frame="narrow" data-testid="dtf-narrow">
      <DataTable<Device>
        id="gallery-devices-filters-narrow"
        label="Devices (narrow)"
        rows={page?.rows ?? []}
        rowCount={page?.rowCount}
        columns={deviceColumns}
        getRowId={getRowId}
        state={state}
        onStateChange={setState}
        search={deviceSearch}
        loading={!page}
        refetching={Boolean(page) && pending}
        getRowLabel={(device) => device.hostname}
        noun={NOUN}
      />
    </div>
  )
}

/* ── Each editor, open, as the popover shows it ──────────────────────────────── */
const EDITOR_SAMPLES: Record<string, unknown> = {
  os: { op: "in", values: ["Windows 11 Business 24H2", "macOS 15 Sequoia"] },
  lastSeen: { op: "recent", days: 7 },
  memoryUsed: { op: "between", min: 20, max: 80 },
  online: { op: "eq", value: true },
  serial: { op: "in", values: ["8CC0481GWV", "5CG2101XYZ"] },
  hostname: { op: "startsWith", value: "NST" },
}

function EditorPreview({ id, label, spec }: { id: string; label: string; spec: FilterSpec }) {
  const [value, setValue] = useState<unknown>(EDITOR_SAMPLES[id])
  return (
    <Popover.Preview title={label} size={spec.kind === "date" ? "lg" : "md"}>
      <FilterEditor spec={spec} label={label} value={value} onChange={setValue} onCommit={setValue} />
    </Popover.Preview>
  )
}

function EditorGallery() {
  const columns = filterColumns(deviceColumns).filter((column) => column.id in EDITOR_SAMPLES)
  return (
    <div className="dtf-editors">
      {columns.map((column) => (
        <figure key={column.id} className="gallery-example dtf-editor">
          <div className="gallery-example-stage">
            <EditorPreview id={column.id} label={column.spec.label ?? column.header} spec={column.spec} />
          </div>
          <figcaption className="gallery-example-label">{column.spec.kind}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export default function DataTableFiltersSection() {
  return (
    <SectionPage>
      <Specimen
        title="Devices"
        description="400 devices behind a mock graphql-orm server that evaluates the table's Where and returns one page. Search from the toolbar, or filter from a column menu, the Filters button, a chip or a right-click. Search, filters, sort and page live in the URL."
        layout="bare"
        wide
      >
        <DevicesDemo />
      </Specimen>

      <Specimen
        title="Narrow pane"
        description="Below 36rem rows become cards; the search field gives way to an icon (here its “Search: …” chip, which opens the field over the line), and filter chips that do not fit fold into one."
        layout="bare"
        wide
      >
        <NarrowDemo />
      </Specimen>

      <Specimen title="Editors" description="One per kind, the same shape: condition, value, Clear and Apply. Checkbox lists, yes/no and date presets apply as you choose." layout="bare" wide>
        <EditorGallery />
      </Specimen>

      <Rules
        do={[
          "Give every column a filter chosen by what it means, or `filter: { none }` with the reason.",
          "Give every table a search on its identifying columns, sent as the first And entry.",
          "Offer only the operators the server's filter type can run.",
          "Enter numbers in the unit the cell shows and let the column's scale convert them.",
          "Keep relative dates relative in the URL so shared links keep rolling.",
          "Build the Where with toWhere on every fetch so presets use today's boundaries.",
        ]}
        dont={[
          "Filter a paged result in the browser; rows on other pages vanish silently.",
          "Use IsToday or RecentDays for timestamps; they use the database's UTC day.",
          "Offer `is one of` on a Decimal column; DecimalFilter has no lists.",
          "Wrap the chips onto a second line; fold them instead.",
          "Fake facet counts from the current page.",
          "Search one page of a paged result in the browser.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--accent-soft", "Chip fill"],
          ["--accent-text", "Chip text and the header glyph"],
          ["--accent-line", "Chip edge (60%)"],
          ["--control-h-sm", "Toolbar controls; chips are one step smaller"],
          ["--radius-full", "Chip shape"],
          ["--icon-xs", "Header glyph"],
          ["--check-size", "Option checkboxes (sm)"],
        ]}
      />
    </SectionPage>
  )
}
