# Migration

Upgrade steps between releases. Each section lists the changes that need code edits first,
then behaviour changes to review. The [changelog](../CHANGELOG.md) lists everything else.

## 0.9.10 → Unreleased

No code changes are required.

- AI result files and composer attachments now show their kind (PDF, spreadsheet, archive,
  audio and so on) instead of the plain page, and JSON, YAML and XML show the data icon
  rather than the code icon. A test or snapshot that looked for `data-icon="code"` or
  `data-icon="file"` on those rows needs the new icon name.
- An application mapping file names or MIME types to icons can use `FileIcon` from
  `glass-ux/file-icon` (or `fileKind` for the kind alone), and colour kinds from its own CSS
  with `[data-file-kind]`.

## 0.9.9 → 0.9.10

No code changes are required.

- Charts keep breaking a line at missing samples. To join gaps with a dashed bridge instead,
  pass `gaps="bridge"` to `LineChart` or `AreaChart`; data that dropped nulls to avoid holes
  can keep them now.
- A `ConversationLog` keeps a reader at the end while an answer streams again; nothing to
  change. A test that waits for a completed answer and checks the log is at its end should
  pass consistently.
- A rule that hid a `Tree`'s group counts (`.fa-tree-count { display: none }`) can become
  `groupCounts={false}`.
- A `Tree` is unchanged unless you opt in. For an explorer, pass `selectableGroups` (branches
  select on click and open from the chevron), mark unloaded branches `hasChildren: true` and
  fetch them in `onLoadChildren`, and page long branches with `hasMore` and `onLoadMore`. A
  wrapper that turned group clicks into selections, or kept placeholder children to force a
  chevron, can go.
- Window actions are unchanged unless you wrap them. To stop a narrow window's actions pushing
  its controls out of the frame, wrap each action in `Window.Action` with a `label` (and an
  `icon` and `onSelect`, or `menu` content for a menu or a Segmented choice). Actions are
  `secondary` by default and fold into More; mark the one that must stay `priority="primary"`.
- A split view built in the application (a tree beside a table, a list above details) can
  move to `SplitPane` from `glass-ux/split-pane`. Its size is remembered per window kind
  inside a window body; pass `storageKey` elsewhere, or `storageKey={null}` to forget it.
- A stylesheet that clipped a range `Slider`'s track to stop it widening a scroll area
  (`overflow-x: clip` on `.fa-slider-track`) can go: the slider clips its own range, and
  that override also cut off the value bubble over a thumb at either end.

## 0.9.8 → 0.9.9

No code changes are required.

- Panels in `AppShell`'s routed view are now frosted like the drawer and inspector. Review
  screenshots of routed pages; with live rendering their frost drops out for the length of a
  route cross-fade.
- In a `ConversationLog` of 20 or more turns, scroll to a turn with
  `useConversationLog().scrollToTurn(index)` instead of `scrollIntoView` on its element.
- Under a `TooltipProvider` a `Tooltip` renders only its trigger, marked `data-fa-tooltip`,
  and one host per provider shows the bubble. Tests that inspected Base UI's per-trigger
  tooltip internals should hover or focus the trigger and check the visible bubble.
- A surface can choose its own level: `glass="reduced"` or `glass="solid"` on `Surface` and
  `Panel`, or `data-glass` on any element. It never goes more transparent than the page.

### Baked glass rendering (optional)

Baked rendering gives panels and chrome on the page canvas a copy of the canvas blurred once,
instead of a live blur every frame. It looks the same at rest and removes most compositor work
while anything animates (docs/performance.md, "Baked frost"). To use it:

1. Select it where you configure appearance, at module scope:

   ```ts
   configureAppearance({ defaults: { palette: "graphite" }, glassRendering: "baked" });
   ```

   With server rendering, call it before `appearanceBootScript()`, so the first frame
   carries `data-glass-rendering="baked"` on `<html>`.
2. Keep `AppearanceProvider` mounted; it bakes the canvas. Without the provider, call
   `applyAppearance` (or run the boot script) after `configureAppearance`, and call
   `installBakedFrost()` once at startup.
3. Draw the page canvas with `canvas-ambient` or `canvas-background` (and `canvas-silk` for
   Silk). Images in your own canvas must be same-origin or served with CORS; otherwise the
   materials keep the live blur.
4. If your Content Security Policy restricts images, allow `blob:` in `img-src`: the baked
   canvas is a `blob:` image.
5. Panels and chrome must sit on the canvas (the layout contract). A layer that rests over
   other content — a sticky header over a list, a panel overlapping another — would show the
   canvas through it; give it `glass-overlay` or `glass-float`, which always blur live.

Scrolling, sliding panes, dragged and floating windows, overlays and mode islands keep the
live blur automatically. Browsers without `background-clip: border-area`, and iOS and iPadOS,
keep it everywhere. Text on a baked panel may draw with subpixel antialiasing on Windows and
Linux, so pixel snapshots taken there can change.

## 0.9.7 → 0.9.8

No code changes are required.

- A local aspect-ratio box (padding-top hacks or your own `aspect-ratio` wrapper) can move
  to `AspectRatio` from `glass-ux/aspect-ratio`.
- Overrides for a full-screen window's background (`background-clip`, hiding `::before`),
  for the narrow scope icon's width, and `data-mode="dark"` on controls inside `glass-float`
  can go.
- Content on `glass-float` that set its own light text colour can rely on the float's
  `--fg` and `--fg-muted`.
- A click handler on `.fa-chart-hit` that read `aria-valuenow` can move to `LineChart`
  `onActivate`, and a drawn selection to `selected`.

## 0.9.6 → 0.9.7

No code changes are required.

- Managed windows show a Full screen control beside Pop out. Turn it off for a kind with
  `fullscreen: false` on its `WindowKindDefinition`. Content that drew its own Full screen
  button in `Window.Actions` can drop it and read `useWindow().fullscreen` instead.
- Tests that list a window's controls should expect `data-control="fullscreen"` after
  `popout` where the browser supports full screen (jsdom does not, so unit tests see no
  change).
- A pop-out route whose manager has no storage no longer needs its own handshake: the
  library asks the workspace for its state. Remove any shim that rebroadcast state for it.
- Your own Base UI portals inside a window should pass `container={popupContainer()}` so
  they open inside a window in full screen.

## 0.9.5 → 0.9.6

No code changes are required. Stand-in glyphs for sites (for example `IconMapPin` for an
office, `IconPackage` for a warehouse, `IconTag` for a shop) can move to `IconOffice`,
`IconWarehouse`, `IconStore`, `IconSchool`, `IconHospital` and `IconFactory`, and
organisation relationships to `IconPartner` and `IconSupplier`.

## 0.9.4 → 0.9.5

No code changes are required.

- To draw a window's scope with the application's own identity component, return `chip` and
  `icon` from `WindowScopes.describe` alongside `label`. A scope without them keeps the
  library's pill and `avatar`.

## 0.9.3 → 0.9.4

No code changes are required.

- A paged `DataTable` is unchanged. To load more as the reader scrolls, pass `infinite` and
  append each batch to `rows` (docs/data-filters.md, "Load more as the reader scrolls").
- With graphql-orm and Apollo Client, `connectionPagination()` from
  `glass-ux/adapters/graphql-orm` replaces a hand-written `fetchMore` `updateQuery` or field
  policy that concatenates `Edges`.

## 0.9.2 → 0.9.3

No code changes are required.

- A single-series `LineChart` or `AreaChart`, and a multi-series one with only one series
  visible, now shows the floating chart tooltip (`.fa-chart-tip`, portalled to the body)
  while hovered or under the keyboard cursor. Tests that expected no tooltip for one series,
  or that read the hovered value only from the head readout, should expect the tooltip; the
  head readout still updates. Tests that counted `.fa-chart-tip` elements on a page should
  allow for it.
- `PieChart`, `DonutChart` and `Sunburst` show the same tooltip in the full tier. Tests that
  took a screenshot or checked what covers the legend while a slice is hovered should
  account for it.

## 0.9.1 → 0.9.2

No code changes are required.

- A disabled menu row's reason is now its tooltip, not a line under the row. Tests that
  looked for the reason text (or `.fa-menu-reason`) inside the open menu should hover or
  arrow to the row and expect a `tooltip`, or check the row's accessible description.
- `reasonShown`, `reasonId` and `reasonRuns` are deprecated and do nothing for menus;
  remove them. They are planned for removal in 0.10.
- A chart's full-tier head has a second icon button, "Copy as CSV", after "View as table".
  Tests that selected the head's only button should select it by name.

## 0.9.0 → 0.9.1

No code changes are required.

- Browser tests that open a dialog from the keyboard and expect focus on the header close
  button should expect the first control instead (in a `SettingsDialog`, the current
  section's tab). Pass `initialFocus` to keep another target.
- A test that pressed Escape twice, once for a tooltip and once for its dialog, needs one
  press now.

## 0.8.3 → 0.9.0

0.9.0 removes the gallery and the deep import paths from the package, makes the formatting
locale configurable and renames the selection props on four components. None of these has an
alias, so update imports, locale setup and props before upgrading.

### Required changes

**The gallery is no longer in the package.** Remove imports of `glass-ux/gallery`,
`glass-ux/gallery/*` and `glass-ux/gallery/styles.css`. Link to the
[documentation site](https://dastari.github.io/glass-ux/) instead, or serve the
`glass-ux-docs.tar.gz` asset from the same release where the catalogue must be available
offline. Keep your own component examples in your application.

**Deep imports no longer resolve.** Import from the package's named entries; the
[API index](api/README.md) lists each component's entry. Anything only reachable through an
internal path is no longer public: copy it into your application, or ask for it to become an
entry.

| 0.8 | 0.9 |
| --- | --- |
| `glass-ux/ui/<family>/<file>` (e.g. `glass-ux/ui/button/button`) | `glass-ux/<family>` (e.g. `glass-ux/button`) |
| `glass-ux/lib/appearance/<file>` | `glass-ux/appearance` |
| `glass-ux/lib/actions/actions` | `glass-ux/actions` |
| `glass-ux/lib/fit-form` | `glass-ux/fit-form` |
| `glass-ux/lib/use-media-query` | `glass-ux/dialog` (`useMediaQuery`, `usePhoneLayout`, `PHONE_QUERY`) |
| `glass-ux/ui/data-table/cells/relative-time` | `glass-ux/data-table` |
| `glass-ux/ui/country-select/countries` | `glass-ux/country-select` |
| `glass-ux/shell/context-switcher/index` | `glass-ux/shell/context-switcher` |
| `glass-ux/shell/<file>`, `glass-ux/windows/<file>`, `glass-ux/ai/<file>` | `glass-ux/shell`, `glass-ux/windows`, `glass-ux/ai` or the named `glass-ux/ai/<part>` entry |
| `glass-ux/icons/generated/icons` | `glass-ux/icons` |

**Set the formatting locale.** Glass UX used to format everything as en-AU. It now follows
`<html lang>`, falling back to en-US. To keep Australian formats, set `<html lang="en-AU">`
or call `configureLocale("en-AU")` from `glass-ux/locale` beside `configureAppearance`.

- For SSR, call `configureLocale` with the same tag on the server and the client.
- To format one region differently, wrap it in `<LocaleProvider locale="…">`, or pass a
  component's `locale` prop.
- Schema helpers cannot see a provider: pass a field's explicit `locale` to its schema too.
- A custom chart `format` callback now receives the locale as its second argument.
- `parseMoney` and `parseBytes` read the locale's decimal mark, so in a locale such as de-DE
  `1.234,5` means 1234.5.

**Selection props.** Replace `onSelect` with `onSelectedIdChange` on `Tree`,
`TopologyCanvas`, `GeoMap` and `SessionNav`. The callback receives the id first; the object
`onSelect` received is `details.item`.

| Component | 0.8 | 0.9 |
| --- | --- | --- |
| `Tree` | `onSelect={(node) => setSelected(node.id)}` | `onSelectedIdChange={setSelected}` (node: `details.item`) |
| `TopologyCanvas` | `onSelect={setSelected}` | `onSelectedIdChange={(id) => setSelected(id)}` |
| `GeoMap` | `onSelect={(point) => select(point?.id ?? null)}` | `onSelectedIdChange={(id) => select(id)}` (point: `details.item`) |
| `SessionNav` | `activeId={id}` and `onSelect={(session) => open(session)}` | `selectedId={id}` and `onSelectedIdChange={(id, { item }) => open(item!)}` |

- A fixed `selectedId` with no handler stays fixed. Use `defaultSelectedId` to let the
  component keep the selection, and `selectedId={null}` to clear it.
- `onSelectedIdChange` does not fire when the selected item is pressed again. Handle the press
  separately if you relied on `onSelect` for that, for example to close a drawer.

### Review

- If your repository vendors the archive, commit only the `.tgz` and delete any unpacked copy.
- Source maps are no longer shipped. Debuggers show the compiled ES modules, which follow the
  source closely.
- `docs/api/typedoc.json` is gone. Read `docs/api/*.md` or the type declarations.
- Firefox ESR 140 now shows the theme colours. No code changes are needed.
- A `MapSilhouette` outside a map now fills its container, which needs a definite height.
  Remove any wrapper you added to clip or position it.

## 0.8.2 → 0.8.3

No code changes are required.

- Tests that find the date input of an AI date-time ask by the name "Date" should use the
  part's new name, "<label> Date" (for example "Date and time Date"), or the group name.
- Replace a native `<input type="time">` beside a `DateField` with `DateTimeField` or
  `TimeField` to get typed entry, the list of times and time zone handling.

## 0.8.1 → 0.8.2

No code changes are required.

- In Solid, controls, wells, soft tints and skeletons now have opaque fills. In Frosted,
  controls and wells are close to opaque. Review screenshots taken in those materials.
- Markdown with `wrapTableCells` shows every table row instead of a 14-row scroll box.

## 0.8.0 → 0.8.1

No code changes are required.

- The drag preview now renders in the top layer. Remove any z-index you set to raise it over
  dialogs.
- During a pointer drag a transparent shield covers the page and shows the cursor. Hover
  styles under the pointer pause until the drop.

## 0.7 → 0.8

0.8.0 renames the organisation switcher to a generic context switcher and removes the
names deprecated in 0.7. Neither has an alias, so update imports, props and CSS before
upgrading. Coming from 0.7.0 or 0.7.1, also read the 0.7.x sections below.

### Required changes

**`OrgSwitcher` is `ContextSwitcher`.** It switches any context: organisations, projects,
workspaces. Import it from `glass-ux/shell` or the new `glass-ux/shell/context-switcher`
entry. `glass-ux/shell/org-switcher` is gone.

```diff
- import { OrgSwitcher, useRecentOrganisations } from "glass-ux/shell";
+ import { ContextSwitcher, useRecentContexts } from "glass-ux/shell";

- <OrgSwitcher organisations={orgs} searchPlaceholder="Find a customer" … />
+ <ContextSwitcher items={orgs} labels={{ placeholder: "Find a customer" }} … />
```

| 0.7                                            | 0.8                                                 |
| ---------------------------------------------- | --------------------------------------------------- |
| `OrgSwitcher`, `OrgSwitcherProps`              | `ContextSwitcher`, `ContextSwitcherProps`           |
| `OrgSwitcherPanel`, `OrgSwitcherPanelProps`    | `ContextSwitcherPanel`, `ContextSwitcherPanelProps` |
| `OrgSwitcherRemote`                            | `ContextSwitcherRemote`                             |
| `OrgAvatar`, `OrgAvatarProps`, `OrgAvatarSize` | `ContextAvatar`, `ContextAvatarProps`, `ContextAvatarSize` |
| `describeOrgScope`                             | `describeContext`                                   |
| `SwitcherOrganisation`                         | `ContextItem`                                       |
| `OrgTree`, `OrgTint`                           | `ContextTree`, `ContextTint`                        |
| `buildOrgTree`                                 | `buildContextTree`                                  |
| `orgCode`, `orgInitials`, `orgTint`            | `contextCode`, `contextInitials`, `contextTint`     |
| `useRecentOrganisations`                       | `useRecentContexts`                                 |
| `glass-ux/shell/org-switcher`                  | `glass-ux/shell/context-switcher`                   |

Props and fields:

- `organisations` is `items` on `ContextSwitcher` and `ContextSwitcherPanel`.
- `searchPlaceholder` is gone; pass `labels={{ placeholder: "…" }}`.
- `OrgAvatar`'s `org` prop is `ContextAvatar`'s `item`.
- `ContextTree.ordered` entries are `{ item, depth }` (were `{ org, depth }`).
- A `SwitcherRow` carries `item` (was `org`), and its `kind` is `"item"` (was
  `"organisation"`). The list rows' `data-kind` attribute follows.
- `describeContext` returns `item` (was `org`).
- `SwitcherLabels.organisations` is `group`, and `SwitcherLabels` gains keys for every
  word the switcher shows or announces. Partial `labels` props still merge over the
  defaults. Code that builds a whole `SwitcherLabels` (for `switcherGroups`) should start
  from `switcherLabels(noun)` or `DEFAULT_SWITCHER_LABELS`.

CSS: `.fa-org-switcher*` classes are `.fa-context-switcher*`, and `.fa-org-avatar*` are
`.fa-context-avatar*`. Update stylesheets and test selectors that name them.

Unchanged: with no `labels`, the switcher still speaks of organisations, so its accessible
names ("Organisation: Northstar Studio", "Search organisations") and the default words stay
the same. `useRecentContexts` reads the same storage format under your key, so saved recents
survive.

**Deprecated names from 0.7 are removed.**

| Removed                                        | Use                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `toWhere` on DataTable filter and search specs | `toCondition`                                                             |
| `WhereInput` from `glass-ux/data-table`        | `FilterCondition`                                                         |
| `EndpointStatus` (badge, data-table)           | `StatusKind`                                                              |
| DesktopSession `endpoint` prop                 | `target`                                                                  |
| `POPUP_OFFSET`, `POPUP_COLLISION_PADDING`      | Popups read `--popup-offset` and `--popup-collision`; override the tokens |

```diff
- filters.text({ field: "Hostname", toWhere: (value) => … })
+ filters.text({ field: "Hostname", toCondition: (value) => … })
- import type { WhereInput } from "glass-ux/data-table";
+ import type { FilterCondition } from "glass-ux/data-table";
- import type { EndpointStatus } from "glass-ux/badge";
+ import type { StatusKind } from "glass-ux/badge";
- <DesktopSession endpoint={device} … />
+ <DesktopSession target={device} … />
```

- `CustomFilterSpec` is an interface again and requires `toCondition`, so an interface may
  extend it. `CustomFilterConditionSpec`, the 0.7 union of the two names, is removed: use
  `CustomFilterSpec`, or `CustomFilterOptions` for the `filters.custom` argument.
- `DesktopSession`'s `target` is now required.
- `POPUP_OFFSET` and `POPUP_COLLISION_PADDING` have no replacement export. Positioning code
  of your own should read the `--popup-offset` and `--popup-collision` tokens, which follow
  UI scale and density.
- The GraphQL adapter keeps its own `toWhere()` function and `WhereInput` type.

### Other changes

No code changes are required. Drag and drop is a new entry, `glass-ux/drag-drop`. The
redrawn company and manufacturer icons keep their names; review screenshots that include
them.

- Scroll regions whose content fits no longer swallow the mouse wheel, so the page or pane
  around them scrolls. Remove workarounds that forwarded wheel events past a DataTable,
  Panel body, ScrollArea or window body. A region that overflows still stops the wheel at its
  ends, as before.

## 0.7.1 → 0.7.2

No code changes are required. Meters stay neutral while healthy unless you pass
`tone="data"`.

## 0.7.0 → 0.7.1

No code changes are required.

- Remove any workaround that pinned the docked Inspector's or drawer's width; AppShell sizes
  both panes again.
- Import `resolveActions` from `glass-ux/actions` instead of
  `glass-ux/lib/actions/actions`.
- A window body that is still loading is now announced as a `status` named "Loading
  window". Tests that find it by role should query `getByRole("status", { name: "Loading
  window" })`.

## 0.6 → 0.7

### Required changes

**The GraphQL filter adapter has its own entry.** The `where`/`evaluate` translation for
GraphQL ORM servers moved out of the core library. Core DataTable filters and search no
longer refer to any server shape.

```diff
- import { toWhere, searchWhere } from "glass-ux/lib/graphql-orm/where";
- import { evaluateWhere } from "glass-ux/lib/graphql-orm/evaluate";
+ import { toWhere, searchWhere, evaluateWhere } from "glass-ux/adapters/graphql-orm";
```

Every export keeps its name: `toWhere`, `searchWhere`, `columnWhere`, `columnEntries`,
`toFilterInput`, `decimalText`, `rfc3339`, `evaluateWhere`, `WhereInput`, `WhereOptions`
and `EvaluateOptions`. In-memory matching (`filterRows`, `matchesFilter`, `searchRows`)
stays in `glass-ux/data-table`.

**`CustomFilterSpec` is a type, not an interface.** A custom filter now requires exactly one
of `toCondition` or the deprecated `toWhere`. Object literals and `satisfies` checks are
unchanged. An interface that extends it must become an intersection:

```diff
- interface TagFilter extends CustomFilterSpec<string[]> {
-   suggestions: string[];
- }
+ type TagFilter = CustomFilterSpec<string[]> & {
+   suggestions: string[];
+ };
```

**Removed deep-import helpers.** These were reachable only through the wildcard paths and were
unused by the library:

| Removed                                        | Replacement                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `readMotionScale` from `glass-ux/ui/map/theme` | `motionScale()` from `glass-ux/appearance`                                                  |
| `fitRect` from `glass-ux/windows/geometry`     | `clamp` from the same module on each of `x`, `y`, `w`, `h`                                  |
| `stackOrder` from `glass-ux/windows/geometry`  | `windows.filter((w) => !w.poppedOut && w.layout !== "tiled").toSorted((a, b) => a.z - b.z)` |

### Deprecated names

The old names still work in 0.7 and will be removed in 0.8.

| Deprecated                                     | Use                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `toWhere` on DataTable filter and search specs | `toCondition`                                                             |
| `WhereInput` from `glass-ux/data-table`        | `FilterCondition`                                                         |
| `EndpointStatus` (badge, data-table)           | `StatusKind`                                                              |
| `DesktopSession` `endpoint` prop               | `target`                                                                  |
| `POPUP_OFFSET`, `POPUP_COLLISION_PADDING`      | Popups read `--popup-offset` and `--popup-collision`; override the tokens |

The GraphQL adapter keeps its own `toWhere()` function and `WhereInput` type; those names
describe that server's `Where` input and are not deprecated.

### Behaviour to review

- **Command palette group order.** The default order is now
  `DEFAULT_PALETTE_GROUP_ORDER` (`["Recent", "*", "Actions", "Navigation"]`). It no longer
  places "Endpoints" and "Organisations" last. To keep the previous order, pass
  `groupOrder={[...DEFAULT_PALETTE_GROUP_ORDER, "Endpoints", "Organisations"]}` to
  `PaletteProvider`.
- **Tree default icons** are `IconFolder` (branches) and `IconFile` (leaves). Supply
  `icon` per node to restore device or organisation icons.
- **Popup gaps.** Every anchored popup uses `--popup-offset` (6px at the default scale), so
  popovers and preview cards sit 2px closer to their trigger; arrowed tooltips sit 12px
  away and context menus 3px. Gaps now follow UI scale and density.
- **Unavailable controls stay focusable.** Map, topology and calendar controls that cannot
  act are `aria-disabled` with a reason instead of `disabled`; at the minimum or maximum
  month the calendar's previous/next buttons remain in the tab order.
- **Button announcements.** A Button that tracks pending, success and failure renders a
  visually hidden polite live region beside itself. Pass `statusAnnouncement={false}` when
  the host already announces the outcome. Host selectors such as `:last-child` around such
  buttons may need adjusting.
- **Clearable inputs clear on Escape.** Any `Input` with `clearable` now clears on Escape,
  as `SearchField` already did.
- **`null` as a controlled value.** `Segmented` (`value`), `TagInput` (`value`),
  `MultiSelect` (`value`) and `Tree` (`expanded`) treat `null` like `undefined`
  (uncontrolled). `SwatchPicker` keeps `value={null}` as a controlled “nothing chosen”.
- **Opaque materials in Solid.** In Solid, reduced transparency and browsers without
  `backdrop-filter`, `glass-card` and `glass-float` are opaque. An overlay rendered inside a
  panel or chrome layer uses an opaque fill instead of a second blur.
- **DataTable cards** show the subtitle under the title and flow fields on wrapping lines by
  column priority. Below 36rem the toolbar stays on one row and search folds to an icon.
- **Motion.** Popups, dialogs, toasts and indicators use spring easing; under Still or the
  operating system's reduced-motion setting they remain instant, as before.
- **SwatchPicker folds instead of wrapping.** By default (`collapse="auto"`) the swatches
  stay on one line, and when they do not fit the box they are given the picker becomes one
  menu button showing the chosen swatch. It used to wrap onto more lines. Pass
  `collapse="none"` to keep every swatch and wrap, for example in a phone sheet. The picker
  also follows `SegmentedCollapseContext`, so a host that forces `"menu"` (the TopBar's module
  slot on a phone) folds a picker placed there; its own `collapse` prop wins. Tests that
  find swatches by name in a narrow box should open the menu (`Palette: Ocean`) and pick the
  `menuitemradio` instead.

### Package contents

- `dist/gallery/api.generated.json` and `demo-coverage.generated.json` are no longer
  published; no package export pointed at them.
- Declaration maps (`*.d.ts.map`) are no longer published. Go-to-definition opens the
  declaration file.
- Generated icons are tree-shakeable: importing one icon no longer bundles all of them.
