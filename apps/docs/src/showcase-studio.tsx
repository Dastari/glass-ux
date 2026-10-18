import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { componentDestination } from "glass-ux/gallery";
import { Surface, Panel, PanelHeader, PanelBody } from "glass-ux/surface";
import { Button } from "glass-ux/button";
import { Badge } from "glass-ux/badge";
import { Avatar, AvatarGroup } from "glass-ux/avatar";
import { Metric } from "glass-ux/metric";
import { AreaChart, BarChart } from "glass-ux/charts";
import { ActivityFeed } from "glass-ux/activity-feed";
import { ChipOverflow } from "glass-ux/chip-overflow";
import { FactList } from "glass-ux/fact-list";
import { Notice } from "glass-ux/notice";
import { Tabs } from "glass-ux/tabs";
import { Tree, type TreeNode } from "glass-ux/tree";
import { Sheet } from "glass-ux/sheet";
import {
  DataTable,
  RelativeTime,
  createDataTableColumns,
  filters,
  localPage,
  shownFor,
  type DataTableGroup,
  type DataTableState,
  type DataTableSearch,
} from "glass-ux/data-table";
import {
  ActionBar,
  usePaletteActions,
  type ActionMenuProps,
} from "glass-ux/actions";
import {
  usePaletteCommands,
  type PaletteCommand,
} from "glass-ux/command-palette";
import { Progress } from "glass-ux/progress";
import { Dialog } from "glass-ux/dialog";
import { Field } from "glass-ux/field";
import {
  DateField,
  addDays,
  todayIso,
  type IsoDate,
} from "glass-ux/date-picker";
import { Form, formBehaviour, textRule, useAppForm } from "glass-ux/form";
import { Segmented } from "glass-ux/segmented";
import { Switch } from "glass-ux/switch";
import { toast } from "glass-ux/toast";
import {
  IconArchive,
  IconArrowUpRight,
  IconChartLine,
  IconCheck,
  IconFile,
  IconFileText,
  IconFolder,
  IconFolderOpen,
  IconGrid,
  IconImage,
  IconPlus,
  IconSend,
} from "glass-ux/icons";
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  PROJECT_TAGS,
  previousHours,
  studioPeople,
  studioPortrait,
  weeklyHours,
  type ProjectStatus,
  type StudioProject,
} from "./showcase-data";

type ActionSet<T> = ActionMenuProps<T>["set"];

const DAY = 86_400_000;
const dueAt = (project: StudioProject) => Date.now() + project.dueIn * DAY;

export const statusTone = (status: ProjectStatus) =>
  status === "Complete"
    ? "success"
    : status === "In review"
      ? "warning"
      : "accent";

export function ComponentLinks({ items }: { items: Array<[string, string]> }) {
  return (
    <div
      className="showcase-component-links"
      aria-label="Components in this demo"
    >
      {items.map(([id, label]) => {
        const destination = componentDestination(id);
        return (
          <Link
            key={id}
            to="/components/$component"
            params={{ component: destination.id }}
            hash={destination.hash}
          >
            {label}
            <IconArrowUpRight />
          </Link>
        );
      })}
    </div>
  );
}

/* ── Projects table ────────────────────────────────────────────────────────── */

const col = createDataTableColumns<StudioProject>();
const columns = col.columns([
  col.accessor("name", {
    header: "Project",
    pin: true,
    width: 16,
    minWidth: 12,
    priority: 1,
    cardRole: "title",
    sortable: true,
    cell: ({ row }) => (
      <span className="showcase-project-name">
        <span>{row.original.name}</span>
        <span className="type-caption text-fg-muted">
          {row.original.category}
        </span>
      </span>
    ),
    filter: filters.text({ field: "name" }),
  }),
  col.accessor("owner", {
    header: "Lead",
    width: 11,
    priority: 3,
    sortable: true,
    cell: ({ row }) => (
      <span className="showcase-person">
        <Avatar
          name={row.original.owner}
          src={studioPortrait(row.original.owner)}
          size="xs"
          decorative
        />
        {row.original.owner}
      </span>
    ),
    filter: filters.options({
      field: "owner",
      options: studioPeople.map(({ name }) => ({ value: name, label: name })),
    }),
  }),
  col.accessor("status", {
    header: "Status",
    width: 8.5,
    priority: 2,
    grow: false,
    cardRole: "status",
    sortable: true,
    cell: ({ getValue }) => (
      <Badge size="sm" tone={statusTone(getValue())} marker="dot">
        {getValue()}
      </Badge>
    ),
    filter: filters.options({
      field: "status",
      options: PROJECT_STATUSES.map((value) => ({ value, label: value })),
    }),
  }),
  col.accessor("dueIn", {
    id: "due",
    header: "Next milestone",
    width: 8.5,
    priority: 2,
    sortable: true,
    cell: ({ row }) =>
      row.original.status === "Complete" ? (
        <span className="text-fg-muted">Delivered</span>
      ) : row.original.dueIn < 0 ? (
        <span className="text-danger">
          {Math.abs(row.original.dueIn)}{" "}
          {row.original.dueIn === -1 ? "day" : "days"} overdue
        </span>
      ) : (
        <RelativeTime value={dueAt(row.original)} />
      ),
  }),
  col.accessor("progress", {
    header: "Progress",
    width: 9,
    priority: 3,
    sortable: true,
    cell: ({ row }) => (
      <Progress
        value={row.original.progress}
        aria-label={`${row.original.name} progress`}
        size="sm"
      />
    ),
    filter: filters.number({
      server: "int",
      field: "progress",
      min: 0,
      max: 100,
    }),
  }),
  col.accessor((row) => row.tags.join(", "), {
    id: "tags",
    header: "Tags",
    width: 15,
    minWidth: 11,
    priority: 4,
    cell: ({ row }) => (
      <ChipOverflow
        label={`${row.original.name} tags`}
        limit={2}
        items={row.original.tags.map((tag) => ({
          id: tag,
          label: tag,
          content: <Badge size="sm">{tag}</Badge>,
        }))}
      />
    ),
  }),
  col.accessor("hours", {
    header: "Hours",
    width: 5,
    priority: 4,
    align: "end",
    sortable: true,
    filter: filters.number({ server: "int", field: "hours", min: 0 }),
  }),
]);
const projectSearch: DataTableSearch<StudioProject> = {
  fields: [
    { field: "name", value: (row) => row.name },
    { field: "owner", value: (row) => row.owner },
    { field: "category", value: (row) => row.category },
  ],
  placeholder: "Search projects or people",
};

/** Project actions, defined once (R1): row menu, right-click, bulk bar, sheet header, palette. */
export function useProjectActions({
  open,
  update,
  archive,
}: {
  open: (project: StudioProject) => void;
  update: (ids: readonly string[], patch: Partial<StudioProject>) => void;
  archive: (ids: readonly string[]) => void;
}) {
  const handlers = useRef({ open, update, archive });
  handlers.current = { open, update, archive };
  return useMemo<ActionSet<StudioProject>>(
    () => ({
      entity: "project",
      actions: [
        {
          id: "open",
          label: "Open project",
          icon: IconArrowUpRight,
          group: "open",
          surfaces: ["menu", "context", "palette"],
          run: ([project]) => {
            if (project) handlers.current.open(project);
          },
        },
        {
          id: "review",
          label: "Request review",
          icon: IconSend,
          group: "manage",
          primary: true,
          priority: 1,
          bulk: true,
          disabledReason: (targets) =>
            targets.every((project) => project.status !== "In progress")
              ? targets.length === 1
                ? `${targets[0]?.name} is ${targets[0]?.status.toLowerCase()}`
                : "None of the selected projects are in progress"
              : null,
          run: (targets) =>
            handlers.current.update(
              targets
                .filter((project) => project.status === "In progress")
                .map((project) => project.id),
              { status: "In review" },
            ),
          successMessage: (targets) =>
            targets.length === 1
              ? `${targets[0]?.name} sent for review`
              : `${targets.length} projects sent for review`,
        },
        {
          id: "complete",
          label: "Mark complete",
          icon: IconCheck,
          group: "manage",
          priority: 2,
          bulk: true,
          disabledReason: (targets) =>
            targets.every((project) => project.status === "Complete")
              ? targets.length === 1
                ? "Already complete"
                : "The selected projects are already complete"
              : null,
          run: (targets) =>
            handlers.current.update(
              targets.map((project) => project.id),
              { status: "Complete", progress: 100 },
            ),
          successMessage: (targets) =>
            targets.length === 1
              ? `${targets[0]?.name} marked complete`
              : `${targets.length} projects marked complete`,
        },
        {
          id: "archive",
          label: "Archive",
          icon: IconArchive,
          group: "danger",
          bulk: true,
          confirm: (targets) => ({
            title:
              targets.length === 1
                ? `Archive ${targets[0]?.name}?`
                : `Archive ${targets.length} projects?`,
            body: "Archived projects leave the studio list. This demo restores them when the page reloads.",
            confirmLabel: "Archive",
            tone: "danger",
          }),
          run: (targets) =>
            handlers.current.archive(targets.map((project) => project.id)),
          successMessage: (targets) =>
            targets.length === 1
              ? `${targets[0]?.name} archived`
              : `${targets.length} projects archived`,
        },
      ],
    }),
    [],
  );
}

function ProjectCommands({
  projects,
  opened,
  actions,
  onOpen,
}: {
  projects: readonly StudioProject[];
  opened: StudioProject | null;
  actions: ActionSet<StudioProject>;
  onOpen: (project: StudioProject) => void;
}) {
  const commands = useMemo<PaletteCommand[]>(
    () =>
      projects.map((project) => ({
        id: `studio-project:${project.id}`,
        label: project.name,
        group: "Projects",
        detail: `${project.category} · ${project.status}`,
        keywords: [project.owner, ...project.tags],
        icon: <IconFolder />,
        run: () => onOpen(project),
      })),
    [projects, onOpen],
  );
  usePaletteCommands(commands);
  return opened ? <OpenedCommands project={opened} actions={actions} /> : null;
}

function OpenedCommands({
  project,
  actions,
}: {
  project: StudioProject;
  actions: ActionSet<StudioProject>;
}) {
  const targets = useMemo(() => [project], [project]);
  usePaletteActions(actions, targets, project.name);
  return null;
}

/* ── Project sheet ─────────────────────────────────────────────────────────── */

function deliverables(project: StudioProject): TreeNode[] {
  const slug = project.name.toLowerCase().replaceAll(" ", "-");
  return [
    {
      id: `${project.id}-brief`,
      label: "Brief",
      icon: <IconFolder />,
      children: [
        {
          id: `${project.id}-brief-doc`,
          label: `${slug}-brief.pdf`,
          description: "Signed off by the client",
          icon: <IconFileText />,
        },
        {
          id: `${project.id}-brief-budget`,
          label: "budget.xlsx",
          icon: <IconFile />,
        },
      ],
    },
    {
      id: `${project.id}-design`,
      label: "Design",
      icon: <IconFolder />,
      children: project.tags.map((tag) => ({
        id: `${project.id}-design-${tag}`,
        label: `${tag.toLowerCase()}-v${Math.max(1, Math.round(project.progress / 30))}.fig`,
        description: `${tag} · ${project.owner}`,
        icon: <IconImage />,
      })),
    },
    {
      id: `${project.id}-handover`,
      label: "Handover",
      icon: <IconFolder />,
      children:
        project.status === "Complete"
          ? [
              {
                id: `${project.id}-handover-zip`,
                label: `${slug}-final.zip`,
                description: "Delivered",
                icon: <IconFile />,
              },
            ]
          : [],
    },
  ];
}

function projectActivity(project: StudioProject) {
  const people = project.team.length ? project.team : [project.owner];
  return [
    `updated the ${project.tags[0]?.toLowerCase() ?? "design"} files`,
    project.status === "In review"
      ? "shared the project for review"
      : "left a comment on the brief",
    "logged 6 hours",
  ].map((text, index) => {
    const name = people[index % people.length]!;
    return {
      id: `${project.id}-activity-${index}`,
      at: Date.now() - (index * 5 + 1) * 3_600_000,
      icon: (
        <Avatar name={name} src={studioPortrait(name)} size="xs" decorative />
      ),
      content: (
        <>
          <strong>{name.split(" ")[0]}</strong> {text}.
        </>
      ),
    };
  });
}

export function ProjectSheet({
  project,
  actions,
  onClose,
}: {
  project: StudioProject | null;
  actions?: ActionSet<StudioProject>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("overview");
  // Keep the last project while the sheet animates closed.
  const [shown, setShown] = useState(project);
  if (project && project !== shown) setShown(project);
  const current = project ?? shown;
  return (
    <Sheet.Root
      open={!!project}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) setTab("overview");
      }}
    >
      <Sheet.Popup size="md" aria-label={current?.name ?? "Project"}>
        {current ? (
          <>
            <Sheet.Header
              title={current.name}
              subtitle={current.category}
              icon={<IconFolderOpen />}
            />
            <Sheet.Body>
              <div className="showcase-stack" data-testid="project-sheet">
                {actions ? (
                  <div className="showcase-sheet-actions">
                    <ActionBar
                      set={actions}
                      targets={[current]}
                      label={current.name}
                      maxButtons={2}
                    />
                  </div>
                ) : null}
                {current.status !== "Complete" && current.dueIn < 0 ? (
                  <Notice tone="danger" compact title="Milestone overdue">
                    Due {Math.abs(current.dueIn)}{" "}
                    {Math.abs(current.dueIn) === 1 ? "day" : "days"} ago.
                  </Notice>
                ) : current.status === "In review" ? (
                  <Notice tone="info" compact title="Waiting for client review">
                    Feedback is due in {current.dueIn} days.
                  </Notice>
                ) : null}
                <Tabs.Root value={tab} onValueChange={setTab}>
                  <Tabs.List
                    aria-label="Project sections"
                    items={[
                      { value: "overview", label: "Overview" },
                      {
                        value: "files",
                        label: "Files",
                        count: current.tags.length + 2,
                      },
                      { value: "activity", label: "Activity" },
                    ]}
                  />
                  <Tabs.Panel value="overview">
                    <div className="showcase-stack">
                      <div className="showcase-row">
                        <Avatar
                          name={current.owner}
                          src={studioPortrait(current.owner)}
                          decorative
                        />
                        <div>
                          <p className="type-label">{current.owner}</p>
                          <p className="type-caption text-fg-muted">
                            Project lead
                          </p>
                        </div>
                        <Badge tone={statusTone(current.status)}>
                          {current.status}
                        </Badge>
                      </div>
                      <Progress
                        value={current.progress}
                        label="Project progress"
                        meta={`${current.hours} hours logged`}
                      />
                      <FactList
                        facts={[
                          {
                            label: "Next milestone",
                            value:
                              current.status === "Complete" ? (
                                "Delivered"
                              ) : (
                                <RelativeTime value={dueAt(current)} />
                              ),
                          },
                          {
                            label: "Team",
                            value: (
                              <AvatarGroup
                                size="xs"
                                people={current.team.map((name) => ({
                                  name,
                                  src: studioPortrait(name),
                                }))}
                              />
                            ),
                          },
                          {
                            label: "Tags",
                            value: current.tags.join(", ") || "None",
                          },
                        ]}
                      />
                    </div>
                  </Tabs.Panel>
                  <Tabs.Panel value="files">
                    <Tree
                      aria-label={`${current.name} files`}
                      nodes={deliverables(current)}
                      defaultExpanded={[`${current.id}-design`]}
                      emptyText={() => "No files"}
                    />
                  </Tabs.Panel>
                  <Tabs.Panel value="activity">
                    <ActivityFeed items={projectActivity(current)} />
                  </Tabs.Panel>
                </Tabs.Root>
              </div>
            </Sheet.Body>
            <Sheet.Footer>
              <Button onClick={onClose}>Back to workspace</Button>
            </Sheet.Footer>
          </>
        ) : null}
      </Sheet.Popup>
    </Sheet.Root>
  );
}

/* ── New project ───────────────────────────────────────────────────────────── */

export interface NewProjectInput {
  name: string;
  category: string;
  owner: string;
  due: IsoDate | null;
  team: string[];
  tags: string[];
}

const projectNameRule = textRule(() => ({ ok: true }), {
  required: true,
  requiredMessage: "Give your project a name.",
});
const blank = (): NewProjectInput => ({
  name: "",
  category: PROJECT_CATEGORIES[0]!,
  owner: "Avery Quinn",
  due: addDays(todayIso(), 14),
  team: [],
  tags: [],
});
const people = studioPeople.map((person) => ({
  value: person.name,
  label: person.name,
  description: person.role,
  icon: <Avatar name={person.name} src={person.src} size="xs" decorative />,
}));

function NewProject({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: NewProjectInput) => void;
}) {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: blank(),
    onSubmit: ({ value }) => {
      onAdd({ ...value, name: value.name.trim() });
      onOpenChange(false);
    },
  });
  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(value) => {
        if (!value) form.reset(blank());
      }}
    >
      <Dialog.Popup size="md">
        <Dialog.Header
          title="New project"
          subtitle="Meridian Studio"
          icon={<IconPlus />}
        />
        <Form form={form} className="showcase-dialog-form">
          <Dialog.Body>
            <div className="showcase-form">
              <form.AppField
                name="name"
                validators={{ onDynamic: projectNameRule }}
              >
                {(field) => (
                  <field.TextField
                    label="Project name"
                    maxLength={80}
                    placeholder="Atlas field guide"
                  />
                )}
              </form.AppField>
              <form.AppField name="category">
                {(field) => (
                  <field.SelectField
                    label="Discipline"
                    options={PROJECT_CATEGORIES.map((value) => ({
                      value,
                      label: value,
                    }))}
                  />
                )}
              </form.AppField>
              <form.AppField name="due">
                {(field) => (
                  <Field label="Next milestone">
                    <DateField
                      name={field.name}
                      value={field.state.value}
                      min={todayIso()}
                      onValueChange={(value) => field.handleChange(value)}
                      onBlur={field.handleBlur}
                    />
                  </Field>
                )}
              </form.AppField>
              <form.AppField name="owner">
                {(field) => (
                  <field.SelectField
                    label="Project lead"
                    options={people.map(({ value, label, icon }) => ({
                      value,
                      label,
                      icon,
                    }))}
                  />
                )}
              </form.AppField>
              <form.AppField name="team">
                {(field) => (
                  <field.MultiSelectField
                    label="Team"
                    optional
                    options={people}
                    placeholder="Add people"
                  />
                )}
              </form.AppField>
              <form.AppField name="tags">
                {(field) => (
                  <field.TagInputField
                    label="Tags"
                    optional
                    allowCreate
                    max={6}
                    suggestions={PROJECT_TAGS.map((tag) => ({
                      value: tag,
                      label: tag,
                    }))}
                    placeholder="Print, Web…"
                  />
                )}
              </form.AppField>
            </div>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <form.SubmitButton variant="primary">
              Create project
            </form.SubmitButton>
          </Dialog.Footer>
        </Form>
      </Dialog.Popup>
    </Dialog.Root>
  );
}

/* ── Workspace ─────────────────────────────────────────────────────────────── */

export function StudioWorkspace({
  projects,
  onAdd,
  onUpdate,
  onArchive,
}: {
  projects: StudioProject[];
  onAdd: (input: NewProjectInput) => void;
  onUpdate: (ids: readonly string[], patch: Partial<StudioProject>) => void;
  onArchive: (ids: readonly string[]) => void;
}) {
  const [view, setView] = useState<"overview" | "projects">("overview");
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [live, setLive] = useState(true);
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState(false);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const opened = projects.find((project) => project.id === openedId) ?? null;
  const open = (project: StudioProject) => setOpenedId(project.id);
  const actions = useProjectActions({
    open,
    update: onUpdate,
    archive: (ids) => {
      if (openedId && ids.includes(openedId)) setOpenedId(null);
      onArchive(ids);
    },
  });
  const [state, setState] = useState<DataTableState>({
    sorting: [],
    filters: [],
    pagination: { pageIndex: 0, pageSize: 25 },
    selection: {},
    search: "",
    groups: { collapsed: ["Complete"], shown: {} },
  });
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => setTick((value) => value + 1), 5000);
    return () => clearInterval(timer);
  }, [live]);
  const series = weeklyHours.map(
    (value, index) => value + (index === weeklyHours.length - 1 ? tick % 7 : 0),
  );
  // Grouped by status: each group's count comes from every matching project (R16).
  const matching = useMemo(
    () =>
      localPage(
        projects,
        columns,
        {
          ...state,
          pagination: { pageIndex: 0, pageSize: projects.length || 1 },
        },
        projectSearch,
      ).rows,
    [projects, state],
  );
  const groups = useMemo<DataTableGroup[]>(
    () =>
      PROJECT_STATUSES.map((status) => ({
        id: status,
        label: status,
        count: matching.filter((project) => project.status === status).length,
      })).filter((group) => group.count > 0),
    [matching],
  );
  const rows = useMemo(() => {
    const groupState = state.groups ?? { collapsed: [], shown: {} };
    return groups.flatMap((group) =>
      groupState.collapsed.includes(group.id)
        ? []
        : matching
            .filter((project) => project.status === group.id)
            .slice(0, shownFor(groupState, group.id, 10)),
    );
  }, [groups, matching, state.groups]);
  const completed = projects.filter(
    (project) => project.status === "Complete",
  ).length;
  const hoursFor = (category: string, done: boolean) =>
    projects
      .filter(
        (project) =>
          project.category === category &&
          (project.status === "Complete") === done,
      )
      .reduce((sum, project) => sum + project.hours, 0);
  return (
    <section
      id="workspace"
      className="showcase-section"
      aria-labelledby="workspace-title"
    >
      <div className="showcase-section-heading">
        <h2 id="workspace-title">Application demo</h2>
      </div>
      <ProjectCommands
        projects={projects}
        opened={opened}
        actions={actions}
        onOpen={open}
      />
      <div className="showcase-workspace" data-testid="studio-workspace">
        <div className="showcase-workspace-bar">
          <div className="showcase-row">
            <span className="showcase-studio-mark">
              <IconGrid />
            </span>
            <div>
              <p className="type-label">Meridian Studio</p>
              <p className="type-caption text-fg-muted">
                {projects.length} projects · {studioPeople.length} people
              </p>
            </div>
          </div>
          <div className="showcase-row">
            <AvatarGroup people={studioPeople} size="sm" />
            <Button
              variant="primary"
              icon={<IconPlus />}
              onClick={() => setAdding(true)}
            >
              New project
            </Button>
          </div>
        </div>
        <div className="showcase-workspace-tools">
          <Segmented
            aria-label="Studio view"
            value={view}
            onValueChange={setView}
            options={[
              { value: "overview", label: "Overview", icon: <IconChartLine /> },
              { value: "projects", label: "Projects", icon: <IconFolder /> },
            ]}
          />
          <Switch
            size="sm"
            label="Live demo"
            checked={live}
            onCheckedChange={setLive}
          />
        </div>
        {view === "overview" ? (
          <>
            <div className="showcase-metrics">
              <Surface material="card" radius="tile" padding="tile">
                <div className="showcase-metric">
                  <Metric
                    label="Active projects"
                    value={projects.length - completed}
                    delta={2}
                    deltaUnit=""
                    deltaLabel="this month"
                    better="up"
                    data={[2, 3, 3, 4, 4, 5, projects.length - completed]}
                  />
                </div>
              </Surface>
              <Surface material="card" radius="tile" padding="tile">
                <div className="showcase-metric" data-testid="live-hours">
                  <Metric
                    label="Studio hours"
                    value={series.at(-1)!}
                    unit="h"
                    delta={12}
                    deltaUnit="%"
                    deltaLabel="vs last week"
                    data={series}
                    range={live ? "Live sample" : "Paused"}
                  />
                </div>
              </Surface>
              <Surface material="card" radius="tile" padding="tile">
                <div className="showcase-metric">
                  <Metric
                    label="Projects delivered"
                    value={completed}
                    delta={1}
                    deltaUnit=""
                    deltaLabel="this week"
                    data={[0, 0, 1, 1, 1, 2, completed]}
                  />
                </div>
              </Surface>
            </div>
            <div className="showcase-dashboard-grid">
              <Panel>
                <PanelHeader
                  className="showcase-chart-header"
                  title="Studio hours"
                  description={
                    period === "week"
                      ? "This week and last week"
                      : "This month and last month"
                  }
                  level={3}
                  actions={
                    <Segmented
                      size="sm"
                      aria-label="Chart period"
                      value={period}
                      onValueChange={setPeriod}
                      options={[
                        { value: "week", label: "Week" },
                        { value: "month", label: "Month" },
                      ]}
                    />
                  }
                />
                <PanelBody>
                  <div className="showcase-chart">
                    <AreaChart
                      label="Studio hours over time"
                      x={series.slice(-7).map((_, i) => i + 1)}
                      series={[
                        {
                          key: "current",
                          label: period === "week" ? "This week" : "This month",
                          data: series
                            .slice(-7)
                            .map(
                              (value) => value * (period === "month" ? 3 : 1),
                            ),
                        },
                        {
                          key: "previous",
                          label: period === "week" ? "Last week" : "Last month",
                          data: previousHours
                            .slice(-7)
                            .map(
                              (value) => value * (period === "month" ? 3 : 1),
                            ),
                        },
                      ]}
                      unit="h"
                      formatX={(value) =>
                        period === "week"
                          ? (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][
                              value - 1
                            ] ?? "Sun")
                          : `${value * 4} Oct`
                      }
                    />
                  </div>
                </PanelBody>
              </Panel>
              <Panel>
                <PanelHeader
                  title="Hours by discipline"
                  description="Open and delivered projects"
                  level={3}
                />
                <PanelBody>
                  <div className="showcase-chart">
                    <BarChart
                      label="Logged hours by discipline"
                      orientation="horizontal"
                      layout="stacked"
                      categories={PROJECT_CATEGORIES}
                      series={[
                        {
                          key: "open",
                          label: "Open",
                          data: PROJECT_CATEGORIES.map((category) =>
                            hoursFor(category, false),
                          ),
                        },
                        {
                          key: "delivered",
                          label: "Delivered",
                          data: PROJECT_CATEGORIES.map((category) =>
                            hoursFor(category, true),
                          ),
                        },
                      ]}
                      unit="h"
                    />
                  </div>
                </PanelBody>
              </Panel>
            </div>
          </>
        ) : null}
        <Panel>
          {view === "overview" ? (
            <PanelHeader title="Projects" level={3} />
          ) : null}
          <PanelBody>
            <div className="showcase-projects" data-view={view}>
              <DataTable
                id="docs-studio-projects"
                label="Studio projects"
                rows={rows}
                columns={columns}
                state={state}
                onStateChange={setState}
                search={projectSearch}
                grouping={{
                  groupOf: (project) => project.status,
                  groups,
                  pageSize: 10,
                }}
                getRowId={(row) => row.id}
                getRowLabel={(row) => row.name}
                onRowOpen={open}
                actions={actions}
                noun={{ one: "project", other: "projects" }}
                emptyMessage="No projects yet"
                emptyAction={
                  <Button icon={<IconPlus />} onClick={() => setAdding(true)}>
                    New project
                  </Button>
                }
              />
            </div>
          </PanelBody>
        </Panel>
      </div>
      <ComponentLinks
        items={[
          ["data-table", "Grouped tables"],
          ["action-bar", "Shared actions"],
          ["command-palette", "Command palette"],
          ["bar-chart", "Charts"],
          ["metric", "Metrics"],
          ["sheet", "Sheets"],
          ["tree", "Tree"],
          ["date-picker", "Date fields"],
          ["tag-input", "Tag input"],
        ]}
      />
      <ProjectSheet
        project={opened}
        actions={actions}
        onClose={() => setOpenedId(null)}
      />
      <NewProject
        open={adding}
        onOpenChange={setAdding}
        onAdd={(input) => {
          onAdd(input);
          setState((value) => ({
            ...value,
            search: "",
            filters: [],
            sorting: [],
            // Show the new project: its group opens, the others keep their state.
            groups: {
              collapsed: (value.groups?.collapsed ?? []).filter(
                (group) => group !== "In progress",
              ),
              shown: {},
            },
          }));
          toast.success(`${input.name} created in the demo workspace.`);
        }}
      />
    </section>
  );
}
