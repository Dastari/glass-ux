import { useMemo, useRef, useState } from "react";
import { useLocale } from "../../lib/locale/index.js";
import { defineActions } from "../../ui/actions/index.js";
import { Breadcrumb } from "../../ui/breadcrumb/index.js";
import { Button } from "../../ui/button/index.js";
import { formatBytes } from "../../ui/byte-size-field/index.js";
import { createDataTableColumns, DataTable, localPage, type DataTableState } from "../../ui/data-table/index.js";
import { FileIcon } from "../../ui/file-icon/index.js";
import { IconFolder, IconTrash, IconUpload } from "../../icons/generated/icons.js";
import { SplitPane } from "../../ui/split-pane/index.js";
import { Panel } from "../../ui/surface/index.js";
import { Tree, type TreeNode } from "../../ui/tree/index.js";

interface FileRow {
  id: string;
  name: string;
  kind: "folder" | "file";
  size: number | null;
  modified: string;
}

const file = (name: string, size: number, modified: string): FileRow => ({ id: name, name, kind: "file", size, modified });
const folder = (id: string, name: string, modified: string): FileRow => ({ id, name, kind: "folder", size: null, modified });

const FOLDERS: TreeNode[] = [
  {
    id: "projects",
    label: "Projects",
    icon: <IconFolder />,
    children: [
      {
        id: "harbour",
        label: "Harbour Library",
        icon: <IconFolder />,
        children: [{ id: "drawings", label: "Drawings", icon: <IconFolder />, hasChildren: false }],
      },
      { id: "cedar", label: "Cedar Pavilion", icon: <IconFolder />, hasChildren: false },
    ],
  },
  { id: "templates", label: "Templates", icon: <IconFolder />, hasChildren: false },
  { id: "archive", label: "Archive", icon: <IconFolder />, hasChildren: false },
];

const FILES: Record<string, FileRow[]> = {
  projects: [folder("harbour", "Harbour Library", "2026-10-28"), folder("cedar", "Cedar Pavilion", "2026-10-21"), file("project-register.xlsx", 48_200, "2026-10-30")],
  harbour: [
    folder("drawings", "Drawings", "2026-10-28"),
    file("brief.pdf", 2_410_000, "2026-09-14"),
    file("site-survey.pdf", 8_930_000, "2026-08-29"),
    file("meeting-notes.docx", 31_400, "2026-10-27"),
    file("entrance-render.png", 5_120_000, "2026-10-12"),
  ],
  drawings: [file("level-1.dwg", 12_800_000, "2026-10-28"), file("level-2.dwg", 13_100_000, "2026-10-28"), file("sections.pdf", 4_700_000, "2026-10-19")],
  cedar: [file("concept.pdf", 3_200_000, "2026-10-21"), file("lighting-schedule.xlsx", 22_600, "2026-10-18")],
  templates: [file("drawing-sheet.dwg", 910_000, "2026-03-02"), file("meeting-notes.docx", 18_300, "2026-03-02")],
  archive: [file("2025-projects.zip", 96_400_000, "2026-01-15")],
};

/** A date in the page's locale. */
function Modified({ value }: { value: string }) {
  return new Date(value).toLocaleDateString(useLocale(), { dateStyle: "medium", timeZone: "UTC" });
}

// Pane limits are SplitPane props, in rem so they follow UI scale.
const PANE_LIMITS = { defaultSize: "16rem", startMin: "12rem", endMin: "20rem" } as const; // tokens:allow SplitPane prop values

const col = createDataTableColumns<FileRow>();
const columns = col.columns([
  col.accessor("name", {
    header: "Name",
    pin: true,
    width: 18,
    cardRole: "title",
    sortable: true,
    cell: ({ row }) => (
      <span className="flex min-w-0 items-center gap-inline">
        {row.original.kind === "folder" ? <IconFolder /> : <FileIcon name={row.original.name} />}
        <span className="truncate">{row.original.name}</span>
      </span>
    ),
  }),
  col.accessor("modified", { header: "Modified", width: 9, priority: 2, sortable: true, sortDescFirst: true, cell: ({ row }) => <Modified value={row.original.modified} /> }),
  col.accessor("size", { header: "Size", width: 7, priority: 3, align: "end", sortable: true, cell: ({ row }) => (row.original.size === null ? "" : formatBytes(row.original.size)) }),
]);

const pathTo = (id: string, nodes: TreeNode[] = FOLDERS, trail: TreeNode[] = []): TreeNode[] | null => {
  for (const node of nodes) {
    const path = [...trail, node];
    if (node.id === id) return path;
    const found = pathTo(id, node.children ?? [], path);
    if (found) return found;
  }
  return null;
};

/** A file manager: folders in a tree, the open folder's contents in a table. Pass your own listing to replace `FILES`. */
export default function FilesTemplate() {
  const [folderId, setFolderId] = useState("harbour");
  const [files, setFiles] = useState(FILES);
  const upload = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<DataTableState>({
    sorting: [{ id: "name", desc: false }],
    filters: [],
    pagination: { pageIndex: 0, pageSize: 50 },
    selection: {},
    search: "",
  });
  const listing = files[folderId] ?? [];
  const page = useMemo(() => localPage(listing, columns, state), [listing, state]);
  const rows = page.rows.toSorted((a, b) => Number(b.kind === "folder") - Number(a.kind === "folder"));
  const path = pathTo(folderId) ?? [];
  const actions = useMemo(
    () =>
      defineActions<FileRow>("file", [
        {
          id: "delete",
          label: "Delete",
          icon: IconTrash,
          group: "danger",
          bulk: true,
          visible: (targets) => targets.every((target) => target.kind === "file"),
          confirm: ([only, ...others]) => ({
            title: others.length ? `Delete ${others.length + 1} files?` : `Delete ${only?.name}?`,
            body: "This cannot be undone.",
            confirmLabel: "Delete",
            tone: "danger",
          }),
          run: (targets) => {
            const removed = new Set(targets.map((target) => target.id));
            setFiles((current) => ({ ...current, [folderId]: (current[folderId] ?? []).filter((row) => !removed.has(row.id)) }));
            setState((current) => ({ ...current, selection: {} }));
          },
        },
      ]),
    [folderId],
  );
  const addFiles = (chosen: FileList | null) => {
    const added = [...(chosen ?? [])].map((item) => file(item.name, item.size, new Date().toISOString().slice(0, 10)));
    // Replace with your application's upload.
    setFiles((current) => ({ ...current, [folderId]: [...(current[folderId] ?? []), ...added] }));
  };
  const openFolder = (id: string) => {
    setFolderId(id);
    setState((current) => ({ ...current, selection: {}, pagination: { ...current.pagination, pageIndex: 0 } }));
  };
  return (
    <div className="@container h-full min-h-0 p-gutter">
      <Panel className="h-full min-h-0" aria-label="Files">
        <SplitPane
          name="template-files"
          storageKey={null}
          startLabel="Folders"
          endLabel="Contents"
          {...PANE_LIMITS}
          start={
            <div className="h-full min-h-0 p-tile">
              <Tree nodes={FOLDERS} aria-label="Folders" selectableGroups defaultExpanded={["projects", "harbour"]} selectedId={folderId} onSelectedIdChange={(id) => id && openFolder(id)} />
            </div>
          }
          end={
            <div className="flex h-full min-h-0 flex-col gap-controls p-tile">
              <div className="flex min-w-0 items-center justify-between gap-controls">
                <Breadcrumb
                  aria-label="Folder path"
                  collapse="auto"
                  items={path.map((node) => ({ id: node.id, label: node.label, href: `#${node.id}` }))}
                  renderLink={(item, props) => (
                    <a
                      {...props}
                      onClick={(event) => {
                        event.preventDefault();
                        openFolder(item.id);
                      }}
                    />
                  )}
                />
                <input
                  ref={upload}
                  type="file"
                  multiple
                  hidden
                  aria-label="Files to upload"
                  onChange={(event) => {
                    addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
                <Button size="sm" variant="secondary" icon={<IconUpload />} onClick={() => upload.current?.click()}>
                  Upload
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <DataTable
                  id="template-files"
                  label="Folder contents"
                  noun={{ one: "item", other: "items" }}
                  rows={rows}
                  rowCount={page.count}
                  columns={columns}
                  getRowId={(row) => row.id}
                  getRowLabel={(row) => row.name}
                  actions={actions}
                  state={state}
                  onStateChange={setState}
                  emptyMessage="This folder is empty"
                  onRowOpen={(row) => {
                    if (row.kind === "folder") openFolder(row.id);
                  }}
                />
              </div>
            </div>
          }
        />
      </Panel>
    </div>
  );
}
