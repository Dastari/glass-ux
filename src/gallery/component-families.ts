import catalogue from "./catalogue.generated.json" with { type: "json" };

/** One exported component and its generated purpose, entry point and specimen. */
export type ComponentCatalogueEntry = (typeof catalogue)[number];

/** A base component and the related exports documented in its single article. */
export interface ComponentFamily extends ComponentCatalogueEntry {
  /** The base export first, followed by its controls, slots, variants and skeletons. */
  components: ComponentCatalogueEntry[];
}

// Group slots, providers, loading states and variants with the control they support.
// Independent controls stay discoverable even when they compose the same primitive.
const familyRoots: Record<string, string> = {
  actions: "action-bar",
  "address-field": "address-field",
  "alert-dialog": "alert-dialog",
  appearance: "appearance-provider",
  avatar: "avatar",
  badge: "badge",
  brand: "brand-logo",
  button: "button",
  "byte-size-field": "byte-size-field",
  cascader: "cascader",
  "command-palette": "command-panel",
  combobox: "combobox",
  "coordinates-field": "coordinates-field",
  "country-select": "country-select",
  "data-table": "data-table",
  "date-picker": "date-field",
  "detail-tile": "detail-tile",
  dialog: "dialog",
  "drag-drop": "drop-zone",
  "duration-field": "duration-field",
  "email-field": "email-field",
  entity: "entity-identity",
  "entity-settings": "entity-settings-dialog",
  field: "field",
  "file-drop": "file-drop",
  form: "form",
  "hostname-field": "hostname-field",
  input: "input",
  "ip-field": "ip-field",
  "login-flow": "login-flow",
  "mac-field": "mac-address-field",
  map: "geo-map",
  menu: "menu",
  meter: "meter",
  metric: "metric",
  "money-field": "money-field",
  "on-screen-keyboard": "on-screen-keyboard",
  "otp-field": "otp-field",
  "password-field": "password-field",
  "percent-field": "percent-field",
  "phone-field": "phone-field",
  "port-field": "port-field",
  progress: "progress",
  radio: "radio",
  "rich-text": "rich-text-field",
  "setting-row": "setting-row",
  "level-gauge": "level-gauge",
  "relationship-canvas": "relationship-canvas",
  "signature-pad": "signature-pad",
  sparkline: "sparkline",
  tabs: "tabs",
  textarea: "textarea",
  "time-zone-select": "time-zone-select",
  toast: "toaster",
  tooltip: "tooltip",
  topology: "topology-canvas",
  tree: "tree",
  "tree-select": "tree-select",
  "url-field": "url-field",
  "vertical-tabs": "vertical-tabs",
  windows: "window-frame",
};

const groups: Record<string, string[]> = {
  accordion: ["disclosure"],
  badge: [
    "status-badge",
    "count-badge",
    "status-dot",
    "tone-dot",
    "notification-dot",
  ],
  breadcrumb: ["route-breadcrumb"],
  button: ["button-group", "action-button", "button-link", "copy-button"],
  checkbox: ["checkbox-group"],
  combobox: [
    "multi-select",
    "tag-input",
    "autocomplete",
    "combobox-popup",
    "option-row",
    "option-chip",
    "option-status",
    "option-more",
    "chip-measure",
    "highlight",
  ],
  "data-table": [
    "identity-cell",
    "text-cell",
    "two-line-cell",
    "numeric-cell",
    "relative-time",
    "sparkline-cell",
    "meter-cell",
    "filter-editor",
  ],
  menu: ["context-menu", "menu-item-content", "menu-preview"],
  panel: ["panel-header", "panel-body", "panel-footer"],
  "chart-frame": [
    "chart-legend",
    "chart-table",
    "chart-tooltip",
    "drill-path-bar",
    "hit-layer",
    "plot-skeleton",
    "swatch",
    "tooltip-body",
  ],
  "app-shell": [
    "rail",
    "top-bar",
    "section-drawer",
    "inspector",
    "tab-bar",
    "account-button",
    "search-trigger",
    "shell-brand",
    "shortcut-keys",
    "theme-toggle",
    "timer-chip",
    "top-bar-settings-button",
  ],
  "entity-header": ["entity-header-skeleton"],
  inspector: ["inspector-toggle"],
  "context-switcher": ["context-avatar", "context-switcher-panel"],
  "assistant-pane": ["ai-hero", "ai-mark"],
  "ai-card": ["ai-surface-provider"],
  "conversation-log": [
    "conversation-handlers-provider",
    "turn",
    "turn-navigator",
  ],
  "assistant-message": [
    "user-message",
    "system-notice",
    "message-blocks",
    "message-skeleton",
    "reasoning",
  ],
  composer: ["attachment-chip", "suggestion-chips", "ai-status-strip"],
  "approval-card": ["approval-record"],
  "ask-card": [
    "ask-layout",
    "ask-record",
    "ask-shell",
    "clarify-ask",
    "confirm-ask",
    "date-time-ask",
    "entity-picker-ask",
    "form-ask",
    "multi-choice-ask",
    "quick-replies-ask",
    "rank-ask",
    "single-choice-ask",
  ],
  "ask-dock": ["ask-dock-provider", "ask-marker"],
  "code-block": ["inline-code"],
  "result-value": ["redacted"],
  "entity-chip": [
    "entity-glyph",
    "entity-option-list",
    "entity-preview-card",
    "entity-preview-content",
    "entity-quick-actions",
    "entity-resolver-provider",
    "entity-state-badge",
  ],
  "result-frame": [
    "result-block",
    "generic-result",
    "result-chart",
    "result-detail",
    "result-diff",
    "result-entities",
    "result-entity",
    "result-files",
    "result-images",
    "result-json",
    "result-log",
    "result-metrics",
    "result-skeleton",
    "result-table",
    "result-value",
    "table-scroll",
    "file-glyph",
    "file-row-item",
    "image-lightbox",
    "image-tile",
  ],
  "session-nav": ["session-nav-skeleton"],
  "source-list": ["citation-marker", "sources-provider"],
  "tool-group": [
    "tool-call-row",
    "tool-call-skeleton",
    "provider-activity",
    "status-glyph",
  ],
};

const explicitParents = new Map(
  Object.entries(groups).flatMap(([parent, children]) =>
    children.map((child) => [child, parent] as const),
  ),
);

function immediateParentId(component: ComponentCatalogueEntry) {
  return (
    explicitParents.get(component.id) ??
    familyRoots[component.family] ??
    component.id
  );
}

const byId = new Map(catalogue.map((component) => [component.id, component]));

function parentId(component: ComponentCatalogueEntry): string {
  const visited = new Set<string>();
  let current = component;
  while (true) {
    if (visited.has(current.id))
      throw new Error(
        `Circular documentation family: ${[...visited, current.id].join(" → ")}`,
      );
    visited.add(current.id);
    const parent = immediateParentId(current);
    if (parent === current.id) return parent;
    const next = byId.get(parent);
    if (!next)
      throw new Error(
        `Unknown documentation family ${parent} for ${current.id}`,
      );
    current = next;
  }
}

function familyMembers(
  component: ComponentCatalogueEntry,
): ComponentCatalogueEntry[] {
  const preferred = groups[component.id] ?? [];
  const children = catalogue.filter(
    (item) =>
      item.id !== component.id && immediateParentId(item) === component.id,
  );
  children.sort((a, b) => {
    const rank = (id: string) => {
      const index = preferred.indexOf(id);
      return index < 0 ? preferred.length : index;
    };
    return rank(a.id) - rank(b.id) || a.name.localeCompare(b.name);
  });
  return [component, ...children.flatMap(familyMembers)];
}

/** The concise documentation directory, with every original export retained in its family. */
export const componentFamilies: ComponentFamily[] = catalogue
  .filter((component) => parentId(component) === component.id)
  .map((component) => ({ ...component, components: familyMembers(component) }));

/** Find the document containing a base component or any of its related exports. */
export function findComponentFamily(id: string): ComponentFamily | undefined {
  return componentFamilies.find((family) =>
    family.components.some((component) => component.id === id),
  );
}

/** The canonical family route and optional section anchor for an original component identifier. */
export function componentDestination(id: string): {
  id: string;
  hash?: string;
} {
  const family = findComponentFamily(id);
  return family && family.id !== id ? { id: family.id, hash: id } : { id };
}
