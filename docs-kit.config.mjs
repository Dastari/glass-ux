// Glass UX's own settings for the documentation kit. This file is not published: it holds the
// project's forbidden names (private to this repository), its budgets and its catalogue tables.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { defineDocsKit } from "./scripts/docs-kit/lib/config.mjs";
import {
  generateTemplateExamples,
  templateExample,
  templateIds,
} from "./scripts/template-examples.mjs";

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
      "ComboChart",
      "FunnelChart",
      "RadarChart",
      "SankeyChart",
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
  carousel: "carousel",
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
  "emoji-picker": "emoji-picker",
  "file-dialog": "file-dialog",
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
  "media-player": "video-player",
  map: "geo-map",
  menu: "menu",
  menubar: "menubar",
  meter: "meter",
  metric: "metric",
  "money-field": "money-field",
  "on-screen-keyboard": "on-screen-keyboard",
  "otp-field": "otp-field",
  "pane-layout": "pane-layout",
  "password-field": "password-field",
  "percent-field": "percent-field",
  "phone-field": "phone-field",
  "port-field": "port-field",
  progress: "progress",
  masonry: "masonry",
  radio: "radio",
  rating: "rating",
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
  "emoji-picker": ["emoji-popover"],
  "file-dialog": ["file-conflict-dialog", "file-dialog-preview"],
  "notification-list": ["notification-popover"],
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
  // 34_000 → 34_500: a tooltip reaches Kbd, which draws each step of a chord, and reads PopupLayer, so a tooltip
  // inside a player in the top layer opens above it instead of behind it.
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
  // Measured 82.6 KB: about 20 KB of player on the shared Button, Tooltip, Menu and Slider. Of glass-ux/windows
  // only the pure fullscreenSupported and DRAG_THRESHOLD; stream engines and sender SDKs are the host's.
  { entry: 'glass-ux/media-player', named: 'VideoPlayer', gzip: 91_000, forbid: ['dist/windows/managed-window.js', 'dist/windows/store.js', 'dist/windows/geometry.js', 'hls.js', 'dash.js'] },
  { entry: 'glass-ux/media-player', named: 'AudioPlayer', gzip: 85_000, forbid: ['dist/windows/managed-window.js', 'dist/ui/media-player/video-player.js', 'dist/ui/media-player/mini-window.js', 'hls.js', 'dash.js'] },
  // Measured 4.1 KB: the headless controller stays free of controls and of Base UI.
  { entry: 'glass-ux/media-player', named: 'useMediaPlayer', gzip: 4_600, forbid: ['@base-ui/react', 'dist/ui/media-player/controls.js'] },
  // Measured 141.8 KB: Dialog, Tree, Breadcrumb, Select, Segmented, FileDrop and the row menus, all drawn at once.
  { entry: 'glass-ux/file-dialog', named: 'FileDialog', gzip: 156_000, forbid: ['@tanstack/react-form', '@tanstack/form-core', 'd3-scale', 'shiki', 'zod', 'lexical', 'maplibre-gl'] },
  // The conflict step alone: a plain Save brings no browser with it.
  { entry: 'glass-ux/file-dialog', named: 'FileConflictDialog', gzip: 59_000, forbid: ['dist/ui/file-dialog/file-browser.js', 'dist/ui/tree/tree.js', '@tanstack/react-virtual'] },
  // A worker bundle pays for this and nothing else: no React, no Base UI.
  { entry: 'glass-ux/file-provider/memory', named: 'memoryFiles', gzip: 2_600, forbid: ['react', '@base-ui/react'] },
  // Measured 3.3 KB: the radios, the keys and the star. The Field, the form binding and the schema stay out unless used.
  { entry: 'glass-ux/rating', named: 'Rating', gzip: 3_700, forbid: ['@base-ui/react', '@tanstack/react-form', '@tanstack/form-core', 'zod'] },
  // Measured 36.9 KB: 33.3 KB of that is the shared Button and its tooltip for the previous, next and pause buttons; the
  // strip, the indicators, the autoplay clock and the announcer add 3.6 KB. The scroll-snap does the swiping, so no gesture library.
  { entry: 'glass-ux/carousel', named: 'Carousel', gzip: 40_500, forbid: ['@tanstack/react-form', '@tanstack/form-core', 'd3-scale', 'shiki', 'zod', 'dist/ui/lightbox/viewer.js'] },
  // Measured 1.9 KB: the layout arithmetic and the measuring. No Base UI; the Image and Lightbox in a demo are the host's.
  { entry: 'glass-ux/masonry', named: 'Masonry', gzip: 2_200, forbid: ['@base-ui/react', 'dist/ui/lightbox/viewer.js', 'dist/ui/image/image.js'] },
  // The layout alone is a pure function with no React.
  { entry: 'glass-ux/masonry', named: 'layoutMasonry', gzip: 600, forbid: ['react', '@base-ui/react'] },
  // Measured 70.6 KB: the rows on the shared Button, Segmented (with its collapsed Menu), ScrollArea and RelativeTime.
  { entry: 'glass-ux/notification-list', named: 'NotificationList', gzip: 78_000, forbid: ['lexical', 'react-markdown', '@tanstack/react-form', 'd3-scale', 'shiki', 'zod'] },
  { entry: 'glass-ux/notification-list', named: 'NotificationPopover', gzip: 81_000, forbid: ['lexical', 'react-markdown', '@tanstack/react-form', 'd3-scale', 'shiki', 'zod'] },
  // Measured 98.0 KB. The editor and the Markdown renderer load on demand, each behind a placeholder of the right size.
  { entry: 'glass-ux/comment-thread', named: 'CommentThread', gzip: 108_000, forbid: ['lexical', '@lexical/rich-text', 'react-markdown', 'dist/ui/emoji-picker/emoji-picker.js', 'dist/ui/emoji-picker/emoji-data.js'] },
  // Measured 52.3 KB: the toolbar, the popover around the picker and Button. Neither the picker's code nor its data.
  { entry: 'glass-ux/reaction-bar', named: 'ReactionBar', gzip: 58_000, forbid: ['dist/ui/emoji-picker/emoji-picker.js', 'dist/ui/emoji-picker/emoji-data.js', 'lexical'] },
  // Measured 67.5 KB without its data, a further 23.6 KB of strings that load when a picker first renders.
  { entry: 'glass-ux/emoji-picker', named: 'EmojiPicker', gzip: 75_000, forbid: ['dist/ui/emoji-picker/emoji-data.js', 'lexical'] },
  { entry: 'glass-ux/emoji-picker', named: 'EmojiPopover', gzip: 53_000, forbid: ['dist/ui/emoji-picker/emoji-data.js', 'dist/ui/emoji-picker/emoji-picker.js', 'lexical'] },
  { entry: 'glass-ux/phone-field', named: 'PhoneField', gzip: 75_000, forbid: ['libphonenumber-js'] },
  { entry: 'glass-ux/rich-text', named: 'RichTextInput', gzip: 67_000, forbid: ['lexical', '@lexical/rich-text'] },
  // The list that RichTextInput drives lives outside the editor: importing it brings in no Lexical.
  { entry: 'glass-ux/typeahead', named: 'Typeahead', gzip: 50_000, forbid: ['lexical', '@lexical/rich-text', '@lexical/react'] },
  { entry: 'glass-ux/typeahead', named: 'useTypeahead', gzip: 2_000, forbid: ['@base-ui/react', 'lexical'] },
  { entry: 'glass-ux/map', named: 'GeoMap', gzip: 75_000, forbid: ['maplibre-gl'] },
  // Measured 89.8 KB: tree, hosts, Tabs (with its More menu), DragDrop and Button. The panel's menus and the phone
  // sheet (54.7 KB together) load on demand, so a locked mail layout carries neither, and the window manager never.
  {
    entry: 'glass-ux/pane-layout',
    named: 'PaneLayout',
    gzip: 99_000,
    forbid: ['dist/ui/pane-layout/pane-menu.js', 'dist/ui/pane-layout/pane-sheet.js', 'dist/ui/sheet/sheet.js', 'dist/ui/context-menu/context-menu.js', 'dist/ui/alert-dialog/alert-dialog.js', 'dist/windows/index.js', 'dist/windows/store.js'],
  },
  // The tree functions run anywhere: no React and no DOM, for migrations and tests.
  { entry: 'glass-ux/pane-layout', named: 'movePanel', gzip: 1_500, forbid: ['@base-ui/react', 'dist/ui/tabs/tabs.js', 'dist/ui/drag-drop/manager.js'] },
  // Measured 61.4 KB, of which Menu is 54.4 KB. The action runner's router, dialog and toasts stay out
  // unless useMenubarActions is imported.
  // Measured 44.2 KB and 46.3 KB: neither needs a scale. Sankey lays out in house: d3-sankey would bring older
  // copies of d3-array and d3-shape. Radar's rings and combo's axes use the shared d3-scale ticks, at 52.3 KB and 57.8 KB.
  { entry: 'glass-ux/charts', named: 'FunnelChart', gzip: 48_500, forbid: ['d3-scale', 'd3-shape', 'd3-hierarchy', 'd3-sankey'] },
  { entry: 'glass-ux/charts', named: 'SankeyChart', gzip: 51_000, forbid: ['d3-scale', 'd3-shape', 'd3-hierarchy', 'd3-sankey'] },
  { entry: 'glass-ux/charts', named: 'RadarChart', gzip: 57_500, forbid: ['d3-shape', 'd3-hierarchy', 'd3-sankey'] },
  { entry: 'glass-ux/charts', named: 'ComboChart', gzip: 63_500, forbid: ['d3-shape', 'd3-hierarchy', 'd3-sankey'] },
  { entry: 'glass-ux/menubar', named: 'Menubar', gzip: 67_500, forbid: ['@tanstack/react-router', '@tanstack/react-form', 'd3-scale', 'shiki', 'zod'] },
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
      /^\.\/file-provider/,
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
      "src/file-provider/index.ts",
      "src/file-provider/memory.ts",
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
  hooks: {
    // A template's public source is written from its screen, and the screen uses package entries only.
    generate: () => generateTemplateExamples(),
    async check() {
      const failures = [];
      for (const id of await templateIds()) {
        const path = `src/gallery/examples/template-${id}.tsx.txt`;
        try {
          if (!existsSync(path) || readFileSync(path, "utf8") !== (await templateExample(id)))
            failures.push(`template ${id}: ${path} is stale; run pnpm docs:api`);
        } catch (error) {
          failures.push(`template ${id}: ${error.message}`);
        }
      }
      return failures;
    },
    routes: () =>
      readdirSync("src/gallery/templates")
        .filter((file) => file.endsWith(".tsx") && file !== "application-shell.tsx")
        .map((file) => file.replace(".tsx", ""))
        .flatMap((id) => [`templates/${id}`, `templates/${id}/preview`]),
  },
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
