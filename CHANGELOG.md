# Changelog

All notable changes to Glass UX. Versions follow [semantic versioning](https://semver.org/);
while the major version is 0, a minor release may contain breaking changes, and each one
has upgrade steps in the [migration guide](docs/migration.md).

## 0.8.0

### Breaking changes

Upgrade steps: [migration guide, 0.7 → 0.8](docs/migration.md#07--08).

- `OrgSwitcher` is now `ContextSwitcher`, a switcher for any context people work in:
  organisations, projects, workspaces. Every related export, the
  `glass-ux/shell/org-switcher` entry and the `.fa-org-switcher*` / `.fa-org-avatar*`
  classes are renamed, with no aliases. Its `organisations` prop is `items`, and
  `searchPlaceholder` moved into `labels.placeholder`. Rows carry `item` instead of `org`,
  with kind `"item"` instead of `"organisation"`, and the group label key
  `organisations` is `group`.
- The names deprecated in 0.7 are removed: `toWhere` on DataTable filter and search specs
  (use `toCondition`), `WhereInput` from `glass-ux/data-table` (use `FilterCondition`),
  `EndpointStatus` (use `StatusKind`), DesktopSession's `endpoint` prop (use `target`), and
  `POPUP_OFFSET` / `POPUP_COLLISION_PADDING` (popups read `--popup-offset` and
  `--popup-collision`). `CustomFilterConditionSpec` is removed and `CustomFilterSpec` is an
  interface requiring `toCondition`; DesktopSession's `target` is required. The GraphQL
  adapter's own `toWhere()` and `WhereInput` are unchanged.

### Added

- `ContextSwitcher` takes `labels` for every word it shows or announces: the trigger's
  accessible name, the phone sheet's title, search, the empty, loading and failure messages,
  and "Load more". `switcherLabels({ one: "project", other: "projects" })` builds the whole
  set from a noun. `all={false}` drops the "all" row; until something is chosen, the trigger
  reads `labels.choose` ("Choose a project"). `icon` sets the "all" glyph, and a
  `ContextItem` can carry its own `icon`, which sits on its tint in place of initials. The
  catalogue page (`/components/context-switcher`) shows a project switcher.

- Drag and drop, in `glass-ux/drag-drop`. `DragDropProvider` scopes it; `Draggable` makes
  any element carry one of your objects with a `type`; `DropZone` makes any element a target;
  `DragHandle` limits where a drag starts. Hooks `useDraggable`, `useDropZone`,
  `useDragDropMonitor` and `useActiveDrag` cover elements you already render.
  - `sort="vertical" | "horizontal" | "grid"` makes a zone's Draggables an ordered list,
    row or grid: lifted items leave a gap that closes, the zone under the item opens a gap
    where it will land, and after the drop every item animates to its new place.
  - Zones filter with `accept` and refuse reactively with `validate` and `disabled`, showing
    `ready`, `disabled`, `error` (with a reason under the preview) and `pending` states as
    data attributes. `appearance` is `"outline"`, `"fill"` or `"none"`, which shows no drop
    chrome at all.
  - Every drag reports `onDragStart`, `onDragMove`, `onDragOver`, `onDrop`, `onDragCancel`
    (with a reason) and `onDragEnd`. `onDrop` may return `false` or a promise; reject with
    `DropError` to show why it failed.
  - Mouse, pen, touch (long press, or at once on a DragHandle) and keyboard (Space lifts,
    arrows move within and across zones). Moves are announced; Escape cancels and the item
    flies home. Auto-scroll near the edges of scroll containers and the page.
  - `applyDrop`, `moveItem` and `insertItem` apply a drop to your data.
  - Guide: `docs/components/drag-drop.md`. Catalogue: the DropZone page.

### Fixed

- The mouse wheel did nothing over a DataTable whose rows did not need to scroll: an
  `height="auto"` table, or a fill table whose rows fit, inside a page, panel or window that
  scrolls. Its scroller set `overscroll-behavior: contain`, and Chromium ends the scroll chain
  at any container with `contain`, even one with nothing to scroll, so only the pane's
  scrollbar moved it. The table now contains the wheel vertically only while its rows
  overflow. A wheel over the header row now scrolls the rows.
- The same trap is gone from `[data-scroll-container]`, scrolling `Panel` bodies,
  `ScrollArea`, scroll-style window bodies, the docked inspector body, `Tree`, vertical tab
  lists and the chart table view: each contains the wheel only along an axis whose content
  overflows. `PanelBody` in a `Panel scroll` publishes `data-scrolled-*` edge attributes and, while its content overflows, takes keyboard focus so it can be scrolled from the keyboard (R20.6).
  Overlays (popups, dialogs, the command palette) still always contain it.

### Changed

- Company icons redrawn to match each brand's recognised square or app-icon mark: Adobe,
  Amazon, Cloudflare, Discord, Facebook, npm, Stripe, Telegram and Zoom; and manufacturer
  icons Bosch, Dell, Lenovo, QNAP and Schneider Electric. Names and exports are unchanged.

## 0.7.2

### Added

- `Meter` and `MeterCell` take `tone`: `"neutral"` (default, unchanged) or `"data"`. With
  `tone="data"` a healthy level uses the first data colour, `--chart-1`, for columns that
  compare levels such as disk use; warning and danger still apply past `warningAt` and
  `dangerAt`. Design rule R3.9 says when to use it. The Meter and MeterCell catalogue pages
  show both tones.

## 0.7.1

### Fixed

- A docked `Inspector` stretched across the whole workspace in 0.7.0, covering the routed
  view and taking its clicks, whenever the inspector showed (by default from 120rem, or
  opened from 80rem). AppShell now sizes the panes in its drawer and inspector slots to
  `--_drawer` and `--inspector-w` whatever order the stylesheets load in, so a pane's own
  `flex` no longer stretches it over the workspace. A browser test docks both panes at
  1920×1080 and 1366×768.
- `WindowBodySkeleton`, which `WindowContentHost` shows while a window's body loads, named
  itself "Loading window" on an element with no role, so axe reported
  `aria-prohibited-attr`. It is now a busy `status` with that name. A unit test and a browser
  test with axe cover a window whose body has not loaded.

### Added

- `resolveActions` and its `ResolvedGroup` and `ResolvedAction` types are exported from
  `glass-ux/actions`, alongside `defineActions`, for command lists and tests. Replace deep
  imports from `glass-ux/lib/actions/actions`.

### Changed

- The AppShell catalogue demo includes a section drawer, and usage examples import action
  sets from `glass-ux/actions`.
- The WindowBodySkeleton catalogue demo shows the skeleton at its loading size, and in a
  window whose body is still loading.

## 0.7.0

### Breaking changes

Upgrade steps: [migration guide, 0.6 → 0.7](docs/migration.md#06--07).

- The GraphQL ORM filter adapter moved from `glass-ux/lib/graphql-orm/where` and
  `glass-ux/lib/graphql-orm/evaluate` to `glass-ux/adapters/graphql-orm`. Core DataTable
  filters, search and documentation no longer refer to a server shape, and a boundary check
  keeps core from importing adapters.
- `CustomFilterSpec` is a type requiring exactly one of `toCondition` or `toWhere`; an
  interface can no longer extend it.
- Removed unused deep-import helpers `readMotionScale` (`glass-ux/ui/map/theme`) and
  `fitRect`, `stackOrder` (`glass-ux/windows/geometry`).

### Added

- `LoginFlow` (`glass-ux/login-flow`): sign-in with email, username or either; provider
  sign-in with presets for Google, GitHub, Microsoft, Apple, Slack, Discord and Facebook;
  remember me; forgot and reset password with resend cooldown; optional account creation
  with a host password policy; and a two-factor code step. Views are controlled or
  uncontrolled, every callback returns a promise, refusals display in reserved space without
  moving controls, and all copy is replaceable through `labels`.
- DataTable row reordering through the `reorder` prop: pointer, touch, pen and keyboard
  (Space or Enter to lift, arrows, Home and End to move, Alt+Arrow to move at once), live
  announcements, auto-scroll, locked rows, optimistic saving with rollback, and support for
  virtualised bodies, cards, selection and pinned columns. Reordering is disabled with a
  stated reason while sorting, searching, filtering, grouping or paging, unless
  `withinGroups` or `withinPage` allows it. `moveRow` reorders local data.
- `configureDataTables({ maxRelativeDays })` sets the longest relative date filter span.
- Liquid glass optics: a lit top rim and shaded lower rim on every material, an inner lens
  glow, a pointer-following specular highlight and rim glint on lit controls
  (`installPointerLight`, installed by `AppearanceProvider`).
- Spring motion: `--ease-spring`, `--ease-glide`, `--ease-bounce` and `--ease-materialise`
  (sampled `linear()` springs with cubic-bezier fallbacks), `--duration-glide`,
  `--duration-materialise` and `--duration-release`. Selection indicators in Segmented, Tabs,
  TabNav, VerticalTabs and VerticalTabNav glide and stretch between items; popups, tooltips,
  dialogs and toasts emerge from their anchor; switch thumbs stretch while pressed.
- Motion helpers in `glass-ux/appearance`: `prefersReducedMotion`, `motionScale`,
  `tokenDuration`, `scaledDuration`, `feedbackHold`, `isTransparencyReduced` and
  `installShimmerSync`.
- `StatusKind` (replacing `EndpointStatus`), `DEFAULT_PALETTE_GROUP_ORDER`,
  `FilterCondition` and `toCondition` (replacing `WhereInput` and `toWhere`).
- `defineActions`, `ActionSet` and the action definition types are exported from
  `glass-ux/actions`.
- `Button` `statusAnnouncement` announces success and failure through a polite live region.
- Floating windows can be moved and resized from the keyboard through the window menu
  (right-click, Shift+F10 or the Menu key on the app bar).
- `Surface padding="overlay"`; radius roles `--radius-chip`, `--radius-mark`,
  `--radius-tile-icon`, `--radius-thumb`, `--radius-tooltip` and others, with every component
  using a role; `--popup-collision`.
- `Markdown` `anchors`: GitHub-style heading ids and in-page `#fragment` links for documents.
- `SwatchPicker` is container-aware, like `Segmented`: when its swatches do not fit, it
  folds to one menu button showing the chosen swatch, whose menu lists every swatch with its
  name and a check on the chosen one. `collapse` (`"auto"` by default, `"menu"`, `"none"`)
  and `SegmentedCollapseContext` choose the form; the button keeps its width whatever the
  value. New types `SwatchPickerCollapse` and `SwatchPickerForm`.
- The `fa-fit-row` recipe: one line of controls that give way in order (`fa-fit-1` first …
  `fa-fit-5` last) instead of overflowing; container-aware controls fold as they are
  squeezed.
- `glass-ux/lib/fit-form` (`fitForm`, `nextFitForm`, `useFitForm`): the measuring that
  `Segmented` and `SwatchPicker` share, with the hysteresis that keeps a control from
  flipping between forms.
- A migration guide and this changelog, shipped in the package.

### Changed

- The documentation showcase: a dense network operations workspace (map, live sites table,
  details panel, topology window, events view, shared actions and account switching with
  `LoginFlow`) with one blurred layer at a time, and a studio demo with grouped projects,
  priority reordering, a new-project form and a details sheet.
- DataTable cards show the subtitle under the title and flow fields by column priority; the
  toolbar stays on one row below 36rem with search folding to an icon.
- Popup offsets come from `--popup-offset` and follow UI scale and density; all anchored
  popups share one gap.
- Command palette default groups and Tree default icons are neutral (see the migration
  guide).
- Solid, reduced transparency and browsers without `backdrop-filter` make `glass-card` and
  `glass-float` opaque; an overlay inside a panel or chrome layer no longer adds a second
  blur.
- Sliders, the snap preview, shell drawer and inspector, and the phone tab bar move with
  transforms instead of animating layout; disclosures share one `fa-collapse` recipe; the
  skeleton shimmer moves with a transform instead of repainting.
- Unavailable map, topology, calendar and chart legend controls stay focusable and state why.
- `check-docs` fails on missing or placeholder documentation and on public runtime exports
  without TSDoc; every public prop and export is documented.

- The design rules are rewritten as numbered, scannable rules. Every rule number cited in
  code and documentation is defined, with new rules for using the library (R22),
  authentication (R23) and releases (R24.4), and a pre-ship checklist. `check-docs` fails
  when code or docs cite a rule that does not exist.

### Deprecated

- `toWhere` and `WhereInput` in `glass-ux/data-table`, `EndpointStatus`, the
  `DesktopSession` `endpoint` prop, `POPUP_OFFSET` and `POPUP_COLLISION_PADDING`. They will be
  removed in 0.8.

### Fixed

- DataTable rows re-render when `actions`, `getRowActions`, `renderRowActions` or
  `rowWrapper` change, so row actions no longer go stale.
- Hiding the inspector or collapsing the section drawer returns focus to the reopen control.
- The composer keeps focus on one Send/Stop button; file drop rows move focus on removal and
  announce upload results; rich text upload errors no longer push the editor down.
- Live regions in PasswordField, OrgSwitcher, SettingRow and Metric stay mounted, so first
  announcements are not lost; "+N" overflow chips expose their hidden values to screen
  readers.
- The chart legend's tab stop follows focus.
- A fresh DataTable update reads "Updated just now"; MeterCell keeps its bar in narrow
  columns; a chart's hidden fallback table no longer widens narrow pages.
- A `Form` placed in `Dialog.Popup` keeps the dialog body scrolling and the footer visible.
- `ActionBar` no longer grows tall inside a vertical flex container.
- Map attribution entries are separated and sized for small maps.
- Workspace stacking in phone sheet mode stays below popovers, toasts and tooltips.
- Toast exits use the fast exit timing; tooltips follow the overlay motion vocabulary.
- The documentation site's header toolbar no longer runs off the right edge: the palette
  folds to its menu first, then density, animations and material; the background select
  truncates last; and where even the folded controls do not fit, one Appearance button
  holds them.

### Performance

- Generated icons are tree-shakeable: a single icon import is 0.9 KB instead of 83 KB, and
  `glass-ux/button` is 5.8 KB instead of 88 KB (minified).
- Form layout components no longer import TanStack Form; result charts load on demand;
  streaming markdown reparses only the changing tail. `glass-ux/ai` is 223 KB gzip instead
  of 304 KB.
- One shared, coalesced `ResizeObserver` serves every measured component, and TruncatedText
  measures and mounts its tooltip only when needed.
- The package is 6.9 MB packed and 40 MB unpacked (from 8.1 MB and 54 MB): the API model
  JSON and declaration maps are no longer published.
- `pnpm size:check` keeps gzip budgets for key entries and keeps heavy dependencies out of
  them.
- The documentation site loads each route on demand; its main chunk is 181 KB gzip instead
  of 579 KB.

Earlier releases are listed on [GitHub releases](https://github.com/Dastari/glass-ux/releases).
