import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DemoScope } from "../demo-scope.js";
import {
  ContainerLab,
  Example,
  Rules,
  SectionPage,
  Specimen,
  TokenTable,
} from "../kit.js";
import {
  IconOperatingSystem,
  IconRefresh,
  IconSoftware,
  IconWindows,
} from "../../icons/generated/icons.js";
import { Badge } from "../../ui/badge/index.js";
import { Button, ButtonGroup } from "../../ui/button/index.js";
import {
  createDataTableColumns,
  DataTable,
  IdentityCell,
  moveRow,
  NumericCell,
  RelativeTime,
  SparklineCell,
  StatusBadge,
  TextCell,
  searchRows,
  shownFor,
  useTableUrlState,
  type DataTableDensity,
  type DataTableGroup,
  type DataTableRowMove,
  type DataTableSearch,
  type DataTableState,
} from "../../ui/data-table/index.js";
import type { Domain } from "../../ui/sparkline/index.js";
import {
  endpointColumns,
  useEndpointRowActions,
} from "./data-table.columns.js";
import { DeviceGallery } from "./devices.fixtures.js";
import {
  createEndpointServer,
  SORTABLE_COLUMNS,
  type Endpoint,
  type EndpointPage,
  type EndpointQuery,
  type EndpointServer,
} from "./data-table.fixtures.js";

/* One "server" for the whole section, so live ticks show up in every table. */
const server = createEndpointServer();
const getRowId = (endpoint: Endpoint) => endpoint.id;
const PAGE_SIZES = [25, 50, 100] as const;
const NOUN = { one: "endpoint", other: "endpoints" };
const NO_ROWS: Endpoint[] = [];
const PERCENT: Domain = [0, 100];

type Simulate = "data" | "loading" | "empty" | "error";

/**
 * The toolbar search (R16.8): the fields the mock server's `search` matches. With the optional
 * graphql-orm adapter this is an `Or` of `Contains` on each (`toWhere(…, { search })`).
 */
const ENDPOINT_SEARCH: DataTableSearch<Endpoint> = {
  fields: [
    { field: "Name", value: (endpoint) => endpoint.name },
    { field: "User", value: (endpoint) => endpoint.user },
    { field: "Organisation", value: (endpoint) => endpoint.organisation },
    { field: "Ip", value: (endpoint) => endpoint.ip },
    { field: "Model", value: (endpoint) => endpoint.model },
  ],
  placeholder: "Search name, user, IP, model",
};

/** Query the mock server like a Query-backed view: first load, refetches, stale-while-revalidate. */
function useEndpointPage(
  source: EndpointServer,
  query: EndpointQuery,
  { latency = true, token = 0 } = {},
) {
  const key = JSON.stringify(query);
  const [result, setResult] = useState<{
    key: string;
    token: number;
    page: EndpointPage;
    at: number;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void source
      .query(JSON.parse(key) as EndpointQuery, { latency })
      .then((page) => {
        if (!cancelled) setResult({ key, token, page, at: Date.now() });
      });
    return () => {
      cancelled = true;
    };
  }, [source, key, latency, token]);
  const pending = !result || result.key !== key || result.token !== token;
  return { page: result?.page ?? null, pending, updatedAt: result?.at };
}

function describeRequest(query: EndpointQuery) {
  const sort = query.sorting.length
    ? query.sorting.map((s) => `${s.id} ${s.desc ? "desc" : "asc"}`).join(", ")
    : "none";
  return `sort ${sort} · page ${query.pageIndex + 1} · ${query.pageSize} per page${query.search ? ` · search "${query.search}"` : ""}`;
}

function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant={pressed ? "soft" : "ghost"}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/* Fictional inventory: editing, export and persistent column ordering share one specimen. */
interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  status: string;
  due: string;
  active: boolean;
}
const inventoryColumn = createDataTableColumns<InventoryItem>();
const inventoryColumns = inventoryColumn.columns([
  inventoryColumn.accessor("name", {
    header: "Item",
    pin: true,
    width: 15,
    cardRole: "title",
    edit: { kind: "text" },
  }),
  inventoryColumn.accessor("quantity", {
    header: "Quantity",
    width: 8,
    priority: 1,
    edit: {
      kind: "number",
      validate: (value) =>
        value >= 0 ? null : "Quantity must be zero or more",
    },
  }),
  inventoryColumn.accessor("status", {
    header: "Status",
    width: 9,
    priority: 1,
    edit: {
      kind: "select",
      options: [
        { value: "ready", label: "Ready" },
        { value: "ordered", label: "Ordered" },
        { value: "held", label: "Held" },
      ],
    },
  }),
  inventoryColumn.accessor("due", {
    header: "Due date",
    width: 10,
    priority: 1,
    edit: { kind: "date" },
  }),
  inventoryColumn.accessor("active", {
    header: "Active",
    width: 7,
    priority: 1,
    edit: { kind: "switch", format: (value) => (value ? "Yes" : "No") },
    cell: (context) => (context.getValue() ? "Yes" : "No"),
  }),
]);
const inventoryRows: InventoryItem[] = [
  {
    id: "i1",
    name: "Cedar sensor",
    quantity: 12,
    status: "ready",
    due: "2026-11-01",
    active: true,
  },
  {
    id: "i2",
    name: "Birch relay",
    quantity: 4,
    status: "ordered",
    due: "2026-11-12",
    active: false,
  },
  {
    id: "i3",
    name: "Locked sample",
    quantity: 1,
    status: "held",
    due: "2026-12-01",
    active: true,
  },
];
function InventoryDemo() {
  const [rows, setRows] = useState(inventoryRows);
  const [rtl, setRtl] = useState(false);
  const [density, setDensity] = useState<DataTableDensity>("comfortable");
  return (
    <div className="dt-demo">
      <div className="dt-demo-controls">
        <Toggle pressed={rtl} onClick={() => setRtl((value) => !value)}>
          Right to left
        </Toggle>
        <Toggle
          pressed={density === "compact"}
          onClick={() =>
            setDensity((value) =>
              value === "compact" ? "comfortable" : "compact",
            )
          }
        >
          Compact inventory
        </Toggle>
      </div>
      <div
        className="dt-demo-frame"
        data-testid="dt-inventory"
        dir={rtl ? "rtl" : "ltr"}
      >
        <DataTable
          id="gallery-inventory"
          label="Inventory"
          rows={rows}
          columns={inventoryColumns}
          getRowId={(row) => row.id}
          getRowLabel={(row) => row.name}
          density={density}
          export={{ filename: "inventory.csv", bom: true }}
          onCellEdit={async (change) => {
            await new Promise((resolve) => setTimeout(resolve, 650));
            if (change.rowId === "i3")
              throw new Error("This sample is locked; the value was restored");
            setRows((current) =>
              current.map((row) =>
                row.id === change.rowId
                  ? { ...row, [change.columnId]: change.value }
                  : row,
              ),
            );
          }}
        />
      </div>
    </div>
  );
}

/* ── The Endpoints table: URL state, mock server, live ticker, every state ─────────── */
function EndpointsDemo() {
  const rowActions = useEndpointRowActions();
  const url = useTableUrlState({
    prefix: "ep",
    sortable: SORTABLE_COLUMNS,
    pageSizes: PAGE_SIZES,
    defaultPageSize: 25,
    defaultSorting: [{ id: "name", desc: false }],
  });
  const [simulate, setSimulate] = useState<Simulate>("data");
  const [live, setLive] = useState(false);
  const [density, setDensity] = useState<DataTableDensity | undefined>(
    undefined,
  );
  // Each refetch bumps the token; live ticks refetch silently (no refetch line).
  const [refetch, setRefetch] = useState({ token: 0, silent: false });
  const [opened, setOpened] = useState<string | null>(null);
  const [rowOpen, setRowOpen] = useState<"double-click" | "click">(
    "double-click",
  );

  const query = useMemo<EndpointQuery>(
    () => ({
      sorting: url.state.sorting,
      pageIndex: url.state.pagination.pageIndex,
      pageSize: url.state.pagination.pageSize,
      search: url.state.search || undefined,
    }),
    [url.state],
  );
  const { page, pending, updatedAt } = useEndpointPage(server, query, {
    token: refetch.token,
  });
  const rows = useMemo(
    () => (simulate === "data" && page ? page.rows : NO_ROWS),
    [simulate, page],
  );
  const silent = refetch.silent;

  // Live updates: a tick on the server (on the rows in view), then a silent refetch.
  const visible = useRef<string[]>([]);
  useEffect(() => {
    visible.current = rows.map((row) => row.id);
  }, [rows]);
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      server.tick({ prefer: visible.current });
      setRefetch((value) => ({ token: value.token + 1, silent: true }));
    }, 2500);
    return () => clearInterval(timer);
  }, [live]);
  const state: Partial<DataTableState> = url.state;
  const loading = simulate === "loading" || (simulate === "data" && !page);

  return (
    <div className="dt-demo">
      <div className="dt-demo-controls" role="group" aria-label="Simulate">
        <ButtonGroup
          className="glass-control dt-demo-group"
          role="group"
          aria-label="State"
        >
          {(["data", "loading", "empty", "error"] as const).map((value) => (
            <Toggle
              key={value}
              pressed={simulate === value}
              onClick={() => setSimulate(value)}
            >
              {value === "data"
                ? "Loaded"
                : value === "loading"
                  ? "Loading"
                  : value === "empty"
                    ? "Empty"
                    : "Error"}
            </Toggle>
          ))}
        </ButtonGroup>
        <ButtonGroup
          className="glass-control dt-demo-group"
          role="group"
          aria-label="Table density"
        >
          {(["comfortable", "compact"] as const).map((value) => (
            <Toggle
              key={value}
              pressed={(density ?? "comfortable") === value}
              onClick={() => setDensity(value)}
            >
              {value === "comfortable" ? "Comfortable" : "Compact"}
            </Toggle>
          ))}
        </ButtonGroup>
        <ButtonGroup
          className="glass-control dt-demo-group"
          role="group"
          aria-label="Open a row on"
        >
          {(["double-click", "click"] as const).map((value) => (
            <Toggle
              key={value}
              pressed={rowOpen === value}
              onClick={() => setRowOpen(value)}
            >
              {value === "click" ? "Open on click" : "Open on double-click"}
            </Toggle>
          ))}
        </ButtonGroup>
        <ButtonGroup className="glass-control dt-demo-group">
          <Toggle pressed={live} onClick={() => setLive((value) => !value)}>
            Live updates
          </Toggle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              server.tick({
                enrol: "always",
                prefer: rows.map((row) => row.id),
              });
              setRefetch((value) => ({ token: value.token + 1, silent: true }));
            }}
          >
            Tick once
          </Button>
        </ButtonGroup>
        <output className="dt-demo-request" data-testid="dt-request">
          {describeRequest(query)}
          {opened ? ` · ran Open on ${opened}` : ""}
        </output>
      </div>
      <div className="dt-demo-frame" data-testid="dt-main">
        <DataTable<Endpoint>
          id="gallery-endpoints"
          label="Endpoints"
          rows={rows}
          rowCount={
            simulate === "data"
              ? page?.rowCount
              : simulate === "empty"
                ? 0
                : undefined
          }
          columns={endpointColumns}
          getRowId={getRowId}
          state={state}
          onStateChange={url.onStateChange}
          pageSizes={PAGE_SIZES}
          search={ENDPOINT_SEARCH}
          loading={loading}
          refetching={
            simulate === "data" && Boolean(page) && pending && !silent
          }
          error={
            simulate === "error"
              ? "Endpoints did not load: the Glass UX API did not respond."
              : undefined
          }
          onRetry={() => setSimulate("data")}
          emptyMessage="No endpoints enrolled"
          actions={rowActions}
          onRowOpen={(endpoint) => setOpened(endpoint.name)}
          rowOpen={rowOpen}
          getRowLabel={(endpoint) => endpoint.name}
          density={density}
          onDensityChange={setDensity}
          live={live || silent}
          updatedAt={simulate === "data" ? updatedAt : undefined}
          noun={NOUN}
          toolbar={
            <Button
              size="sm"
              icon={<IconRefresh />}
              onClick={() =>
                setRefetch((value) => ({
                  token: value.token + 1,
                  silent: false,
                }))
              }
            >
              Refresh
            </Button>
          }
        />
      </div>
    </div>
  );
}

/* ── A plain table on local state, used in the frames ─────────────────────────────── */
function FrameTable({
  id,
  pageSize = 25,
  label,
}: {
  id: string;
  pageSize?: number;
  label?: string;
}) {
  const scope = useContext(DemoScope);
  const [state, setState] = useState<DataTableState>({
    sorting: [{ id: "lastSeen", desc: true }],
    filters: [],
    pagination: { pageIndex: 0, pageSize },
    selection: {},
  });
  const query = useMemo<EndpointQuery>(
    () => ({
      sorting: state.sorting,
      pageIndex: state.pagination.pageIndex,
      pageSize: state.pagination.pageSize,
      search: state.search || undefined,
    }),
    [state.sorting, state.pagination, state.search],
  );
  const { page, pending, updatedAt } = useEndpointPage(server, query, {
    latency: false,
  });
  const rowActions = useEndpointRowActions();
  return (
    <DataTable<Endpoint>
      id={id}
      label={["Endpoints preview", scope, label].filter(Boolean).join(": ")}
      rows={page?.rows ?? []}
      rowCount={page?.rowCount}
      columns={endpointColumns}
      getRowId={getRowId}
      state={state}
      onStateChange={setState}
      search={ENDPOINT_SEARCH}
      loading={!page}
      refetching={Boolean(page) && pending}
      actions={rowActions}
      getRowLabel={(endpoint) => endpoint.name}
      updatedAt={updatedAt}
      noun={NOUN}
    />
  );
}

/** Frame widths in rem: wide (priority folding) down to cards. */
const WIDTHS = [
  { label: "Fill", rem: null },
  { label: "Wide", rem: 64 },
  { label: "Medium", rem: 48 },
  { label: "Narrow", rem: 38 },
  { label: "Cards", rem: 30 },
] as const;

function ResponsiveDemo() {
  const [width, setWidth] = useState<number | null>(64);
  const frame = useRef<HTMLDivElement>(null);
  const choose = useCallback((rem: number | null) => {
    setWidth(rem);
    // The frame is user-resizable too; a preset replaces any manual size.
    frame.current?.style.removeProperty("width");
  }, []);
  return (
    <div className="dt-demo">
      <ButtonGroup
        className="glass-control dt-demo-group"
        role="group"
        aria-label="Frame width"
      >
        {WIDTHS.map((option) => (
          <Toggle
            key={option.label}
            pressed={width === option.rem}
            onClick={() => choose(option.rem)}
          >
            {option.label}
          </Toggle>
        ))}
      </ButtonGroup>
      <div
        ref={frame}
        className="gallery-lab-frame dt-demo-resizable"
        data-lab-frame="responsive"
        data-resizable=""
        data-testid="dt-responsive"
        style={{ width: width === null ? "100%" : `${width}rem` }}
      >
        <FrameTable id="gallery-endpoints-responsive" />
      </div>
    </div>
  );
}

/* ── Grouped rows: endpoints by operating system, each group paged on its own ──────── */
const GROUP_PAGE = 10;
function GroupedDemo() {
  const [state, setState] = useState<DataTableState>({
    sorting: [{ id: "name", desc: false }],
    filters: [],
    pagination: { pageIndex: 0, pageSize: 25 },
    selection: {},
    groups: { collapsed: ["macOS"], shown: {} },
  });
  // The "server": every endpoint once, sorted; it answers a count per group and each group's first rows.
  const query = useMemo<EndpointQuery>(
    () => ({ sorting: state.sorting, pageIndex: 0, pageSize: 5000 }),
    [state.sorting],
  );
  const { page } = useEndpointPage(server, query, { latency: false });
  // The search narrows every group, and each count is the server's under the same query.
  const all = useMemo(
    () => searchRows(page?.rows ?? NO_ROWS, state.search, ENDPOINT_SEARCH),
    [page, state.search],
  );
  const groups = useMemo<DataTableGroup[]>(() => {
    const counts = new Map<string, number>();
    for (const endpoint of all)
      counts.set(endpoint.os, (counts.get(endpoint.os) ?? 0) + 1);
    return [...counts.entries()]
      .toSorted((a, b) => b[1] - a[1])
      .map(([os, count]) => ({
        id: os,
        label: os,
        count,
        icon: /windows/i.test(os) ? <IconWindows /> : <IconOperatingSystem />,
      }));
  }, [all]);
  const rows = useMemo(() => {
    const groupState = state.groups ?? { collapsed: [], shown: {} };
    return groups.flatMap((group) =>
      groupState.collapsed.includes(group.id)
        ? []
        : all
            .filter((endpoint) => endpoint.os === group.id)
            .slice(0, shownFor(groupState, group.id, GROUP_PAGE)),
    );
  }, [all, groups, state.groups]);
  const rowActions = useEndpointRowActions();
  return (
    <div className="gallery-lab-frame dt-demo-grouped" data-testid="dt-grouped">
      <DataTable<Endpoint>
        id="gallery-endpoints-grouped"
        label="Endpoints by operating system"
        rows={rows}
        columns={endpointColumns}
        getRowId={getRowId}
        state={state}
        onStateChange={setState}
        loading={!page}
        search={ENDPOINT_SEARCH}
        grouping={{
          groupOf: (endpoint) => endpoint.os,
          groups,
          pageSize: GROUP_PAGE,
        }}
        actions={rowActions}
        getRowLabel={(endpoint) => endpoint.name}
        noun={NOUN}
      />
    </div>
  );
}

/* ── Infinite loading: offset batches appended as the reader scrolls ───────────────── */
const BATCH = 50;
const listServer = createEndpointServer();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A growing list, as Apollo's `fetchMore` with a merging field policy (or TanStack Query's
 * `useInfiniteQuery`) keeps one: the first batch for each query, then each next offset
 * appended. The previous query's rows stay until the new first batch arrives.
 */
function useEndpointList(
  sorting: DataTableState["sorting"],
  search: string | undefined,
  failNext: { current: boolean },
) {
  const key = JSON.stringify([sorting, search ?? ""]);
  const [list, setList] = useState<{
    key: string;
    rows: Endpoint[];
    rowCount: number;
  } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const [order, query] = JSON.parse(key) as [
      DataTableState["sorting"],
      string,
    ];
    void listServer
      .query({ sorting: order, search: query, pageIndex: 0, pageSize: BATCH })
      .then((page) => {
        if (!cancelled)
          setList({ key, rows: page.rows, rowCount: page.rowCount });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);
  const current = list?.key === key ? list : null;
  const loadMore = async () => {
    if (!current) return;
    setLoadingMore(true);
    try {
      if (failNext.current) {
        failNext.current = false;
        await wait(400);
        throw new Error("The endpoint service did not answer");
      }
      const page = await listServer.query({
        sorting,
        search,
        pageIndex: current.rows.length / BATCH,
        pageSize: BATCH,
      });
      setList((value) =>
        value?.key === key
          ? {
              ...value,
              rows: [...value.rows, ...page.rows],
              rowCount: page.rowCount,
            }
          : value,
      );
    } finally {
      setLoadingMore(false);
    }
  };
  return {
    rows: list?.rows ?? NO_ROWS,
    rowCount: list?.rowCount,
    pending: !current,
    hasMore: current ? current.rows.length < current.rowCount : false,
    loadingMore,
    loadMore,
  };
}

function InfiniteDemo() {
  const [state, setState] = useState<DataTableState>({
    sorting: [{ id: "lastSeen", desc: true }],
    filters: [],
    pagination: { pageIndex: 0, pageSize: BATCH },
    selection: {},
  });
  const failNext = useRef(false);
  const [failArmed, setFailArmed] = useState(false);
  const list = useEndpointList(state.sorting, state.search, failNext);
  const rowActions = useEndpointRowActions();
  return (
    <div
      className="gallery-lab-frame dt-demo-infinite"
      data-testid="dt-infinite"
    >
      <DataTable<Endpoint>
        id="gallery-endpoints-infinite"
        label="Endpoints, loaded as you scroll"
        rows={list.rows}
        rowCount={list.rowCount}
        columns={endpointColumns}
        getRowId={getRowId}
        state={state}
        onStateChange={setState}
        loading={list.rows.length === 0 && list.pending}
        refetching={list.rows.length > 0 && list.pending}
        search={ENDPOINT_SEARCH}
        infinite={{
          hasMore: list.hasMore,
          loadingMore: list.loadingMore,
          onLoadMore: () => {
            setFailArmed(false);
            return list.loadMore();
          },
        }}
        toolbar={
          <Button
            size="sm"
            variant={failArmed ? "primary" : "secondary"}
            aria-pressed={failArmed}
            onClick={() => {
              failNext.current = !failArmed;
              setFailArmed(!failArmed);
            }}
          >
            Fail next batch
          </Button>
        }
        actions={rowActions}
        getRowLabel={(endpoint) => endpoint.name}
        noun={NOUN}
      />
    </div>
  );
}

/* ── Reorderable rows: a job queue the host owns, saved locally or on a mock server ───── */
interface QueueJob {
  id: string;
  title: string;
  team: string;
  /** Controlled view state, including loading, empty and error states. */
  state: "running" | "queued" | "held";
  minutes: number;
}
const QUEUE: QueueJob[] = [
  {
    id: "q1",
    title: "Rebuild search index",
    team: "Platform",
    state: "running",
    minutes: 18,
  },
  {
    id: "q2",
    title: "Rotate TLS certificates",
    team: "Security",
    state: "queued",
    minutes: 6,
  },
  {
    id: "q3",
    title: "Archive March audit logs",
    team: "Compliance",
    state: "queued",
    minutes: 25,
  },
  {
    id: "q4",
    title: "Resize thumbnail cache",
    team: "Media",
    state: "queued",
    minutes: 12,
  },
  {
    id: "q5",
    title: "Sync partner catalogue",
    team: "Commerce",
    state: "held",
    minutes: 9,
  },
  {
    id: "q6",
    title: "Recalculate usage invoices",
    team: "Billing",
    state: "queued",
    minutes: 31,
  },
  {
    id: "q7",
    title: "Vacuum analytics tables",
    team: "Data",
    state: "queued",
    minutes: 14,
  },
  {
    id: "q8",
    title: "Refresh map tiles",
    team: "Maps",
    state: "queued",
    minutes: 22,
  },
];
const TASKS = [
  "Reindex",
  "Backfill",
  "Compact",
  "Export",
  "Verify",
  "Snapshot",
  "Prune",
  "Replay",
];
const AREAS = [
  "orders",
  "sessions",
  "invoices",
  "events",
  "assets",
  "contacts",
  "tickets",
  "metrics",
];
const TEAMS = ["Platform", "Data", "Billing", "Media", "Security", "Commerce"];
const LONG_QUEUE: QueueJob[] = Array.from({ length: 400 }, (_, index) => ({
  id: `l${index + 1}`,
  title: `${TASKS[index % TASKS.length]} ${AREAS[(index * 3) % AREAS.length]} shard ${index + 1}`,
  team: TEAMS[(index * 5) % TEAMS.length]!,
  state: index === 0 ? "running" : index % 11 === 4 ? "held" : "queued",
  minutes: 4 + ((index * 7) % 37),
}));
const STATE_LABEL = {
  running: "Running",
  queued: "Queued",
  held: "Held",
} as const;
const STATE_TONE = {
  running: "info",
  queued: "neutral",
  held: "warning",
} as const;
const queueCol = createDataTableColumns<QueueJob & { position: number }>();
const queueColumns = queueCol.columns([
  queueCol.accessor("position", {
    header: "#",
    width: 3.5,
    minWidth: 3,
    align: "end",
    priority: 1,
    cardRole: "meta",
    flash: false,
    cell: ({ getValue }) => <NumericCell value={getValue()} />,
  }),
  queueCol.accessor("title", {
    header: "Job",
    pin: true,
    width: 16,
    cardRole: "title",
  }),
  queueCol.accessor("team", {
    header: "Team",
    priority: 2,
    width: 9,
    cardRole: "subtitle",
  }),
  queueCol.accessor("state", {
    header: "State",
    priority: 2,
    width: 7,
    cardRole: "status",
    skeleton: "badge",
    cell: ({ getValue }) => (
      <Badge tone={STATE_TONE[getValue()]} marker="dot" size="sm">
        {STATE_LABEL[getValue()]}
      </Badge>
    ),
  }),
  queueCol.accessor("minutes", {
    header: "Estimate",
    priority: 3,
    width: 7,
    align: "end",
    sortable: true,
    cardRole: "meta",
    cell: ({ getValue }) => <NumericCell value={getValue()} unit="min" />,
  }),
]);
type Saving = "local" | "server" | "fail";
const SAVE_LATENCY = 600;

function ReorderDemo() {
  const [long, setLong] = useState(false);
  const [queue, setQueue] = useState<QueueJob[]>(QUEUE);
  const [saving, setSaving] = useState<Saving>("server");
  const [cards, setCards] = useState(false);
  const [sorting, setSorting] = useState<DataTableState["sorting"]>([]);
  const [last, setLast] = useState("No moves yet");
  const rows = useMemo(() => {
    const positioned = queue.map((job, index) => ({
      ...job,
      position: index + 1,
    }));
    const sort = sorting[0];
    return sort
      ? positioned.toSorted(
          (a, b) => (a.minutes - b.minutes) * (sort.desc ? -1 : 1),
        )
      : positioned;
  }, [queue, sorting]);
  const describe = (move: DataTableRowMove<QueueJob>) => {
    const after = move.previousId
      ? queue.find((job) => job.id === move.previousId)?.title
      : null;
    return `${move.row.title}: ${move.from + 1} → ${move.to + 1}${after ? `, after ${after}` : ", first"}`;
  };
  return (
    <div className="dt-demo">
      <div
        className="dt-demo-controls"
        role="group"
        aria-label="Reorder options"
      >
        <ButtonGroup
          className="glass-control dt-demo-group"
          role="group"
          aria-label="Saving"
        >
          {(["local", "server", "fail"] as const).map((value) => (
            <Toggle
              key={value}
              pressed={saving === value}
              onClick={() => setSaving(value)}
            >
              {value === "local"
                ? "Local"
                : value === "server"
                  ? "Server"
                  : "Server fails"}
            </Toggle>
          ))}
        </ButtonGroup>
        <ButtonGroup
          className="glass-control dt-demo-group"
          role="group"
          aria-label="Layout"
        >
          <Toggle pressed={!cards} onClick={() => setCards(false)}>
            Table
          </Toggle>
          <Toggle pressed={cards} onClick={() => setCards(true)}>
            Cards
          </Toggle>
        </ButtonGroup>
        <ButtonGroup
          className="glass-control dt-demo-group"
          role="group"
          aria-label="Queue length"
        >
          {([false, true] as const).map((value) => (
            <Toggle
              key={String(value)}
              pressed={long === value}
              onClick={() => {
                setLong(value);
                setQueue(value ? LONG_QUEUE : QUEUE);
              }}
            >
              {value ? "400 jobs" : "8 jobs"}
            </Toggle>
          ))}
        </ButtonGroup>
        <output className="dt-demo-request" data-testid="dt-reorder-last">
          {last}
        </output>
      </div>
      <div
        className="gallery-lab-frame dt-demo-reorder"
        data-testid="dt-reorder"
        data-cards={cards ? "" : undefined}
      >
        <DataTable<QueueJob & { position: number }>
          id="gallery-queue-reorder"
          label="Job queue"
          rows={rows}
          rowCount={rows.length}
          columns={queueColumns}
          getRowId={(job) => job.id}
          getRowLabel={(job) => job.title}
          state={{ sorting }}
          onStateChange={(next, change) => {
            if (change === "sorting") setSorting(next.sorting);
          }}
          pageSizes={[500]}
          noun={{ one: "job", other: "jobs" }}
          reorder={{
            canReorder: (job) => job.state !== "running",
            lockedReason: () => "Running jobs keep their place",
            onReorder: (move) => {
              const apply = () =>
                setQueue((current) => moveRow(current, move.from, move.to));
              if (saving === "local") {
                apply();
                setLast(describe(move));
                return;
              }
              setLast(`Saving ${move.row.title}…`);
              return new Promise<void>((resolve, reject) =>
                window.setTimeout(() => {
                  if (saving === "fail") {
                    setLast(`${move.row.title}: not saved`);
                    reject(new Error("The queue service did not respond."));
                    return;
                  }
                  apply();
                  setLast(describe(move));
                  resolve();
                }, SAVE_LATENCY),
              );
            },
          }}
        />
      </div>
    </div>
  );
}

const HEIGHTS = [
  { id: "short", label: "Short pane · 13rem: one-line pager", rem: 13 },
  { id: "strip", label: "Strip · 3.5rem: status bar only", rem: 3.5 },
] as const;

/* ── Auto height, not selectable: a second entity proves the table is generic ──────── */
interface Software {
  id: string;
  name: string;
  publisher: string;
  version: string;
  installed: number;
  sizeMb: number;
}
const now = Date.now();
const TWO_MINUTES_AGO = now - 2 * 60_000;
const SOFTWARE: Software[] = [
  {
    id: "s1",
    name: "Google Chrome",
    publisher: "Google LLC",
    version: "129.0.6668.90",
    installed: now - 3 * 86_400_000,
    sizeMb: 512,
  },
  {
    id: "s2",
    name: "Microsoft 365 Apps for business",
    publisher: "Microsoft Corporation",
    version: "16.0.18129",
    installed: now - 40 * 86_400_000,
    sizeMb: 3_820,
  },
  {
    id: "s3",
    name: "Glass UX Agent",
    publisher: "Orbit Workspace",
    version: "6.8.0",
    installed: now - 2 * 3_600_000,
    sizeMb: 48,
  },
  {
    id: "s4",
    name: "Adobe Acrobat Reader",
    publisher: "Adobe Inc.",
    version: "24.003.20112",
    installed: now - 12 * 86_400_000,
    sizeMb: 640,
  },
  {
    id: "s5",
    name: "Zoom Workplace",
    publisher: "Zoom Video Communications",
    version: "6.2.5",
    installed: now - 7 * 86_400_000,
    sizeMb: 290,
  },
];
const SOFTWARE_SEARCH: DataTableSearch<Software> = {
  fields: [
    { field: "Name", value: (row) => row.name },
    { field: "Publisher", value: (row) => row.publisher },
  ],
};
const softwareCol = createDataTableColumns<Software>();
const softwareColumns = softwareCol.columns([
  softwareCol.accessor("name", {
    header: "Name",
    pin: true,
    width: 16,
    cardRole: "title",
    skeleton: "identity",
    cell: ({ row }) => (
      <IdentityCell
        title={row.original.name}
        subtitle={row.original.publisher}
        icon={<IconSoftware />}
      />
    ),
  }),
  softwareCol.accessor("version", {
    header: "Version",
    priority: 2,
    width: 9,
    cell: ({ getValue }) => <TextCell identifier>{getValue()}</TextCell>,
  }),
  softwareCol.accessor("installed", {
    header: "Installed",
    priority: 2,
    width: 8,
    skeleton: "time",
    cell: ({ getValue }) => <RelativeTime value={getValue()} />,
  }),
  softwareCol.accessor("sizeMb", {
    header: "Size",
    priority: 3,
    width: 6.5,
    align: "end",
    cell: ({ getValue }) => <NumericCell value={getValue()} unit="MB" />,
  }),
]);

/** A fully loaded list: searched in the browser with the server's semantics (§8). */
function SoftwareTable({
  id = "gallery-software",
  defaultHiddenColumns,
}: { id?: string; defaultHiddenColumns?: readonly string[] } = {}) {
  const scope = useContext(DemoScope);
  const [search, setSearch] = useState("");
  const rows = useMemo(
    () => searchRows(SOFTWARE, search, SOFTWARE_SEARCH, softwareColumns),
    [search],
  );
  return (
    <DataTable<Software>
      id={id}
      label={scope ? `Installed software: ${scope}` : "Installed software"}
      rows={rows}
      rowCount={rows.length}
      columns={softwareColumns}
      defaultHiddenColumns={defaultHiddenColumns}
      getRowId={(row) => row.id}
      state={{ search }}
      onStateChange={(next, change) => {
        if (change === "search") setSearch(next.search ?? "");
      }}
      search={SOFTWARE_SEARCH}
      height="auto"
      selectable={false}
      noun={{ one: "application", other: "applications" }}
    />
  );
}

export default function DataTableGallery() {
  return (
    <DeviceGallery>
      <DataTableSection />
    </DeviceGallery>
  );
}

function DataTableSection() {
  return (
    <SectionPage>
      <Specimen
        title="Endpoints"
        description="1,284 endpoints from a mock server (300–700 ms). Sort, page, resize and select; Shift-click multi-sorts headers and selects a range of rows. State lives in the URL. The ⋯ menu, right-click and the bulk bar run the endpoint actions."
        layout="bare"
        wide
      >
        <EndpointsDemo />
      </Specimen>

      <Specimen
        title="Columns follow the container"
        description="Narrow the frame: the lowest-priority columns fold into “+N”, which shows them under each row. Below 36rem the rows become cards. Drag the corner to resize freely."
        layout="bare"
        wide
      >
        <ResponsiveDemo />
      </Specimen>

      <Specimen
        title="Default columns"
        description="Installed and Size start in row details. The column chooser keeps every field available, saves explicit choices and restores the application's defaults with Reset columns. Cards keep those fields in their own expandable details."
        layout="bare"
        wide
      >
        <SoftwareTable
          id="gallery-default-columns"
          defaultHiddenColumns={["installed", "sizeMb"]}
        />
      </Specimen>

      <Specimen
        title="Grouped rows"
        description="A header per group with the server's count that collapses (click, Enter or Space; ← and →; Alt-click for every group). Each group pages on its own with “Show more”, so one large group never buries the rest. Here: endpoints by operating system, macOS collapsed."
        layout="bare"
        wide
      >
        <GroupedDemo />
      </Specimen>

      <Specimen
        title="Infinite loading"
        description="Rows load 50 at a time from the mock server as the end of the list comes near, instead of pages. Sorting and the search start a new list from the top. Fail next batch makes the next request fail, so the end of the list offers Retry."
        layout="bare"
        wide
      >
        <InfiniteDemo />
      </Specimen>

      <Specimen
        title="Editable inventory"
        description="Enter, F2 or double-click edits a cell. Tab saves and moves to the next field. Locked sample rejects saves. Export uses the selected rows when present; header menus and grips change column order."
        layout="bare"
        wide
      >
        <InventoryDemo />
      </Specimen>

      <Specimen
        title="Reorderable rows"
        description="Drag a row by the grip at its start, or focus the grip, press Space and use the arrow keys. The host owns the order and saves each move. Running jobs are locked, and sorting by Estimate disables reordering. Server saves after 600 ms; Server fails reverts the move."
        layout="bare"
        wide
      >
        <ReorderDemo />
      </Specimen>

      <Specimen
        title="Short containers"
        description="The table keeps its rows and steps down its status bar as the height shrinks."
        layout="bare"
        wide
      >
        <div className="dt-demo-heights">
          {HEIGHTS.map((frame) => (
            <figure key={frame.id} className="gallery-lab-cell dt-demo-height">
              <div
                className="gallery-lab-frame"
                data-lab-frame={frame.id}
                data-testid={`dt-${frame.id}`}
                style={{ height: `${frame.rem}rem` }}
              >
                <FrameTable
                  id={`gallery-endpoints-${frame.id}`}
                  label={frame.label}
                />
              </div>
              <figcaption className="gallery-example-label">
                {frame.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </Specimen>

      <Specimen
        title="Auto height"
        description="Grows with its rows instead of scrolling inside. Read-only lists switch selection off."
        layout="bare"
      >
        <div data-testid="dt-auto">
          <SoftwareTable />
        </div>
      </Specimen>

      <Specimen
        title="Cells"
        description="Helpers for the cells Glass UX tables repeat. Numbers are tabular with a thin space before units; times are relative with the absolute time on hover."
      >
        <Example label="Identity">
          <span className="dt-demo-cell">
            <IdentityCell
              title="NST-C106"
              subtitle="AzureAD\MiraRowan"
              status="online"
            />
          </span>
          <span className="dt-demo-cell">
            <IdentityCell
              title="LMN-4E5E"
              subtitle="LMN-4E5E\Front Counter"
              status="warning"
              statusLabel="Needs restart"
            />
          </span>
        </Example>
        <Example label="Status">
          <StatusBadge status="online" size="sm" />
          <StatusBadge status="offline" size="sm" />
          <StatusBadge status="warning" size="sm">
            Needs restart
          </StatusBadge>
          <StatusBadge status="error" size="sm">
            Agent error
          </StatusBadge>
          <StatusBadge status="installing" size="sm" />
          <Badge tone="info" marker="dot" size="sm">
            Update scheduled
          </Badge>
        </Example>
        <Example label="Time, number, trend">
          <span className="dt-demo-cell">
            <RelativeTime value={TWO_MINUTES_AGO} />
          </span>
          <span className="dt-demo-cell">
            <NumericCell value={7.8} unit="GB" fractionDigits={1} />
          </span>
          <span className="dt-demo-cell dt-demo-spark">
            <SparklineCell
              values={[
                12, 14, 11, 18, 23, 19, 16, 22, 31, 27, 24, 21, 18, 20, 26, 29,
                25, 22, 19, 23,
              ]}
              domain={PERCENT}
              unit="%"
              label="CPU"
            />
          </span>
          <span className="dt-demo-cell dt-demo-spark">
            <SparklineCell
              values={[61, 64, 70, 72, 69, 75, 81, 84, 88, 91]}
              domain={PERCENT}
              unit="%"
              label="CPU"
              tone="danger"
            />
          </span>
        </Example>
      </Specimen>

      <ContainerLab>
        {(preset) => (
          <FrameTable
            id={`gallery-endpoints-lab-${preset?.id ?? "free"}`}
            pageSize={25}
          />
        )}
      </ContainerLab>

      <Rules
        do={[
          "Give every column a priority so the table knows what to fold first.",
          "Keep sorting, the search, page and page size in the URL with useTableUrlState.",
          "Give every table a search on its identifying columns; the field sits beside Filters.",
          "Pass the entity's ActionSet; the ⋯ menu, right-click and bulk bar all read it. Rows of different kinds pass getRowActions.",
          "Group on the server: a grouped count for the headers, one query per expanded group.",
          "Write empty states as one fact plus the action that fixes it.",
          "Keep a manual order in the host's data; return a promise from reorder.onReorder to save it.",
          "Load long feeds and logs with infinite and an offset or cursor; keep the sort, filters and search in the URL.",
          "Let the table fill a pane with a definite height; it scrolls inside itself.",
        ]}
        dont={[
          "Hide columns with media queries; the table measures its own container.",
          "Put a banner above the table for errors or new rows; both happen in place.",
          "Hand-build a row menu next to the table's own.",
          "Count a group's rows in the browser; the header shows the server's count.",
          "Load every row up front and page it in the browser; ask the server for the next batch.",
          "Store a manual order in table preferences or the URL; it is the host's data.",
          "Size columns in px; widths are rem so they scale with the interface.",
          "Wrap the table in another glass layer; the header is an inset fill.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--row-h", "Body row height (density)"],
          ["--row-h-header", "Header height (density)"],
          ["--check-size", "Selection checkbox"],
          ["--control-h-sm", "Row and pager buttons"],
          ["--glass-fill-inset", "Header fill"],
          ["--line", "Row hairlines (at 70%)"],
          ["--fill-hover", "Hovered row"],
          ["--accent-soft", "Selected row and bulk bar"],
          ["--accent-ring", "Focused row"],
          ["--radius-item", "Row corners"],
          ["--radius-control", "Header band"],
          ["--surface-2", "Pinned cells while scrolled sideways"],
          ["--duration-slower", "Live-update flash (×2.5)"],
          ["--fg-muted", "Reorder grip"],
          ["--shadow-3", "Lifted row while reordering"],
          ["--accent-line", "Reorder drop slot and lifted edge"],
          ["--duration-base", "Rows parting while reordering"],
        ]}
      />
    </SectionPage>
  );
}
