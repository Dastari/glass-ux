import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { BrandMark } from "glass-ux/brand";
import { Button } from "glass-ux/button";
import { Badge, CountBadge } from "glass-ux/badge";
import { ToneDot } from "glass-ux/tone-dot";
import { Avatar } from "glass-ux/avatar";
import { Breadcrumb } from "glass-ux/breadcrumb";
import { Dialog } from "glass-ux/dialog";
import { Sheet } from "glass-ux/sheet";
import { FactList } from "glass-ux/fact-list";
import { DetailTile } from "glass-ux/detail-tile";
import { Metric } from "glass-ux/metric";
import { Notice } from "glass-ux/notice";
import { EmptyState } from "glass-ux/empty-state";
import { ActivityFeed, type ActivityItem } from "glass-ux/activity-feed";
import { MeterCell } from "glass-ux/meter-cell";
import { ScrollArea } from "glass-ux/scroll-area";
import { LoginError, LoginFlow, loginProvider } from "glass-ux/login-flow";
import { toast } from "glass-ux/toast";
import { Segmented } from "glass-ux/segmented";
import { Menu } from "glass-ux/menu";
import { Tooltip } from "glass-ux/tooltip";
import { RichTextInput } from "glass-ux/rich-text";
import { EntityIdentity, type EntityState } from "glass-ux/entity";
import {
  ActionBar,
  usePaletteActions,
  defineActions,
  type ActionSet,
} from "glass-ux/actions";
import {
  useCommandPalette,
  usePaletteCommands,
  type PaletteCommand,
} from "glass-ux/command-palette";
import { AccountButton, Rail, SearchTrigger, TopBar } from "glass-ux/shell";
import { Panel, PanelBody, PanelHeader } from "glass-ux/surface";
import {
  DataTable,
  EMPTY_CELL,
  RelativeTime,
  SparklineCell,
  TextCell,
  TwoLineCell,
  createDataTableColumns,
  filters,
  localPage,
  shownFor,
  type DataTableGroup,
  type DataTableSearch,
  type DataTableState,
} from "glass-ux/data-table";
import {
  GeoMap,
  MapStatusSummary,
  countStatuses,
  useMapRegion,
  type MapPoint,
} from "glass-ux/map";
import {
  TopologyCanvas,
  type TopologyClusterSpec,
  type TopologyNode,
  type TopologyNodeMenu,
} from "glass-ux/topology";
import { DEMO_MAP_CONFIG } from "glass-ux/gallery/fixtures/map";
import {
  Window,
  WindowManagerProvider,
  Workspace,
  createWindowManager,
  registerWindowKind,
  type WindowContentProps,
} from "glass-ux/windows";
import {
  IconAccessPoint,
  IconActivity,
  IconCheck,
  IconCloudOff,
  IconDeskPhone,
  IconEndpoint,
  IconFileText,
  IconInspector,
  IconMapPin,
  IconNetwork,
  IconNetworkSwitch,
  IconPause,
  IconPlay,
  IconPrinter,
  IconRefresh,
  IconRestart,
  IconRouter,
  IconServer,
  IconSignal,
  IconUser,
} from "glass-ux/icons";
import {
  NETWORK_NOTES,
  jitter,
  networkEvents,
  networkSites,
  studioPeople,
  studioPortrait,
  type EventSeverity,
  type NetworkEvent,
  type NetworkSite,
  type SiteStatus,
} from "./showcase-data";
import "./showcase-network.css";

/* ── Model ─────────────────────────────────────────────────────────────────── */

export interface SiteRow extends NetworkSite {
  status: SiteStatus;
  /** The last SAMPLES uplink latency readings, oldest first. */
  samples: number[];
  latency: number | null;
  use: number;
  lastSeen: number;
  alerts: number;
}

interface EventRow extends NetworkEvent {
  at: number;
  site: string;
  open: boolean;
}

const SAMPLES = 20;
const TICK_MS = 4000;
const LOADED_AT = Date.now();
const TOTAL_DEVICES = networkSites.reduce((sum, site) => sum + site.devices, 0);

const STATUS_LABEL: Record<SiteStatus, string> = {
  healthy: "Healthy",
  warning: "Warning",
  danger: "Critical",
  unknown: "Offline",
};
const STATUS_TONE = {
  healthy: "success",
  warning: "warning",
  danger: "danger",
  unknown: "neutral",
} as const;
const SEVERITY: Record<
  EventSeverity,
  { label: string; tone: "danger" | "warning" | "info" | "success" }
> = {
  critical: { label: "Critical", tone: "danger" },
  warning: { label: "Warning", tone: "warning" },
  info: { label: "Information", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
};
const stateOf = (status: SiteStatus): EntityState => ({
  id: status,
  label: STATUS_LABEL[status],
  tone: STATUS_TONE[status],
});
const latencyTone = (value: number) =>
  value >= 100 ? "danger" : value >= 60 ? "warning" : "neutral";
const plural = (count: number, one: string, other = `${one}s`) =>
  `${count} ${count === 1 ? one : other}`;

function sample(site: NetworkSite, index: number, tick: number) {
  const spread = Math.max(4, site.baseLatency * 0.18);
  return Math.max(
    3,
    Math.round(site.baseLatency + spread * jitter(index + 1, tick)),
  );
}

function buildRows(
  tick: number,
  now: number,
  acknowledged: ReadonlySet<string>,
): SiteRow[] {
  return networkSites.map((site, index) => {
    const samples = site.online
      ? Array.from({ length: SAMPLES }, (_, i) =>
          sample(site, index, tick - SAMPLES + 1 + i),
        )
      : [];
    const latency = samples.at(-1) ?? null;
    const status: SiteStatus =
      latency === null
        ? "unknown"
        : latency >= 100
          ? "danger"
          : latency >= 60 || site.online < site.devices
            ? "warning"
            : "healthy";
    return {
      ...site,
      status,
      samples,
      latency,
      use: site.online
        ? Math.min(
            100,
            Math.max(
              1,
              Math.round(site.baseUse + 5 * jitter(index + 40, tick)),
            ),
          )
        : 0,
      // At least one 15 s relative-time clock tick old, so no report reads as future.
      lastSeen: site.online
        ? now - 15_000 - (index % 4) * 15_000
        : LOADED_AT - (site.silentFor ?? 0) * 60_000,
      alerts: networkEvents.filter(
        (event) =>
          event.siteId === site.id &&
          event.alert &&
          !acknowledged.has(event.id),
      ).length,
    };
  });
}

/* ── Shared context: selection and the site handlers cells and windows use ── */

interface NetworkContextValue {
  selectedId: string | null;
  select: (id: string | null, reveal?: boolean) => void;
  notes: string;
  setNotes: (value: string) => void;
}
const NetworkContext = createContext<NetworkContextValue>({
  selectedId: null,
  select: () => {},
  notes: NETWORK_NOTES,
  setNotes: () => {},
});

/* ── Site table ────────────────────────────────────────────────────────────── */

function SiteCell({ row }: { row: SiteRow }) {
  const { selectedId, select } = useContext(NetworkContext);
  const current = selectedId === row.id;
  return (
    <EntityIdentity
      tier="row"
      name={row.label}
      kind="Site"
      icon={<IconMapPin />}
      state={stateOf(row.status)}
      secondary={`${row.town} · ${row.region}`}
      onOpen={() => select(row.id, true)}
      className="network-site-identity"
      data-current={current ? "" : undefined}
    />
  );
}

const siteCol = createDataTableColumns<SiteRow>();
const siteColumns = siteCol.columns([
  siteCol.accessor("label", {
    header: "Site",
    pin: true,
    width: 15,
    minWidth: 11,
    maxWidth: 22,
    sortable: true,
    cardRole: "title",
    skeleton: "identity",
    cell: ({ row }) => <SiteCell row={row.original} />,
  }),
  siteCol.accessor("status", {
    header: "Status",
    priority: 1,
    width: 7.5,
    minWidth: 7,
    maxWidth: 9,
    grow: false,
    cardRole: "status",
    skeleton: "badge",
    cell: ({ getValue }) => (
      <Badge size="sm" tone={STATUS_TONE[getValue()]} marker="dot">
        {STATUS_LABEL[getValue()]}
      </Badge>
    ),
    filter: filters.options({
      field: "status",
      options: (["danger", "warning", "healthy", "unknown"] as const).map(
        (value) => ({ value, label: STATUS_LABEL[value] }),
      ),
    }),
  }),
  siteCol.accessor((row) => row.latency ?? -1, {
    id: "latency",
    header: "Latency",
    priority: 1,
    width: 9,
    minWidth: 8,
    maxWidth: 11,
    grow: false,
    sortable: true,
    sortDescFirst: true,
    skeleton: "sparkline",
    cell: ({ row }) =>
      row.original.latency === null ? (
        <TextCell muted>No data</TextCell>
      ) : (
        <SparklineCell
          values={row.original.samples}
          value={row.original.latency}
          unit="ms"
          label={`${row.original.label} uplink latency, last ${SAMPLES} samples`}
          tone={latencyTone(row.original.latency)}
        />
      ),
  }),
  siteCol.accessor("use", {
    header: "Uplink use",
    priority: 2,
    width: 11,
    minWidth: 9,
    maxWidth: 14,
    sortable: true,
    sortDescFirst: true,
    cell: ({ row }) =>
      row.original.online ? (
        <MeterCell
          label={`${row.original.label} uplink use`}
          value={row.original.use}
          max={100}
          valueText={`${row.original.use}%`}
          description={`${row.original.use}% of ${row.original.capacity} Mb/s`}
        />
      ) : (
        <TextCell muted>{EMPTY_CELL}</TextCell>
      ),
    filter: filters.number({ server: "int", field: "use", min: 0, max: 100 }),
  }),
  siteCol.accessor("online", {
    header: "Devices",
    priority: 2,
    width: 6.5,
    maxWidth: 8,
    align: "end",
    sortable: true,
    cell: ({ row }) => (
      <TextCell>
        {row.original.online}/{row.original.devices}
      </TextCell>
    ),
  }),
  siteCol.accessor("alerts", {
    header: "Alerts",
    priority: 2,
    width: 5.5,
    maxWidth: 7,
    align: "end",
    sortable: true,
    sortDescFirst: true,
    cell: ({ getValue }) =>
      getValue() ? (
        <CountBadge value={getValue()} tone="danger" />
      ) : (
        <TextCell muted>{EMPTY_CELL}</TextCell>
      ),
  }),
  siteCol.accessor("lastSeen", {
    header: "Last report",
    priority: 3,
    width: 8,
    maxWidth: 10,
    sortable: true,
    sortDescFirst: true,
    skeleton: "time",
    cell: ({ getValue }) => <RelativeTime value={getValue()} />,
  }),
  siteCol.accessor("region", {
    header: "Region",
    priority: 3,
    width: 8,
    maxWidth: 11,
    // A card's title already names the town and region.
    cardRole: "hidden",
    sortable: true,
    filter: filters.options({
      field: "region",
      options: ["North", "North-West", "East", "South", "Central"].map(
        (value) => ({ value, label: value }),
      ),
    }),
  }),
  siteCol.accessor("contact", {
    header: "Contact",
    priority: 4,
    width: 10,
    maxWidth: 13,
    sortable: true,
    cell: ({ getValue }) => (
      <span className="network-person">
        <Avatar
          name={getValue()}
          src={studioPortrait(getValue())}
          size="xs"
          decorative
        />
        {getValue()}
      </span>
    ),
  }),
  siteCol.accessor("gateway", {
    header: "Gateway",
    priority: 4,
    width: 8,
    maxWidth: 10,
    cell: ({ getValue }) => <TextCell identifier>{getValue()}</TextCell>,
  }),
  siteCol.accessor("code", {
    header: "Site code",
    priority: 5,
    width: 6,
    maxWidth: 8,
    cell: ({ getValue }) => <TextCell identifier>{getValue()}</TextCell>,
  }),
]);
const siteSearch: DataTableSearch<SiteRow> = {
  fields: [
    { field: "label", value: (row) => row.label },
    { field: "town", value: (row) => row.town },
    { field: "code", value: (row) => row.code },
    { field: "gateway", value: (row) => row.gateway },
  ],
  placeholder: "Search sites, towns or gateways",
};

type QuickFilter = "all" | "attention" | "offline";
const QUICK: Record<Exclude<QuickFilter, "all">, string[]> = {
  attention: ["danger", "warning"],
  offline: ["unknown"],
};
function quickFilterOf(state: DataTableState): QuickFilter | undefined {
  const status = state.filters.find((filter) => filter.id === "status");
  if (!status) return "all";
  const value = status.value as { op?: string; values?: string[] };
  if (value.op !== "in" || !value.values) return undefined;
  const key = value.values.toSorted().join(",");
  if (key === QUICK.attention.toSorted().join(",")) return "attention";
  if (key === QUICK.offline.join(",")) return "offline";
  return undefined;
}

/* ── Event table ───────────────────────────────────────────────────────────── */

const eventCol = createDataTableColumns<EventRow>();
function EventSiteCell({ row }: { row: EventRow }) {
  const { select } = useContext(NetworkContext);
  return (
    <EntityIdentity
      tier="row"
      name={row.site}
      kind="Site"
      icon={<IconMapPin />}
      onOpen={() => select(row.siteId, true)}
    />
  );
}
const eventColumns = eventCol.columns([
  eventCol.accessor("title", {
    header: "Event",
    width: 18,
    minWidth: 12,
    cardRole: "title",
    sortable: true,
    cell: ({ row }) => (
      <TwoLineCell title={row.original.title} subtitle={row.original.detail} />
    ),
  }),
  eventCol.accessor("severity", {
    header: "Severity",
    priority: 1,
    width: 8,
    maxWidth: 10,
    grow: false,
    cardRole: "status",
    cell: ({ getValue }) => (
      <Badge size="sm" tone={SEVERITY[getValue()].tone} marker="dot">
        {SEVERITY[getValue()].label}
      </Badge>
    ),
    filter: filters.options({
      field: "severity",
      options: (Object.keys(SEVERITY) as EventSeverity[]).map((value) => ({
        value,
        label: SEVERITY[value].label,
      })),
    }),
  }),
  eventCol.accessor("site", {
    header: "Site",
    priority: 1,
    width: 12,
    maxWidth: 16,
    sortable: true,
    cell: ({ row }) => <EventSiteCell row={row.original} />,
  }),
  eventCol.accessor("open", {
    header: "Alert",
    priority: 2,
    width: 9,
    maxWidth: 11,
    cell: ({ row }) =>
      !row.original.alert ? (
        <TextCell muted>{EMPTY_CELL}</TextCell>
      ) : row.original.open ? (
        <Badge size="sm" tone="danger" marker="ring">
          Open
        </Badge>
      ) : (
        <Badge size="sm" tone="success" marker="dot">
          Acknowledged
        </Badge>
      ),
  }),
  eventCol.accessor("at", {
    header: "Time",
    priority: 2,
    width: 8,
    maxWidth: 10,
    sortable: true,
    sortDescFirst: true,
    skeleton: "time",
    cell: ({ getValue }) => <RelativeTime value={getValue()} />,
  }),
]);
const eventSearch: DataTableSearch<EventRow> = {
  fields: [
    { field: "title", value: (row) => row.title },
    { field: "detail", value: (row) => row.detail },
    { field: "site", value: (row) => row.site },
  ],
  placeholder: "Search events",
};
const dayOf = (event: NetworkEvent) =>
  event.minutesAgo < 24 * 60 ? "recent" : "earlier";

/* ── Devices (topology) ────────────────────────────────────────────────────── */

type DeviceKind =
  "router" | "switch" | "ap" | "computer" | "server" | "phone" | "printer";
interface Device {
  kind: DeviceKind;
  online: boolean;
  site: string;
}
const DEVICE_ICON = {
  router: IconRouter,
  switch: IconNetworkSwitch,
  ap: IconAccessPoint,
  computer: IconEndpoint,
  server: IconServer,
  phone: IconDeskPhone,
  printer: IconPrinter,
};
const DEVICE_LABEL: Record<DeviceKind, string> = {
  router: "Gateway",
  switch: "Switch",
  ap: "Access point",
  computer: "Computer",
  server: "Server",
  phone: "Phone",
  printer: "Printer",
};
const CLUSTERS: Record<string, TopologyClusterSpec> = {
  servers: { label: "Servers", order: 1 },
  computers: { label: "Computers", order: 2 },
  phones: { label: "Phones", order: 3 },
  printers: { label: "Printers", order: 4 },
};
const ONLINE_STATE: EntityState = {
  id: "online",
  label: "Online",
  tone: "success",
};
const OFFLINE_STATE: EntityState = {
  id: "offline",
  label: "Offline",
  tone: "neutral",
};

function siteDevices(site: NetworkSite): TopologyNode<Device>[] {
  const subnet = site.gateway.split(".").slice(0, 3).join(".");
  let host = 1;
  const node = (
    id: string,
    parentId: string | null,
    kind: DeviceKind,
    extra: Partial<TopologyNode<Device>> = {},
  ): TopologyNode<Device> => ({
    id,
    parentId,
    label: id,
    detail: `${subnet}.${host++}`,
    data: { kind, online: true, site: site.id },
    ...extra,
  });
  const gw = `${site.code}-GW01`;
  const sw = `${site.code}-SW-CORE`;
  const nodes = [
    node(gw, null, "router"),
    node(sw, gw, "switch", { link: { kind: "wired", speedMbps: 10_000 } }),
  ];
  const aps = site.devices >= 14 ? 2 : 1;
  for (let a = 1; a <= aps; a++)
    nodes.push(
      node(`${site.code}-AP-${a}`, sw, "ap", {
        link: { kind: "wired", speedMbps: 2500 },
      }),
    );
  let remaining = site.devices - nodes.length;
  if (site.devices >= 20 && remaining > 0) {
    nodes.push(
      node(`${site.code}-SRV-1`, sw, "server", {
        cluster: "servers",
        link: { kind: "wired", speedMbps: 10_000 },
      }),
    );
    remaining--;
  }
  if (remaining > 0) {
    nodes.push(
      node(`${site.code}-PRN-1`, sw, "printer", {
        cluster: "printers",
        link: { kind: "wired", speedMbps: 1000 },
      }),
    );
    remaining--;
  }
  const phones = Math.floor(remaining * 0.25);
  for (let p = 1; p <= phones; p++)
    nodes.push(
      node(`${site.code}-PH-${p}`, sw, "phone", {
        cluster: "phones",
        link: { kind: "wired", speedMbps: 1000 },
      }),
    );
  remaining -= phones;
  const wired = Math.ceil(remaining / 2);
  for (let c = 1; c <= remaining; c++) {
    const wireless = c > wired;
    nodes.push(
      node(
        `${site.code}-PC-${String(c).padStart(2, "0")}`,
        wireless ? `${site.code}-AP-${((c - wired - 1) % aps) + 1}` : sw,
        "computer",
        {
          cluster: "computers",
          link: wireless
            ? { kind: "wireless" }
            : { kind: "wired", speedMbps: 1000 },
        },
      ),
    );
  }
  // Offline devices: the last access point and its clients go first, then the rest.
  let offline = site.devices - site.online;
  const down = (device: TopologyNode<Device>) => {
    if (offline <= 0 || !device.data.online) return;
    device.data = { ...device.data, online: false };
    offline--;
  };
  const lastAp = `${site.code}-AP-${aps}`;
  if (site.online && aps > 1 && offline > 1)
    for (const device of nodes)
      if (device.id === lastAp || device.parentId === lastAp) down(device);
  for (let index = nodes.length - 1; index >= 0 && offline > 0; index--) {
    const device = nodes[index]!;
    if (
      site.online &&
      (device.data.kind === "router" || device.data.kind === "switch")
    )
      continue;
    down(device);
  }
  return nodes;
}

function DeviceTile({ node }: { node: TopologyNode<Device> }) {
  const Icon = DEVICE_ICON[node.data.kind];
  return (
    <EntityIdentity
      tier="icon"
      name={node.label}
      kind={DEVICE_LABEL[node.data.kind]}
      icon={<Icon />}
      state={node.data.online ? ONLINE_STATE : OFFLINE_STATE}
    />
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type DeviceTarget = { name: string; online: boolean; kind: DeviceKind };
const deviceActions = defineActions<DeviceTarget>("device", [
  {
    id: "ping",
    label: "Ping",
    icon: IconSignal,
    group: "connect",
    disabledReason: ([device]) =>
      device && !device.online ? `${device.name} is offline` : null,
    run: () => wait(600),
    successMessage: ([device]) => `${device?.name} replied in 4 ms`,
  },
  {
    id: "restart",
    label: "Restart",
    icon: IconRestart,
    group: "manage",
    disabledReason: ([device]) =>
      device && !device.online ? `${device.name} is offline` : null,
    confirm: ([device]) => ({
      title: `Restart ${device?.name}?`,
      body: "Connected clients reconnect after about a minute.",
      confirmLabel: "Restart",
      tone: "warning",
    }),
    run: () => wait(900),
    successMessage: ([device]) => `${device?.name} is restarting`,
  },
]);

function SiteDevices({ site }: { site: NetworkSite }) {
  const nodes = useMemo(() => siteDevices(site), [site]);
  const [selected, setSelected] = useState<string | null>(null);
  const renderNode = useCallback(
    (node: TopologyNode<Device>) => <DeviceTile node={node} />,
    [],
  );
  const describe = useCallback(
    (node: TopologyNode<Device>) =>
      `${DEVICE_LABEL[node.data.kind]} ${node.label}, ${node.data.online ? "Online" : "Offline"}`,
    [],
  );
  const menu = useCallback(
    (node: TopologyNode<Device>): TopologyNodeMenu => ({
      set: deviceActions,
      targets: [
        { name: node.label, online: node.data.online, kind: node.data.kind },
      ],
      label: node.label,
    }),
    [],
  );
  return (
    <TopologyCanvas<Device>
      label={`Devices at ${site.label}`}
      nodes={nodes}
      clusters={CLUSTERS}
      renderNode={renderNode}
      describeNode={describe}
      selectedId={selected}
      onSelectedIdChange={setSelected}
      nodeMenu={menu}
      frameKey={site.id}
      emptyText="No devices reported"
    />
  );
}

/* ── Site and network detail ───────────────────────────────────────────────── */

function eventItems(
  events: readonly EventRow[],
  onSite?: (id: string) => void,
): ActivityItem[] {
  return events.map((event) => ({
    id: event.id,
    at: event.at,
    icon: (
      <ToneDot
        tone={SEVERITY[event.severity].tone}
        label={SEVERITY[event.severity].label}
      />
    ),
    content: (
      <span className="network-event">
        <span className="type-label">{event.title}</span>
        <span className="type-caption text-fg-muted">
          {onSite ? (
            <button
              type="button"
              className="network-event-site"
              onClick={() => onSite(event.siteId)}
            >
              {event.site}
            </button>
          ) : null}
          {onSite ? " · " : null}
          {event.detail}
        </span>
      </span>
    ),
  }));
}

function SiteAlert({
  site,
  events,
  onAcknowledge,
}: {
  site: SiteRow;
  events: readonly EventRow[];
  onAcknowledge: (sites: readonly SiteRow[]) => void;
}) {
  const alerts = events.filter((event) => event.alert);
  if (!alerts.length) return null;
  const open = alerts.filter((event) => event.open);
  if (!open.length)
    return (
      <Notice tone="success" compact title="Alerts acknowledged">
        {plural(alerts.length, "alert")} acknowledged by Avery Quinn.
      </Notice>
    );
  return (
    <Notice
      tone={
        open.some((event) => event.severity === "critical")
          ? "danger"
          : "warning"
      }
      compact
      title={plural(open.length, "open alert")}
      action={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onAcknowledge([site])}
        >
          Acknowledge
        </Button>
      }
    >
      {open[0]!.title}
    </Notice>
  );
}

/** A feed that scrolls within the detail pane's remaining height, faded at its edges. */
function EventList({
  bounded,
  label,
  children,
}: {
  bounded: boolean;
  label: string;
  children: ReactNode;
}) {
  return bounded ? (
    <div className="network-event-scroll">
      <ScrollArea edges="fade" aria-label={label}>
        {children}
      </ScrollArea>
    </div>
  ) : (
    children
  );
}

function SiteDetails({
  site,
  events,
  onAcknowledge,
  bounded = false,
}: {
  site: SiteRow;
  events: readonly EventRow[];
  onAcknowledge: (sites: readonly SiteRow[]) => void;
  /** In the fixed-height detail pane: the events scroll in their own faded region. */
  bounded?: boolean;
}) {
  const offline = site.devices - site.online;
  const first = site.samples[0];
  return (
    <div className="network-detail">
      <SiteAlert site={site} events={events} onAcknowledge={onAcknowledge} />
      <div className="network-tiles">
        <DetailTile
          icon={<IconEndpoint />}
          label="Devices online"
          value={`${site.online} of ${site.devices}`}
          detail={offline ? `${offline} not reporting` : "All reporting"}
        />
        <DetailTile
          icon={<IconNetwork />}
          label="Uplink use"
          value={site.online ? `${site.use}%` : "—"}
          detail={`${site.capacity} Mb/s link`}
          numeric
        />
        <DetailTile
          icon={<IconRouter />}
          label="Gateway"
          value={`${site.code}-GW01`}
          detail={site.gateway}
          numeric
          truncate
        />
        <DetailTile
          icon={<IconUser />}
          label="Site contact"
          value={site.contact}
          detail={
            studioPeople.find((person) => person.name === site.contact)?.role
          }
        />
      </div>
      <div className="network-detail-side">
        <div className="network-metric">
          {site.latency !== null && first !== undefined ? (
            <Metric
              label="Uplink latency"
              value={site.latency}
              unit="ms"
              data={site.samples}
              delta={site.latency - first}
              deltaUnit=" ms"
              deltaLabel={`vs ${SAMPLES} samples ago`}
              better="down"
              tone={latencyTone(site.latency)}
            />
          ) : (
            <EmptyState icon={<IconCloudOff />}>
              No latency samples while the gateway is offline.
            </EmptyState>
          )}
        </div>
        <section
          className="network-detail-section"
          aria-labelledby={`events-${site.id}`}
        >
          <h4 id={`events-${site.id}`}>Events</h4>
          <EventList bounded={bounded} label={`${site.label} events`}>
            <ActivityFeed
              items={eventItems(events)}
              empty="No events in the last 2 days"
            />
          </EventList>
        </section>
      </div>
    </div>
  );
}

function NetworkSummary({
  rows,
  events,
  onSite,
}: {
  rows: readonly SiteRow[];
  events: readonly EventRow[];
  onSite: (id: string) => void;
}) {
  const online = rows.reduce((sum, row) => sum + row.online, 0);
  const latencies = rows
    .flatMap((row) => (row.latency === null ? [] : [row.latency]))
    .toSorted((a, b) => a - b);
  const median = latencies[Math.floor(latencies.length / 2)] ?? 0;
  const open = events.filter((event) => event.open);
  return (
    <div className="network-detail">
      <div className="network-tiles network-summary-facts">
        <MapStatusSummary counts={countStatuses(rows)} labels={STATUS_LABEL} />
        <FactList
          facts={[
            { label: "Devices online", value: `${online} of ${TOTAL_DEVICES}` },
            { label: "Open alerts", value: open.length },
            { label: "Median uplink latency", value: `${median} ms` },
          ]}
        />
      </div>
      <section
        className="network-detail-side network-detail-section"
        aria-labelledby="network-open-alerts"
      >
        <h4 id="network-open-alerts">Open alerts</h4>
        <EventList bounded label="Open alerts">
          <ActivityFeed
            items={eventItems(open, onSite)}
            empty="No open alerts"
          />
        </EventList>
      </section>
    </div>
  );
}

/* ── Device map window ─────────────────────────────────────────────────────── */

function DevicesWindow({ params }: WindowContentProps) {
  const site =
    networkSites.find((item) => item.id === params.site) ?? networkSites[0]!;
  const offline = site.devices - site.online;
  return (
    <>
      <Window.Body variant="fill">
        <div className="network-topology">
          <SiteDevices site={site} />
        </div>
      </Window.Body>
      <Window.Status>
        <Window.StatusItem tone={offline ? "warning" : "success"}>
          {offline ? `${offline} offline` : "All online"}
        </Window.StatusItem>
        <Window.StatusMeta>{plural(site.devices, "device")}</Window.StatusMeta>
      </Window.Status>
    </>
  );
}

registerWindowKind({
  kind: "showcase.devices",
  title: (params) =>
    `${networkSites.find((site) => site.id === params.site)?.label ?? "Site"} devices`,
  subtitle: (params) =>
    networkSites.find((site) => site.id === params.site)?.town,
  icon: IconNetwork,
  key: (params) => `showcase.devices.${params.site}`,
  size: { w: 640, h: 440 },
  minSize: { w: 320, h: 260 },
  popout: false,
  load: async () => ({ default: DevicesWindow }),
});

/* ── Notes window ──────────────────────────────────────────────────────────── */

function NotesWindow() {
  const { notes, setNotes } = useContext(NetworkContext);
  return (
    <>
      <Window.Actions>
        <Button
          size="sm"
          variant="ghost"
          icon={<IconRefresh />}
          aria-label="Reset notes"
          onClick={() => setNotes(NETWORK_NOTES)}
        />
      </Window.Actions>
      <Window.Body>
        <RichTextInput
          aria-label="Network review notes"
          value={notes}
          onValueChange={setNotes}
          minHeight={200}
          maxHeight={420}
          resize={false}
        />
      </Window.Body>
      <Window.Status>
        <Window.StatusItem>Saved in this tab</Window.StatusItem>
        <Window.StatusMeta>
          {plural(notes.length, "character")}
        </Window.StatusMeta>
      </Window.Status>
    </>
  );
}

registerWindowKind({
  kind: "showcase.notes",
  title: () => "Network review notes",
  icon: IconFileText,
  key: () => "showcase.notes",
  size: { w: 420, h: 440 },
  minSize: { w: 280, h: 260 },
  popout: false,
  load: async () => ({ default: NotesWindow }),
});

/* ── Hooks ─────────────────────────────────────────────────────────────────── */

/** An element's width in px and rem, measured before paint and on resize. */
function useWidth(element: HTMLElement | null) {
  const [width, setWidth] = useState({ px: 0, rem: 0 });
  useLayoutEffect(() => {
    if (!element) return;
    const measure = () => {
      const rem =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setWidth({ px: element.clientWidth, rem: element.clientWidth / rem });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return width;
}

/** Whether the element is on screen: live sampling pauses while it is scrolled away. */
function useInView(ref: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(Boolean(entry?.isIntersecting)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

/** Commands registered while the workspace is mounted: sites, views and the selection's actions. */
function NetworkCommands({
  rows,
  selected,
  actions,
  onSite,
  onView,
  onNotes,
}: {
  rows: readonly SiteRow[];
  selected: SiteRow | undefined;
  actions: ActionSet<SiteRow>;
  onSite: (id: string) => void;
  onView: (view: "sites" | "events") => void;
  onNotes: () => void;
}) {
  // Labels change only when a status does, so live latency samples do not re-register.
  const key = rows.map((row) => `${row.id}:${row.status}`).join("|");
  const sites = useMemo<PaletteCommand[]>(
    () =>
      rows.map((row) => ({
        id: `network-site:${row.id}`,
        label: row.label,
        group: "Sites",
        detail: `${row.town} · ${STATUS_LABEL[row.status]}`,
        keywords: [row.code, row.gateway, row.region],
        icon: <IconMapPin />,
        run: () => onSite(row.id),
      })),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- rebuilt when a status changes
    [key, onSite],
  );
  const views = useMemo<PaletteCommand[]>(
    () => [
      {
        id: "network-view:events",
        label: "Show network events",
        group: "Network",
        icon: <IconActivity />,
        run: () => onView("events"),
      },
      {
        id: "network-view:notes",
        label: "Open network review notes",
        group: "Network",
        icon: <IconFileText />,
        run: onNotes,
      },
    ],
    [onView, onNotes],
  );
  usePaletteCommands(sites);
  usePaletteCommands(views);
  return selected ? (
    <SelectionCommands site={selected} actions={actions} />
  ) : null;
}

function SelectionCommands({
  site,
  actions,
}: {
  site: SiteRow;
  actions: ActionSet<SiteRow>;
}) {
  // Re-register when the actions' state changes, not on every live sample.
  const key = `${site.id}:${site.alerts}:${site.status}`;
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed on the state the actions read
  const targets = useMemo(() => [site], [key]);
  usePaletteActions(actions, targets, site.label);
  return null;
}

/* ── Workspace ─────────────────────────────────────────────────────────────── */

type View = "sites" | "events";

/* ── Accounts ──────────────────────────────────────────────────────────────── */

interface NetworkAccount {
  name: string;
  email: string;
  role: string;
}
const NETWORK_ACCOUNTS: readonly NetworkAccount[] = [
  { name: "Avery Quinn", email: "avery@example.com", role: "Operations lead" },
  { name: "Mira Chen", email: "mira@example.com", role: "Network engineer" },
];
/** How long the signed-in confirmation shows before the dialog closes. */
const SWITCH_CONFIRM_MS = 700;

/** Sign in as another account without leaving the workspace. */
function SwitchAccountDialog({
  open,
  onOpenChange,
  current,
  onSwitch,
  finalFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: NetworkAccount;
  onSwitch: (account: NetworkAccount) => void;
  finalFocus: RefObject<HTMLButtonElement | null>;
}) {
  const switchTo = (account: NetworkAccount) =>
    window.setTimeout(() => onSwitch(account), SWITCH_CONFIRM_MS);
  const other =
    NETWORK_ACCOUNTS.find((account) => account.email !== current.email) ??
    current;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Popup size="sm" initialFocus={false} finalFocus={finalFocus}>
        <Dialog.Header
          title="Switch account"
          subtitle={`Signed in as ${current.email}`}
        />
        <Dialog.Body>
          <LoginFlow
            key={current.email}
            surface={false}
            heading={false}
            autoFocus
            providers={[loginProvider("microsoft")]}
            onProviderSignIn={async () => {
              await wait(800);
              switchTo(other);
            }}
            onSignIn={async ({ identifier }) => {
              await wait(700);
              const email = identifier.trim().toLowerCase();
              const account = NETWORK_ACCOUNTS.find(
                (item) => item.email === email,
              );
              if (!account)
                throw new LoginError(
                  "No Meridian network account uses this email.",
                );
              if (account.email === current.email)
                return {
                  status: "error",
                  field: "identifier",
                  message: `Already signed in as ${account.email}.`,
                };
              switchTo(account);
            }}
            footer={
              <p className="type-caption text-fg-muted">
                Sample accounts: avery@example.com and mira@example.com, with
                any password.
              </p>
            }
          />
        </Dialog.Body>
      </Dialog.Popup>
    </Dialog.Root>
  );
}

export default function NetworkWorkspace() {
  const [manager] = useState(() =>
    createWindowManager({
      storageKey: null,
      channelName: null,
      defaultLayout: () => "floating",
    }),
  );
  const palette = useCommandPalette();
  const frame = useRef<HTMLDivElement>(null);
  const account = useRef<HTMLButtonElement>(null);
  const closeProfile = useRef<HTMLButtonElement>(null);
  const [frameElement, setFrameElement] = useState<HTMLElement | null>(null);
  const [detail, setDetail] = useState<HTMLElement | null>(null);
  const frameRem = useWidth(frameElement).rem;
  const wide = frameRem >= 56;
  const compactFrame = frameRem > 0 && frameRem < 40;
  const detailWidth = useWidth(detail).px;
  const visible = useInView(frame);
  const home = useMapRegion(DEMO_MAP_CONFIG, "AU-TAS");

  const [view, setView] = useState<View>("sites");
  const [selectedId, setSelectedId] = useState<string | null>("west");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notes, setNotes] = useState(NETWORK_NOTES);
  const [profileOpen, setProfileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [user, setUser] = useState(NETWORK_ACCOUNTS[0]!);
  const [acknowledged, setAcknowledged] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [live, setLive] = useState(true);
  const [clock, setClock] = useState(() => ({ tick: 0, now: LOADED_AT }));
  const [siteState, setSiteState] = useState<DataTableState>({
    sorting: [],
    filters: [],
    pagination: { pageIndex: 0, pageSize: 25 },
    selection: {},
    search: "",
  });
  const [eventState, setEventState] = useState<DataTableState>({
    sorting: [{ id: "at", desc: true }],
    filters: [],
    pagination: { pageIndex: 0, pageSize: 25 },
    selection: {},
    search: "",
    groups: { collapsed: [], shown: {} },
  });

  useEffect(() => {
    if (!live || !visible) return;
    const timer = setInterval(
      () => setClock((value) => ({ tick: value.tick + 1, now: Date.now() })),
      TICK_MS,
    );
    return () => clearInterval(timer);
  }, [live, visible]);

  const rows = useMemo(
    () => buildRows(clock.tick, clock.now, acknowledged),
    [clock, acknowledged],
  );
  const events = useMemo<EventRow[]>(
    () =>
      networkEvents.map((event) => ({
        ...event,
        at: LOADED_AT - event.minutesAgo * 60_000,
        site:
          networkSites.find((site) => site.id === event.siteId)?.label ?? "",
        open: event.alert && !acknowledged.has(event.id),
      })),
    [acknowledged],
  );
  const selected = rows.find((row) => row.id === selectedId);

  // A marker pulses once when its site's status changes.
  const statuses = useRef(new Map<string, string>());
  const [pulses, setPulses] = useState<Record<string, number>>({});
  useEffect(() => {
    const changed = rows.filter(
      (row) =>
        statuses.current.has(row.id) &&
        statuses.current.get(row.id) !== row.status,
    );
    for (const row of rows) statuses.current.set(row.id, row.status);
    if (changed.length)
      setPulses((value) => {
        const next = { ...value };
        for (const row of changed) next[row.id] = (next[row.id] ?? 0) + 1;
        return next;
      });
  }, [rows]);

  const filtered = useMemo(
    () =>
      localPage(
        rows,
        siteColumns,
        { ...siteState, pagination: { pageIndex: 0, pageSize: rows.length } },
        siteSearch,
      ).rows,
    [rows, siteState],
  );
  const sitePage = useMemo(
    () => localPage(rows, siteColumns, siteState, siteSearch),
    [rows, siteState],
  );
  const points = useMemo<MapPoint<SiteRow>[]>(
    () =>
      filtered.map((row) => ({
        id: row.id,
        label: row.label,
        lat: row.lat,
        lng: row.lng,
        status: row.status,
        description: row.town,
        data: row,
      })),
    [filtered],
  );

  const eventGroups = useMemo<DataTableGroup[]>(() => {
    const matching = localPage(
      events,
      eventColumns,
      { ...eventState, pagination: { pageIndex: 0, pageSize: events.length } },
      eventSearch,
    ).rows;
    return [
      { id: "recent", label: "Last 24 hours" },
      { id: "earlier", label: "Earlier" },
    ]
      .map((group) => ({
        ...group,
        count: matching.filter((event) => dayOf(event) === group.id).length,
      }))
      .filter((group) => group.count > 0);
  }, [events, eventState]);
  const eventRows = useMemo(() => {
    const matching = localPage(
      events,
      eventColumns,
      { ...eventState, pagination: { pageIndex: 0, pageSize: events.length } },
      eventSearch,
    ).rows;
    const groups = eventState.groups ?? { collapsed: [], shown: {} };
    return eventGroups.flatMap((group) =>
      groups.collapsed.includes(group.id)
        ? []
        : matching
            .filter((event) => dayOf(event) === group.id)
            .slice(0, shownFor(groups, group.id, 25)),
    );
  }, [events, eventState, eventGroups]);

  const select = useCallback(
    (id: string | null, reveal = false) => {
      setSelectedId(id);
      if (id && reveal) {
        setView("sites");
        if (!wide) setSheetOpen(true);
      }
    },
    [wide],
  );
  const openNotes = useCallback(() => {
    const stage = frame.current?.querySelector(".fa-wm-workspace-stage");
    const id = manager.open({ kind: "showcase.notes" });
    if (stage && stage.clientWidth > 640)
      manager.float(id, {
        x: stage.clientWidth - 436,
        y: 8,
        w: 420,
        h: Math.min(440, stage.clientHeight - 16),
      });
  }, [manager]);
  const openDevices = useCallback(
    (siteId: string) => {
      setSheetOpen(false);
      const stage = frame.current?.querySelector(".fa-wm-workspace-stage");
      const id = manager.open({
        kind: "showcase.devices",
        params: { site: siteId },
      });
      if (stage && stage.clientWidth > 640) {
        manager.float(id, {
          x: 8,
          y: 8,
          w: Math.min(640, stage.clientWidth - 16),
          h: Math.min(460, stage.clientHeight - 16),
        });
        // A tree reads best with room: open over the stage; Restore returns it to the rect.
        manager.maximise(id);
      }
    },
    [manager],
  );
  const acknowledge = useCallback((sites: readonly SiteRow[]) => {
    const ids = networkEvents
      .filter(
        (event) =>
          event.alert && sites.some((site) => site.id === event.siteId),
      )
      .map((event) => event.id);
    setAcknowledged((value) => new Set([...value, ...ids]));
  }, []);
  const acknowledgeEvents = useCallback((targets: readonly EventRow[]) => {
    setAcknowledged(
      (value) => new Set([...value, ...targets.map((event) => event.id)]),
    );
  }, []);
  const addToNotes = useCallback(
    (sites: readonly SiteRow[]) => {
      setNotes(
        (value) =>
          `${value}\n\n${sites
            .map(
              (site) =>
                `- Follow up **${site.label}**: ${STATUS_LABEL[site.status].toLowerCase()}, ${site.online} of ${site.devices} devices online${site.latency === null ? "" : `, ${site.latency} ms uplink`}.`,
            )
            .join("\n")}`,
      );
      openNotes();
    },
    [openNotes],
  );

  // Defined once (R1): the row ⋯ menu, right-click, bulk bar, the detail header and the palette.
  const handlers = useRef({
    select,
    acknowledge,
    addToNotes,
    acknowledgeEvents,
    openDevices,
  });
  handlers.current = {
    select,
    acknowledge,
    addToNotes,
    acknowledgeEvents,
    openDevices,
  };
  const siteActions = useMemo(
    () =>
      defineActions<SiteRow>("site", [
        {
          id: "details",
          label: "Show details",
          icon: IconInspector,
          group: "open",
          priority: 5,
          surfaces: ["menu", "context"],
          run: ([site]) => handlers.current.select(site?.id ?? null, true),
        },
        {
          id: "devices",
          label: "Device map",
          icon: IconNetwork,
          group: "open",
          priority: 2,
          run: ([site]) => {
            if (site) handlers.current.openDevices(site.id);
          },
        },
        {
          id: "acknowledge",
          label: "Acknowledge alerts",
          icon: IconCheck,
          group: "manage",
          primary: true,
          priority: 1,
          bulk: true,
          disabledReason: (targets) =>
            targets.some((site) => site.alerts)
              ? null
              : targets.length === 1
                ? "No open alerts at this site"
                : "No open alerts at the selected sites",
          run: (targets) => handlers.current.acknowledge(targets),
          successMessage: (targets) =>
            targets.length === 1
              ? `Alerts acknowledged at ${targets[0]?.label}`
              : `Alerts acknowledged at ${targets.length} sites`,
        },
        {
          id: "ping",
          label: "Ping gateway",
          icon: IconSignal,
          group: "connect",
          priority: 3,
          disabledReason: ([site]) =>
            site && !site.online ? `${site.label} gateway is offline` : null,
          run: () => wait(700),
          successMessage: ([site]) =>
            `${site?.code}-GW01 replied in ${site?.latency ?? 0} ms`,
        },
        {
          id: "notes",
          label: "Add to review notes",
          icon: IconFileText,
          group: "organise",
          priority: 4,
          bulk: true,
          run: (targets) => handlers.current.addToNotes(targets),
        },
        {
          id: "restart",
          label: "Restart gateway",
          icon: IconRestart,
          group: "danger",
          disabledReason: ([site]) =>
            site && !site.online ? `${site.label} gateway is offline` : null,
          confirm: ([site]) => ({
            title: `Restart ${site?.code}-GW01?`,
            body: `${site?.online} devices at ${site?.label} lose their connection for about a minute.`,
            confirmLabel: "Restart gateway",
            tone: "warning",
          }),
          run: () => wait(1200),
          successMessage: ([site]) => `${site?.code}-GW01 is restarting`,
        },
      ]),
    [],
  );
  const eventActions = useMemo(
    () =>
      defineActions<EventRow>("event", [
        {
          id: "acknowledge",
          label: "Acknowledge",
          icon: IconCheck,
          group: "manage",
          primary: true,
          bulk: true,
          disabledReason: (targets) =>
            targets.some((event) => event.open)
              ? null
              : targets.length === 1
                ? "This event has no open alert"
                : "No open alerts in the selection",
          run: (targets) =>
            handlers.current.acknowledgeEvents(
              targets.filter((event) => event.open),
            ),
          successMessage: (targets) =>
            plural(targets.filter((event) => event.open).length, "alert") +
            " acknowledged",
        },
        {
          id: "site",
          label: "Show site",
          icon: IconMapPin,
          group: "open",
          run: ([event]) =>
            handlers.current.select(event?.siteId ?? null, true),
        },
      ]),
    [],
  );

  const quick = quickFilterOf(siteState);
  const setQuick = (value: QuickFilter) =>
    setSiteState((state) => ({
      ...state,
      filters: [
        ...state.filters.filter((filter) => filter.id !== "status"),
        ...(value === "all"
          ? []
          : [{ id: "status", value: { op: "in", values: QUICK[value] } }]),
      ],
      pagination: { ...state.pagination, pageIndex: 0 },
    }));
  const openAlerts = events.filter((event) => event.open).length;
  const siteEvents = selected
    ? events.filter((event) => event.siteId === selected.id)
    : [];

  const detailHeader = selected ? (
    <PanelHeader
      level={3}
      title={selected.label}
      description={`${selected.town} · ${selected.region} · ${STATUS_LABEL[selected.status]}`}
      actions={
        <ActionBar
          set={siteActions}
          targets={[selected]}
          label={selected.label}
          maxButtons={2}
          available={Math.round(detailWidth * 0.5)}
        />
      }
    />
  ) : (
    <PanelHeader
      level={3}
      title="Meridian network"
      description={`${rows.length} sites · ${TOTAL_DEVICES} devices`}
    />
  );
  const detailBody = selected ? (
    <SiteDetails
      site={selected}
      events={siteEvents}
      onAcknowledge={acknowledge}
      bounded
    />
  ) : (
    <NetworkSummary
      rows={rows}
      events={events}
      onSite={(id) => select(id, true)}
    />
  );

  const map = (
    <div className="network-map">
      <GeoMap
        label="Meridian network sites"
        config={DEMO_MAP_CONFIG}
        home={home}
        points={points}
        pulses={pulses}
        selectedId={selectedId}
        onSelectedIdChange={(id) => select(id)}
        noun={{ one: "site", other: "sites" }}
        statusLabels={STATUS_LABEL}
        renderPopup={(point) => (
          <div className="network-map-popup">
            <p className="type-label">{point.label}</p>
            <FactList
              facts={[
                { label: "Status", value: STATUS_LABEL[point.status] },
                {
                  label: "Devices",
                  value: `${point.data.online} of ${point.data.devices} online`,
                },
                {
                  label: "Latency",
                  value:
                    point.data.latency === null
                      ? "No data"
                      : `${point.data.latency} ms`,
                },
              ]}
            />
            {!wide ? (
              <Button
                size="sm"
                variant="secondary"
                icon={<IconInspector />}
                onClick={() => select(point.id, true)}
              >
                Site details
              </Button>
            ) : null}
          </div>
        )}
      />
    </div>
  );

  const sitesTable = (
    <Panel className="network-table">
      <PanelBody className="network-table-body">
        <DataTable<SiteRow>
          id="docs-network-sites"
          label="Network sites"
          rows={sitePage.rows}
          rowCount={sitePage.count}
          columns={siteColumns}
          state={siteState}
          onStateChange={setSiteState}
          search={siteSearch}
          getRowId={(row) => row.id}
          getRowLabel={(row) => row.label}
          onRowOpen={(row) => select(row.id, true)}
          actions={siteActions}
          defaultHiddenColumns={["gateway", "code"]}
          noun={{ one: "site", other: "sites" }}
          live
          updatedAt={clock.now}
          toolbar={
            !compactFrame ? (
              <Segmented
                size="sm"
                aria-label="Show sites"
                value={quick}
                onValueChange={setQuick}
                options={[
                  { value: "all", label: "All" },
                  { value: "attention", label: "Attention" },
                  { value: "offline", label: "Offline" },
                ]}
              />
            ) : undefined
          }
          status={
            <span className="network-live">
              <Tooltip
                content={live ? "Pause live updates" : "Resume live updates"}
              >
                <Button
                  size="xs"
                  variant="ghost"
                  icon={live ? <IconPause /> : <IconPlay />}
                  aria-label={
                    live ? "Pause live updates" : "Resume live updates"
                  }
                  onClick={() => setLive((value) => !value)}
                />
              </Tooltip>
              <ToneDot
                tone={live ? "success" : "neutral"}
                marker={live ? "pulse" : "ring"}
              />
              <span data-testid="network-live-state">
                {live ? "Live" : "Paused"}
              </span>
            </span>
          }
        />
      </PanelBody>
    </Panel>
  );

  const eventsTable = (
    <Panel className="network-table network-events-table">
      <PanelBody className="network-table-body">
        <DataTable<EventRow>
          id="docs-network-events"
          label="Network events"
          rows={eventRows}
          columns={eventColumns}
          state={eventState}
          onStateChange={setEventState}
          search={eventSearch}
          grouping={{ groupOf: dayOf, groups: eventGroups, pageSize: 25 }}
          getRowId={(row) => row.id}
          getRowLabel={(row) => row.title}
          actions={eventActions}
          noun={{ one: "event", other: "events" }}
        />
      </PanelBody>
    </Panel>
  );

  return (
    <NetworkContext value={{ selectedId, select, notes, setNotes }}>
      <WindowManagerProvider manager={manager}>
        <NetworkCommands
          rows={rows}
          selected={selected}
          actions={siteActions}
          onSite={(id) => select(id, true)}
          onView={setView}
          onNotes={openNotes}
        />
        <div
          ref={(element) => {
            frame.current = element;
            setFrameElement(element);
          }}
          className="network-frame canvas-ambient"
          data-testid="network-workspace"
          data-layout={wide ? "wide" : "narrow"}
        >
          <TopBar
            module={
              <Button
                variant="ghost"
                icon={<BrandMark mark="product" />}
                aria-label="Network overview"
                onClick={() => {
                  setView("sites");
                  setSelectedId(null);
                }}
              />
            }
            breadcrumb={
              <Breadcrumb
                aria-label="Network breadcrumb"
                items={[
                  {
                    id: "network",
                    label: "Meridian network",
                    icon: <IconNetwork />,
                    onSelect: () => setView("sites"),
                  },
                  {
                    id: view,
                    label: view === "sites" ? "Sites" : "Events",
                    siblings: [
                      {
                        id: "sites",
                        label: "Sites",
                        onSelect: () => setView("sites"),
                      },
                      {
                        id: "events",
                        label: "Events",
                        onSelect: () => setView("events"),
                      },
                    ],
                  },
                ]}
              />
            }
            search={
              <SearchTrigger
                placeholder="Sites and actions…"
                onOpen={palette.open}
              />
            }
            account={
              <Menu.Root>
                <Menu.Trigger
                  render={
                    <AccountButton
                      ref={account}
                      name={user.name}
                      email={user.email}
                      avatarSrc={studioPortrait(user.name)}
                    />
                  }
                />
                <Menu.Popup
                  finalFocus={profileOpen || switching ? false : account}
                >
                  <Menu.Item onClick={() => setProfileOpen(true)}>
                    Profile
                  </Menu.Item>
                  <Menu.Item onClick={openNotes}>
                    Network review notes
                  </Menu.Item>
                  <Menu.Separator />
                  <Menu.Item onClick={() => setSwitching(true)}>
                    Switch account
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Root>
            }
          />
          <div className="network-body">
            <Rail.Root aria-label="Network navigation">
              <Rail.Item
                icon={<IconMapPin />}
                label="Sites"
                active={view === "sites"}
                onClick={() => setView("sites")}
              />
              <Rail.Item
                icon={<IconActivity />}
                label="Events"
                active={view === "events"}
                badge={
                  openAlerts ? (
                    <CountBadge value={openAlerts} tone="danger" overlay />
                  ) : undefined
                }
                onClick={() => setView("events")}
              />
              <Rail.Spacer />
              <Rail.Item
                icon={<IconFileText />}
                label="Network review notes"
                onClick={openNotes}
              />
            </Rail.Root>
            <Workspace
              className="network-stage"
              primaryLabel={
                view === "sites" ? "Network sites" : "Network events"
              }
              dock={false}
              primary={
                view === "sites" ? (
                  <div className="network-sites">
                    {map}
                    {wide ? (
                      <Panel
                        ref={setDetail}
                        scroll
                        className="network-detail-panel"
                        aria-label={
                          selected
                            ? `${selected.label} details`
                            : "Network summary"
                        }
                        data-testid="network-detail"
                      >
                        {detailHeader}
                        <PanelBody className="network-detail-body">
                          {detailBody}
                        </PanelBody>
                      </Panel>
                    ) : null}
                    {sitesTable}
                  </div>
                ) : (
                  <div className="network-events">{eventsTable}</div>
                )
              }
            />
          </div>
          {!wide ? (
            <Sheet.Root
              open={sheetOpen && Boolean(selected)}
              onOpenChange={setSheetOpen}
            >
              <Sheet.Popup
                size="md"
                aria-label={
                  selected ? `${selected.label} details` : "Site details"
                }
              >
                {selected ? (
                  <>
                    <Sheet.Header
                      title={selected.label}
                      subtitle={`${selected.town} · ${selected.region} · ${STATUS_LABEL[selected.status]}`}
                    />
                    <Sheet.Body>
                      <div
                        className="network-sheet"
                        data-testid="network-detail"
                      >
                        <ActionBar
                          set={siteActions}
                          targets={[selected]}
                          label={selected.label}
                          maxButtons={2}
                        />
                        <SiteDetails
                          site={selected}
                          events={siteEvents}
                          onAcknowledge={acknowledge}
                        />
                      </div>
                    </Sheet.Body>
                  </>
                ) : null}
              </Sheet.Popup>
            </Sheet.Root>
          ) : null}
          <Dialog.Root open={profileOpen} onOpenChange={setProfileOpen}>
            <Dialog.Popup
              size="sm"
              initialFocus={closeProfile}
              finalFocus={account}
            >
              <Dialog.Header title={user.name} subtitle={user.email} />
              <Dialog.Body>
                <div className="network-person">
                  <Avatar name={user.name} src={studioPortrait(user.name)} />
                  <FactList
                    facts={[
                      { label: "Role", value: user.role },
                      { label: "Workspace", value: "Meridian network" },
                    ]}
                  />
                </div>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  ref={closeProfile}
                  onClick={() => setProfileOpen(false)}
                >
                  Close profile
                </Button>
              </Dialog.Footer>
            </Dialog.Popup>
          </Dialog.Root>
          <SwitchAccountDialog
            open={switching}
            onOpenChange={setSwitching}
            current={user}
            finalFocus={account}
            onSwitch={(next) => {
              setUser(next);
              setSwitching(false);
              toast.success(`Signed in as ${next.name}`);
            }}
          />
        </div>
      </WindowManagerProvider>
    </NetworkContext>
  );
}
