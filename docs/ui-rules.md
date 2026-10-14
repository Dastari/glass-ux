# Glass UX design rules

Tokens and component behaviour are the implementation authority. These rules describe
the shared contracts; an application supplies its data, routing, branding and policies.

## R1 · Consistency

Use the same primitive for the same interaction. Define an entity’s actions once and render
that definition in its header, menus, context menu and command palette.

## R2 · Copy

Use specific labels, outcome-naming actions and actionable errors. Empty states state facts.
Accessible names identify the control even when its visible content is an icon.

## R3 · Tokens and themes

Colours, geometry, typography and motion use semantic CSS tokens. Variants are data attributes.
The application may register its own CSS palette with `definePalette` and configure defaults
and locked preferences with `configureAppearance`. The default palette is Graphite.

## R4 · Materials

Use the shared glass materials. Avoid nesting blurred layers. Support Glass, Frosted and
Solid, and use the imagery context over media. Headings and navigation sit on the canvas.

## R5–R6 · Shell and navigation

The shell owns the viewport; content scrolls within its own container. Show a section drawer
only when it contains real navigation. Applications own URLs, navigation and scope changes.
Use routed tabs for places and local tabs for presentation choices.

## R7–R8 · Containers and text

Adapt to the component’s container on both axes. Bounded charts, maps and workspaces need
a definite height. Truncate single-line identifiers with an accessible full-text tooltip;
wrap prose. Do not silently clip content.

## R9–R10 · Stability and loading

Reserve the space used by errors, progress and validation. Skeletons match loaded geometry.
Buttons confirm pending, success and failure in place. The shell renders while data loads.

## R11–R13 · Interaction and actions

Base UI owns keyboard navigation, focus, positioning and ARIA behaviour. Shared recipes own
hover, press, focus and disabled states. An unavailable action explains why. Confirm
consequential actions by naming their target and outcome. Incoming assistant questions and
approvals remain non-modal; the host supplies the authorization policy.

## R14 · Windows

Managed windows reconstruct from serialisable kinds and parameters. The host owns storage
namespaces and registered content. Dragging and resizing update compositor styles and commit
state on release, without re-rendering content every frame.

## R15 · Forms

Use TanStack Form and the typed schema helpers. Stack one field per row; boolean settings
use switches in setting rows. Validate on blur, then on change after an error. Normalise
typed input on blur so the caret stays stable. Labels and validation remain accessible.

## R16–R17 · Data and live updates

Columns define filtering, search and priority explicitly. The host supplies paging, server
filters and subscriptions. Never filter one page as if it were the full server result.
Update loaded values in place; connection state belongs to the relevant view.

## R18–R21 · Motion, icons and accessibility

Animate transform and opacity; honour reduced motion and transparency. Components size
their icons. Meet WCAG 2.2 AA in both modes and every supported material. Preserve accessible
names, focus return, keyboard paths and touch targets. Test narrow and wide containers.

## R22–R24 · Ownership and verification

Applications own install metadata and authenticated runtime behaviour. A component has its
own source folder, public typed exports, TSDoc, API page, live examples and relevant tests.
Run `pnpm check`, `pnpm docs:build` and the affected browser tests. Review recorded examples
in light, dark and phone layouts before a release.

## Documentation layouts

The main application and its product demo use available workspace space. Component
documentation uses a centered maximum-width reading column. Stack examples vertically,
follow them with usage and the complete API, and use a vertical section rail whose links
jump within the single document. Keep every section present; do not hide them behind tab
panels. Icon demos share one Foundations page. Each chart has its own focused page.

Documentation headings, descriptions, rules and example wrappers sit on the page canvas.
Code blocks may use a well, and a component that demonstrates a surface keeps that surface.
Do not wrap every specimen in an additional card.
