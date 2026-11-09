import { useMemo, useRef, useState } from "react";
import { ActivityFeed, type ActivityItem } from "../../ui/activity-feed/index.js";
import { Badge, type BadgeTone } from "../../ui/badge/index.js";
import { Button } from "../../ui/button/index.js";
import { createDataTableColumns, DataTable, filters, localPage, type DataTableSearch, type DataTableState } from "../../ui/data-table/index.js";
import { EmptyState } from "../../ui/empty-state/index.js";
import { FactList } from "../../ui/fact-list/index.js";
import { IconArrowLeft, IconFolder } from "../../icons/generated/icons.js";
import { useLocale } from "../../lib/locale/index.js";
import { formatMoney } from "../../ui/money-field/index.js";
import { Panel, PanelBody, PanelHeader } from "../../ui/surface/index.js";

type Stage = "Planning" | "In review" | "Approved" | "On hold";

interface Project {
  id: string;
  name: string;
  owner: string;
  stage: Stage;
  budget: number;
  due: string;
  history: ActivityItem[];
}

const STAGE_TONES: Record<Stage, BadgeTone> = { Planning: "neutral", "In review": "accent", Approved: "success", "On hold": "warning" };
const STAGES = Object.keys(STAGE_TONES) as Stage[];

const PROJECTS: Project[] = [
  ["PRJ-104", "Harbour Library", "Avery Quinn", "In review", 182000, "2026-12-11"],
  ["PRJ-105", "Cedar Pavilion", "Mira Rowan", "Planning", 64000, "2027-01-22"],
  ["PRJ-107", "Orchard House", "Noor Haddad", "On hold", 95500, "2027-02-05"],
  ["PRJ-110", "Riverside Studio", "Avery Quinn", "Approved", 41200, "2026-11-28"],
  ["PRJ-112", "Quarry Gallery", "Jun Park", "In review", 230000, "2027-03-19"],
  ["PRJ-115", "Tidewater Hall", "Mira Rowan", "Planning", 118000, "2027-04-02"],
  ["PRJ-118", "Linden Courtyard", "Jun Park", "Approved", 27800, "2026-12-03"],
  ["PRJ-121", "Foundry Offices", "Noor Haddad", "In review", 154000, "2027-02-26"],
].map(([id, name, owner, stage, budget, due]) => ({
  id: id as string,
  name: name as string,
  owner: owner as string,
  stage: stage as Stage,
  budget: budget as number,
  due: due as string,
  history: [
    { id: `${id}-stage`, content: `Moved to ${stage}`, at: "2026-10-20T09:30:00Z" },
    { id: `${id}-created`, content: `Created by ${owner}`, at: "2026-08-04T14:10:00Z" },
  ],
}));

/** A date in the page's locale. */
function DueDate({ value }: { value: string }) {
  return new Date(value).toLocaleDateString(useLocale(), { dateStyle: "medium", timeZone: "UTC" });
}

/** An amount in the page's locale. */
function Budget({ value }: { value: number }) {
  return formatMoney(value * 100, { currency: "AUD", locale: useLocale() });
}

const col = createDataTableColumns<Project>();
const columns = col.columns([
  col.accessor("name", { header: "Project", pin: true, width: 14, cardRole: "title", sortable: true }),
  col.accessor("stage", {
    header: "Stage",
    width: 8,
    priority: 1,
    sortable: true,
    cell: ({ row }) => <Badge tone={STAGE_TONES[row.original.stage]}>{row.original.stage}</Badge>,
    filter: filters.options({ field: "stage", options: STAGES.map((stage) => ({ value: stage, label: stage })) }),
  }),
  col.accessor("owner", { header: "Owner", width: 10, priority: 2, sortable: true }),
  col.accessor("due", { header: "Due", width: 8, priority: 3, sortable: true, cell: ({ row }) => <DueDate value={row.original.due} /> }),
  col.accessor("budget", { header: "Budget", width: 8, priority: 4, align: "end", sortable: true, cell: ({ row }) => <Budget value={row.original.budget} /> }),
]);

const search: DataTableSearch<Project> = {
  fields: [
    { field: "name", value: (row) => row.name },
    { field: "owner", value: (row) => row.owner },
    { field: "id", value: (row) => row.id },
  ],
  placeholder: "Search projects",
};

/** A list with a detail pane: beside the table when there is room, in its place when there is not. */
export default function RecordsTemplate() {
  const [state, setState] = useState<DataTableState>({
    sorting: [{ id: "due", desc: false }],
    filters: [],
    pagination: { pageIndex: 0, pageSize: 25 },
    selection: {},
    search: "",
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const pane = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const page = useMemo(() => localPage(PROJECTS, columns, state, search), [state]);
  const open = PROJECTS.find((project) => project.id === openId);
  const close = () => {
    setOpenId(null);
    opener.current?.focus();
  };
  return (
    <div className="@container/screen h-full min-h-0 p-gutter">
      <div className="grid h-full min-h-0 gap-panels @4xl/screen:grid-cols-3">
        <Panel material="card" className={open ? "hidden min-h-0 @4xl/screen:col-span-2 @4xl/screen:flex" : "min-h-0 @4xl/screen:col-span-2"} aria-label="Projects">
          <PanelBody className="flex min-h-0 flex-col">
            <DataTable
              id="template-projects"
              label="Projects"
              noun={{ one: "project", other: "projects" }}
              rows={page.rows}
              rowCount={page.count}
              columns={columns}
              getRowId={(project) => project.id}
              getRowLabel={(project) => project.name}
              selectable={false}
              search={search}
              state={state}
              onStateChange={setState}
              rowOpen="click"
              onRowOpen={(project) => {
                opener.current = document.activeElement as HTMLElement;
                setOpenId(project.id);
                requestAnimationFrame(() => pane.current?.focus());
              }}
            />
          </PanelBody>
        </Panel>
        <Panel ref={pane} tabIndex={-1} material="card" scroll className={open ? "min-h-0" : "hidden min-h-0 @4xl/screen:flex"} aria-label="Project details">
          {open ? (
            <>
              <PanelHeader
                title={open.name}
                description={open.id}
                actions={
                  <Button className="@4xl/screen:hidden" size="sm" variant="ghost" icon={<IconArrowLeft />} onClick={close}>
                    All projects
                  </Button>
                }
              />
              <PanelBody>
                <div className="flex flex-col gap-section">
                  <FactList
                    facts={[
                      { label: "Stage", value: <Badge tone={STAGE_TONES[open.stage]}>{open.stage}</Badge> },
                      { label: "Owner", value: open.owner },
                      { label: "Due", value: <DueDate value={open.due} /> },
                      { label: "Budget", value: <Budget value={open.budget} /> },
                    ]}
                  />
                  <ActivityFeed aria-label={`${open.name} history`} items={open.history} />
                </div>
              </PanelBody>
            </>
          ) : (
            <PanelBody>
              <EmptyState icon={<IconFolder />}>No project selected</EmptyState>
            </PanelBody>
          )}
        </Panel>
      </div>
    </div>
  );
}
