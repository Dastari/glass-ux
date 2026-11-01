// Glass UX's own settings for the documentation kit. This file is not published: it holds the
// project's forbidden names (private to this repository), its budgets and its catalogue tables.
import { defineDocsKit } from "./scripts/docs-kit/lib/config.mjs";

const sectionByFamily = {
  input: "text-fields",
  textarea: "text-fields",
  checkbox: "choice",
  radio: "choice",
  autocomplete: "combobox",
  "multi-select": "combobox",
  "tag-input": "combobox",
  meter: "progress",
  sparkline: "metric",
  surface: "materials",
  icon: "icons",
  kbd: "text-fields",
  entity: "entity-identity",
  "entity-settings": "entity-settings",
  shell: "app-shell",
  windows: "windows",
  ai: "ai-messages",
  actions: "actions",
  "data-table": "data-table",
  appearance: "knobs",
  locale: "locale",
  skeleton: "typography",
  "truncated-text": "tooltip",
};
function sectionFor(component) {
  const name = component.name.toLowerCase();
  if (
    component.family === "shell" &&
    /contextswitcher|contextavatar/.test(name)
  )
    return "context-switcher";
  if (component.family === "icons") return "icons";
  if (
    component.family === "charts" &&
    [
      "LineChart",
      "AreaChart",
      "BarChart",
      "ColumnChart",
      "PieChart",
      "DonutChart",
      "Gauge",
      "RadialBar",
      "Heatmap",
      "ScatterChart",
      "Histogram",
      "Treemap",
      "Sunburst",
    ].includes(component.name)
  )
    return "chart-" + component.id;
  // The overview brush drives a line chart's window: it is shown with LineChart.
  if (component.name === "ChartBrush") return "chart-line-chart";
  if (component.family === "charts") {
    if (/line|area/.test(name)) return "charts-lines";
    if (/bar|column/.test(name)) return "charts-bars";
    if (/tree|sunburst|drill/.test(name)) return "charts-hierarchy";
    if (/scatter|histogram|heatmap/.test(name)) return "charts-distribution";
    return "charts-part";
  }
  if (component.family === "ai") {
    if (/composer/.test(name)) return "ai-composer";
    if (/approval/.test(name)) return "ai-approvals";
    if (/ask/.test(name)) return "ai-asks";
    if (/entity|context/.test(name)) return "ai-context-links";
    if (/tool/.test(name)) return "ai-tools";
    if (/result|card|table/.test(name)) return "ai-results";
    if (/session|pane|inspector/.test(name)) return "ai-sessions";
  }
  return sectionByFamily[component.family] ?? component.family;
}

// Group slots, providers, loading states and variants with the control they support.
// Independent controls stay discoverable even when they compose the same primitive.
const families = {
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
  "compare-slider": "compare-slider",
  combobox: "combobox",
  "coordinates-field": "coordinates-field",
  "country-select": "country-select",
  "data-table": "data-table",
  "date-picker": "date-field",
  "detail-tile": "detail-tile",
  dialog: "dialog",
  "diff-view": "diff-view",
  "drag-drop": "drop-zone",
  "duration-field": "duration-field",
  "email-field": "email-field",
  entity: "entity-identity",
  "entity-settings": "entity-settings-dialog",
  field: "field",
  "file-drop": "file-drop",
  "find-bar": "find-bar",
  form: "form",
  "gradient-picker": "gradient-picker",
  "hostname-field": "hostname-field",
  "image-cropper": "image-cropper",
  input: "input",
  "ip-field": "ip-field",
  keymap: "keymap-provider",
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
  "status-bar": "status-bar",
  "level-gauge": "level-gauge",
  "relationship-canvas": "relationship-canvas",
  sidebar: "sidebar",
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
  typeahead: "typeahead",
  "url-field": "url-field",
  "vertical-tabs": "vertical-tabs",
  windows: "window-frame",
};

const familyMembers = {
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
  lightbox: ["image-viewer"],
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

/**
 * Gzip budgets in bytes for a whole entry (`export *`) or a named import, plus packages that
 * must stay out of the initial chunk (they load on demand). Budgets leave about 10% headroom
 * over the measured size; raise one deliberately with the change that needs it.
 */
const budgets = [
  { entry: 'glass-ux/icons', named: 'IconSearch', gzip: 1_000 },
  // Includes the shared Base UI direction context and script-aware localeDirection fallback.
  { entry: 'glass-ux/locale', gzip: 1_300 },
  // Raised from 34,000 for chords: a Button's tooltip reaches Kbd, which draws each step of one.
  { entry: 'glass-ux/button', named: 'Button', gzip: 34_500 },
  { entry: 'glass-ux/input', named: 'Input', gzip: 40_000 },
  { entry: 'glass-ux/form', named: 'FormStack', gzip: 1_000, forbid: ['@tanstack/form-core', '@tanstack/react-form'] },
  // Measured 51.3 KB: the parts plus Base UI's Collapsible, Tooltip and the filter's Field. The phone sheet
  // (Base UI Drawer and the dialog surface) loads when the phone layout first applies, and the icon strip's
  // flyout menus (Base UI Menu) once an icon-mode sidebar with sub-menus mounts: 80.8 KB when both were eager.
  {
    entry: 'glass-ux/sidebar',
    named: 'Sidebar',
    gzip: 57_500,
    forbid: [
      'dist/ui/sidebar/sidebar-sheet.js',
      'dist/ui/sheet/sheet.js',
      'dist/ui/dialog/dialog.js',
      'dist/ui/sidebar/sidebar-flyout.js',
      'dist/ui/menu/menu.js',
      '@tanstack/react-form',
      'd3-scale',
      'shiki',
      'zod',
    ],
  },
  // Measured 14.4 KB: state, persistence, the shortcut and the tooltip provider; the parts stay out.
  { entry: 'glass-ux/sidebar', named: 'SidebarProvider', gzip: 16_000, forbid: ['@tanstack/react-form', 'd3-scale'] },
  // Measured 16.4 KB: the component, every built-in layout's data (built on first use), and the editing,
  // Hangul/kana and navigation engines. Base UI stays out: the keys are plain buttons.
  { entry: 'glass-ux/on-screen-keyboard', named: 'OnScreenKeyboard', gzip: 18_000, forbid: ['@base-ui/react'] },
  // Measured 18.5 KB: the keyboard plus the drawer's presence, inset and portal code. Of Base UI only the
  // direction context (0.4 KB); the popover, Button and the provider's linking stay in their own modules.
  { entry: 'glass-ux/on-screen-keyboard', named: 'KeyboardDrawer', gzip: 20_500, forbid: ['@tanstack/react-form', 'd3-scale', 'shiki', 'zod'] },
  { entry: 'glass-ux/phone-field', named: 'PhoneField', gzip: 75_000, forbid: ['libphonenumber-js'] },
  { entry: 'glass-ux/rich-text', named: 'RichTextInput', gzip: 67_000, forbid: ['lexical', '@lexical/rich-text'] },
  // The list that RichTextInput drives lives outside the editor: importing it brings in no Lexical.
  { entry: 'glass-ux/typeahead', named: 'Typeahead', gzip: 50_000, forbid: ['lexical', '@lexical/rich-text', '@lexical/react'] },
  { entry: 'glass-ux/typeahead', named: 'useTypeahead', gzip: 2_000, forbid: ['@base-ui/react', 'lexical'] },
  { entry: 'glass-ux/map', named: 'GeoMap', gzip: 75_000, forbid: ['maplibre-gl'] },
  { entry: 'glass-ux/ai/code-block', named: 'CodeBlock', gzip: 40_000, forbid: ['shiki', '@shikijs/core'] },
  // Unused wrapper calls (`Object.assign`, `memo`, ...) carry /* @__PURE__ */ (pnpm pure:check), so
  // importing one export does not pull the module's other components and their imports.
  { entry: 'glass-ux/entity', named: 'EntityIdentitySkeleton', gzip: 3_000, forbid: ['@base-ui/react'] },
  { entry: 'glass-ux/ai/message', named: 'UserMessage', gzip: 79_000, forbid: ['react-markdown', 'd3-scale', '@tanstack/form-core', 'shiki'] },
  // Interface messages and the resolver add about 1–2 KB gzip to these compositions.
  // The Lightbox loads with the first image opened: results that show none never pay for its viewer.
  { entry: 'glass-ux/ai/results', named: 'ResultBlock', gzip: 103_000, forbid: ['d3-scale', '@tanstack/form-core', 'dist/ui/lightbox/viewer.js', 'dist/hooks/use-pan-zoom.js'] },
  // 230_000 → 232_000: the shared Lightbox now announces the picture it moves to (a live region and a message),
  // and the keyboard-shortcut policy (`configureShortcuts`) sits in the Kbd module every button tooltip uses.
  { entry: 'glass-ux/ai/message', named: 'AssistantMessage', gzip: 232_000, forbid: ['d3-scale', '@tanstack/form-core', 'shiki', 'dist/ui/lightbox/viewer.js', 'dist/hooks/use-pan-zoom.js'] },
];

export default defineDocsKit({
  title: "Glass UX",
  entries: {
    exclude: [
      ".",
      "./fit-form",
      "./hooks",
      "./lib/appearance",
      "./shell/context-switcher",
      "./vite",
      /^\.\/adapters\//,
      /^\.\/ai\//,
      /^\.\/gallery/,
      /^\.\/i18n/,
      /^\.\/testing/,
    ],
    last: ["./ai", "./shell", "./windows", "./appearance", "./locale", "./icons"],
    referenceOnly: [
      "src/vite.ts",
      "src/lib/fit-form.ts",
      "src/hooks/index.ts",
      "src/testing/index.ts",
      "src/testing/playwright.ts",
      "src/gallery/index.ts",
      "src/adapters/graphql-orm/index.ts",
    ],
  },
  families,
  familyMembers,
  section: sectionFor,
  collections: [
    {
      id: "icons",
      name: "Icons",
      family: "icons",
      alsoFamilies: ["icon"],
      file: "src/icons/generated/icons.tsx",
      description:
        "All icons share IconProps. Import only the named icons your interface uses; meaningful icons need a label, decorative icons omit it.",
      summary:
        "A shared family of scalable icons with accessible labels, theme-aware strokes and tree-shaken named imports.",
      sample: "IconSearch",
      prose:
        "Company and manufacturer icons use the same props, for example `IconGithub`, `IconGoogle`, `IconDell`, `IconCisco` and `IconYealink`. They identify the named company and inherit the current colour. The gallery also supports device-class searches such as `printer`, `VoIP`, `network` and `UPS`. See [the icon authoring guide](../icon-spec.md) for geometry and review rules.",
      fallback: (name) =>
        `${name.replace(/^Icon/, "").replace(/([a-z])([A-Z])/g, "$1 $2")} icon. Uses the shared icon size tokens; provide label for meaningful icons and omit it for decoration.`,
    },
  ],
  badges: {
    icons: "Foundation",
    charts: "Charts",
    ai: "Assistant components",
  },
  guides: [
    { id: "getting-started", title: "Getting started" },
    { id: "integration", title: "Existing applications" },
    { id: "agent-adoption", title: "AI agent adoption" },
    { id: "layout-contract", title: "Theme and layout" },
    { id: "ui-rules", title: "Design rules" },
    { id: "testing", title: "Testing" },
    { id: "migration", title: "Migration" },
  ],
  llms: {
    intro: "Typed React components, compound slots, themes and interaction rules. Read docs from the installed package to match its version.\n\nBefore composing UI, apply the screen content rules in docs/ui-rules.md. Unless explicitly\ninstructed otherwise: do not overuse subheadings, invent motivational or promotional copy,\noverexplain the page, push primary content down with redundant framing, repeat a route title\nalready visible in navigation, or introduce content shifts that move buttons or menus.",
    links: [
      { title: "Getting started", path: "docs/getting-started.md" },
      { title: "Existing applications", path: "docs/integration.md" },
      { title: "Agent adoption", path: "docs/agent-adoption.md" },
      { title: "API index", path: "docs/api/README.md" },
      { title: "Design rules", path: "docs/ui-rules.md" },
      { title: "Theme and layout", path: "docs/layout-contract.md" },
      { title: "Migration", path: "docs/migration.md" },
      { title: "Changelog", path: "CHANGELOG.md" },
      { title: "Typed form inputs", path: "docs/components/README.md" },
      { title: "Markdown rich text editing", path: "docs/components/rich-text.md" },
      { title: "Compact compositions", path: "docs/components/compact-compositions.md" },
      { title: "Adoption skill", path: "skills/glass-ux-adopt/SKILL.md" },
      { title: "Component selection skill", path: "skills/glass-ux-components/SKILL.md" },
      { title: "Forms skill", path: "skills/glass-ux-forms/SKILL.md" },
      { title: "Data views skill", path: "skills/glass-ux-data/SKILL.md" },
      { title: "Assistant UI skill", path: "skills/glass-ux-assistant/SKILL.md" },
      { title: "Authoring skill", path: "skills/glass-ux-author/SKILL.md" },
    ],
  },
  typedocDir: ".handoff/typedoc",
  checks: {
    logicalDirs: ["src/styles", "src/ui", "src/shell", "src/windows", "src/ai"],
    tokenDirs: ["src/ui", "src/shell", "src/windows", "src/features", "src/ai", "src/glassUx"],
    perfDirs: ["src"],
    presentationDirs: ["src/gallery", "apps/docs/src"],
    radiusAllow: ["src/styles/tokens.css", "src/styles/tailwind-theme.css"],
    forbidden: [
      new RegExp(
        ["\\bf" + "ame\\b", "first.?assist", "\\bg" + "ema\\b", "\\bj" + "im2\\b", "ninja" + "rmm", "glamorgan", "flinders island", "toby martin", "maureen ferris"].join("|"),
        "i",
      ),
    ],
    budgets,
    rules: { file: "docs/ui-rules.md", dirs: ["src", "apps/docs/src", "docs", "skills", "e2e"] },
  },
});
