import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { componentDestination } from "glass-ux/gallery";
import {
  useAppearance,
  BACKGROUNDS,
  BACKGROUND_LABELS,
} from "glass-ux/appearance";
import {
  Surface,
  Panel,
  PanelHeader,
  PanelBody,
  PanelFooter,
} from "glass-ux/surface";
import { Button } from "glass-ux/button";
import { ButtonLink } from "glass-ux/button-link";
import { Badge } from "glass-ux/badge";
import { Avatar, AvatarGroup } from "glass-ux/avatar";
import { Metric } from "glass-ux/metric";
import { AreaChart } from "glass-ux/charts";
import { ActivityFeed } from "glass-ux/activity-feed";
import {
  DataTable,
  createDataTableColumns,
  localPage,
  filters,
  type DataTableState,
  type DataTableSearch,
} from "glass-ux/data-table";
import { Progress, ProgressRing } from "glass-ux/progress";
import { Dialog } from "glass-ux/dialog";
import { Field } from "glass-ux/field";
import { Form, formBehaviour, textRule, useAppForm } from "glass-ux/form";
import { Segmented } from "glass-ux/segmented";
import { Switch } from "glass-ux/switch";
import { Checkbox } from "glass-ux/checkbox";
import { Slider } from "glass-ux/slider";
import { toast } from "glass-ux/toast";
import {
  AiMark,
  Markdown,
  AssistantMessage,
  Composer,
  ConversationHandlersProvider,
  ConversationLog,
  EntityResolverProvider,
  ResultBlock,
  Turn,
  UserMessage,
  type AiAttachment,
  type AiBlock,
  type AiMessage,
  type EntityRef,
  type EntityResolver,
} from "glass-ux/ai";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconChartLine,
  IconFolder,
  IconGrid,
  IconPhone,
  IconPlus,
  IconRefresh,
  IconUser,
} from "glass-ux/icons";
import {
  studioProjects,
  studioPeople,
  studioPortrait,
  weeklyHours,
  previousHours,
  taskNames,
  type StudioProject,
} from "./showcase-data";
import "./showcase.css";
import { NetworkWorkspace } from "./showcase-network";

const statusTone = (status: StudioProject["status"]) =>
  status === "Complete"
    ? "success"
    : status === "In review"
      ? "warning"
      : "accent";
const col = createDataTableColumns<StudioProject>();
const columns = col.columns([
  col.accessor("name", {
    header: "Project",
    width: 18,
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
    width: 12,
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
    width: 9,
    priority: 2,
    cardRole: "status",
    sortable: true,
    cell: ({ getValue }) => (
      <Badge size="sm" tone={statusTone(getValue())} marker="dot">
        {getValue()}
      </Badge>
    ),
    filter: filters.options({
      field: "status",
      options: ["In progress", "In review", "Complete"].map((value) => ({
        value,
        label: value,
      })),
    }),
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

function ComponentLinks({ items }: { items: Array<[string, string]> }) {
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

function ProjectDialog({
  project,
  onClose,
}: {
  project: StudioProject | null;
  onClose: () => void;
}) {
  return (
    <Dialog.Root
      open={!!project}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Popup size="sm">
        <Dialog.Header
          title={project?.name ?? "Project"}
          subtitle={project?.category}
          icon={<IconFolder />}
        />
        <Dialog.Body>
          {project ? (
            <div className="showcase-stack">
              <div className="showcase-row">
                <Avatar
                  name={project.owner}
                  src={studioPortrait(project.owner)}
                  decorative
                />
                <div>
                  <p className="type-label">{project.owner}</p>
                  <p className="type-caption text-fg-muted">Project lead</p>
                </div>
                <Badge tone={statusTone(project.status)}>
                  {project.status}
                </Badge>
              </div>
              <Progress
                value={project.progress}
                label="Project progress"
                meta={`${project.hours} hours logged`}
              />
            </div>
          ) : null}
        </Dialog.Body>
        <Dialog.Footer>
          <Button onClick={onClose}>Back to workspace</Button>
        </Dialog.Footer>
      </Dialog.Popup>
    </Dialog.Root>
  );
}

const projectNameRule = textRule(() => ({ ok: true }), {
  required: true,
  requiredMessage: "Give your project a name.",
});

function NewProject({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string) => void;
}) {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { name: "" },
    onSubmit: ({ value }) => {
      onAdd(value.name.trim());
      onOpenChange(false);
    },
  });
  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(value) => {
        if (!value) form.reset({ name: "" });
      }}
    >
      <Dialog.Popup size="sm">
        <Dialog.Header
          title="New project"
          subtitle="Meridian Studio"
          icon={<IconPlus />}
        />
        <Form form={form}>
          <Dialog.Body>
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

function StudioWorkspace({
  projects,
  onAdd,
}: {
  projects: StudioProject[];
  onAdd: (name: string) => void;
}) {
  const [view, setView] = useState<"overview" | "projects">("overview");
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [live, setLive] = useState(true);
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState(false);
  const [opened, setOpened] = useState<StudioProject | null>(null);
  const [state, setState] = useState<DataTableState>({
    sorting: [],
    filters: [],
    pagination: { pageIndex: 0, pageSize: 5 },
    selection: {},
    search: "",
  });
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => setTick((value) => value + 1), 5000);
    return () => clearInterval(timer);
  }, [live]);
  const series = weeklyHours.map(
    (value, index) => value + (index === weeklyHours.length - 1 ? tick % 7 : 0),
  );
  const page = useMemo(
    () => localPage(projects, columns, state, projectSearch),
    [projects, state],
  );
  const completed = projects.filter(
    (project) => project.status === "Complete",
  ).length;
  return (
    <section
      id="workspace"
      className="showcase-section"
      aria-labelledby="workspace-title"
    >
      <div className="showcase-section-heading">
        <div>
          <h2 id="workspace-title">Application demo</h2>
        </div>
      </div>
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
                <div className="showcase-metric">
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
                <PanelHeader title="Recent activity" level={3} />
                <PanelBody>
                  <ActivityFeed
                    items={[
                      {
                        id: "review",
                        icon: (
                          <Avatar
                            name="Mira Chen"
                            src={studioPortrait("Mira Chen")}
                            size="xs"
                            decorative
                          />
                        ),
                        content: (
                          <>
                            <strong>Mira</strong> shared The Observatory for
                            review.
                          </>
                        ),
                        at: Date.now() - 180000,
                      },
                      {
                        id: "complete",
                        icon: (
                          <Avatar
                            name="Noah Reed"
                            src={studioPortrait("Noah Reed")}
                            size="xs"
                            decorative
                          />
                        ),
                        content: (
                          <>
                            <strong>Noah</strong> wrapped up Cedar house.
                          </>
                        ),
                        at: Date.now() - 1800000,
                      },
                      {
                        id: "guidelines",
                        icon: (
                          <Avatar
                            name="Avery Quinn"
                            src={studioPortrait("Avery Quinn")}
                            size="xs"
                            decorative
                          />
                        ),
                        content: (
                          <>
                            <strong>Avery</strong> added the Meridian
                            guidelines.
                          </>
                        ),
                        at: Date.now() - 3600000,
                      },
                    ]}
                  />
                </PanelBody>
                <PanelFooter className="showcase-activity-footer">
                  <Badge
                    tone={live ? "success" : "neutral"}
                    marker={live ? "pulse" : "ring"}
                  >
                    {live ? "Sample data is live" : "Live updates paused"}
                  </Badge>
                  <span
                    className="type-caption text-fg-muted"
                    data-testid="live-tick"
                  >
                    Update {tick + 1}
                  </span>
                </PanelFooter>
              </Panel>
            </div>
          </>
        ) : null}
        <Panel>
          {view === "overview" ? (
            <PanelHeader title="Projects" level={3} />
          ) : null}
          <PanelBody>
            <div className="showcase-projects">
              <DataTable
                id="docs-studio-projects"
                label="Studio projects"
                rows={page.rows}
                rowCount={page.count}
                columns={columns}
                state={state}
                onStateChange={setState}
                search={projectSearch}
                getRowId={(row) => row.id}
                getRowLabel={(row) => row.name}
                onRowOpen={setOpened}
                pageSizes={[5, 10, 25]}
                noun={{ one: "project", other: "projects" }}
                renderRowActions={(row) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconArrowUpRight />}
                    aria-label={`Open ${row.name}`}
                    onClick={() => setOpened(row)}
                  />
                )}
                renderBulkActions={(rows, clear) => (
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.success(
                        `${rows.length} project${rows.length === 1 ? "" : "s"} added to your demo review.`,
                      );
                      clear();
                    }}
                  >
                    Add to review
                  </Button>
                )}
              />
            </div>
          </PanelBody>
        </Panel>
      </div>
      <ComponentLinks
        items={[
          ["data-table", "Data table"],
          ["area-chart", "Charts"],
          ["metric", "Metrics"],
          ["surface", "Surfaces"],
          ["dialog", "Dialogs"],
        ]}
      />
      <ProjectDialog project={opened} onClose={() => setOpened(null)} />
      <NewProject
        open={adding}
        onOpenChange={setAdding}
        onAdd={(name) => {
          onAdd(name);
          setState((value) => ({
            ...value,
            search: "",
            filters: [],
            sorting: [],
            pagination: { ...value.pagination, pageIndex: 0 },
          }));
        }}
      />
    </section>
  );
}

const MODEL = { name: "Studio assistant", runtime: "Scripted demo" };
const firstPrompt: AiMessage = {
  id: "welcome-prompt",
  role: "user",
  createdAt: Date.now(),
  state: "complete",
  blocks: [{ kind: "markdown", text: "What’s happening in the studio?" }],
};
const welcome: AiMessage = {
  id: "welcome-answer",
  role: "assistant",
  createdAt: Date.now(),
  model: MODEL.name,
  state: "complete",
  blocks: [
    {
      kind: "tools",
      calls: [
        {
          id: "read-studio",
          toolId: "demo.projects.read",
          label: "Read 8 studio projects",
          status: "succeeded",
          elapsedMs: 400,
        },
      ],
    },
    {
      kind: "markdown",
      text: "**The Observatory** and **Morrow spaces** are in review. **Meridian identity** is 72% complete.\n\nSelect **Prepare a review checklist** to create sample tasks for the mobile project preview.",
    },
    {
      kind: "result",
      result: {
        id: "welcome-metrics",
        type: "metrics",
        title: "Studio summary",
        source: "Meridian Studio · sample data",
        metrics: [
          { label: "Projects", value: 8 },
          { label: "Delivered", value: 2, tone: "success" },
          { label: "In review", value: 2, tone: "warning" },
        ],
      },
    },
  ],
};

function StudioAssistant({
  projects,
  onChecklist,
}: {
  projects: StudioProject[];
  onChecklist: () => void;
}) {
  const [messages, setMessages] = useState<AiMessage[]>([firstPrompt, welcome]);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [expanded, setExpanded] = useState<AiMessage | null>(null);
  const [context, setContext] = useState<EntityRef[]>([]);
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [contextProject, setContextProject] = useState<StudioProject | null>(
    null,
  );
  const files = useRef(new Map<string, { file: File; url: string }>());
  const attachmentSequence = useRef(0);
  const resolver = useMemo<EntityResolver>(
    () => ({
      kinds: {
        project: {
          icon: IconFolder,
          noun: "Project",
          plural: "Projects",
          segment: "projects",
        },
        person: {
          icon: IconUser,
          noun: "Person",
          plural: "People",
          segment: "people",
        },
      },
      search: (query, kind) =>
        [
          ...projects.map((project) => ({
            kind: "project",
            id: project.id,
            label: project.name,
          })),
          ...studioPeople.map((person) => ({
            kind: "person",
            id: person.name,
            label: person.name,
          })),
        ].filter(
          (entity) =>
            (!kind || entity.kind === kind) &&
            entity.label.toLowerCase().includes(query.toLowerCase()),
        ),
      preview: (entity) => {
        const project = projects.find((item) => item.id === entity.id);
        return project
          ? {
              subtitle: project.category,
              facts: [
                { label: "Status", value: project.status },
                { label: "Progress", value: `${project.progress}%` },
                { label: "Hours", value: String(project.hours) },
              ],
            }
          : {
              subtitle: "Meridian Studio",
              facts: [
                {
                  label: "Role",
                  value: "Studio team",
                },
              ],
            };
      },
      actions: () => undefined,
      open: (entity) => {
        const project = projects.find((item) => item.id === entity.id);
        if (project) setContextProject(project);
        else toast.info(`${entity.label} · Meridian Studio`);
      },
      openWindow: (entity) => {
        const project = projects.find((item) => item.id === entity.id);
        if (project) setContextProject(project);
        else toast.info(`${entity.label} · Meridian Studio`);
      },
    }),
    [projects],
  );
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPrompt = useRef("");
  const stop = () => {
    generation.current++;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
    setMessages((items) =>
      items.map((message) =>
        message.state === "streaming"
          ? {
              ...message,
              state: "cancelled",
              blocks: message.blocks.map((block) =>
                block.kind === "tools"
                  ? {
                      ...block,
                      calls: block.calls.map((call) =>
                        call.status === "running"
                          ? { ...call, status: "cancelled" }
                          : call,
                      ),
                    }
                  : block,
              ),
            }
          : message,
      ),
    );
    setAnnouncement("Reply stopped.");
  };
  useEffect(
    () => () => {
      generation.current++;
      if (timer.current) clearInterval(timer.current);
      for (const item of files.current.values()) URL.revokeObjectURL(item.url);
      files.current.clear();
    },
    [],
  );
  const send = (text: string) => {
    if (running || !text.trim()) return;
    lastPrompt.current = text;
    setPrompt("");
    setRunning(true);
    const sentAttachments = attachments;
    setAttachments([]);
    const run = ++generation.current;
    const id = `reply-${run}-${Date.now()}`;
    const checklist =
      !sentAttachments.length && /checklist|review|prepare/i.test(text);
    const complete = projects.filter(
      (project) => project.status === "Complete",
    ).length;
    const scopedProject = projects.find((project) =>
      context.some(
        (entity) => entity.kind === "project" && entity.id === project.id,
      ),
    );
    const answer = sentAttachments.length
      ? `${sentAttachments.length} ${sentAttachments.length === 1 ? "file is" : "files are"} held in browser memory for this conversation. You can download the original files below. No files are sent to a server.`
      : checklist
        ? "I’ve drafted a review checklist for **Meridian identity**:\n\n- Review the visual direction\n- Share the identity guidelines\n- Prepare handover files\n- Schedule the studio review\n\nApprove the request below to add these tasks to the mobile project preview."
        : /hour|time/i.test(text)
          ? `The studio has logged **${projects.reduce((total, project) => total + project.hours, 0)} hours** across ${projects.length} projects. **The Observatory** leads with 112 hours.\n\nTry the dashboard’s Week / Month control to explore the trend.`
          : /complete|deliver|finish/i.test(text)
            ? `**${complete} projects are complete**: ${projects
                .filter((project) => project.status === "Complete")
                .map((project) => project.name)
                .join(
                  " and ",
                )}.\n\nThe rest are moving through design and review. You can inspect each project in the table above.`
            : scopedProject
              ? `[${scopedProject.name}](/projects/${scopedProject.id}) is **${scopedProject.progress}% complete**, with **${scopedProject.hours} hours** logged. ${scopedProject.owner} is the project lead.`
              : `Studio summary: **${projects.length} projects**, **${complete} delivered**, and **${projects.filter((project) => project.status === "In review").length} ready for review**.`;
    const widgets: AiBlock[] = checklist
      ? []
      : [
          {
            kind: "result",
            result: sentAttachments.length
              ? {
                  id: `files-${id}`,
                  type: "files",
                  title: "Attached files",
                  source: "Browser memory",
                  files: sentAttachments.map((file) => ({
                    id: file.id,
                    name: file.name,
                    size: file.size,
                    mime: file.mime,
                    href: files.current.get(file.id)?.url,
                  })),
                }
              : /hour|time/i.test(text)
                ? {
                    id: `hours-${id}`,
                    type: "chart",
                    title: "Studio hours",
                    source: "Meridian Studio · sample data",
                    chart: "bar",
                    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                    unit: "h",
                    series: [
                      {
                        name: "This week",
                        values: weeklyHours.slice(-7),
                        tone: "accent",
                      },
                      {
                        name: "Last week",
                        values: previousHours.slice(-7),
                        tone: "neutral",
                      },
                    ],
                  }
                : /complete|deliver|finish/i.test(text)
                  ? {
                      id: `completed-${id}`,
                      type: "table",
                      title: "Completed projects",
                      source: "Meridian Studio · sample data",
                      columns: [
                        { key: "project", header: "Project", priority: 1 },
                        { key: "owner", header: "Lead", priority: 2 },
                        {
                          key: "hours",
                          header: "Hours",
                          type: "number",
                          unit: "h",
                          priority: 2,
                        },
                      ],
                      rows: projects
                        .filter((project) => project.status === "Complete")
                        .map((project) => ({
                          project: {
                            kind: "project",
                            id: project.id,
                            label: project.name,
                          },
                          owner: project.owner,
                          hours: project.hours,
                        })),
                      total: complete,
                      noun: { one: "project", other: "projects" },
                    }
                  : scopedProject
                    ? {
                        id: `project-${id}`,
                        type: "entity",
                        title: "Project",
                        source: "Meridian Studio · sample data",
                        entity: {
                          kind: "project",
                          id: scopedProject.id,
                          label: scopedProject.name,
                        },
                        subtitle: scopedProject.category,
                        facts: [
                          { label: "Status", value: scopedProject.status },
                          {
                            label: "Progress",
                            value: `${scopedProject.progress}%`,
                          },
                          {
                            label: "Hours",
                            value: String(scopedProject.hours),
                          },
                        ],
                      }
                    : {
                        id: `summary-${id}`,
                        type: "metrics",
                        title: "Studio summary",
                        source: "Meridian Studio · sample data",
                        metrics: [
                          { label: "Projects", value: projects.length },
                          {
                            label: "Delivered",
                            value: complete,
                            tone: "success",
                          },
                          {
                            label: "In review",
                            value: projects.filter(
                              (project) => project.status === "In review",
                            ).length,
                            tone: "warning",
                          },
                        ],
                      },
          },
        ];
    let length = 0;
    setMessages((items) => [
      ...items,
      {
        id: `prompt-${id}`,
        role: "user",
        createdAt: Date.now(),
        state: "complete",
        blocks: [{ kind: "markdown", text }],
        attachments: sentAttachments,
      },
      {
        id,
        role: "assistant",
        model: MODEL.name,
        createdAt: Date.now(),
        state: "streaming",
        blocks: [
          {
            kind: "tools",
            calls: [
              {
                id: `tool-${id}`,
                toolId: "demo.projects.read",
                label: "Reading studio projects",
                activeLabel: "Reading studio projects",
                status: "running",
              },
            ],
          },
        ],
      },
    ]);
    timer.current = setInterval(() => {
      if (generation.current !== run) return;
      length += 18;
      const done = length >= answer.length;
      setMessages((items) =>
        items.map((message) =>
          message.id === id
            ? {
                ...message,
                state: done ? "complete" : "streaming",
                blocks: [
                  {
                    kind: "tools",
                    calls: [
                      {
                        id: `tool-${id}`,
                        toolId: "demo.projects.read",
                        label: `Read ${projects.length} studio projects`,
                        status: "succeeded",
                        elapsedMs: 400,
                      },
                    ],
                  },
                  { kind: "markdown", text: answer.slice(0, length) },
                  ...(done ? widgets : []),
                  ...(done && checklist
                    ? [
                        {
                          kind: "ask" as const,
                          ask: {
                            id: `checklist-${id}`,
                            type: "approval" as const,
                            question:
                              "Add this checklist to Meridian identity?",
                            action: "Add the review checklist",
                            targets: [],
                            risk: "warning" as const,
                            effect:
                              "Adds four sample tasks to the mobile preview. You can reset the demo at any time.",
                            state: "pending" as const,
                          },
                        },
                      ]
                    : []),
                ],
              }
            : message,
        ),
      );
      if (done) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setRunning(false);
        setAnnouncement(answer);
      }
    }, 65);
  };
  return (
    <EntityResolverProvider resolver={resolver}>
      <div className="showcase-assistant" data-testid="studio-assistant">
        <PanelHeader
          title="Studio assistant"
          description="Scripted responses · local demo"
          level={3}
          actions={
            <Button
              variant="ghost"
              size="sm"
              icon={<IconRefresh />}
              aria-label="Reset conversation"
              onClick={() => {
                stop();
                setMessages([firstPrompt, welcome]);
                setPrompt("");
                setContext([]);
                setAttachments([]);
                for (const item of files.current.values())
                  URL.revokeObjectURL(item.url);
                files.current.clear();
                setAnnouncement("Conversation reset.");
              }}
            />
          }
        />
        <ConversationHandlersProvider
          handlers={{
            decide: async (id, decision) => {
              if (decision.decision === "approve") {
                onChecklist();
                toast.success("Review checklist added to the mobile project.");
              }
              setMessages((items) =>
                items.map((message) => ({
                  ...message,
                  blocks: message.blocks.map((block) =>
                    block.kind === "ask" &&
                    block.ask.id === id &&
                    block.ask.type === "approval"
                      ? {
                          ...block,
                          ask: {
                            ...block.ask,
                            state:
                              decision.decision === "approve"
                                ? "executed"
                                : "denied",
                            outcome:
                              decision.decision === "approve"
                                ? "Four review tasks added to the mobile preview."
                                : undefined,
                          },
                        }
                      : block,
                  ),
                })),
              );
            },
            feedback: (target, feedback) =>
              setMessages((items) =>
                items.map((message) =>
                  message.id === target.id ? { ...message, feedback } : message,
                ),
              ),
            editMessage: (message) => {
              setPrompt(
                message.blocks
                  .filter((block) => block.kind === "markdown")
                  .map((block) => block.text)
                  .join("\n"),
              );
            },
            retry: async () => {
              if (!running)
                send(lastPrompt.current || "What’s happening in the studio?");
            },
            openMessageWindow: setExpanded,
            openResultWindow: (result) =>
              setExpanded({
                id: `expanded-${result.id}`,
                role: "assistant",
                createdAt: Date.now(),
                state: "complete",
                model: MODEL.name,
                blocks: [{ kind: "result", result }],
              }),
          }}
        >
          <div className="showcase-conversation">
            <ConversationLog
              label="Studio assistant conversation"
              surface="panel"
              announcement={announcement}
              footer={
                <Composer
                  value={prompt}
                  onValueChange={setPrompt}
                  onSend={send}
                  onStop={stop}
                  onEditLast={() => setPrompt(lastPrompt.current)}
                  run={running ? "running" : "idle"}
                  model={MODEL}
                  context={context}
                  onContextChange={setContext}
                  attachments={attachments}
                  onAttach={(selected) => {
                    const added = selected.map((file) => {
                      const id = `studio-file-${++attachmentSequence.current}`;
                      const url = URL.createObjectURL(file);
                      files.current.set(id, { file, url });
                      return {
                        id,
                        name: file.name,
                        size: file.size,
                        mime: file.type,
                        href: url,
                        state: "ready" as const,
                        previewUrl: file.type.startsWith("image/")
                          ? url
                          : undefined,
                      };
                    });
                    setAttachments((items) => [...items, ...added]);
                  }}
                  onRemoveAttachment={(id) => {
                    const item = files.current.get(id);
                    if (item) URL.revokeObjectURL(item.url);
                    files.current.delete(id);
                    setAttachments((items) =>
                      items.filter((item) => item.id !== id),
                    );
                  }}
                  aria-label="Ask the studio assistant"
                  placeholder="Ask about projects, or type @ for context…"
                  status={
                    <span className="showcase-composer-status type-caption text-fg-muted">
                      Local demo · files stay in browser memory
                    </span>
                  }
                />
              }
            >
              <Turn index={1}>
                {messages.map((message, index) =>
                  message.role === "user" ? (
                    <UserMessage
                      key={message.id}
                      message={message}
                      editable={index === messages.length - 2}
                    />
                  ) : (
                    <AssistantMessage
                      key={message.id}
                      message={message}
                      latest={index === messages.length - 1}
                    />
                  ),
                )}
              </Turn>
            </ConversationLog>
          </div>
        </ConversationHandlersProvider>
        <Dialog.Root
          open={!!expanded}
          onOpenChange={(open) => {
            if (!open) setExpanded(null);
          }}
        >
          <Dialog.Popup size="md">
            <Dialog.Header
              title="Assistant response"
              subtitle="Studio assistant · demo"
              icon={<AiMark />}
            />
            <Dialog.Body>
              <Markdown
                text={
                  expanded?.blocks
                    .filter((block) => block.kind === "markdown")
                    .map((block) => block.text)
                    .join("\n") ?? ""
                }
              />
              {expanded?.blocks
                .filter((block) => block.kind === "result")
                .map((block) => (
                  <ResultBlock key={block.result.id} result={block.result} />
                ))}
            </Dialog.Body>
            <Dialog.Footer>
              <Button onClick={() => setExpanded(null)}>
                Back to conversation
              </Button>
            </Dialog.Footer>
          </Dialog.Popup>
        </Dialog.Root>
        <ProjectDialog
          project={contextProject}
          onClose={() => setContextProject(null)}
        />
        <div
          className="showcase-suggestions"
          role="group"
          aria-label="Try a prompt"
        >
          {[
            "Prepare a review checklist",
            "How many hours?",
            "What’s complete?",
          ].map((text) => (
            <Button
              key={text}
              size="sm"
              variant="ghost"
              disabled={running}
              onClick={() => send(text)}
            >
              {text}
            </Button>
          ))}
        </div>
      </div>
    </EntityResolverProvider>
  );
}

function MobileProject({
  checklist,
  resetChecklist,
}: {
  checklist: number;
  resetChecklist: () => void;
}) {
  const taskId = useId();
  const [tab, setTab] = useState<"tasks" | "team">("tasks");
  const [done, setDone] = useState<string[]>([taskNames[0]!]);
  useEffect(() => {
    if (checklist) {
      setTab("tasks");
      setDone([]);
    }
  }, [checklist]);
  return (
    <div className="showcase-mobile-column">
      <div className="showcase-mobile-caption">
        <IconPhone />
        <span className="type-caption">Mobile project preview</span>
      </div>
      <Surface
        className="showcase-phone"
        material="chrome"
        padding="panel"
        data-testid="mobile-preview"
      >
        <div className="showcase-phone-status">
          <span>9:41</span>
          <span>Meridian Studio</span>
          <IconGrid />
        </div>
        <div className="showcase-phone-title">
          <Badge size="sm" tone="accent">
            Brand strategy
          </Badge>
          <h3>Meridian identity</h3>
        </div>
        <Surface material="card" padding="tile" radius="tile">
          <div className="showcase-row">
            <ProgressRing
              value={done.length * 25}
              aria-label="Review completion"
            />
            <div>
              <p className="type-label">Review</p>
              <p className="type-caption text-fg-muted">
                {done.length} of 4 completed
              </p>
            </div>
          </div>
        </Surface>
        <Segmented
          block
          size="sm"
          aria-label="Mobile project view"
          value={tab}
          onValueChange={setTab}
          options={[
            { value: "tasks", label: "Tasks" },
            { value: "team", label: "People" },
          ]}
        />
        {tab === "tasks" ? (
          <div className="showcase-phone-tasks">
            {checklist ? (
              <Badge tone="success" marker="dot">
                Added by your assistant
              </Badge>
            ) : null}
            {taskNames.map((task, index) => (
              <div className="showcase-task" key={task}>
                <span>
                  <Checkbox
                    id={`${taskId}-${index}`}
                    aria-label={task}
                    checked={done.includes(task)}
                    onCheckedChange={(checked) =>
                      setDone((items) =>
                        checked
                          ? [...items, task]
                          : items.filter((item) => item !== task),
                      )
                    }
                  />
                </span>
                <label htmlFor={`${taskId}-${index}`}>{task}</label>
              </div>
            ))}
          </div>
        ) : (
          <div className="showcase-phone-tasks">
            {studioPeople.map(({ name, src }, index) => (
              <div className="showcase-row" key={name}>
                <Avatar
                  name={name}
                  src={src}
                  size="sm"
                  presence={index < 2 ? "online" : "away"}
                />
                <div>
                  <p className="type-label">{name}</p>
                  <p className="type-caption text-fg-muted">
                    {
                      [
                        "Design lead",
                        "Digital designer",
                        "Editorial designer",
                        "Art director",
                      ][index]
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="showcase-phone-footer">
          <span className="type-caption text-fg-muted">Sample project</span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Reset review tasks"
            icon={<IconRefresh />}
            onClick={() => {
              setDone([taskNames[0]!]);
              resetChecklist();
            }}
          />
        </div>
      </Surface>
    </div>
  );
}

function AppearanceLab() {
  const { appearance, update } = useAppearance();
  return (
    <section className="showcase-section" aria-labelledby="appearance-title">
      <div className="showcase-section-heading">
        <div>
          <h2 id="appearance-title">Appearance</h2>
          <p className="text-fg-muted">
            Background, scale, radius and line weight apply to all examples.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => update({ uiScale: 1, radiusScale: 1, borderWidth: 1 })}
        >
          Reset geometry
        </Button>
      </div>
      <div
        className="showcase-backgrounds"
        role="group"
        aria-label="Canvas background"
      >
        {BACKGROUNDS.map((background) => (
          <Button
            key={background}
            variant="secondary"
            className="showcase-background-option"
            aria-pressed={(appearance.background ?? "silk") === background}
            onClick={() => update({ background })}
          >
            <span
              aria-hidden
              className="showcase-background-swatch canvas-ambient"
              data-background={background}
            />
            <span>{BACKGROUND_LABELS[background]}</span>
          </Button>
        ))}
      </div>
      <div className="showcase-appearance">
        <Field
          label="UI scale"
          nativeLabel={false}
          aside={`${Math.round(appearance.uiScale * 100)}%`}
          message="auto"
        >
          <Slider
            bubble="never"
            aria-label="UI scale"
            value={appearance.uiScale}
            min={0.875}
            max={1.25}
            step={0.025}
            onValueChange={(value) => update({ uiScale: Number(value) })}
            format={(value) => `${Math.round(value * 100)}%`}
          />
        </Field>
        <Field
          label="Corner radius"
          nativeLabel={false}
          aside={`${appearance.radiusScale.toFixed(1)}×`}
          message="auto"
        >
          <Slider
            bubble="never"
            aria-label="Corner radius"
            value={appearance.radiusScale}
            min={0}
            max={1.5}
            step={0.1}
            onValueChange={(value) => update({ radiusScale: Number(value) })}
          />
        </Field>
        <Field
          label="Line weight"
          nativeLabel={false}
          aside={`${appearance.borderWidth.toFixed(1)} px`}
          message="auto"
        >
          <Slider
            bubble="never"
            aria-label="Line weight"
            value={appearance.borderWidth}
            min={0.5}
            max={2}
            step={0.1}
            onValueChange={(value) => update({ borderWidth: Number(value) })}
          />
        </Field>
      </div>
    </section>
  );
}

export function Showcase() {
  const [projects, setProjects] = useState(studioProjects);
  const [checklist, setChecklist] = useState(0);
  return (
    <div className="showcase">
      <header className="showcase-hero">
        <h1>Glass UX</h1>
        <p>React 19 components for data and assistant interfaces.</p>
        <div className="showcase-hero-actions">
          <ButtonLink
            variant="primary"
            render={
              <Link to="/guides/$guide" params={{ guide: "getting-started" }} />
            }
            iconEnd={<IconArrowRight />}
          >
            Getting started
          </ButtonLink>
        </div>
      </header>
      <StudioWorkspace
        projects={projects}
        onAdd={(name) => {
          setProjects((items) => [
            {
              id: `project-${Date.now()}`,
              name,
              owner: "Avery Quinn",
              status: "In progress",
              category: "New project",
              progress: 0,
              hours: 0,
            },
            ...items,
          ]);
          toast.success(`${name} created in the demo workspace.`);
        }}
      />
      <section
        id="assistant"
        className="showcase-section"
        aria-labelledby="assistant-title"
      >
        <div className="showcase-section-heading">
          <div>
            <h2 id="assistant-title">Assistant demo</h2>
            <p className="text-fg-muted">
              Scripted chat with streaming, tool activity and approvals.
            </p>
          </div>
        </div>
        <div className="showcase-experiences">
          <div>
            <Panel>
              <StudioAssistant
                projects={projects}
                onChecklist={() => setChecklist((value) => value + 1)}
              />
            </Panel>
            <ComponentLinks
              items={[
                ["conversation-log", "Conversations"],
                ["composer", "Composer"],
                ["approval-card", "Approvals"],
                ["tool-call-row", "Tool activity"],
              ]}
            />
          </div>
          <div>
            <MobileProject
              checklist={checklist}
              resetChecklist={() => setChecklist(0)}
            />
            <ComponentLinks
              items={[
                ["checkbox", "Checkbox"],
                ["progress", "Progress"],
                ["avatar", "Avatars"],
              ]}
            />
          </div>
        </div>
      </section>
      <NetworkWorkspace />
      <ComponentLinks
        items={[
          ["geo-map", "Maps"],
          ["top-bar", "Top bar"],
          ["workspace", "Windows"],
          ["rich-text-input", "Rich text"],
          ["account-button", "Account"],
        ]}
      />
      <AppearanceLab />
      <footer className="showcase-footer">
        <p className="type-caption text-fg-muted">
          All sample data is fictional. Project and chat changes reset when the
          page reloads.
        </p>
      </footer>
    </div>
  );
}
