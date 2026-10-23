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

For a tree beside a table or a list above its details, use `SplitPane` (glass-ux/split-pane)
rather than a hand-built divider: it is keyboard operable, clamps each pane, remembers its
size per window kind and hides a pane behind a button when narrow. An explorer tree uses
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
