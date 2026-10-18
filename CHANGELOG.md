# Changelog

All notable changes to Glass UX. Versions follow [semantic versioning](https://semver.org/);
while the major version is 0, a minor release may contain breaking changes, and each one
has upgrade steps in the [migration guide](docs/migration.md).

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
