/**
 * The page templates, in navigation order. Metadata only, so navigation can name them without
 * loading a screen. Each `id` is a file in ./templates, whose public source the documentation
 * shows as `examples/template-<id>.tsx.txt` (scripts/template-examples.mjs writes those).
 */
export const templates = [
  { id: "overview", title: "Overview dashboard", summary: "Figures, a trend chart and recent activity." },
  { id: "settings", title: "Settings page", summary: "A section rail with a saved form and settings that apply at once." },
  { id: "records", title: "List and detail", summary: "A DataTable with a detail pane beside it, or in its place on a narrow screen." },
  { id: "inbox", title: "Inbox", summary: "Filtered notifications with the open message beside them." },
  { id: "files", title: "File manager", summary: "A folder Tree beside a DataTable of the open folder." },
] as const;
