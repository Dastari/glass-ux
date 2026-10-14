/** Device columns for the filters demo: every column filters by meaning (R16.7). */
import { IconEndpoint, IconLaptop, IconServer } from "../../icons/generated/icons.js"
import {
  createDataTableColumns,
  filters,
  IdentityCell,
  NumericCell,
  RelativeTime,
  SparklineCell,
  StatusBadge,
  TextCell,
  type DataTableSearch,
  type FilterOption,
} from "../../ui/data-table/index.js"
import type { Domain } from "../../ui/sparkline/index.js"
import { osSource, SITES, type Device } from "./data-table-filters.fixtures.js"

const PERCENT: Domain = [0, 100]
const SITE_OPTIONS: FilterOption[] = SITES.map((site) => ({ value: site, label: site }))

function glyph(device: Device) {
  if (device.os.startsWith("Windows Server") || device.os.startsWith("Ubuntu")) return <IconServer />
  if (device.os.startsWith("macOS") || device.os.startsWith("ChromeOS")) return <IconLaptop />
  return <IconEndpoint />
}

const col = createDataTableColumns<Device>()

export const deviceColumns = col.columns([
  col.accessor("hostname", {
    header: "Endpoint",
    pin: true,
    width: 14,
    minWidth: 11,
    sortable: true,
    cardRole: "title",
    skeleton: "identity",
    filter: filters.text({ field: "Hostname", nullable: false }),
    cell: ({ row }) => (
      <IdentityCell
        title={row.original.hostname}
        subtitle={row.original.user ?? "No one signed in"}
        icon={glyph(row.original)}
        status={row.original.online ? "online" : "offline"}
      />
    ),
  }),
  col.accessor("os", {
    header: "Operating system",
    priority: 2,
    width: 13,
    minWidth: 10,
    sortable: true,
    filter: filters.options({ field: "Os", source: osSource, label: "OS", nullable: false }),
  }),
  col.accessor("lastSeen", {
    header: "Last seen",
    priority: 2,
    width: 7.5,
    minWidth: 7,
    maxWidth: 10,
    sortable: true,
    sortDescFirst: true,
    skeleton: "time",
    filter: filters.date({ field: "LastSeenEpoch", storage: "epoch-seconds", nullable: false }),
    cell: ({ getValue }) => <RelativeTime value={getValue() * 1000} />,
  }),
  col.accessor("memoryUsed", {
    header: "Memory used",
    priority: 3,
    width: 7,
    maxWidth: 9,
    align: "end",
    sortable: true,
    sortDescFirst: true,
    // Stored as a fraction (0.62); the cell and the filter speak percent.
    filter: filters.number({ field: "MemoryUsed", server: "decimal", unit: "%", scale: 0.01, min: 0, max: 100, label: "Memory" }),
    cell: ({ getValue }) => {
      const value = getValue()
      return <NumericCell value={value === null ? null : value * 100} unit="%" />
    },
  }),
  col.accessor("online", {
    header: "Status",
    priority: 1,
    width: 7,
    minWidth: 6.5,
    maxWidth: 9,
    grow: false,
    sortable: true,
    cardRole: "status",
    skeleton: "badge",
    filter: filters.boolean({ field: "Online", labels: { true: "Online", false: "Offline" }, label: "Status" }),
    cell: ({ getValue }) => <StatusBadge status={getValue() ? "online" : "offline"} size="sm" />,
  }),
  col.accessor("serial", {
    header: "Serial number",
    priority: 3,
    width: 8.5,
    maxWidth: 11,
    sortable: true,
    filter: filters.text({ field: "Serial", label: "Serial", nullable: false }),
    cell: ({ getValue }) => <TextCell identifier>{getValue()}</TextCell>,
  }),
  col.accessor("site", {
    header: "Site",
    priority: 3,
    width: 7.5,
    maxWidth: 10,
    sortable: true,
    filter: filters.options({ field: "Site", options: SITE_OPTIONS }),
  }),
  col.accessor("cpu", {
    header: "CPU",
    priority: 4,
    width: 8.5,
    minWidth: 8,
    maxWidth: 10,
    grow: false,
    skeleton: "sparkline",
    filter: { none: "Recent samples drawn as a sparkline, not a stored value" },
    cell: ({ getValue }) => {
      const values = getValue()
      if (!values.length) return <TextCell muted>—</TextCell>
      return <SparklineCell values={values} domain={PERCENT} unit="%" label="CPU over the last 20 minutes" />
    },
  }),
])

/** Column id → graphql-orm OrderBy field, for the request readout. */
export const ORDER_FIELDS: Record<string, string> = {
  hostname: "Hostname",
  os: "Os",
  lastSeen: "LastSeenEpoch",
  memoryUsed: "MemoryUsed",
  online: "Online",
  serial: "Serial",
  site: "Site",
}

/**
 * The toolbar search (R16.8): hostname and serial (columns), and the signed-in user (shown
 * under the hostname, not a column of its own). The Where is an `Or` of `Contains` on each.
 */
export const deviceSearch: DataTableSearch<Device> = {
  fields: ["hostname", "serial", { field: "SignedInUser", value: (device) => device.user }],
  placeholder: "Search hostname, serial, user",
}
