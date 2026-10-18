/** Endpoint columns and actions for the DataTable gallery (realistic Glass UX data, R2). */
import { useMemo } from "react"
import { EntityIdentity } from "../../ui/entity/index.js"
import { IconEndpoint } from "../../icons/generated/icons.js"
import { defineActions, type ActionDefinition, type ActionSet } from "../../ui/actions/index.js"
import {
  createDataTableColumns,
  NumericCell,
  RelativeTime,
  SparklineCell,
  StatusBadge,
  TextCell,
  TwoLineCell,
} from "../../ui/data-table/index.js"
import type { StatusKind as BadgeStatus } from "../../ui/badge/index.js"
import type { Domain } from "../../ui/sparkline/index.js"
import type { Endpoint, EndpointStatus } from "./data-table.fixtures.js"
import { endpointActions as sharedEndpointActions, type DemoEndpoint } from "./overlays.fixtures.js"

/** The fixture's states drawn as the shared endpoint states (src/ui/badge STATUS). */
export const STATUS: Record<EndpointStatus, { status: BadgeStatus; label: string }> = {
  online: { status: "online", label: "Online" },
  offline: { status: "offline", label: "Offline" },
  attention: { status: "warning", label: "Needs restart" },
  error: { status: "error", label: "Agent error" },
}

const PERCENT: Domain = [0, 100]

const col = createDataTableColumns<Endpoint>()

export const endpointColumns = col.columns([
  col.accessor("name", {
    header: "Endpoint",
    pin: true,
    width: 15,
    minWidth: 11,
    maxWidth: 28,
    sortable: true,
    cardRole: "title",
    skeleton: "identity",
    // The row owns opening and the menus; the identity inside it is passive.
    cell: ({ row }) => (
      <EntityIdentity name={row.original.name} icon={<IconEndpoint />} tier="row" secondary={row.original.user === "—" ? "No one signed in" : row.original.user} />
    ),
  }),
  col.accessor("status", {
    header: "Status",
    priority: 1,
    width: 8.5,
    minWidth: 8,
    maxWidth: 10,
    grow: false,
    sortable: true,
    cardRole: "status",
    skeleton: "badge",
    cell: ({ getValue }) => {
      const state = STATUS[getValue()]
      return (
        <StatusBadge status={state.status} size="sm">
          {state.label}
        </StatusBadge>
      )
    },
  }),
  col.accessor("organisation", { header: "Organisation", priority: 2, width: 14, minWidth: 10, sortable: true }),
  col.accessor((row) => `${row.os} ${row.osVersion}`, {
    id: "os",
    header: "Operating system",
    priority: 2,
    width: 12,
    minWidth: 10,
    sortable: true,
    cell: ({ row }) => <TwoLineCell title={row.original.os} subtitle={row.original.osVersion} />,
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
    cell: ({ getValue }) => <RelativeTime value={getValue()} />,
  }),
  col.accessor("cpu", {
    header: "CPU",
    priority: 3,
    width: 8.5,
    minWidth: 8,
    maxWidth: 10,
    grow: false,
    sortable: true,
    sortDescFirst: true,
    skeleton: "sparkline",
    cell: ({ getValue }) => {
      const values = getValue()
      const last = values[values.length - 1]
      if (last === undefined) return <TextCell muted>—</TextCell>
      return (
        <SparklineCell
          values={values}
          domain={PERCENT}
          unit="%"
          label="CPU over the last 20 minutes"
          tone={last >= 85 ? "danger" : last >= 70 ? "warning" : "neutral"}
        />
      )
    },
  }),
  col.accessor("ip", {
    header: "IP address",
    priority: 3,
    width: 8,
    minWidth: 7.5,
    maxWidth: 10,
    sortable: true,
    cell: ({ getValue }) => <TextCell identifier>{getValue()}</TextCell>,
  }),
  col.accessor("agentVersion", {
    header: "Agent",
    priority: 4,
    width: 5.5,
    minWidth: 5,
    maxWidth: 7,
    sortable: true,
    cell: ({ getValue }) => <TextCell identifier>{getValue()}</TextCell>,
  }),
  col.accessor("model", { header: "Model", priority: 4, width: 14, minWidth: 10, sortable: true }),
  col.accessor("memoryGb", {
    header: "Memory",
    priority: 4,
    width: 6.5,
    maxWidth: 8,
    align: "end",
    sortable: true,
    sortDescFirst: true,
    cell: ({ getValue }) => <NumericCell value={getValue()} unit="GB" fractionDigits={1} />,
  }),
  col.accessor("diskFreeGb", {
    header: "Disk free",
    priority: 5,
    width: 6.5,
    maxWidth: 8,
    align: "end",
    sortable: true,
    cell: ({ getValue }) => <NumericCell value={getValue()} unit="GB" />,
  }),
  col.accessor("uptimeDays", {
    header: "Uptime",
    priority: 5,
    width: 6,
    maxWidth: 8,
    align: "end",
    sortable: true,
    cell: ({ getValue }) => {
      const days = getValue()
      return <NumericCell value={days} unit={days === 1 ? "day" : "days"} />
    },
  }),
  col.accessor("serial", {
    header: "Serial number",
    priority: 5,
    width: 8,
    maxWidth: 10,
    sortable: true,
    cell: ({ getValue }) => <TextCell identifier>{getValue()}</TextCell>,
  }),
  col.accessor("domain", { header: "Domain", priority: 5, width: 8, maxWidth: 11, sortable: true }),
])

/** A table row as the endpoint the shared ActionSet is written for. */
function asDemoEndpoint(endpoint: Endpoint): DemoEndpoint {
  return {
    id: endpoint.id,
    name: endpoint.name,
    model: endpoint.model,
    os: `${endpoint.os} ${endpoint.osVersion}`,
    user: endpoint.user,
    organisation: endpoint.organisation,
    online: endpoint.status !== "offline",
    favourite: false,
    lastSeen: "",
  }
}

/** Read an ActionSet written for one shape through another (every function sees `project`ed targets). */
function adaptActions<S, T>(set: ActionSet<S>, project: (row: T) => S): ActionSet<T> {
  const many = (targets: readonly T[]) => targets.map(project)
  const adapt = ({ label, visible, disabledReason, confirm, run, successMessage, children, ...rest }: ActionDefinition<S>): ActionDefinition<T> => ({
    ...rest,
    label: typeof label === "function" ? (targets) => label(many(targets)) : label,
    visible: visible && ((targets) => visible(many(targets))),
    disabledReason: disabledReason && ((targets) => disabledReason(many(targets))),
    confirm: confirm && ((targets) => confirm(many(targets))),
    run: run && ((targets, context) => run(many(targets), context)),
    successMessage: successMessage && ((targets) => successMessage(many(targets))),
    children: children?.map(adapt),
  })
  return defineActions(set.entity, set.actions.map(adapt))
}

/**
 * The endpoint actions: the one definition the Actions, Menu and Context menu sections
 * render (overlays.fixtures), so the table's ⋯ menu, right-click menu and bulk bar show
 * exactly what every other surface shows.
 */
export const endpointActions = adaptActions(sharedEndpointActions, asDemoEndpoint)

/**
 * The rows' actions from the device kit: the endpoint class's composed set (the endpoint
 * actions above plus the shared device actions, such as Change icon…), read through each
 * row's device. A table row, the device's header and its tree row show the same menu.
 */
export function useEndpointRowActions(): ActionSet<Endpoint> { return useMemo(() => endpointActions, []) }
