/**
 * The human guides shipped with the release, in navigation order; each `id` is a guide
 * `LibraryGuide` can load and `title` is its navigation label. Metadata only, so navigation
 * can name them without loading the guide renderer (guide.tsx).
 */
export const libraryGuides = [
  { id: "getting-started", title: "Getting started" },
  { id: "integration", title: "Existing applications" },
  { id: "agent-adoption", title: "AI agent adoption" },
  { id: "layout-contract", title: "Theme and layout" },
  { id: "ui-rules", title: "Design rules" },
] as const;
