---
name: glass-ux-components
description: Choose and compose Glass UX controls, navigation, identity, surfaces and overlays using their installed API contracts and shared design rules.
---

# Compose a Glass UX screen

Before composing UI, read and apply the installed package's `docs/ui-rules.md`, especially
Screen content rules. These defaults apply to consuming websites and applications unless
explicit user or project instructions say otherwise: do not overuse subheadings, add
motivational/irrelevant/cheerful/promotional copy, overexplain the page, push primary content
down with redundant framing, repeat a route title already named by navigation, or introduce
content shifts that move buttons or menus. Use factual labels and reserve asynchronous
content space. Deliberate long-form documents may contain necessary headings and prose.

Read the installed package's `docs/api/README.md` and the page for each component you use.
The component pages list types, literal options, defaults, callbacks and compound slots.
Read `docs/ui-rules.md` for material, container, interaction and accessibility conventions.
Read `docs/layout-contract.md` before writing layout. Use Surface radius/padding props or
Panel/drawer content slots. Keep group headings on the canvas and verify theme geometry;
raw material classes only provide appearance.

Choose components by their job: `Button` and shared actions for outcomes, `Field` and typed
inputs for editing, `EntityIdentity` for generic entities, `EmptyState` for no results,
`Notice` for information belonging to a place, and the window status bar for connection state.
Use the shell and window primitives only when the application needs that structure.
For sign-in, providers, two-factor codes, password reset and sign-up, use `LoginFlow` with
the application's callbacks (`docs/components/login-flow.md`) rather than assembling fields.

Compose documented slots rather than reproducing their markup or styling internals.
Provide accessible names for icon-only controls. A disabled action carries its reason.
Use `TruncatedText` where a full identifier must remain reachable, and the component's
skeleton where data is loading. Give screens, video and images of a known shape an
`AspectRatio` so they keep their space before they load.

For an application's own frame (a navigation pane beside the content, outside AppShell), use
`Sidebar` (glass-ux/sidebar) in a `SidebarProvider` with a `SidebarInset`: it collapses to an
icon strip or off canvas, remembers its state and width without a flash, toggles with ⌘B or
Ctrl+B and becomes a sheet on phones (`docs/components/sidebar.md`). Rows take a `detail`
line, a quiet `count` or an entity `face`; `Sidebar.Match` marks a filter's matches, and
`Sidebar.Content fill` hands the height to a Tree that scrolls itself.

For a list that opens from text and leaves focus there, use `Typeahead` with `useTypeahead`
(glass-ux/typeahead), anchored to a caret or any rectangle; base UI menus move focus and cannot
do this. `RichTextInput` takes `mentions` and `slashCommands`. To show a Markdown document that is read and not edited, including tables, use `RichTextReader` (glass-ux/rich-text-reader), not a read-only `RichTextInput`. For find in a log, table or
document use `FindBar` (glass-ux/find-bar): the host owns matching. For a change to text use
`DiffView` (glass-ux/diff-view). For choosing files or where to save over host storage, use
`FileDialog` (glass-ux/file-dialog) with a `FileProvider` (glass-ux/file-provider): it lists and
chooses, and the host reads and writes. `mode="folder"` chooses a folder, and `places` adds shortcuts
to common folders in any mode. For a rating from icons, or an average shown as one, use `Rating` (glass-ux/rating) and `field.RatingField`; it is a radio group. For slides of any content one at a time use `Carousel` (glass-ux/carousel): `ratio` reserves its height and `autoplay` shows a Pause button. For items of different heights in columns use `Masonry` (glass-ux/masonry) with `getRatio`, never CSS `columns`, which breaks the tab order. A version history is an `ActivityFeed` with `tone`, `children`
and `selectedId`; a ticket or case history is one with `variant="timeline"` (markers on a rail),
avatar markers, a `detail` under each post and `order="oldest"`. For the rows behind an unread count use `NotificationList` or `NotificationPopover`
(glass-ux/notification-list), passing the count to `AccountButton` or a `Rail.Item`, which do not change. For discussion use
`CommentThread` (glass-ux/comment-thread): `permissions` decides which controls exist, `composer` adds a control and send label to each composer (reply composers hold their own choice), and `renderBadges` and `renderAttachments` add to a comment. Use `ReactionBar`
(glass-ux/reaction-bar) for reactions and `EmojiPicker` (glass-ux/emoji-picker) to choose an emoji. `AppShell focusRegions`, or `useFocusRegions` from glass-ux/hooks, gives F6
between panes.

For a tree beside a table or a list above its details, use `SplitPane` (glass-ux/split-pane)
rather than a hand-built divider: it is keyboard operable, clamps each pane, remembers its
size per window kind and hides a pane behind a button when narrow. For more than two panes,
or panels people rearrange, use `PaneLayout` (glass-ux/pane-layout): a JSON tree of splits and
stacks where a panel moves without remounting. `locked` gives a resize-only layout with no tabs
for mail and dashboards. A panel that must stay connected while hidden, such as a remote session,
needs `whenHidden: "run"`. An explorer tree uses
`Tree` with `selectableGroups`, and `hasChildren`/`onLoadChildren` (and `hasMore`/`onLoadMore`)
for hierarchies too large to load at once. Wrap window app bar actions in `Window.Action`
with a label and priority so a narrow window folds them into More instead of pushing its
controls out of the frame.

Use token roles and outer layout classes. Named variants and semantic tones are props, not
local colour overrides. Give bounded charts, maps and workspaces a definite height, and
check both a narrow and a wide container. Keep application-specific entities and policies
in the consuming project; the generic primitive receives their data and actions.

For compact facts, activity, clickable rows, chip overflow, semantic dots, link buttons or
table meters, read `docs/components/compact-compositions.md` and the selected API page.
Use these compositions before copying private class recipes. `TruncatedText` accepts rich
nodes; `Field.warning` uses its reserved message slot.

For moving objects between places (boards, reorderable lists, palettes, trays), use
`glass-ux/drag-drop` (`docs/components/drag-drop.md`): `Draggable` items carrying your object
and a type, `DropZone` targets that filter with `accept`, refuse with `validate`/`disabled`
and a reason, and sort with `sort`. Apply `onDrop` to your data synchronously with
`applyDrop` or `moveItem`, and keep a menu action for the same move.
