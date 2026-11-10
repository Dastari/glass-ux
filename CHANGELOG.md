# Changelog

All notable changes to Glass UX. Versions follow [semantic versioning](https://semver.org/);
while the major version is 0, a minor release may contain breaking changes, and each one
has upgrade steps in the [migration guide](docs/migration.md).

## Unreleased

### Added

- Icons for aviation and ground support: `airplane`, `jet-engine`, `propeller`, `landing-gear`, `tyre`,
  `seat`, `oil-can`, `refueller`, `tug`, `towbar`, `baggage-cart`, `dolly`, `trailer`, `belt-loader`,
  `forklift`, `airstairs`, `work-stand`, `ladder`, `scissor-lift`, `aircraft-jack`, `ground-power`,
  `air-start`, `nitrogen-cart`, `oxygen-cart`, `de-icer`, `pump`, `marshalling-stand`, `wheelchair`,
  `ramp` and `scrubber`. One icon per kind of equipment; the gallery's search also finds them by the
  codes in use (GPU, ASU, DIU, BB, BT, MS, SD, SL, DPL).
- Icons for tools and safety: `wrench`, `screwdriver`, `hammer`, `drill`, `toolbox`, `multimeter`,
  `flashlight`, `fire-extinguisher`, `hard-hat`, `traffic-cone` and `wheel-chock`.
- Icons for vehicles, lifting and handling: `van`, `bus`, `boom-lift`, `hoist`, `crane`, `pallet`,
  `trolley`, `gas-cylinder`, `sprayer` and `snowflake`. The gallery's search also finds existing icons
  by the other names in use: truck (`supplier`), car (`vehicle`), fuel (`pump`, `refueller`),
  generator (`ground-power`), compressor (`air-start`), jack, stairs, step stand and tow tractor (#25).
- Scheduler `eventActions`: an `ActionSet` for an event's context menu, opened by right-click anywhere
  on the event, Shift+F10 or the Menu key, or a long press on an event that cannot be moved, in every
  view (#19).
- CommandPalette: a command's `meta` (any content, such as an EntityIdentity chip and a time) after
  its label, in place of `detail` (#18).
- PanelHeader `density="tight"` for small summary panels: no minimum height, and less space above the
  body (#26).
- EntitySettingsDialog `mode="create"`: every tab with fields counts as changed, so Save works with
  prefilled values, and the buttons say Create (#24).
- `Rail.Separator`: a line between groups of rail items that moves into More with its group, so lines
  never meet; More draws the same lines between the groups it holds (#20).
- FactList `variant="rows"`, a property list for a record's details: an icon column, a label column
  every value starts after, values centred on the row and a hairline between rows. A fact takes an
  `icon` in either variant (#21).
- DataTable `cardRole: "media"` with a column's `media: { ratio }`: the cell is drawn across the top
  of each card, edge to edge, above the title, and as a thumbnail the row's height in the table. A
  loading card keeps its box. The data table page shows it with a compact FileDrop in the toolbar (#22).
- Draggable `announcements` and `describedBy`, its own words and instructions inside a shared
  provider (#17).

### Fixed

- DataTable joins a DragDropProvider around it instead of starting its own, so Draggables in cells
  reach the host's zones; its column ids and types are namespaced by the table and keep their own
  announcements (#17).
- Bound text fields (TextField, TextareaField, EmailField, UrlField, and the other text fields) take a
  `null` or `undefined` value, show it as empty, and hand the same blank back when cleared (#23).
- Rail: the fit counts entries' block margins, so a margin on an entry no longer pushes the foot items
  out of view; an application's own `position` or `visibility` on an entry no longer keeps it in the
  rail once it is in More (#20).
- Documentation: headings inside a specimen keep their own styles instead of taking the page's heading
  size and spacing (a PanelHeader's title had 16 px under it in its own demo).
- A touch long press that lifts something to drag it no longer also opens a context menu around it.

## 0.19.6

### Fixed

- Dialog: with an `identity` in the header (EntitySettingsDialog's `identity`), the close button sits on
  the line of the identity's actions, or its first row when it has none, instead of at the top of the
  header. EntityIdentity marks those with `data-header-anchor`.
- SettingsDialog and EntitySettingsDialog: the scrolling pane's content is cut off at the footer's line
  instead of running 4 px over it.

## 0.19.5

### Added

- `scripts/profile-scroll.mjs` measures a built documentation page while it scrolls: main-thread time
  and its parts, compositor time, frames, draw time and the transitions that started (#11).

### Changed

- Rows that scroll under a resting pointer change on hover at once and ease only on the way out:
  DataTable rows and their row actions, notification rows and their tools, and list items (`.fa-item`).
  Each row starts one transition instead of two (#12).
- The documentation shell skips rendering for demo, usage and API blocks more than a screen away once
  the reader scrolls. Each keeps the height it last rendered at, so the page's length and deep links
  stay put. Under automation it stays off unless `localStorage["docs-kit.far-blocks"]` is `"on"` (#11).

### Fixed

- `useScrollEdges` no longer forces a style recalculation on every scroll event. It schedules one frame
  per burst of events and reads the reading direction only for a scroller with horizontal overflow at
  offset 0 (#14).
- Sparkline's wrapper is no longer positioned, since nothing inside it is positioned against it (#13).

On `/components/data-table/`, main-thread time while scrolling fell from 167–176 to 110–134 ms per
second, and hit testing from 44–54 to 13–15 ([performance](docs/performance.md#scrolling-long-pages)).

## 0.19.4

### Added

- Appearance: blur is a person's preference. `glassRendering` (`"live"` or `"none"`) is stored with the
  other choices, restored by the boot script before first paint and covered by Reset. Set the site-wide
  default with `configureAppearance({ defaults: { glassRendering } })`, or fix it with `locked` (#9).
- AppearanceSettings: the opt-in style group has a Blur row (On / Off) beside Style. While the style is
  Flat, it shows "Not used in Flat" (#9).

### Changed

- `configureAppearance({ glassRendering })` now sets the site-wide default, the same as
  `defaults.glassRendering` (which wins when both are set). It is deprecated. Nothing changes until a
  person chooses otherwise, which they can only do where the application offers the Blur row.
- `exportAppearance` writes blur into `theme.defaults.glassRendering`, and reads a person's own
  `glassRendering` like the other knobs. `importAppearance` still reads a top-level `glassRendering`
  from older themes, and returns it in `defaults`.
- The documentation's Blur control is stored with the other appearance choices.

## 0.19.3

### Added

- AppearanceSettings: a `"style"` section offers Glass or Flat. It is opt-in, like shape and fonts:
  `sections={["style", ...DEFAULT_APPEARANCE_SECTIONS]}`. The choice applies at once, is stored and is
  covered by Reset (#9).
- AppearanceSettings: `flat` sets how the rows Flat overrides look while the style is Flat: `"disable"`
  (default) or `"hide"` (#10).

### Fixed

- SettingRow: a Slider in its control draws at 14rem, narrowing in a narrow row. The control slot sized to
  its content, so the slider had no width, track or thumb. This includes AppearanceSettings' Interface
  size, Corner rounding and Line weight (#8).
- AppearanceSettings: in Flat, Material, Background and Animation say "Not used in Flat" and cannot be
  changed, since Flat draws solid panels on a plain canvas without motion. Their stored choices apply
  again in Glass (#10).

## 0.19.2

### Added

- RadioCard: `size="lg"` for questionnaires and consent on touch screens: a subtitle-size title, a
  body-size description and a larger circle (#2).
- SignaturePad and SignatureField: `maxHeight` (a CSS length or pixels) caps the signing area. The pad
  narrows to keep its shape, so the saved drawing keeps its proportions and a phone held sideways leaves
  room to scroll past it (#6).
- PhoneInput, PhoneField and MobileField: standard input attributes (`enterKeyHint`, `autoComplete`,
  `autoFocus`, `onKeyDown`, `onFocus`, `onPaste`, `data-*`…) reach the number input. New type
  `PhoneInputAttributes` (#4).

### Fixed

- Text fields no longer zoom the page on iPhone Safari. On coarse pointers every text-entry element (inputs,
  textareas, selects, editable regions, and the search boxes inside Select, Combobox and the country picker)
  has at least 16 px text; control heights do not change (#1).
- RadioCard: titles wrap instead of ending in an ellipsis (#2).
- PhoneInput: the country picker's hit area reaches 44 px on touch screens without changing its size (#3).
- LevelGauge: a pressable gauge's hit area reaches 44 px on touch screens without changing its size (#5).
- PhoneInput: `autoFocus` and `ref` reach the number input, so an application can focus it without querying
  for an `input`, which finds the country picker's hidden one first (#7).

## 0.19.1

### Added

- EntitySettingsDialog: `identity` makes the entity's EntityIdentity the header, with its state, facts and
  ActionBar beside the close button. In a narrow dialog it takes its compact tier, with the actions in one ⋯.
  The dialog is named from it ("NST-C106 settings"). New type `EntitySettingsIdentity`.
- EntitySettingsDialog: `headerActions` puts controls in a header without `identity`. Dialog.Header takes
  `identity` too, and its `title` is optional with one.
- DataTable: a column's `entity` names the entity its cell shows when it is not the row's own (a device's
  Organisation or Site). Right-click in that cell offers that entity's actions. New type
  `DataTableCellEntity`.
- SessionNav: `renderSession` draws a session's row, such as its EntityIdentity at the row tier. The row
  still selects, renames and keeps its menus.
- Icons: `IconCrown`, for a primary item (a site's primary badge).
- PinMap: `ref` takes a `PinMapHandle`, whose `goTo` moves the view without placing the pin.
- PinMap: the wheel zooms at the cursor without scrolling what is behind it. A scroll that began elsewhere
  keeps scrolling across the map until the wheel has been still for 400 ms.
- CoordinatesField: Go to my location in the Pick on map header moves the map there without placing the pin.
  Hidden where the browser has no geolocation, or with `locate={false}`.
- Popover: `headerActions` adds controls to the title row.
- `hasAddressParts(value)`: whether any written part of an address is set.

### Changed

- PinMap: a drag, click or nudge inside the map leaves the camera alone. Only a value from outside, such as
  a lookup or typed coordinates, moves it.
- PinMap: a crosshair where a click places the pin, and a grabbing hand while dragging the map or the pin.
- AddressField and AddressInput: a position alone no longer opens the address parts. An address part or
  Enter manually does.
- CoordinatesField: Pick on map closes when its button scrolls out of view.

### Fixed

- PinMap: dropping the pin no longer re-places it at the cursor. The browser's click after a drag placed it
  a second time, so latitude moved by however far above the tip it was grabbed, and hosts got the value twice.
- PinMap: the pin's tip marks the exact point. It sat 10% of the pin's size above it.
- DataTable: on a narrow table the sort menu joins the columns menu (below 36rem), and Filters is icon-only
  and an idle search reserves no room (below 30rem). The filter strip used to run under the table's own tools,
  which then drew over Filters and its chip and blocked clicks on them.

## 0.19.0

### Added

- FileDialog: `mode="folder"` chooses a folder, returned through `onChoose`: the one selected in the list,
  or else the one showing. Files stay listed, dimmed. New types `FolderFileDialogProps` and
  `FolderSelection`.
- FileDialog: `places` adds shortcuts to common folders in every mode, above the folders, or in a menu
  where the dialog is narrow. New type `FileDialogPlace`.
- DataTable: `view` holds `"table"` or `"cards"` at any width; the default `"auto"` follows
  `cardBreakpoint` as before. Put a `Segmented` in `toolbar` to let people choose.
- DataTable: `cardMinWidth` lays cards in as many columns as fit, with arrow keys that move by what is
  drawn. `cardMaxWidth` caps the width, and the same value as `cardMinWidth` gives fixed tiles. A
  reorderable table keeps one column.
- DataTable: while cards show, the toolbar has a sort menu over the sortable columns, since cards have no
  headers. `cardSort={false}` removes it.
- DataTable: `renderCard` draws a card's content, handing over the row's checkbox, actions, expander and
  cells; `renderCardSkeleton` is its loading placeholder. New types `DataTableView` and `DataTableCard`.
- TopologyCanvas: `listFlush` removes the list view's inset, for a list that brings its own edges, such
  as a DataTable.

### Changed

- DataTable: while cards show, the sort menu and the columns menu come before Export and `toolbar`, so those
  two stay where they are when the view changes. The columns menu used to come last.

### Fixed

- Flat: an off Switch and a Slider's thumb no longer vanish. The bead took the same colour as a dialog's
  surface, and the off Switch's edge was removed, so on a dialog it drew nothing at all.
- DataTable: a selected card keeps its highlight while the pointer is over it.
- AddressField and AddressInput: Enter manually focuses Street address as the fields open, not a frame
  later, when it could take focus back from a field the person had already moved to.

## 0.18.0

### Added

- Histogram: `series` draws several distributions over each other, each with its own name and colour, on
  one set of edges and one axis. `blend="screen"` adds light where they cross, so an image's channels
  read yellow, cyan and white.
- BarChart: `layout="overlay"` draws vertical columns at one place in each band, see-through, with
  `blend` to choose how they mix. A bar series takes a `color` it means, in its legend and tooltip too.
- Autocomplete and OptionStatus: `errorText` replaces the list's failure text.
- Docs kit: `TemplateDocumentation` and `TemplatePreview` take the screen, its sources and an optional
  shell, so a sister package can use them directly.

### Changed

- Toolbar: a single-choice `Toolbar.Group` folds one tool at a time, the last first, and keeps the
  chosen tool showing. Choosing a folded tool from More brings it into the row.
- Menu: a menu with any icon or tick keeps that column on every row, so labels share one edge.
- AddressInput and AddressField: a failed lookup has its own words. A timeout or upstream failure points
  to manual entry, and a 429 or `RATE_LIMITED` asks for a moment. Retry stays, the text wraps, and it
  stays under the field once the list closes, with Enter manually filled in.
- Language packs: each one uses one register and one term per concept throughout. Spanish uses usted,
  Dutch u and Italian tu; wording changes across all eleven, so check tests that assert translated text.
- `loadMessagePack`: a loader runs once however many times it is asked, including when another package
  registered a pack for the language first.

### Removed

- **Breaking:** the `addressField.lookupStatusError` message, which only `createPhotonGeocoder` used. It
  now throws `GeocoderError`, whose message reads the same.

### Fixed

- DataTable: `formatRelative` read a time up to 20 seconds ahead of the shared clock as "in less than a
  minute". It now reads "just now"; the clock ticks every 15 seconds, so it can lag a time just taken.
- Toolbar: an uncontrolled single-choice group kept separate choices in the row and in More.
- `loadMessagePack`: a sister package's pack registered first left Glass UX's own words in English.
- Greetings: AiHero's marked phrase was not in its title in Chinese and Korean, so nothing was marked.

## 0.17.1

### Added

- MeterCell and Meter: `tone="success"` is green for a level where more is good, such as licence
  seats all assigned. It has no thresholds, so a full bar stays green, unless you set `warningAt`
  or `dangerAt`.
- DataTable: `filterOnly` on a column gives a filter with no column. It appears in the Filters menu
  and matches rows, and is never drawn, listed in the column menu, shown on a card or exported.
- Switch: `disabledReason` turns it off, keeps it in the Tab order and shows the reason as its
  tooltip and description. `focusableWhenDisabled` keeps a disabled switch reachable.

### Fixed

- DataTable: an open bulk action bar covered the pager, so the next page could not be reached. They
  now share the line, and the bar wraps above the pager when both will not fit.
- ReferenceInput: a read-only relation label, as with `direction="from"`, touched its chip. It now
  has the editable row's gap.
- Toolbar: `Toolbar.Button` with only `disabledReason` read as enabled to assistive technology. A
  reason alone now means disabled, as it does on Button, in the toolbar and in its More menu.
- SearchTrigger: it ignored a host's `aria-label`, and a custom `placeholder` failed axe
  `label-content-name-mismatch`. A host's name wins; without one, the name follows the placeholder.
- `registerMessagePack`: a later pack for a language removed the earlier pack's messages. Packs for
  one language now merge, and a later pack wins for each message it provides.
- ContextMenu, and so EntityIdentity, EntityChip and every other long-pressable link: lifting a long
  press clicked the link while the menu it opened was still up, which navigated away.

## 0.17.0

### Removed

- **Breaking:** baked glass rendering: `glassRendering: "baked"`, `installBakedFrost`,
  `FROST_LIVE_ATTRIBUTE`, `FROST_READY_ATTRIBUTE` and `FROST_CANVAS_ATTRIBUTE`. It had to return to
  the live blur whenever a scroller moved its panels, and swapping panels to the blur and back made
  scrolling slower than the live blur alone. `glassRendering: "none"` takes its place. Upgrade
  steps are in the [migration guide](docs/migration.md).

### Added

- Appearance: `glassRendering: "none"` removes every backdrop filter for the application, gives
  Glass the Frosted fills and promotes scroll containers. Scrolling 80 panels drew in about a
  fifth of the time of the live blur (docs/performance.md).
- RichTextReader (`glass-ux/rich-text-reader`): a read-only Markdown document with tables, task
  lists, images and footnotes, and no editor. Its renderer loads on demand.
- CommentThread: `composer` (`defaultChoice`, `renderControl`, `sendLabel`), with a choice held per
  composer, top-level or reply, and carried on `CommentDraft.choice` and `CommentEntry.choice`;
  `renderBadges` and `renderAttachments`.
- ChipOverflow: `wrap={false}` keeps one line, with chips shrinking to an ellipsis and +N visible.
- Metric and MetricSkeleton: `sparklineFill` lets the micro-tier sparkline fill the row.
- AlertDialog: `children` holds a field below the description. `onConfirm` here and in `confirm()`
  may return or resolve to `false` to refuse: the dialog stays open at rest, with no toast or shake.
  `useActionFeedback().run` takes an `isRefusal` third argument.
- SubmitButton: `allowUnchanged` lets a pre-filled form submit unchanged.
- AddressField and AddressInput: `defaultQuery` seeds the lookup from existing text. Nothing is
  sent to the geocoder until the person focuses the field.
- Autocomplete: `onFocus` and `openOnInputClick`.
- ReferenceInput: `addLabel` names one instance's add control.
- Form kit: `field.DateField` (also `BoundDateField`) and `dateSchema`. DateField gains `onReject`
  and `required`.
- ActivityFeed: `isNew` on an item marks a newly arrived row, moving nothing.
- DataTable: `emptyIcon`.
- Rail: `labels` on `Rail.Root` draws each item's name under its icon, and AppShell widens the rail
  column to `--sidebar-w-rail-labelled`.
- AppShell: `inspectorDefault="closed"` starts the inspector closed at every width. A stored
  choice still wins.
- Inspector: `closeName` names its close button, docked or as a sheet. Dialog and Sheet headers
  gain `closeLabel`.
- FileRowItem: `as="div"` renders it outside a list.
- AssistantMessage: `feedback={false}` and `openInWindow={false}` leave those controls out.
- ApprovalCard: `disabled` and `disabledReason` on the ask turn its decisions off, Deny included.
- Window kinds: `renderSubtitle` draws the subtitle as a node, such as an identity chip with its
  actions, in the title bar and the switcher. `renderDockItem` wraps the dock item, which is where
  its subject's actions go. `subtitle` stays the text for the document title and the dock.
  `WindowFrame.AppBar` draws a non-string `subtitle` as given, and the window does not drag from it.
- SessionNav: `renderOrganisation` draws a session's organisation beside its row, so it can carry a
  link, actions and a preview, and pressing it does not select the session.
- ScrollArea: `aria-labelledby`.

### Changed

- EntityIdentity and EntityChip: a removable chip keeps its link, `onOpen`, actions and preview,
  with ✕ as one extra control that opens none of them.
- ReferenceInput: the kind filter is one scrolling row at any number of kinds.
- DataTable cards: a value holding a one-line element, such as ChipOverflow with `wrap={false}`,
  gives way before the field's label.

### Fixed

- Tree: a search that emptied the tree, or filled it again, threw React errors #300 and #310.
- RichTextInput: a task list failed axe `list` at serious level. It is now a group of checkboxes.
  Lexical's `role="checkbox"` on the list item still reports axe `aria-allowed-role` at minor level.
- Composer: a rejecting `onSend` was an unhandled rejection. The draft now stays and nothing is
  raised. Report the failure in `onSend`.
- DataTable: on a narrow toolbar, an active search chip overlapped Filters and the table's own
  tools. The chip now truncates, and the tools wrap under the strip when both will not fit.
- AiStatusStrip: below 26rem the state wraps to a second line instead of truncating beside Retry.
- Autocomplete and AutocompleteField: the popup stays shut when it has nothing to show, so there
  is no empty strip and the rest of the page is not hidden from assistive technology.
- Toast: each toast is a labelled `group` rather than a `dialog` or `alertdialog`.

### Documentation

- RichTextInput: the visual view shows tables, reference links, footnotes and frontmatter as
  literal Markdown. Source mode edits them, and the Markdown stays intact.
- `glass-ux/adapters/graphql-orm`: keyset lists take the table's `OrderBy`, so they can back
  sortable tables.

## 0.16.2

### Added

- Rail: items that do not fit its height move into a More menu instead of scrolling out of
  reach. More sits before the first `Rail.Spacer`; the items after it stay longest, and the
  current section always stays visible. A menu row or a shortcut uses the item itself, so its
  router link, handler and drawer toggle run as they do from the rail, and an item used from
  the menu joins the rail, so anything it opens has an anchor. More shows a dot while a hidden
  item has a badge. `overflow="scroll"` on `Rail.Root` keeps every item in a scrolling column.
- TabBar: tabs beyond `maxItems` (default 5, More included), or too narrow to stay readable,
  move into a More sheet, and the current destination stays in the bar. Without a `TabBar.More`
  the bar adds one when needed; with one, its sheet lists those tabs before its own rows. The
  same list of destinations can now go to both `Rail` and `TabBar`.

## 0.16.1

### Added

- Icons: 47 image-editing glyphs in a new **Image editing** gallery group, named as general
  image-editing words so a CMS, a file manager or an avatar editor can use them too. Selection and
  geometry (`select-object`, `marquee`, `straighten`, `image-size`, `canvas-size`, `transform`,
  `perspective`, `fill-edges`); tone and colour (`develop`, `exposure`, `curves`, `levels`,
  `histogram`, `hsl`, `colour-balance`, `detail`, `auto-enhance`); retouching (`clone-stamp`,
  `healing-brush`, `spot-healing`, `patch-region`, `blur`, `sharpen`, `smudge`, `dodge`, `burn`,
  `sponge`, `colour-replace`, `red-eye`, `liquify`, `eraser`); layers (`mask`, `mask-plus`,
  `mask-apply`, `merge-down`, `flatten`); `effects` and `looks`; `image-info`, `image-metadata`,
  `batch`; and views (`before-after`, `focus-mode`, `fit-screen`, `actual-size`, `transparency`).
  `image-size` and `before-after` mirror in right-to-left layouts.
- `FileKind` gains `layered-image` for layered image documents (PSD, PSB, XCF, KRA, ORA,
  Affinity Photo, Paint.NET), drawn by the new `file-layers` icon. These files showed the
  `image` kind before.

### Changed

- Dark Flat canvases use OKLCH lightness `0.18` across all palettes, retaining their neutral
  hue and chroma. Light Flat and Glass canvases keep their existing colours.

## 0.16.0

`ActivityFeed` gains a timeline variant for ticket and case histories, with a joining rail,
content under any event, ordering by date and inline times. The colour wheel, hue sliders and the
gradient picker's default now reach each hue's full sRGB strength, and the colour picker's area no
longer runs wider than the colours it can show; the [migration guide](docs/migration.md) lists
what to review.

### Added

- `ActivityFeed` draws a ticket or case history. `variant="timeline"` puts the markers in one
  column on the reading-start side, joined by a rail that stops a small gap short of each marker
  and ends at the first and last; events without a marker sit on it as a node, avatars and icons
  are sized to the column, and branches get a rail of their own. `ActivityItem.detail` draws a
  post's message or any component under the event's line, on an inset well, a card
  (`detailSurface`) or no surface. `order="newest"` or `"oldest"` sorts by `at`, stably, with
  branches kept under their parent; the default still keeps the given order.
  `timePlacement="inline"` puts the time after the sentence ("… to High · 2 min ago"). New types:
  `ActivityOrder`, `ActivityDetailSurface`. A [guide](docs/components/activity-feed.md) covers them.

### Changed

- `ColorWheel` reaches each hue's most saturated sRGB colour at its rim, from grey at the centre:
  pure red, yellow, green, cyan, blue and magenta now sit on the edge. Before, every hue stopped at
  the chroma the weakest could reach at one lightness, between 40% and 86% of its strength. The
  `ring` variant's hues and `colorWheelColor` follow; values are unchanged.
- `ColorPicker`'s hue slider and its thumb show each hue at full strength, as the HSV plane's did.
- `GradientPicker` starts from a strong blue to fuchsia (`#2563eb` to `#c026d3`) instead of a mid
  blue to a pale violet.

### Fixed

- `ActivityFeed` markers centre on the event's first line. They were centred on the whole row, so
  an event that wrapped had its marker beside the middle of its text.
- `ColorPicker`: for cyan, teal and yellow hues the area was up to a quarter wider than the colours
  it could show, because near-black colours inside the gamut test's rounding counted toward its
  width. The area now ends at the hue's most saturated colour, so the real colours fill it.

## 0.15.0

Requests from the packages built on Glass UX: `PaneLayout` can float its stacks over the primary
panel, `ColorWheel` is new, Slider takes an `origin` for two-way values, and the locale
formatters, focus-region traversal, pane-layout functions and a browser test provider are public.
Code reads left to right on right-to-left pages, and right-to-left Slider thumbs sit at their
value; the [migration guide](docs/migration.md) lists what to review.

### Added

- `glass-ux/pane-layout` exports `openPanel`, `panelsOf`, `stacksOf` and `stackOf`, for a host that
  holds the layout outside the panels.
- `PaneLayout` overlay placement: `placement: "overlay"` in a saved layout (set with `setPlacement`)
  keeps the primary panel's stack under the whole box and floats the other stacks over it in their
  tracks, with their tabs, separators, rails and moves. Switching remounts nothing. The `moving`
  prop and `usePaneLayout().setMoving` give floating stacks the material's `data-moving` state
  during a pan or zoom, and `--pane-covered-*` on the primary stack say how far they reach in. A
  layout without the field renders as before, and a phone keeps its collapsed view.
- `glass-ux/testing/file-provider`: `testFileProvider` with no test runner behind it, so an adapter
  that only works in a browser can run it there. `glass-ux/testing` keeps exporting it.
- Slider and both SliderFields take `origin`, for a two-way slider such as -100 to 100: the fill
  grows from that value toward the thumb on either side, in the reading direction, and there is
  none at the origin.
- `glass-ux/locale` exports `numberFormat` and `formatPercent`, the cached formatters the
  components use, so an application need not keep its own `Intl.NumberFormat` cache.
- `useFocusRegionNavigation` in `glass-ux/hooks`: the traversal behind `useFocusRegions`, with
  `next()` and `previous()` and no key bound, for an application that routes its own shortcuts.
  `useFocusRegions` is built on it and behaves as before.
- `glass-ux-docs-kit`: `SectionMeta.badge` and a `badge` prop on `FoundationDocumentation`, so a
  reference page can be badged "Tool" or "Filter" instead of "Foundation".
- `glass-ux/i18n/catalog`, the module a package built on Glass UX augments to add its namespace to
  `MessageCatalog`, so `defineMessagePack` and `MessageOverrides` type it. `declare module
  "glass-ux/i18n"` cannot merge, because that entry re-exports the interface.
- `glass-ux/color-wheel`: `ColorWheel`, a hue and an amount around a neutral centre for colour
  balance, grading wheels and tints, valued `{ hue, amount }` (the OKLCH hue in degrees, 0 at the
  centre to `max` at the rim). The disc is drawn in OKLCH at one lightness, so hues are evenly
  spaced; `colorWheelColor` gives the colour under the bead. One tab stop holds a Hue and an Amount
  slider: Left and Right turn the hue, Up and Down, Page Up/Down, Home (neutral) and End change the
  amount, and a double press returns to neutral. `disc` and `ring` variants, `sm` and `md` sizes and
  an optional readout.

### Fixed

- Slider: in right-to-left text under a `DirectionProvider`, a thumb sat one thumb's width away
  from the end of its fill (16px small, 20px medium), at the end of the track past its edge. The
  slider now centres its thumbs itself, so they sit at their value with a provider or with only
  the page's `dir`.
- Code reads left to right on a right-to-left page: `CodeBlock`'s code (its card still follows the
  page), `InlineCode`, `DiffView` (a host's own `dir` still wins), and the docs kit's API tables. The
  bidi algorithm moved a line's closing quote to its start, so `import { X } from "pkg"` was
  garbled on catalogue pages in RTL.
- `glass-ux-docs api`: `llms` works with no `links`. It crashed.
- `glass-ux-docs-kit`: the site frame from `init` compiles under `noUncheckedIndexedAccess` and in
  a project with no guides. A site's `guides` is typed even when empty.

## 0.14.0

Application structure, files and media: `PaneLayout`, `Menubar`, `KeymapProvider`, `StatusBar`,
`FileDialog` over a storage contract, video and audio players, `ImageCropper` and `CommentThread`,
with four new chart types, DataTable detail panels and tree rows, and a full image viewer. Tree,
Tabs, shortcuts and `WindowFrame.StatusBar` gain opt-in extensions; existing `useHotkeys`,
`parseShortcut` and `configureShortcuts` consumers keep what they had. Code colours reach 4.5:1 in
light mode, and the [migration guide](docs/migration.md) lists what to review.

### Added

- `glass-ux/pane-layout`: `PaneLayout`, panels in a JSON tree of splits and stacks. A panel moves
  between stacks and splits by drag or a Move to menu with one mount, keeping scroll, focus and
  input. Sizes use rem and `fr` together; `locked` gives a resize-only layout with no tabs, for mail
  and dashboards; a narrow box collapses to a strip and a non-modal sheet and leaves the JSON
  untouched. Saved layouts keep ids that no longer resolve. A hidden panel pauses by default;
  `whenHidden: "run"` keeps its effects running with no remount, for a remote session. The tree
  functions (`movePanel`, `closePanel`, `parsePaneLayout`, `pruneLayout`) run with no React or DOM.
- `glass-ux/menubar`: `Menubar`, an application's menus as data, on Base UI's Menubar. Commands,
  check and radio rows, groups, separators and submenus; chords and rebound keys shown through
  the keymap's read-only lookups, with no listener added; disabled reasons; a menu or submenu's
  rows loaded when it opens (`loadItems`), in reserved space, with failure and retry; a host-chosen
  focus destination after a command (`focusAfterCommand`); long menus that scroll with hairline
  edges; a thumbnail and detail line on a row; controlled or uncontrolled `openMenu`; and
  collapse into one menu by the width of its box. `useMenubarActions` builds rows from
  `defineActions`, and `MenubarSkeleton` holds the bar's place while it loads.
- `glass-ux/status-bar`: `StatusBar` with `Start`, `End`, `Item` and `Group`, interactive
  items, and a stated order for giving way in a narrow box (`giveWay`).
- `glass-ux/keymap`: `KeymapProvider`, a central dispatcher with chords, a serialisable keymap
  the host stores, conflict detection, scoped and declared commands, `ShortcutHelpDialog` and
  `ShortcutPending`. `useCommandBinding` and `useBindingLookup` read a command's keys, rebound
  or not, without registering anything.
- `glass-ux/file-provider`: `FileProvider`, a storage contract as types only, with no imports and no
  runtime code, compiling against the WebWorker lib as well as DOM. Ranged reads with an AbortSignal,
  a version on stat, `WriteBase` in and `WriteResult` out (a conflict is a result, and a blind
  overwrite is always explicit), optional `applyEdits`, paged listings, thumbnails and per-entry
  `denied`. Everything beyond `stat` and `read` is an optional method. It has no authentication.
- `glass-ux/file-provider/memory`: `memoryFiles`, a provider in memory for tests and demonstrations.
- `testFileProvider` in `glass-ux/testing`: a conformance suite for a provider's adapter.
- `glass-ux/file-dialog`: `FileDialog`, open and save over providers. Paged listing, a compact path, folders
  in a Tree, list and grid with thumbnails, multiple selection, a name and formats for Save with
  overwrite confirmation, `FileConflictDialog` for a conflict from the host, filters, and loading,
  empty, denied and error states in one box. It adapts to the provider's methods. The host reads and
  writes in `onOpen` and `onSave` with `{ signal, setProgress }`. `FileDialogPreview` draws it in the
  page.
- Media player: `glass-ux/media-player` adds `VideoPlayer`, `AudioPlayer` and a headless
  `useMediaPlayer`. Video has five view modes on one media element (`inline`, `maximised`,
  `windowed`, `fullscreen`, `pip`): nothing remounts, and the page keeps the player's box.
  Maximised and the mini player use the top layer through the Popover API; the mini player drags,
  resizes and snaps, and moves from the keyboard. Controls cover seeking with buffered ranges,
  chapters and storyboard previews, volume, speed, captions with sizes, quality, live streams,
  loop, playlists and Media Session, with shortcuts scoped to the focused player. `CastAdapter`,
  `useRemotePlayback` and `attach` connect sender SDKs, the Remote Playback API, AirPlay and stream
  engines; the library loads none of them. `useMediaViewMode` and `useCastSession` serve hosts with
  their own controls.
- `glass-ux/image-cropper`: `ImageCropper` (locked aspect or free, host presets), `ImageCropDialog`
  (pick, check, crop, save with `{ signal, setProgress }`), `ImageField`/`ImageInput` with
  `imageSchema` and an optional `onEdit`, and `cropToBlob`. `field.ImageField` is registered in
  `useAppForm`.
- `glass-ux/compare-slider`: `CompareSlider`, a before and after divider over any two pieces of
  content, as a keyboard-operable slider in percent, horizontal or vertical. The sides follow the
  reading direction.
- `glass-ux/gradient-picker`: `GradientPicker`, built on ColorPicker: linear, radial and angular
  gradients, stops by pointer and keyboard, a typed `GradientValue` and `gradientToCss`.
- `glass-ux/masonry`: `Masonry`, items of different heights in columns from the container's width.
  Positions are arithmetic from the width and each item's ratio, so nothing moves while pictures
  load and appending never moves earlier items; an item without a ratio is measured. The DOM order is the
  order of reading (each item goes to the shortest column), so Tab does not run down one column at a
  time as it does with CSS `columns`. Logical offsets for right to left. `layoutMasonry` is the same
  arithmetic as a pure function, for hosts that window a long list.
- `glass-ux/carousel`: `Carousel`, slides of any content in a scroll-snap strip, so swiping and snapping
  cost no script. Previous and Next (stopping at the ends with a reason, or `loop`), indicators as one
  tab stop, slides that are not shown `inert`, a height reserved by the tallest slide or `ratio`, and the
  slide count when the indicators do not fit. A change the person makes is announced politely and a change
  `autoplay` makes is not. `autoplay` shows a Pause button, holds on hover, focus and a hidden page, and
  never starts under reduced motion. Right to left reverses the strip and mirrors the chevrons.
- `glass-ux/rating`: `Rating`, a rating chosen from a row of icons or shown as one. A radio group
  (one tab stop; arrows move and choose, Home and End, Delete clears), whole or half steps, `max`,
  controlled or uncontrolled, `clearable`, a star or any icon, disabled, and a read-only display that
  is one named image filled to the exact value. Value text agrees its unit with the total and formats
  numbers in the locale; the fill and the arrows follow the reading direction; the hover preview
  changes colour only. `field.RatingField` is registered in `useAppForm`, with `ratingSchema`.
- `glass-ux/notification-list`: `NotificationList`, the rows behind the top bar's unread count, with
  no knowledge of what a notification is about. Day or host groups, unread in the accessible name,
  mark read, mark all read, dismiss, an action on each row, a filter (client or host), loading,
  empty and error states in one box, incremental loading with retry, and one tab stop. New rows wait
  behind a count and are announced politely. `NotificationPopover` places it for the shell, opened
  from an AccountButton menu or a Rail.Item; neither changes.
- `glass-ux/comment-thread`: `CommentThread`, comments and one level of replies with a
  `RichTextInput` composer and mentions, edit and delete, pending and failed sends with retry,
  resolved threads and an anchor label. `permissions` from the host decide which controls exist, and
  a string keeps one disabled with its reason. The Markdown renderer and the editor load on demand.
- `glass-ux/reaction-bar`: `ReactionBar`, reactions with counts, named for what they say, as one tab
  stop.
- `glass-ux/emoji-picker`: `EmojiPicker` and `EmojiPopover`, a searchable list in the system font, as
  one tab stop, with skin tones. Its data, 23.6 KB after gzip, loads on demand. Names and search are in
  English unless `loadNames` supplies the locale's.
- Typeahead (`glass-ux/typeahead`): a listbox at a caret or any rectangle, with focus staying in
  the text. `useTypeahead` holds the highlight, keys and ARIA attributes; `Typeahead` draws the
  list with an optional detail pane; rows from the host are shown as given, and results that
  arrive late do not move a row under the pointer (R9). Composer's slash and mention menus are
  built on it, with no change in behaviour.
- FindBar (`glass-ux/find-bar`): a find control that holds no search logic. The host supplies the
  count, the current match and whether the count is still climbing; options come through a slot,
  with an optional replace row, a reserved count, polite announcements and focus returned on Esc.
- DiffView (`glass-ux/diff-view`): a general unified diff with the sign in the gutter, from
  ResultDiff, which is now a thin wrapper. New token roles
  `--code-add-tint`, `--code-remove-tint`, `--code-add-text` and `--code-remove-text`.
- SliderField (`glass-ux/slider`): a slider with its label, track and current value on one row,
  controlled or uncontrolled. The value's width is reserved from the widest value the slider can
  show, so dragging never moves the track; below 22rem it wraps to label and value over the track.
  Its props type is `StandaloneSliderFieldProps`. The form kit's `SliderField` takes an opt-in
  `inline` prop for the same row and keeps its layout otherwise.
- `glass-ux/charts`: `ComboChart`, columns and lines over the same categories, on one value axis
  or two. It is `BarChart` with vertical columns: `BarSeries` gains `mark: "line"` and
  `axis: "secondary"`, and `BarChart` gains `secondaryAxis`, `valueLabel` and `onActivate`, so
  grouped and stacked columns, thresholds and tiers work as they do there. Each axis has a name
  with a key for its series, and a rule in the series' colour while it carries one; the second
  axis's labels sit on the first's gridlines; the legend and tooltip name each series' axis; and
  the table and CSV headers carry each series' axis and unit. The TSDoc says when not to use two
  axes. The value axes do not mirror in right-to-left text.
- `glass-ux/charts`: `FunnelChart`, stages drawn to scale with their share of the first stage and
  the rate of each step, centred or start-aligned (`align`). Hiding a stage takes it out of the
  rates; the table keeps every stage, with drop-off. Rows and `align="start"` follow the reading
  direction.
- `glass-ux/charts`: `RadarChart`, several measures on one scale as an outline per series. A null
  breaks the outline at its spoke. Pointing at a series in the legend brings it forward, and arrow
  keys move to the spoke in that direction. The ring does not mirror in right-to-left text.
- `glass-ux/charts`: `SankeyChart`, flows between nodes in columns, laid out in the library with no
  new dependency. Nodes can share a `group`, which sets their colour and legend entry; hiding one
  re-lays the rest. Arrow keys move through nodes and the flows between them, and `onActivate`
  reports either. A link that closes a loop stays in the table, and the chart says how many were
  left out. The flow runs with the reading direction.
- `glass-ux/charts`: `pointRect` for `spatialNav`, and `spatialNav` now lives in the chart core.
  `ValueAxis`, the type `ScatterAxis` is now an alias of. `ChartFrame` takes `footLegend`, for a
  legend in `foot`, and `ChartKind` adds `combo`, `funnel`, `radar` and `sankey`.
- Histogram: `bins` also takes precomputed `{ from, to, count }` bins. `values` is unchanged.
- `DataTable`: detail panels and tree rows, both opt-in. `renderRowDetail` shows host content under
  a row, rendered while open and measured, with `canExpandRow` and `rowDetailHeight`. `tree`
  (`getSubRows`, `hasChildren`, `getChildCount`, `hasMoreChildren`, `onLoadChildren`, `column`,
  `isContext`, `openMatches`) makes `rows` a hierarchy in a `treegrid`, with lazy children in
  reserved space, failure with Retry, and "Show more" for partly loaded children. Open rows are the
  new `expanded` state slice; `expandAll` controls an expand-all that opens loaded rows and fetches
  nothing. A selection change in a tree also reports `{ unloaded }` to `onStateChange`, and
  `filterTreeRows` filters local rows keeping the ancestors of a match. Works with virtualisation,
  cards, grouping, selection, inline editing and export (which adds a Level column); reordering
  is off, with the reason, while a row is open.
- Lightbox is now a full image viewer. Zoom and pan run on `usePanZoom`: wheel about the pointer,
  pinch, double press between fit and actual size, drag to pan, `maxZoom`, and the 1 key for actual
  size. New: view-only rotate and flip (R, Shift+R), full screen on the viewer (F), a slideshow
  (`slideshowInterval`), a skeleton, `placeholder`, `pending` and Retry per picture, neighbours
  loaded ahead, a details panel (`renderInfo`, `infoOpen`), `content` for an item that is not a
  picture, `tools` to choose the tool groups and `autoHideChrome`.
- `ImageViewer` in `glass-ux/lightbox`: the same viewer in the page, without the dialog.
- Tree: `selectionMode="multiple"` with `selectedIds`, `defaultSelectedIds`,
  `onSelectedIdsChange`, `selectionLimit` and `checkboxes`. A selection is a list of ids, so it
  never needs every node loaded; `details.unloaded` names branches whose children are not.
- Tree: `onRename` for renaming in place (F2, Enter, Escape) and `renamingId`.
- Tree: `onMove` for moves by drag, Alt with the arrow keys and `TreeMoveItems` in a menu, with
  `canMove`, and `moveTreeNodes` to apply one.
- Tree: `renderTrailing` for content at a row's end, and `ref` with `reveal`, `rename`, `move`
  and `canMove`. `reveal` opens, loads and pages to a row that is not loaded.
- Tabs: `TabItem.closable`, `unsaved`, `preview` and `contextMenu`; `Tabs.List` `onClose`,
  `onKeep`, `onTabMove`, `dragType`, `zoneId`, `panelId` and `ref` with `focusTab`. Close with
  the mark, a middle-click, Delete, the context menu or a Close button outside the tablist.
  Reorder with drag, Shift and the arrow keys, or the context menu. Strips under one
  DragDropProvider exchange tabs, and a DropZone can take one.
- `Menu`: `Menu.Item` takes `detail`, a second line that gives the row a fixed rich height and
  `icon` a thumbnail's box. `Menu.CheckboxItem` and `Menu.RadioItem` take `disabledReason` and
  report `aria-keyshortcuts`. `Menu.Submenu` takes `popupClassName`.
- Breadcrumb: `size="xs"`, a compact form for a path inside a pane (a file's folders in an editor
  pane). It sets one line at `--control-h-xs`, never under `--target-aa`, in label type, folds
  against its own box like the default, and is named "Path" unless the host passes `aria-label`.
  Without `size` the markup and geometry are unchanged. New type `BreadcrumbSize`; new message
  `breadcrumb.path` in every language pack.
- Toolbar: `orientation="vertical"` for tool rails (Up and Down Arrow move between controls, folding is
  by height, More opens at the inline end); single-choice groups, where `Toolbar.Group` with `value`,
  `defaultValue` or `onValueChange` is a `radiogroup` of radio buttons (`Toolbar.Button value`) with
  exactly one chosen; and `Toolbar.Flyout`, a tool button with related tools behind it, opened by a hold,
  the context-menu gesture or the arrow at the reading end (Arrow Down in a row), beside a vertical
  toolbar and mirrored in right-to-left layouts. Horizontal toolbars render as before. New message
  `toolbar.relatedTools` in every language pack. Menu popups take an `anchor`, so a control that is not
  the menu's trigger can position one.
- ColorPicker: `size="sm"`, a compact picker for tool panels (shorter plane, thinner tracks, smaller beads;
  hit areas stay 24px), and `plane="hsv"`, an optional saturation by value plane with its own HSV hue, beside
  the default OKLCH plane. The value stays hex. `plane` also reaches the picker inside ColorField. New
  messages `colorPicker.areaHsv` and `areaValueHsv` in every language pack (the Arabic wording needs a
  native-speaker check).
- RichTextInput: opt-in `mentions` and `slashCommands`, on Typeahead. Picks stay Markdown.
- ActivityFeed: a `tone` for the marker, one level of `children` and selection (`selectedId`,
  `defaultSelectedId`, `onSelectedIdChange`), which makes the feed a listbox with one tab stop. A
  feed that uses none of these renders exactly as before.
- Panel `compact` and Surface `padding="compact"`: the panel inset tightened for dense tool panes, from
  the new `--inset-panel-compact` token (12px comfortable, 8px under compact density, against 20px and
  16px for `--inset-panel`; it scales with the UI scale). A nested Panel keeps its own inset. Tailwind
  gets `p-panel-compact`.
- `RelativeTime` and `ScrollArea` take `tabIndex`, for lists with roving focus.
- Kbd and `formatShortcut` draw chords. `shortcutSteps`, `isChord`, `canonicalStep`,
  `canonicalShortcut` and `shortcutFromEvent` join the `glass-ux/kbd` helpers.
- Actions: `useActionShortcuts`, `shortcutTextEntry`, `shortcutScoped` and
  `ResolvedAction.commandId`. Menus and the palette show rebound keys.
- PaletteCommand `keymapId` and `shortcutDisplayOnly`; DragDropProvider `liveRegionHost`.
- Focus regions: `useFocusRegions` in `glass-ux/hooks` and an opt-in `focusRegions` on AppShell.
  F6 and Shift+F6 move between an application's regions, skipping hidden and inert ones, and
  leave the key to the browser while a modal dialog is open.
- `useAnnounce` (`glass-ux/hooks`): one shared, always-mounted polite live region (R20.9) for outcomes no component
  owns. It lives where the person is (inside the full-screen element or the topmost modal dialog, otherwise the
  body, which a modal dialog makes inert), speaks the same message twice, speaks messages from a burst together
  in order, and lets a `key` replace a waiting message. It renders nothing on the server. No component uses it
  yet.
- Hooks (`glass-ux/hooks`): `useClipboard` (copy with a timed `copied` state and an `error`, falling back to
  a hidden textarea where the page has no Clipboard API), `useDebouncedValue` and `useDebouncedCallback`
  (with `cancel`, `flush` and `pending`), and the helpers components already shared: `readingKey` and
  `isRtl`, `useScrollEdges`, `usePrinting`, `useSelectedId` with its change types, `tryFocus`, `focusFirst`,
  `isTextEntryTarget` and `isRichTextTarget`. CopyButton writes through the same clipboard function.
- `useUndoStack` in `glass-ux/hooks`: past, future, push, undo, redo, limit and optional coalescing,
  with the same transitions as pure functions (`pushUndo`, `undoState`, `redoState`).
- `usePanZoom` in `glass-ux/hooks`: drag, wheel, pinch and keys on one transform, with `onFrame` per
  frame and `onCommit` when a gesture ends, and the `cameraTransform` and `containCamera` helpers.
- `PopupLayer` and `usePopupLayer` in the popup container module: Menu and Tooltip open inside a
  surface in the top layer, as they already did inside a full-screen element.
- `glass-ux/appearance`: `exportAppearance` turns an appearance into a theme a project keeps: the
  value for `configureAppearance`, a typed `theme.ts` module and a small `theme.css` for pages
  without the appearance runtime. `importAppearance` restores a theme from that value, its JSON or
  the module's text. It validates every field against the runtime's lists and ranges, ignores
  unknown fields, refuses a bad value with one issue per field, and refuses a picture on another
  site unless `remotePictures` is set. Only numbers, hex-derived parameters and registered ids
  reach the CSS, and pictures never do. Both are plain functions that server code can call.
  `APPEARANCE_RANGES` and `appearanceColourVars` are exported for controls of your own.
- Shared code colours: the syntax roles are now `--code-keyword`, `--code-string`, `--code-string-expression`,
  `--code-constant`, `--code-function`, `--code-parameter`, `--code-punctuation`, `--code-comment` and
  `--code-link`, plus `--code-foreground` and `--code-background`, available on the page and re-declared on
  palette and mode islands, so anything showing code matches. New `--code-type` role for types. `.fa-ai-code`
  maps the Shiki theme's `--fa-code-*` names to them, so code blocks render the same colours as before in
  every palette and mode, and overriding a `--fa-code-token-*` on a code block still works.
- Icons: 131 hand-authored glyphs, taking the set from 372 to 503. New groups for text editing
  (`text`, `bold`, `align-start`, `list-ordered`, `indent`, `slash-command`, `replace`, `regex`,
  `case-sensitive`, `whole-word`, `fold`, `unfold`, `collapse-all`), transforms (`rotate-cw`,
  `rotate-ccw`, `flip-horizontal`, `crop`, `move`), commerce (`credit-card`, `cart`, `receipt`)
  and developer tools (`git-branch`, `git-pull-request`, `webhook`, `rocket`); more media
  controls (`volume`, `skip-forward`, `seek-back`, `captions`, `cast`, `screen-share`,
  `picture-in-picture`, `repeat`, `shuffle`, `playback-speed`), everyday glyphs (`save`, `heart`,
  `flag`, `reply`, `forward`, `timer`, `sliders`, `adjust`, `brush`, `split-horizontal`,
  `bell-off`, `link-off`, `wifi-off`, `cloud-download`) and arrows. Fifteen company marks join
  the set: `azure`, `deepseek`, `gemini`, `grafana`, `hubspot`, `jira`, `kubernetes`, `linear`,
  `mastercard`, `mistral`, `paypal`, `salesforce`, `sentry`, `visa` and `zendesk`.
- Icons: `align-start`, `align-end`, `reply`, `forward` and the diagonal arrows mirror in
  right-to-left layouts. Media glyphs keep their shape, as `play` does.
- `glass-ux-docs-kit`, a second archive on each release for packages built on `glass-ux`: the
  `glass-ux-docs` bin (`api`, `site`, `check`, `init`), `defineDocsKit`, the catalogue page shell
  and specimens in `glass-ux-docs-kit/react`, their styles, and a site frame copied once by
  `init`. Entries and the package name come from `package.json` `exports`. It installs from the
  release archive in the same version, with a peer on the same minor. The `glass-ux` archive does
  not carry it.

### Changed

- Lightbox: the thumbnail strip is one tab stop, the current picture, instead of one per thumbnail;
  the arrow keys change picture from it as before and focus follows, and Home and End go to the
  ends. Only thumbnails near the strip's view load. The zoom readout shows `1:1` at actual size,
  + and − also stop at actual size and `maxZoom` after `zoomSteps`, and the Fit button has a new
  glyph because full screen took the old one. A Previous or Next press keeps focus on its button.
- `ImageLightbox` and `ResultImages` load the viewer the first time an image is opened. A test
  that expects the dialog in the same tick as the click needs to wait for it.
- `AvatarDialog` and `EditableAvatar` are a preset of `ImageCropDialog`. Crop output, keys, wording
  and exports are unchanged. The crop's class names moved from `fa-avatar-crop*` to
  `fa-image-cropper*`.
- `cropImage` rejects with "The image could not be encoded." rather than "The photo could not be
  encoded." when a browser cannot encode.
- `WindowFrame.StatusBar` and its parts are built on StatusBar, with the same elements, classes
  and look. Its items also take `giveWay` and `onClick`. The inner `fa-window-status-label`
  class is now `fa-status-bar-label`.
- `formatShortcut` and `Kbd` show every step of a shortcut with a space, such as "g e", which
  used to read as one key. `useAriaShortcut` returns undefined for a chord, which
  `aria-keyshortcuts` cannot say.
- The palette no longer runs a chord as if it were its last step.
- Tabs: a strip renders on resize only when a different set of tabs fits, not for every width, so a
  strip in a pane being resized stays still (R18.5). What fits is unchanged.
- UI rule R6.4 now reads "One breadcrumb for the route, in the top bar": a path that describes
  content rather than the route may use a compact Breadcrumb in its pane, and never repeats or
  replaces the route breadcrumb.

### Fixed

- `glassUx()` from `glass-ux/vite` names every dependency a page can reach. The list had fallen
  behind (Base UI's direction provider, menubar and toolbar, Lexical, react-hook-form), so Vite met
  them on a lazy route, optimised again and reloaded the page: navigations aborted and pages loaded
  across the change could reach a second copy of React (`Invalid hook call`).
- `RichTextInput`: a controlled host that applies its state late no longer loses keystrokes. Each
  late value was taken for an outside change and replaced what had been typed since.
- `RichTextInput` mentions: Enter and Tab wait for the rows that answer what was typed, then pick
  the first. "@no" then Enter used to insert the row highlighted for "@" while the search was out.
- `Tree`: with `onMove`, the rows mount anew when drag support finishes loading. A row focused at
  that moment now keeps focus, so the keyboard is not left on the page. A click landing in the same
  moment still loses its selection, because its element has gone.
- `EmojiPicker`: Enter in the search picks from what was typed, not the list still catching up.
- `FileDialog`: a tap into a folder followed quickly by a tap on the row that replaced it no longer
  opens that file: a double press takes two presses on the same row.
- `DataTable`: a search or filter's result count is announced for the applied search, once a
  refetch has finished. A host that was refetching, or had not applied the search, had the old
  rows' count announced, and the real result was never said.
- `ReactionBar`: a read-only reaction's fill is opaque under Solid.
- Forced colours: `GradientPicker` keeps its preview and rail in their colours, and `StatusBar`'s
  interactive items and More button have a boundary.
- `AppShell`: the boot script renders only in server HTML. On the client React warned about it
  and never ran it.
- Code colours: every `--code-*` syntax role now reaches 4.5:1 in light mode in all 12 palettes on
  Glass, Frosted and Solid, on every built-in canvas (the worst was 2.66:1). Light mode sets the
  roles at a lower lightness, adjusted for hue and stepped by role, with a chroma floor and ceiling,
  so hues stay apart, including for red-green colour vision, and Graphite, Sand and Slate no longer
  collapse into one grey. Comments take the same ink as parameters and punctuation in light mode.
  `--code-add-text` and `--code-remove-text` are darker in light mode, so DiffView signs reach 4.5:1
  on Silk. Light Glass gives the code well a firmer fill, `--glass-fill-code`, because a 4.5% tint
  over the darker canvases cannot carry 4.5:1 by colour alone. Dark mode, print and forced colours
  are unchanged.
- CodeBlock: line numbers use `--fg-muted`, as DiffView's do; `--fg-disabled` measured about 2.6:1.
  They now reach at least 6.27:1 on the well in every palette and material, and 4.94:1 in light and
  5.59:1 in dark on the hardest canvas.
- DiffView and ResultDiff: the diff has its own well, firmer than the code well, and line numbers
  use `--fg-muted` instead of `--fg-disabled`. The numbers read at 2.00:1 on the add tint, and a
  panel alone left them at 4.37:1 in dark Glass, 3.49:1 bare on the canvas. Numbers, signs and text
  now hold at least 5.55:1 in all 12 palettes, both modes and Glass, Frosted and Solid, bare or in
  a panel and on the darkest canvases, measured in rendered pixels.
- `Menu.Submenu`: a hover-opened submenu no longer closes while the pointer is on its way to it. A
  stall of more than 40ms, or a slow move, in the gap beside the row closed it, on a busy page in
  particular, while the root menu stayed open. It now outlasts the pointer by 300ms; moving to a
  sibling row closes it after the same delay.
- `Segmented` and `SwatchPicker` fold to their menu in right-to-left text when they run out of
  room, instead of clipping: `overflowsOwnBox` (`glass-ux/fit-form`) now reads the edge the row
  spills past.
- Charts: path marks carry the `d` attribute as well as the CSS property, which Safari does not have.
  Marks in 15 chart types, among them line, bar, pie and treemap, drew nothing in WebKit, where the
  bug was found.
- `ContextSwitcher`: focus returns to the trigger on close where WebKit blurs a closing popup.
- `overflowsOwnBox` (`glass-ux/fit-form`): the tolerance is 2px rather than 1px, for three rounded
  measurements. WebKit could read a row that fits as spilling and leave it on its menu form.
- `BarChart`: the last column's label no longer overruns the plot when a narrow box skips labels.
- `DataTable`: Copy as table works on non-secure pages through the shared clipboard helper, and
  reports a refused copy as before.
- `DataTable`: ← and → on a row with "+N" fields, and the open group chevron, follow the reading
  direction in right-to-left tables.
- ColorPicker: its controls no longer overflow a narrow box at a large UI scale.
- ColorPicker: the hue and opacity beads no longer hang past the picker's edge at the ends of their tracks
  (they sat half a bead outside, which widened a scroll area around the picker), and a picker in a narrow box
  squeezes its hex row instead of growing wider than the box.
- ColorField and ColorPicker: the hex input and the swatch tooltips read left to right in right-to-left
  layouts, so `#e8875a` no longer shows as `e8875a#`.
- Histogram: dense bins (a column under 4px wide) no longer lose their width to the gap.

### Documentation

- Documentation: Foundations › Theme export, an appearance panel beside the generated files, with
  download and a restore form.
- Documentation: a Templates group with five complete screens to copy (overview dashboard,
  settings page, list and detail, inbox, file manager), each with a live screen, its source using
  public entries only, and a full-screen route inside a working application shell. They are
  documentation, not package components.

## 0.13.1

Two Sidebar fixes, and the documentation site's directory moved onto the Sidebar.

### Fixed

- Sidebar: the docked sidebar's landmark (`nav`, or `aside` with `as="aside"`) is now its
  outer element, so the resize rail beside the pane is inside it. Before, a resizable
  sidebar placed outside `<main>` left its rail outside every landmark (axe `region`). The
  phone sheet is unchanged. Queries by role and name find the same landmark.
- Sidebar: nested sidebars that share a shortcut no longer all toggle together. The innermost
  one whose provider holds focus takes it; with focus in none of them, the outermost does.

### Documentation

- The documentation site's directory is a Sidebar: ⌘B / Ctrl B or the header button
  collapses it, the rail resizes it (remembered), and on phones it is the Sidebar's sheet.

## 0.13.0

A standalone Sidebar that AppShell's section drawer is now built on, Sheet snap points and
nesting, and brand icons redrawn against current logos.

### Added

- `glass-ux/sidebar`: a standalone `Sidebar` for any application layout. `SidebarProvider`
  holds its state; `Sidebar` takes `side` (start or end), `variant` (`sidebar`, `floating`,
  `inset`), `collapsible` (`offcanvas`, `icon`, `none`) and `resizable` with width limits.
  - Parts: `Header`, `Search` ("/" and ⌘F/Ctrl F, arrow keys walk the results), `Content`
    (scroll edges; `fill` for a tree), `Group` with collapse that persists, `GroupLabel`,
    `GroupAction`, `Menu`, `MenuItem`, `MenuButton` (`active`, `detail`, `count`, `face`,
    `tooltip`), `MenuAction`, `MenuBadge`, `MenuSub`, `MenuSubButton`, `Match`,
    `MenuSkeleton`, `Separator`, `Footer` and `Rail`; `SidebarInset`, `SidebarTrigger` and
    `useSidebar`.
  - ⌘B / Ctrl B toggles it (not while typing in rich text). In icon mode labels become
    tooltips, counts move to the icon's corner and sub-menus open as flyouts.
  - `storageKey` keeps the open state, width and groups, applied before the first paint
    (`sidebarBootScript` for server-rendered pages and CSP hashes). Phones get a sheet.
  - The phone sheet and the icon flyouts load only when needed. Messages in every language
    pack.
- Sheet snap points for bottom sheets: `snapPoints`, `snapPoint`, `defaultSnapPoint`,
  `onSnapPointChange`, `snapPointLabels` and `snapToSequentialPoints`. Drag between heights,
  or use the grab handle as a slider (arrow keys, Home, End). `modal={false}` leaves the page
  usable with no scrim. A sheet opened from a sheet stacks, with the one behind receding.
  `Sheet.Popup` takes `initialFocus` and `finalFocus`.
- Icon `asus-rog` (`IconAsusRog`), the ASUS Republic of Gamers eye, filed under Device
  manufacturers and found by "ROG" and "Republic of Gamers".

### Changed

- AppShell's section drawer is built on `Sidebar`. Props, exports, the stored preferences and
  the look are unchanged. Groups now have `role="group"` and keep collapsed rows in the page
  (hidden). The drawer handle also takes Shift with the arrow keys, Home and End. ⌘B / Ctrl B
  no longer toggles the drawer while typing in rich text, and "/" follows
  `configureShortcuts`.
- Brand icons redrawn after a check against each brand's current logo. Brands with a symbol
  now show it: Poly's p, Grandstream's fin, MikroTik's cube, Palo Alto's bars, Vertiv's disc,
  WatchGuard's ring, Mitel's knot, Jabra's hand, Ruckus's dog, the new Xerox and ASUS marks,
  and truer Huawei, Philips, Yamaha, Zebra, Lexmark, Kyocera, Crestron and Alcatel-Lucent
  symbols. HPE and Intel follow their 2025 and 2023 logos, and Logitech its corporate rather
  than gaming identity. Wordmark-only brands use their wordmark's own initial (Canon's C,
  Sony's slab-serif S) instead of a generic letter, so brands that share an initial can be told
  apart. Threads, Discord, Meta, Notion and GitLab are redrawn; Dropbox, Snapchat, Microsoft
  and Reddit are corrected. Icon names are unchanged.

## 0.12.1

On-screen keyboards for kiosks, TVs and touch screens, and a fix for a standalone chart table.

### Added

- `glass-ux/on-screen-keyboard`: `OnScreenKeyboard` for kiosks, TVs and touch screens where the
  native keyboard is missing or unsuitable. It edits its own value or drives an input, textarea
  or contenteditable without taking its focus, so React-controlled inputs update as if typed.
  - Layouts: an alphabet grid for search screens; QWERTY, QWERTZ, AZERTY, Spanish, Portuguese,
    Italian, Nordic, Russian, Greek, Arabic and Hebrew (physical positions in right-to-left
    pages); kana with voiced marks and small kana; Hangul, which joins jamo into syllables; and
    number, decimal, PIN, phone, email and URL pads. `layoutForLocale` and `alphabetLayout`
    choose by locale, and `defineKeyboardLayout` adds an application's own.
  - Typing: Shift, Caps Lock and symbol layers swap in place; press-and-hold (or a held Enter)
    offers accented alternates; Backspace removes a whole grapheme; Enter takes the target's
    `enterKeyHint` (Search, Go, Done, Next, Send).
  - Navigation: arrow keys move between keys by position, for remotes and D-pads, and
    `onNavigateOut` hands focus to the rest of the screen at an edge.
  - Sizes `sm`, `md` and `lg` (ten-foot screens), `keys` and `grid` variants.
  - Containers: `KeyboardDrawer` docks non-modally at the bottom and sets
    `--keyboard-inset-height`; `KeyboardPopover` floats beside its input.
    `OnScreenKeyboardProvider`, `KeyboardTarget`, `useOnScreenKeyboard` and `KeyboardToggle`
    link the library's inputs (or any input) without changing them, open on focus or on
    demand, choose a pad from `inputmode` or `type`, and keep the native keyboard closed on
    touch screens (`inputmode="none"`, restored afterwards).
  - Messages in every language pack. Icons `backspace`, `shift`, `caps-lock`, `return` and
    `keyboard-hide`.

### Fixed

- A visible `ChartTable` outside a chart stays in its own container: it scrolls within its
  parent's height instead of filling the nearest positioned ancestor, where it covered the
  page title. Inside a chart it still replaces the plot in the plot's box.

## 0.12.0

Stylesheets for only the components an application uses, smaller bundles, text that follows
each locale's rules, and accessibility fixes from an audit of every component family.

### Added

- Kanban Move menu: every card has a button (on hover and focus, always on touch screens) that
  moves it to another column or up and down in its column, as an alternative to dragging
  (WCAG 2.5.7). It takes the path a drop takes (`onCardsChange`, `onCardMove` with `input:
  "menu"`, a rejected save puts the card back) and the new place is announced. `moveMenu={false}`
  removes it.
- `configureShortcuts({ characterKeys: false })` in `glass-ux/kbd` switches off single-character
  shortcuts for the application (the rail's "g e" sequences, palette commands and `useHotkeys`
  shortcuts on the document without Ctrl, Alt or Command), and their key hints, as WCAG 2.1.4
  asks. `useCharacterShortcuts`, `isCharacterShortcut` and `shortcutAllowed` read it. On by default.
- DataTable announces the result count, or the empty state, 500 ms after a person's last search
  or filter change, once the rows have settled. Lightbox announces "Image 3 of 8: alt" when the
  picture changes.

- Load only the styles an application uses: `glass-ux styles --scan src --out src/glass-ux.css`
  writes the foundation, the stylesheets of the components the sources import (with the ones
  they rely on) and the adaptations, in the full stylesheet's order. `--check` fails when the
  file is stale. The build ships `dist/styles/manifest.json`, `styles/foundation.css` and
  `styles/adaptations.css`; `glass-ux/styles.css` is unchanged.
- `loadMessagePack(locale, loaders)` in `glass-ux/i18n` registers the one language pack a
  locale needs from dynamic imports, so a language switcher need not bundle every pack.
- `zh-CN`, `zh-SG` and a bare `zh` use the `zh-Hans` pack, and a bare `pt` uses `pt-BR`.

### Changed

- Smaller bundles: module-level `Object.assign`, `memo`, `createContext` and `lazy` wrappers are
  marked pure, so an unused part no longer pulls its component in (`EntityIdentitySkeleton`
  alone: 69 KB → 2.6 KB gzip; `UserMessage`: 225 KB → 70 KB; `Select`: 58 KB → 49 KB).
  `pnpm pure:check` guards it.
- Formatters are cached: plural rules, relative-time and list formats are no longer built per
  call, `TimeZoneSelect` no longer builds two formatters per zone on every mount, and Calendar
  no longer builds four per render. Toolbar and window actions measure when their items or
  sizes change rather than after every render; the rich-text toolbar no longer re-renders on
  every keystroke; tool-activity and approval timers stop ticking when their text cannot change.
- Percentages, link speeds, list separators and `+N` counts follow the locale ("50 %" in
  German, "،" in Arabic); English output is unchanged. The scheduler's weekend and the
  calendar's first day follow the locale's week (Friday and Saturday in Saudi Arabia).
- Search in DataTable, chip overflow, combobox and the command palette ignores accents
  ("Muller" finds "Müller") and lower-cases by locale.

### Fixed

- Kanban cards are list items again: the drag handle is a named group inside each item, so the
  lane keeps its list and the buttons a card renders no longer sit inside a button. A column's
  count is read from text, not from an `aria-label` on a span.
- Lightbox: ← → scroll a zoomed picture that overflows while the stage has focus, instead of
  changing picture.
- DataTable's reorder announcements are polite, as DragDrop's are.
- Charts: a readout opened by the pointer closes with Escape wherever focus is.
- Chip remove buttons keep a 24 x 24 CSS px hit area for every pointer (WCAG 2.5.8) without
  changing their size.
- Arrow keys follow the reading direction in Cascader, TreeSelect and the scheduler's event
  and time grids; Pagination's first and last icons mirror in right-to-left text; skeleton
  shimmer sweeps with the reading direction.
- Checkbox, Radio and Switch keep a caller's `aria-describedby` alongside their description;
  LevelGauge's note is read by screen readers.
- Live regions no longer re-announce ticking timers: the assistant status strip announces the
  connection state, and tool activity and ask records keep their elapsed and relative times
  out of the announcement.
- The byte-size field reads numbers written in the locale's own digits (Arabic-Indic in
  `ar-EG`).
- Scheduler, address field and filter summaries pass application text to messages as written
  (see the migration guide), so a language can phrase and capitalise it its own way; map
  cluster counts are written with the locale's digits.

## 0.11.7

An editable avatar, a relationship canvas, a level gauge, and fixes requested by a consuming
application.

### Added

- `EditableAvatar` and `AvatarDialog` in `glass-ux/avatar`: people change their photo from an
  edit button on the avatar, or by dropping a photo on it. The dialog takes a dropped, browsed
  or pasted photo, checks it against `requirements` (types, bytes, minimum dimensions and the
  application's own `validate`), and positions it in a round crop by drag, pinch, wheel, keys
  or the zoom slider. `onSave` receives the cropped image, the original and the crop, with an
  abort signal and a progress reporter; a failed save keeps the dialog open with its reason.
  `onRemove` adds Remove photo. The avatar shows the result at once. `checkAvatarFile`,
  `readImageSize`, `cropImage` and `describeAvatarRequirements` work without React. Messages
  in every language pack.
- Avatar size `2xl` (96px) for profile pages.
- `glass-ux/relationship-canvas`: `RelationshipCanvas`, record cards joined row to row on a
  pannable, zoomable dot grid, for schemas, class diagrams, API resource maps and workflows.
  Edges run between rows on different cards or the same card, in cycles and in parallel. Cards
  move by dragging their header or with Shift and the arrow keys, and Auto layout arranges
  them; positions are reported through `onPositionsChange`. Selection draws a card's edges in
  the accent. Messages in every language pack.
- `glass-ux/level-gauge`: `LevelGauge`, a small ordered scale such as Low, Moderate and High.
  Segments fill to the level in its status tone, and an earlier level stays in view: traced
  when the level came down, striped when it rose. `sm` for table cells and footers, `md` with
  the scale's names for forms; `onPress` makes it a button. Messages in every language pack.
- Stepper `sections` and `scrollContainer`: section navigation for one long scrolling form. The
  Stepper follows the section in view and scrolls to a chosen one, smoothly unless motion is
  reduced.
- Segmented `readOnly`: a recorded answer at full contrast, as a read-only radio group with one
  tab stop; pointer and keys change nothing, in every form.
- Workspace `reservePrimary` and `tileOrder`: tiled windows can fill the stage on a page that is
  all windows, with the primary view as the fallback, and keep a preferred order.
  `assignTiles` takes the matching `reservePrimary` argument, and `orderTiles` is exported.
- TopologyCanvas draws the same dot grid behind the map, panning and scaling with the camera
  (`grid={false}` turns it off). The grid is the shared `fa-dot-grid` recipe.

### Changed

- Stepper: the step at `value` is the current step whatever its `status`. It always has
  `aria-current="step"` and the current highlight, and a step with `status: "complete"` there
  shows its check with the highlight. `status` now sets only the marker. Without statuses,
  nothing changes.

## 0.11.6

A signature pad.

### Added

- `glass-ux/signature-pad`: `SignaturePad` and the bound `SignatureField` (registered in
  `useAppForm`), with `signatureSchema`. People sign with a mouse, pen or finger; strokes
  respond to speed and pen pressure and are stored as points, so the value redraws at any size.
  Type instead takes a typed name. Undo and Clear sit in the pad's toolbar; Delete and Ctrl or
  Command with Z work with the pad focused. `signatureToSvg` and `signatureToPng` export the
  value in black on a transparent background. Messages in every language pack.

### Fixed

- VerticalTabs: the deprecated `"chips"` and `"select"` layout values no longer raise a TypeDoc
  warning.

## 0.11.5

Vertical tabs become horizontal tabs in narrow containers.

### Changed

- `VerticalTabs`, `VerticalTabNav` and `RouteVerticalTabs` show the `Tabs` strip (underline,
  More menu) above the content below 36rem of container width, in place of the chip strip
  and, past six sections, the picker. Sections that do not fit move into More; the current
  section always stays in the strip, and section markers and counts show in both. This
  affects settings dialogs on phones and in small windows.
- `layout` takes `"tabs"`; `"chips"` and `"select"` are deprecated and render `"tabs"`.
  `VERTICAL_TABS_MAX_CHIPS` is deprecated and no longer used.
- Rule R6.8: a section rail becomes the horizontal tab strip below its container threshold.

## 0.11.4

No changes to the package.

### Fixed

- The documentation toolbar's fit tests follow its current controls (Blur, and the Flat /
  Glass switch beside it), so the suite passes again.

## 0.11.3

Focus rings no longer cut off by the containers around them, and more security icons.

### Added

- `--focus-reach` (how far a focus ring or halo paints outside a control) and the
  `fa-focus-room` class, which moves a clipping container's edge out by that much without
  moving its content. Rule R11.10 and the layout contract describe their use in applications.
- Icons: `camera-grid-1`, `camera-grid-4` and `camera-grid-9` (camera layouts), `user-check`,
  `user-x`, `shield-check` and `shield-x`.

### Fixed

- Focus rings and the text-entry halo were clipped by the container around them: the settings
  dialog's pane (`EntitySettingsDialog` and settings dialogs), disclosures, truncated titles
  holding links (entity identity, result rows, assistant cards, field labels, the drill path,
  map credits), the JSON tree, Kanban columns and the map's list view. These now leave the
  ring its room.
- DataTable cards, Scheduler events, JSON tree rows, a scrolling panel body and DataTable
  column grips draw their focus ring inside, as rows do.

## 0.11.2

Scheduler and DragDrop fixes from timeline adoption.

### Fixed

- `Draggable` passes `liftKeys` through to `useDraggable`; the option was ignored on the
  component.
- Sticky timeline rows scroll with the others in the narrow layout, or when pinned they would
  take more than 40% of the timeline's height, so they no longer cover the rows beneath.
- Pointer events from portals opened inside an event, such as a menu's items, no longer start
  day or time selection in the timeline, week or month.
- `Scheduler` `actions` shrink and wrap within the header instead of running past its edge in
  a narrow container.

## 0.11.1

Cancel in entity settings can ask before discarding.

### Added

- `EntitySettingsDialog` `confirmOnCancel`: Cancel asks before discarding unsaved changes, as
  Escape, the backdrop and the close button do, instead of reverting at once. The default is
  unchanged.

## 0.11.0

A resource timeline in the Scheduler, and icons for security and access.

### Added

- `Scheduler` `layout="timeline"`: day, week and month as a row per resource and a column per
  day, with events as bars packed into lanes. Sticky rows (`resource.sticky`) for unassigned or
  team-wide work; `renderResource`, `resourceHeader` and `renderEvent` (your buttons in a card
  keep their own behaviour); `continuous` months that scroll across month edges and keep their
  place; virtualised rows and columns. Events move between days and rows and resize from either
  end, by pointer, touch and keyboard (up and down change the row). Rows are DragDrop zones:
  `dropAccept` and `onDrop` take your own items, timeline events are items of type
  `SCHEDULER_EVENT_TYPE`, and `validateDrop(drag, resource, target)` refuses with a reason using
  the proposed day, interval and overlapping `blocks`. A narrow container shows one day.
- `Scheduler` `blocks` (availability shading in the timeline), `eventEffect` (drag to copy),
  `resizable`, `hiddenDays`, `onRangeChange` and `actions`. `editable` may return a string to
  lock an event with a reason. `onSlotSelect` receives `{ element }` to anchor a popover to, and
  timeline slots carry `resourceId`; changes carry `resourceId`, `edge` and `effect`.
- DragDrop `liftKeys`, for handles whose Enter key opens something.
- Icons: `camera-dome`, `camera-turret`, `camera-ptz`, `doorbell`, `nvr`, `siren`, `door`,
  `door-open`, `gate`, `barrier`, `access-reader`, `access-card`, `nfc`, `keypad`, `qr-code`,
  `face-scan`, `intercom`, `voicemail`, `vehicle` and `licence-plate`, under Security and access
  in the icon gallery.

## 0.10.1

Longer lines for long-form Markdown, and guide prose at a reading measure.

### Changed

- `Markdown` prose in wide containers reads at 15px on a 26px line (was 24px).
- Documentation guides keep paragraphs, lists and quotes at the 72ch measure; code and
  tables still use the full column.

### Fixed

- On phones the documentation's Flat / Glass choice is in the Appearance sheet. In the
  header it took a second row and pushed the page down.

## 0.10.0

A Flat visual style, and a roomier DataTable selection bar.

### Added

- `Appearance.style` (`"glass" | "flat"`, default `"glass"`) and `VISUAL_STYLES`. Flat uses
  opaque, undecorated surfaces with smaller corners, a plain canvas and still motion.
  Palettes, modes, density, UI scale, radius scale and line weight still apply, and the
  stored material, background and motion choices return with `style: "glass"`. Set it with
  `configureAppearance({ defaults: { style: "flat" } })` or `useAppearance().update({ style })`.
  The documentation header has a Flat / Glass switch.

### Fixed

- The `DataTable` selection bar was exactly as tall as its buttons, so they touched its
  edges. They now sit inset within it, with matching corners.

## 0.9.14

DataTable column headers are named by their label again.

### Fixed

- `DataTable` column headers took their accessible name from everything inside them, so a
  "Person" header read "Reorder Person column Person Person column options 240". Each header
  is now named by its label; the reorder grip, options button and resize separator keep
  their own names.

## 0.9.13

Accessible names for every option in a radio or checkbox group inside a Field, and Clear
buttons that required pickers can leave out.

### Fixed

- `RadioGroupField`, and any `Radio`, `RadioCard` or labelled `Checkbox` inside a `Field`,
  gave every option the Field's id, so only the first option had an accessible name. Each
  option is now its own Field item with its own id and name.

### Changed

- `Combobox` and `ComboboxField` take `clearable`. It defaults to on unless `required`, so a
  required choice no longer offers a button that empties it. `Autocomplete` takes
  `clearable` too (default on).

## 0.9.12

The interface in eleven more languages and right to left; Next.js App Router support; new
components for colour, appearance, multi-step tasks, scheduling, boards, hierarchies and
guided tours; DataTable editing, export and column order; chart zoom, brush and reference
lines; print and Windows High Contrast; ten canvas backgrounds, six palettes and custom
colours. No code changes are required; the [migration guide](docs/migration.md) lists what
to review.

### Added

**Languages and direction**

- `glass-ux/i18n`: every built-in word is a translatable message. Components declare
  English messages per namespace; `registerMessagePack` serves a language by locale,
  `configureMessages` and `MessagesProvider` change wording, and a component's `labels`
  prop still wins. Packs for German, French, Spanish, Italian, Portuguese (Brazil), Dutch,
  Japanese, Chinese (Simplified), Korean, Arabic and Hebrew at `glass-ux/i18n/<tag>`.
- Right to left: library CSS uses logical properties (enforced by `logical:check`),
  directional icons mirror, and keyboard and pointer handling follow the reading
  direction. `DirectionProvider`, `useDirection` and `localeDirection` in `glass-ux/locale`;
  Sheet sides `start` and `end`.
- The docs site has an interface language menu.

**Platform**

- Next.js App Router: modules that need the client carry `"use client"`; server components
  can import components, icons, `appearanceBootScript` and formatting helpers. A packed
  App Router build is tested (`pnpm test:next`).
- `glass-ux/hooks`: `useControllable`, `useElementSize`, `useMediaQuery` and `useHotkeys`.
- `VisuallyHidden`, `Portal`, `Spinner` and `VirtualList`.
- `glass-ux/form-rhf`: react-hook-form for every field (`RhfField`, `RhfForm`,
  `useRhfField`) with the library's schemas and error display.
- `glass-ux/testing` and `glass-ux/testing/playwright`: `renderWithGlass`,
  `installGlassTestEnvironment`, and helpers for selects, comboboxes, menus, dates,
  switches, tables and toasts.

**Components**

- `ColorPicker` and `ColorField`: any colour in OKLCH, with the sRGB gamut's edge drawn,
  hue and opacity sliders, a hex field, named presets and the browser's eyedropper.
- `AppearanceSettings`: every appearance preference as setting rows, with background tiles
  that preview each background and a picture upload; locked settings show as set by the
  organisation, or are hidden.
- `Stepper` and `Wizard`: progress through a multi-step task, and a wizard that checks each
  step (sync or async) before moving on, with optional steps.
- `Scheduler`: month, week, day and agenda views, events side by side, slot selection,
  rescheduling by drag or keyboard with rollback, time zones and a narrow form.
- `Kanban`: a board with work-in-progress limits that refuse with a reason, moves that fly
  back when a save fails, collapsible columns and a one-column narrow form.
- `TreeSelect`, `Cascader` and `TransferList`: choose from hierarchies (check strategies,
  search, lazy branches, path search) and assign items between two searchable lists.
- `Tour`: a guided tour with a spotlight, an anchored step card and remembered completion.
- `Toolbar`: one tab stop with arrow keys; items fold into More by priority.
- `HoverCard`, `Lightbox` (swipe, zoom and pan, thumbnails), `Link`, `Text`, `Heading`,
  `Stack` and `Grid`.
- Icons: `eyedropper`, `palette`, `chevrons-left` and `chevrons-right`.

**DataTable**

- Inline cell editing: typed editors, validation, optimistic saves that restore on
  failure, Enter/F2/Tab/Escape, and no change to row height.
- Export: CSV and TSV of the visible columns (selected rows when any), clipboard copy,
  and `onExport` for server-side exports.
- Column order by drag or keyboard, kept per person with widths and pins.
- Printing renders every loaded row.

**Charts**

- Threshold lines, bands and event markers on line, area, column, scatter and sparkline
  charts, in the accessible description and the data table.
- X zoom on line and area charts (drag, Ctrl or ⌘ with the wheel, pinch, keys) with Reset
  zoom, an overview brush, and `ChartBrush` to drive several charts from one range.

**Print and high contrast**

- Pages print cleanly: materials become white with a hairline, chrome and toasts are left
  out, panels and scrollers grow to their content.
- Windows High Contrast: every control keeps a boundary and a visible focus ring, and
  selected states use system highlight colours.

**Appearance**

- Backgrounds: Currents and Waves, Pixels, Circuit and Network, and Skyline, Harbour,
  Forest, Hills and Garden. Their artwork is painted in each palette's roles, so it follows
  palette and mode, including baked frost.
- Palettes: Lagoon, Indigo, Rose, Moss, Sand and Slate.
- Custom colours: `accentColor`, `accentColor2` and `canvasTint`, adjusted for AA.
- Picture backgrounds: `background: "image"` with `backgroundImage`;
  `prepareBackgroundImage(file)` downsizes uploads. `defineBackground` registers an
  application-owned background.

### Changed

- Light mode: a deeper canvas, stronger colour fields, clearer panel glass with a firmer
  edge and shadow, and darker secondary text and hairlines.
- Relative times and long durations are formatted by `Intl` in the component's locale.
- Chart `Threshold.tone` is optional (neutral by default) and gains `info` and `dashed`.
- `.canvas-silk` is the artwork layer for every background with artwork.
- Development warnings check `process.env.NODE_ENV` instead of `import.meta.env.DEV`, so
  they work under every bundler.

## 0.9.11

File type icons and a `FileIcon` that picks one, an `Image` frame with loading, empty and
failed states, and icons for cut (scissors) and a desktop computer. No code changes are
required; the [migration guide](docs/migration.md) lists what to review.

### Added

- File type icons: 24 new icons built on the `file` page, one emblem each (`IconFileDocument`,
  `IconFilePdf`, `IconFileSpreadsheet`, `IconFilePresentation`, `IconFileEbook`,
  `IconFileImage`, `IconFileVector`, `IconFileAudio`, `IconFileVideo`, `IconFileFont`,
  `IconFileModel`, `IconFileCode`, `IconFileScript`, `IconFileData`, `IconFileDatabase`,
  `IconFileArchive`, `IconFileExecutable`, `IconFileDiskImage`, `IconFileEmail`,
  `IconFileCalendar`, `IconFileContact`, `IconFileKey`, `IconFileLock`, `IconFileLink`).
  They are filed under **File types** in the icon gallery.
- `FileIcon` (`glass-ux/file-icon`) draws the icon for a file from its `name`, `mime` or a
  known `kind`. `fileKind({ name, mime })` returns the kind: a specific MIME type wins, then
  the extension, then the MIME family; generic types such as `application/octet-stream` and
  `text/plain` defer to the extension. The kind is on `data-file-kind` for application CSS.
  `FILE_KIND_ICONS` maps each kind to its icon component.
- `Image` (`glass-ux/image`): a picture in a frame of fixed ratio (`square`, `landscape`,
  `wide`, `portrait` or any ratio), so nothing moves when it loads. It has the media corner
  radius and a hairline rim (`frame={false}` drops it). A shimmer, or the picture's
  dominant `color`, fills the frame while it loads, and the picture fades in. A missing
  `src` or a failed load shows a fallback in the icon language with the alt text when the
  frame is at least 12rem wide; `fallback` replaces it and `onStateChange` reports it.
  `fit`, `position` and `maxHeight` place the picture. Inside a link or button,
  `hover="zoom"` scales the picture within its frame and `hover="sheen"` sweeps a glass
  highlight across it; Still and reduced motion turn both off. No shadow or reflection:
  an image sits on its surface (R4.5). `alt` is required (`""` for decoration).
- `IconImageOff`: the image glyph with the off slash, for a picture that could not load.
- `IconCut`: scissors, for Cut beside `IconCopy` in edit menus.
- `IconDesktop`: a desktop computer (a monitor beside a tower case), for the hardware class
  beside `IconLaptop` and `IconServer`. `IconEndpoint` stays the managed device.

### Changed

- `FileGlyph` and `fileIcon` (AI results and composer attachments) use `FileIcon`, so files
  show their full kind: a PDF, spreadsheet or archive no longer falls back to the plain page,
  and JSON, YAML and XML show the data icon instead of the code icon.

## 0.9.10

Explorer-style building blocks for large hierarchies, window actions that give way in narrow
windows, opt-in gap bridges for line charts, and range slider fixes. No code changes are
required; the [migration guide](docs/migration.md) lists what to adopt and review.

### Added

- `SplitPane` (`glass-ux/split-pane`): two panes and a divider, side by side or one above the
  other. Drag the divider, or focus it (a separator) and use the arrow keys, Shift for bigger
  steps, Home and End for the limits, Enter to hide or show the pane that gives way;
  double-click restores the default size. `startMin`, `startMax`, `endMin` and `endMax` keep
  each pane in bounds (px, rem or %). Inside a window body the size is remembered per window
  kind (`storageKey` elsewhere). Below `collapseBelow` the pane that gives way hides behind a
  button in a slim rail, which shows it over the other pane.
- `LineChart` and `AreaChart` take `gaps="bridge"`: where samples are missing, a muted dashed
  line joins the last reading before the gap to the first after it, so a hole reads as "no
  samples here" rather than a lone dot. The bridge is straight, decorative and never a value:
  the crosshair, tooltip, readout, legend and data table still show none at a gap. Each one
  has the title "No samples available · visual bridge only", and the chart's accessible
  description says what the dashed lines mean. Gaps before the first reading or after the
  last stay open, and stacked charts never bridge. `maxBridge` bridges only gaps up to a
  span (off by default). The default, `gaps="break"`, is unchanged. Tokens:
  `--chart-bridge`, `--chart-bridge-stroke`, `--chart-bridge-dash`,
  `--chart-bridge-opacity` (opaque under higher contrast, `GrayText` in forced colours).

- `Tree` branches can be selected as well as opened (`selectableGroups`, or `selectable` per
  node): a click, Enter or Space selects the row and fires `onSelectedIdChange`; the chevron,
  → and ←, or a double-click, open and close it. Selectable branches can be links
  (`renderLink`).
- `Tree` loads large hierarchies on demand. A node with `hasChildren` and no `children` shows
  a chevron; `onLoadChildren(node)` runs on its first open, with a loading row meanwhile and
  an error row whose Retry loads again. `hasMore` with `onLoadMore(node)` pages children in
  behind a "Load more" row. A branch that loads no children keeps its folder and loses its
  chevron. Branches whose children are not loaded stay closed while searching, and lazily
  loaded or paged branches show no count. `flattenTree` takes the load state and marks
  `branch` and `status` on its rows.
- `Tree` `groupCounts={false}` hides the groups' counts (on by default), for trees where a
  count would mislead, such as an explorer whose branches are still loading.

- `Window.Action` (`WindowAction`) gives a window's app bar action a priority. When the bar runs
  out of room, the title and scope chip give way first (the title down to `--_title-min`),
  then secondary actions fold, last first, into a trailing More menu: each as an item from its
  `label`, `icon` and `onSelect`, or as its own `menu` content (a submenu, radio items).
  Primary actions, plain children of `Window.Actions` and the window controls never fold or
  leave the bar. It works in `Window.Actions` and in `WindowFrame.AppBar`'s `actions`.

### Fixed

- A reader at the end of a `ConversationLog` stays there while an answer streams and
  completes. Since 0.9.9 the log could stop short of the end once the answer completed (by
  180px in one application), with New messages showing. Two things raced: the dock and log
  observers committed any pending update (the next streamed words) after the log had followed
  the end, and the scroll event from that follow then saw the growth and let go of the end. The
  observers now commit only a change of layout, and a reader leaves the end only by moving up.
  In a streaming fixture at 4x CPU throttle the reader stays within 0px of the end in every
  painted frame, where it ended up to 330px short in one run in five to eight before.
- A range `Slider` no longer widens what scrolls around it. Its range is drawn as a
  track-length strip moved to the range's start, and nothing clipped the part past the
  track's end, so moving the start thumb along widened the scroll area by as much (519 px in
  one window). The range is now clipped to its track, and a hidden value bubble no longer
  takes room over a thumb at either end. The slider looks the same at rest.
- In right-to-left layouts a `Slider`'s thumbs sit on the ends of the range. They were a
  thumb's width toward the left, past the track at the maximum; ticks and mark labels now
  mirror too.

## 0.9.9

A performance release: nothing changes how the library looks or moves, except where noted
under Changed. Measurements are in [docs/performance.md](docs/performance.md#measurements-099).

### Added

- `configureAppearance({ glassRendering: "baked" })` (`GLASS_RENDERINGS`, `GlassRendering`):
  panels and chrome on the page canvas show a copy of the canvas blurred once, instead of
  blurring live every frame. It matches the live blur within 2–5/255 on every background in
  light and dark. With a live pulse in the docked drawer and inspector the compositor drew a
  frame in 0.7 ms instead of 40 ms (60 fps instead of 24). Scrollers, sliding panes,
  overlays, floating windows and mode islands keep the live blur. `live` stays the default.
  `AppearanceProvider` installs it; without the provider call `installBakedFrost()`.
- A surface can take its own material level: `glass` on `Surface` and `Panel`, or
  `data-glass="full" | "reduced" | "solid"` on any element. It is never more transparent than
  the page's level, so a person's Solid choice and reduced transparency still apply.

### Performance

- Tooltips under a `TooltipProvider` share one host per provider instead of a Base UI
  tooltip per trigger. 300 icon buttons mount in 80 ms instead of 182 ms (4x throttle).
  Hover delay, grouping, focus, press, Escape, positioning and `aria-describedby` behave as
  before; a controlled tooltip or one outside any provider keeps its own.
- A button that tracks a status mounts one hidden width reserve until its first status,
  instead of three hidden faces. ActionBar measures markup-only replicas of its buttons.
- Layout is read when the ResizeObserver reports, not mid-commit: tab and breadcrumb
  overflow, ConversationLog's dock and DataTable's body. Entity headers measure when their
  content or size changes, not after every render. A live table cell flashes without a
  forced reflow.
- `AppearanceProvider` hydrates without re-rendering every consumer when nothing different
  is stored.
- A `ConversationLog` with 20 or more children lays out and paints only the turns near the
  viewport. A 200-turn transcript mounts in 1.3 s instead of 2.8 s (4x throttle).
- A closed docked inspector keeps its content under `<Activity mode="hidden">`: state and
  scroll positions stay, effects and animations stop.
- One-shot entrances fill `backwards`, so a finished animation no longer stays attached.
- The shipped stylesheets split rightmost `:is()`/`:where()` lists into selectors Chromium
  can bucket, with the same specificity. The `@scope` fallback applies only where `@scope`
  is unavailable, and the reduced-transparency copies of the Solid rules are generated from
  the Solid rules.
- One shared root-rem store, one relative-time clock and one `MediaQueryList` per query;
  narrower observers in popup metrics and `useBleed`; `RelativeTime` renders once on mount;
  `LineChart`'s memoised plot is no longer re-rendered by clock ticks or a new `xText`.

### Changed

- Panels in `AppShell`'s routed view are frosted like the drawer and inspector. The view
  used to carry a permanent view-transition name, which cut its panels off from the canvas:
  they paid for a blur and showed none. It is now named only while a transition runs. With
  live rendering its panels lose their frost for the length of a route cross-fade; with
  baked rendering they keep it.
- A live line or area chart whose window only moved on (samples dropped at the start, the
  rest unchanged) redraws its paths at once instead of morphing every point one sample to
  the left. Other data changes still morph.
- Relative times in chart readouts and tooltips refresh on the shared 15 s tick (was 30 s).
- In a `ConversationLog` of 20 or more turns, a turn far from the view keeps its last
  rendered size (an estimate before it has rendered). Scroll to a turn with
  `useConversationLog().scrollToTurn(index)`, which the turn navigator uses, rather than
  `scrollIntoView` on the turn.
- `pnpm css-perf:check` rejects an infinite animation on a blurred material and asks every
  other infinite animation for a `perf:infinite` note saying when it runs.

## 0.9.8

### Added

- `AspectRatio` (`glass-ux/aspect-ratio`): a box that keeps a width:height ratio at any
  width, with each direct child filling it. `ratio` takes a number or a `"w / h"` string
  such as a display's `"2560 / 1440"`; `fit="contain" | "cover"` sets `object-fit` on an
  img, video or canvas child; `maxHeight` narrows and centres the box to keep its ratio
  instead of letterboxing; `radius` takes a Surface radius role or `media` (the default).
  It has no material of its own, for use inside a Panel or tile. `parseAspectRatio` reads
  a ratio the same way.
- `LineChart` and `AreaChart` report a chosen point: `onActivate(index, x)` fires on a
  click, Enter or Space on the plot. While it is set the plot shows a pointer cursor and its
  name says Enter selects. `selected` draws the chosen x as an accent rule, or a `[from, to]`
  range as a band, and the keyboard readout says when a point is selected.

### Fixed

- A window in full screen is opaque. It was grey: the panel material clips its own fill to
  the border, which full screen removes, so only the translucent glass layer painted over
  the black backdrop. The frame now paints `--canvas-solid` and drops that layer.
- Controls on `glass-float` read light in the light theme. The float sets its own `--fg`,
  `--fg-muted`, lines, neutral state layers and control fills, so ghost and secondary
  buttons, text and icons on the dark smoke no longer take the page's dark foreground.
- The scope icon in a narrow window keeps its tile. It could shrink to nothing under a
  long title and app bar tools, leaving the icon drawn over the next tool.

## 0.9.7

### Added

- Full screen for windows. Every managed window, in the workspace and popped out, has a
  Full screen control beside Pop out (`WindowFrame.Controls` `fullscreen` and
  `onToggleFullscreen`), where the browser allows it. It puts the window's frame in full
  screen with the Fullscreen API: the app bar and status bar go and the body fills the
  screen. `useWindow()` gains `fullscreen` and `exitFullscreen()`, so content can draw its
  own floating tools (R14.8) and, for a remote session, lock the keyboard; Esc also leaves.
  A window leaves full screen when it is minimised or popped out. A kind turns the control
  off with `fullscreen: false`, like `popout: false`. `useWindowFullscreen(ref)` and
  `fullscreenSupported()` give the same behaviour to a frame of your own.
- Pop-out without storage. A `role: "popout"` manager with `storageKey: null` asks the
  workspace on its channel for the open windows when it connects, and the workspace
  answers; `PopoutWindow` waits for that answer (up to two seconds) before deciding the
  window was closed. A per-tab `channelName` and `popoutUrl` are enough for pop-out.

### Fixed

- Menus, selects, comboboxes, tooltips, popovers, dialogs, preview cards, the chart
  tooltip and toasts open inside whatever element is in full screen, instead of unseen
  behind it. No provider is needed: they follow `document.fullscreenElement`. Your own
  Base UI portals can do the same with `container={popupContainer()}` from
  `glass-ux/windows`, or `usePopupContainer()` for a portal that stays mounted.
- Documentation: a window title in the live workspace example took the page heading size.

## 0.9.6

### Added

- Icons for sites and the organisations a business works with: `IconOffice`,
  `IconWarehouse`, `IconStore`, `IconSchool`, `IconHospital` and `IconFactory`, which share
  the organisation's ground line, and `IconPartner` (a handshake) and `IconSupplier` (a
  delivery truck). The Icons page files them under "Sites and relationships" and finds
  them by other names too: shop, clinic, handshake, truck.

## 0.9.5

### Added

- `WindowScopeInfo` takes `chip` and `icon`, so the application draws a window's scope with
  its own identity component. `chip` replaces the avatar-and-name pill in the app bar's scope
  chip; `icon` replaces the avatar-only form: the chip in a narrow window, the dock group's
  avatar and the phone window switcher's group heading. Without them, `label` and `avatar`
  draw the scope as before. `label` still names the chip, the dock group and the tooltips;
  both nodes are hidden from assistive technology and must not be interactive.

### Fixed

- Documentation: the window scope chip examples drew collapsed, empty windows, and a
  component's `h2` inside any catalogue example (a window title) took the page heading size.

## 0.9.4

### Added

- `DataTable` infinite loading: `infinite={{ hasMore, onLoadMore, loadingMore, error }}` loads
  the next batch from the server as the end of the list comes within a screen of view,
  instead of paging. `onLoadMore` runs once per batch, not again while its promise is
  pending, and not while `refetching` shows the previous query's rows. Sorting, filters and the search stay server-side: a change returns to the top and
  starts a new list. A placeholder row holds the end of the list while the server has more. A
  failed batch (a rejected promise, or `error`) shows "Couldn't load more {noun}" with Retry
  there and keeps the loaded rows. The status bar counts the loaded rows ("150 of 1,284
  endpoints") in place of the pager. The select-all box selects the loaded rows. With
  `live`, a loaded batch is appended at once; rows arriving above the loaded ones still wait
  behind "N new". Reordering is off while more rows remain to load (unless
  `reorder.withinPage`). Grouped tables ignore `infinite`.
- `glass-ux/adapters/graphql-orm`: `connectionRows` reads a graphql-orm connection into table
  rows, `rowCount` and `hasMore` (the same rows for the same result). `nextOffsetPage` and
  `nextKeysetPage` build the next batch's page input. `connectionPagination()` is an Apollo
  Client field policy: it appends `fetchMore` batches to the cached list, keyed by every
  argument except the page; a refetch replaces only the head, and a row that shifted between
  offset batches appears once.

## 0.9.3

### Changed

- Every full-tier chart with a hover or keyboard cursor shows the value at the cursor in the
  glass `ChartTooltip`. A `LineChart` or `AreaChart` with one series now shows it too: the
  x as the title, the relative time for a time series, one row with the value and the series
  label keyed by its colour (a toned series takes the threshold tone its value is in, as its
  dot does), and a marker's label in the footer when one sits at that x. The head readout
  still replaces the latest value with the hovered one. A multi-series chart with all but
  one series hidden from the legend shows the tooltip for the remaining series; a stacked
  chart omits the total while only one band is visible.
- `PieChart`, `DonutChart` and `Sunburst` show the tooltip at the cursor in the full tier:
  the slice (or arc) with its value, share and colour. A sunburst arc's title is its path
  below the focus, and an arc with children says "Click to open". The donut's and the
  sunburst's centre readouts, and the linked legend, are unchanged. Over the sunburst's
  centre the tooltip appears only when the centre is too small for its own readout.
- `BarChart`, `ColumnChart`, `Histogram`, `ScatterChart`, `Heatmap` and `Treemap` already
  showed the tooltip; `Gauge` and `RadialBar` have no cursor and label their values in place.

## 0.9.2

### Changed

- A disabled menu row no longer has a caption line beneath it. `Menu.Item`, `Menu.Submenu`
  and the action menus (`ActionMenu`, `ActionContextMenu`, the `ActionBar` overflow) dim
  the row and show its `disabledReason` as the row's tooltip, beside the menu, on pointer
  hover and on keyboard highlight. The row stays highlightable (`aria-disabled`, its press
  suppressed) and is described by a hidden copy of the reason through `aria-describedby`,
  so screen readers announce it with the row (R11.3, R12.3). `MenuPreview.Item` and
  `ActionMenuPreview` draw the dimmed row without the line. The `.fa-menu-reason` class is
  gone.

### Added

- "Copy as CSV" in a chart's head. In the full tier every chart with a data table shows an
  icon-only `CopyButton` beside "View as table", in the head's corner. It copies the table
  as CSV with raw values (plain numbers, ISO 8601 times, shares as 0–1 fractions). It is
  present but disabled, with its reason, while the chart loads, is empty or failed, so the
  head does not move when the data arrives.
- `chartTableToCsv(model, options?)` in `glass-ux/charts`: RFC 4180 CSV from a
  `ChartTableModel` (header of column labels, quoted fields where needed, CRLF or
  `lineEnding: "\n"`), with the `ChartTableCsvOptions` and `ChartTableValue` types.
- `ChartTableModel.values`: optional raw cell values parallel to `rows`, used by the CSV;
  `ChartTableColumn.value`: a raw header value (a heatmap's time column). Every built-in
  chart fills them.
- `DataTable` `rowOpen` (`DataTableRowOpen`): `"double-click"` (the default, unchanged) or
  `"click"`, which opens a row (or card) with `onRowOpen` on a single primary click and
  gives rows a pointer cursor. Clicks on controls in the row, Shift/Ctrl/⌘/Alt clicks (which
  keep their selection meanings), other buttons, the second click of a double-click and a
  click that ends a text selection in the row do not open it. Enter still opens.
- `Tooltip`'s `side` accepts `"inline-start"` and `"inline-end"`.

### Fixed

- An `EntityIdentity` nested in another (a chip in a header's `slots.state`, for example)
  keeps its own tier's styles. The header, compact, row and chip tiers' descendant rules
  matched the nested entity's parts too, so a chip beside a header's name took the page
  title's size and weight. Each tier's descendant rules now stop at a nested entity.

### Deprecated

- `reasonShown` and `reasonId` on `Menu.Item` and `Menu.Submenu`, `reasonShown` on
  `MenuPreview.Item`, and `reasonRuns`. Rows no longer share a reason line; the props are
  ignored and `reasonRuns` is unused by the menus. They are planned for removal in 0.10.

## 0.9.1

### Fixed

- A dialog opened from the keyboard closes with one Escape. Its initial focus was the
  header close button, whose focus-visible "Close" tooltip took the Escape, so the dialog
  stayed open. A keyboard open now focuses the first control outside the close button (in
  `SettingsDialog`, the current section's tab), or the dialog itself when it has none. A
  touch open still focuses the dialog itself.
- Escape on a control with a tooltip showing closes the tooltip and carries on to the
  dialog, popover or menu around it, so one press dismisses both.

### Added

- `SettingsDialog` takes `initialFocus`, as `Dialog.Popup` does.

## 0.9.0

### Breaking changes

- The release archive no longer contains the gallery. `glass-ux/gallery`,
  `glass-ux/gallery/*` and `glass-ux/gallery/styles.css` are gone from the package. The
  catalogue and demos stay on the documentation site and in each release's
  `glass-ux-docs.tar.gz` asset.
- Only the named entries in `exports` resolve. The `glass-ux/ui/*`, `glass-ux/ai/*`,
  `glass-ux/shell/*`, `glass-ux/windows/*`, `glass-ux/lib/*` and `glass-ux/icons/*` patterns are
  gone, so internal paths such as `glass-ux/ui/button/button` or `glass-ux/lib/use-media-query`
  no longer resolve. Named sub-entries such as `glass-ux/ai/message` and
  `glass-ux/shell/context-switcher` are unchanged, as are the `glass-ux/styles/*`,
  `glass-ux/icons/svg/*` and `glass-ux/assets/*` file paths.
- Formatting no longer hard-codes en-AU. Components use the resolved locale: the component's
  `locale` prop, the nearest `LocaleProvider`, `configureLocale()`, the page's `<html lang>`,
  then en-US. A page with neither `lang` nor `configureLocale()` now shows en-US formats
  (`10/03/2026`, `9:05 PM`); pages with `lang="en-AU"` keep Australian formats.
- Single selection uses one pattern on `Tree`, `TopologyCanvas`, `GeoMap` and `SessionNav`:
  `selectedId` (controlled), `defaultSelectedId` (uncontrolled) and
  `onSelectedIdChange(id, details)`, where `details` has the `reason` (`"item-press"`,
  `"escape-key"`, `"outside-press"`), the native `event` and the `item` (null when cleared).
  - `onSelect` is removed from all four, and `SessionNav`'s `activeId` is now `selectedId`,
    with no aliases.
  - The callback fires only when the id changes, not when the selected item is pressed again.
  - Without `selectedId`, the components keep their own selection, so a pressed item shows as
    selected.

### Added

- `glass-ux/locale`: `configureLocale`, `getLocale`, `LocaleProvider`, `useLocale` and
  `FALLBACK_LOCALE`. A Locale foundation page shows one region formatting in another locale.
- `locale` props on `NumberField` (and so `MoneyInput` and `MoneyField`), `ByteSizeInput`,
  `Slider`, `Metric`, `Pagination`, `DataTable` and every chart. Pure formatting helpers take
  an optional trailing `locale`, and a chart's `format` callback receives the locale as its
  second argument (`LocalizedFormat`).
- `glass-ux/fit-form`: `fitForm`, `nextFitForm`, `useFitForm`, `contentWidth` and
  `overflowsOwnBox`, previously only reachable as `glass-ux/lib/fit-form`.
- `MAIN_COUNTRY_FOR_CALLING_CODE` from `glass-ux/country-select`, as its guide documented.
- `SelectionChangeDetails` and `SelectionChangeReason` from `glass-ux/tree`,
  `glass-ux/topology`, `glass-ux/map` and `glass-ux/ai`.

### Fixed

- Colours in browsers without CSS `@scope`, such as Firefox ESR 140 in Debian 12 and 13. The
  colour roles and brand tones were declared only inside `@scope`, so those browsers showed no
  canvas, text, accent, status or brand colours. `styles/scope-fallback.css`, generated from
  the scoped rules by `pnpm styles`, repeats them as unscoped rules that browsers with `@scope`
  still override. Without `@scope`, a palette island inside a light island on a dark page
  takes dark colours.
- `MapSilhouette` used on its own fills its container. It was sized from the map stage's fit
  padding, so outside a map it overflowed and covered the content after it, as on the GeoMap
  documentation page. Inside `GeoMap` and `GeoMapSkeleton` it is placed as before.
- A drag preview lifted into the top layer keeps the mode, palette and fonts of the
  re-themed island it was picked up from, for both `DragDropProvider` items and DataTable rows.
  Only `data-mode="light"` or `"dark"` counts as a mode island, since some components use
  `data-mode` for their own state.
- The window demos no longer log React's "Cannot update a component (`WindowContentHost`)
  while rendering a different component" warning: their window kinds register at module
  scope. `registerWindowKind` documents that it must not be called during render.
- `DateField` rewrites its text when the locale changes.
- An AI table result shows an entity reference as its chip in any column. A column without
  `type: "entity"` showed it as "[object Object]".

### Changed

- The release archive is 2.1 MB (5.9 MB unpacked), down from 7.2 MB (40.7 MB). Besides the
  gallery it leaves out source maps, the TypeDoc JSON model (`docs/api/typedoc.json`) and
  brand source artwork. The Markdown API pages, guides, skills and the TSDoc in the
  declarations remain. Releases are packed with `pnpm pack:release`, and `pnpm pack:check`
  enforces the size budget.
- **DataTable reorder grip:** easier to see and to discover. It uses `--fg-muted` (about 7:1
  in light and 9:1 in dark Ruby; before, `--fg-subtle` with dots that antialiased down to
  4.6:1) at the medium icon size, brightens while its row is hovered and fills on hover.
  Every grip has a tooltip on hover and keyboard focus, "Drag to reorder, or press Space and
  use the arrow keys", or the reason when it is disabled (R20.7). Nothing moves when it
  appears.
- **DataTable reorder drag:** a pointer or touch drag uses DragDropProvider's visuals. The
  lifted row is a top-layer preview (`.fa-dnd-ghost` / `.fa-dnd-lift`) with the same shadow
  and accent edge, so the table's scroll container no longer clips it, and the same shield
  shows the grabbing cursor, stops hover effects underneath and passes the wheel through.
  The drop slot's dashed edge matches a drop zone ready for the item. Keyboard reordering,
  locked rows, the sort rule, saving and reverting, virtualised auto-scroll and
  announcements are unchanged.
- **Grip icon:** `IconGrip`'s dots are larger (radius 1.6, the top of the icon
  specification's range for grips), and `DragHandle` matches the table's grip.
- Money and byte-size entry reads the locale's decimal and grouping marks (`parseMoney`,
  `parseBytes`, `ByteSizeInput`). Schema messages (`timeSchema`, `dateTimeSchema`,
  `moneySchema`, `byteSizeSchema`, `richTextSchema`) are written when a value is checked, so
  module-level schemas follow a later `configureLocale()`.
- API reference pages and data no longer list every inherited HTML, ARIA and DOM attribute.
  Glass UX and Base UI props stay listed, with a note that the element's standard HTML
  attributes are also accepted. The per-component API data the documentation site loads drops
  from 12.6 MB to 1.2 MB (`menu.json` from 716 KB to 39 KB), and the Markdown reference now
  includes Base UI props.
- Design rule R20.1 states that disabled controls are exempt from the 3:1 non-text contrast
  requirement (WCAG 2.2 SC 1.4.11) but must still look visibly quieter than their active form.

## 0.8.3

### Added

- `TimeField` and `DateTimeField` in `glass-ux/date-picker`, with bare `TimeInput` and
  `DateTimeInput`, registered in `useAppForm` as `field.TimeField` and `field.DateTimeField`.
  - **TimeField:** holds `"HH:mm"` (or `"HH:mm:ss"` with `seconds`). It accepts typing as
    people write times (`930`, `9:30pm`, `21:30`, `noon`) and shows the locale's clock, or
    `hourCycle` 12 or 24. Arrow keys step by `step` (default 15 minutes) and Page Up and
    Page Down by an hour. `min`, `max` and `suggestions` are optional, and a windowed list
    of times opens from the button or Alt+↓.
  - **DateTimeField:** holds a wall-clock string such as `"2026-10-21T09:30"`, with an
    optional `timeZone` whose abbreviation the field shows. Its popup puts the calendar
    beside the times, stacked when narrow.
  - **Daylight saving:** a skipped local time reads forward and a repeated one reads as the
    earlier instant. The field explains either, and the stored value is never rewritten.
  - Helpers: `resolveWallClock`, `wallClockToInstant`, `instantToWallClock`,
    `zoneOffsetMinutes`, `parseTimeText`, `formatTimeText`, `timeSlots` and related.
  - Schemas: `timeSchema` and `dateTimeSchema` (`daylightSaving: "reject"` refuses skipped
    and repeated times).
  - Guide: `docs/components/time-field.md`.

### Changed

- `DateTimeAsk` uses `DateTimeInput` instead of a date field beside a native time input.
  Suggested times, the earliest bound and the answer (an ISO instant) are unchanged. Its parts
  are named "<label> Date" and "<label> Time".

## 0.8.2

### Fixed

- Frosted and Solid now apply to every surface, not only panels, chrome, overlays and cards:
  - **Solid:** controls (inputs, select triggers, secondary buttons, checkboxes, radios,
    segmented and swatch tracks), wells (code cards, table headers, key caps, map wells),
    soft tints (soft buttons, badges, notices, chips, inline code) and skeletons now have
    opaque fills, so the canvas no longer shows through.
  - **Frosted:** control and well fills are raised to about 86% opacity; they matched Glass
    before.
  - **No backdrop filter in Solid:** Solid no longer runs a backdrop filter. It previously
    applied `blur(0px) saturate(…)`, which still saturated the canvas behind every material
    and over imagery.
  - **Mode islands:** elements with their own `data-mode` now follow the selected material.
  - **Reduced transparency:** the operating system's "reduce transparency" setting gets the
    same treatment as Solid.
  - **Regression test:** a browser test checks every component page in Solid, light and dark.
- DataTable no longer makes the scroll container around it scroll by 8px (reported by FAME).
  The closed bulk-action bar waited a step below its place, and transforms count as
  scrollable overflow, so a table in a scrolling pane (vertical tabs, panels) gained a
  second scrollbar. The bar now waits above its place and still settles in as it fades.
  The table's hidden row-height probe no longer extends below a table shorter than one row.
- The window dock's list no longer overflows itself by 1px: the items' rim light had no
  room.
- Map clusters are opaque in Solid.
- A browser test fails if anything on a component page overflows its own box by a few pixels
  beyond its visible content. That catches offsets, probes and decorations that add stray
  scrollbars.
- Markdown tables in documents (`wrapTableCells`) show every row and let the page scroll,
  instead of capping at 14 rows inside a scroll box with an opaque header. Header labels sit
  in the middle of the header row.

### Performance

- DataTable and Tree keep their virtual row measurements while scrolling; before, every scroll
  render rebuilt them. Scroll-time JavaScript roughly halves at 100k rows. Scrolling at 4×
  CPU throttling went from 35 to 42 frames per second for DataTable and from 52–56 to about
  60 for Tree.
- Local DataTable sorting resolves each sort column once and reuses one collator: sorting
  100k rows by text fell from 5.7 s to 0.3 s.
- Topology layout no longer copies a branch for every node it adds: a 50k-node star lays out
  in 33 ms instead of 15 s.
- These changes alter neither visuals nor behaviour; screenshots before and after are
  pixel-identical.

### Added

- `SectionDrawer.Header` takes `subtitle`, a data line under the title such as a version.
- New tokens give the opaque equivalents that Solid uses and Frosted moves towards:
  - `--glass-control-solid`, `--glass-control-solid-hover` and `--glass-inset-solid`;
  - `--tint-*-solid` for the muted, accent, success, warning, danger and info tints.

### Documentation site

- The navigation drawer shows the release version under the Glass UX name, and its logo
  follows the selected palette.

## 0.8.1

### Fixed

- Drag and drop: the preview now stays exactly under the pointer. It moved with `transform`
  while the lift used the `scale` property, which scaled the translation too. The preview sat
  2% of its screen position away from the pointer (about 15 px mid-screen) and lurched while
  the lift's spring eased in.
- Drag and drop is smoother. A lift no longer restyles the whole document: a root cursor rule
  took 70–300 ms on large pages. Pointer frames read no layout, using cached zone geometry and
  arithmetic hit-testing. In the documentation Board profile, the engine's per-frame work fell
  from 1.3 ms to 0.1 ms (median) and dropped frames at 4× CPU throttling from 13% to under 2%.
  Every effect is unchanged.
- Drag and drop: the preview and a transparent cursor shield render in the top layer
  (`popover`), above dialogs and outside ancestor transforms. They mount inside an open modal
  `<dialog>`. The shield passes the wheel to the scroll container under the pointer.
- Drag and drop: a drop zone covered by a menu or sticky header no longer takes the item where
  it cannot be seen, and a zone that scrolls its own content auto-scrolls.
- Component documentation shows a specimen that several related exports share once. A related
  export whose examples are all above links to them. The DropZone page showed its Board three
  times.

### Added

- `useDropZone(options, { trackState: false })` skips React re-renders for a zone whose state
  nothing reads; `DropZone` does this unless its children are a render function.

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
