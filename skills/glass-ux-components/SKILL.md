---
name: glass-ux-components
description: Choose and compose Glass UX controls, navigation, identity, surfaces and overlays using their installed API contracts and shared design rules.
---

# Compose a Glass UX screen

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

Compose documented slots rather than reproducing their markup or styling internals.
Provide accessible names for icon-only controls. A disabled action carries its reason.
Use `TruncatedText` where a full identifier must remain reachable, and the component's
skeleton where data is loading.

Use token roles and outer layout classes. Named variants and semantic tones are props, not
local colour overrides. Give bounded charts, maps and workspaces a definite height, and
check both a narrow and a wide container. Keep application-specific entities and policies
in the consuming project; the generic primitive receives their data and actions.
