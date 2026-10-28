# Changelog

All notable changes to Glass UX. Versions follow [semantic versioning](https://semver.org/);
while the major version is 0, a minor release may contain breaking changes, and each one
has upgrade steps in the [migration guide](docs/migration.md).

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
