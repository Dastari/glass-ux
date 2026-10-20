---
name: glass-ux-author
description: Extend the Glass UX library with a reusable component, typed public API, documented examples and proportional interaction and accessibility checks.
---

# Extend the library

Before composing UI, read and apply the installed package's `docs/ui-rules.md`, especially
Screen content rules. These defaults apply to consuming websites and applications unless
explicit user or project instructions say otherwise: do not overuse subheadings, add
motivational/irrelevant/cheerful/promotional copy, overexplain the page, push primary content
down with redundant framing, repeat a route title already named by navigation, or introduce
content shifts that move buttons or menus. Use factual labels and reserve asynchronous
content space. Deliberate long-form documents may contain necessary headings and prose.

Read repository `AGENTS.md`, `docs/ui-rules.md`, the nearest component implementation and its
gallery section. Determine whether the proposed component is reusable across applications.
Read `docs/layout-contract.md`; include the docs application CSS in token/layout checks.
Application branding, domain adapters and business workflows belong in the consuming project.
For icons, read `docs/icon-spec.md` and edit the geometric authoring definitions before
regenerating SVGs and React exports. Social/company icons identify their named services;
keep them monochrome and review every size, tint state and mode in Foundations → Icons.

Use Base UI for existing keyboard, focus, ARIA and positioning behaviour. Put a component in
its own source folder with CSS, public exports and TSDoc. Use semantic tokens, compound slots
where useful, data attributes for variants and container-based adaptation.
Use the shared Surface/Panel geometry for panes and cards. Test actual theme-driven insets,
corners and line weight, and keep catalogue headings and panel groups on the canvas.

Document controlled/uncontrolled state, value units, valid options, defaults, callbacks and
keyboard behaviour. Name single selection `selectedId`, `defaultSelectedId` and
`onSelectedIdChange(id, details)` with `SelectionChangeDetails`, as Tree does. Add a live specimen with fictional fixtures, loaded/skeleton parity and
relevant disabled, empty, invalid, pending and error states.

Update the public package entry and API catalogue mapping. Run `pnpm docs:api`, `pnpm check`,
the static docs build and affected browser tests. Verify the packed artifact when changing
exports, dependencies or assets. Release and publication remain governed by the repository's
versioned release workflow and the user's requested scope.
Before publishing documentation, build with `GLASS_UX_BASE=/glass-ux/` and run
`pnpm test:production`. Its rendered-colour and syntax checks catch palette cascade and
lazy-chunk failures that control state and development-server checks can miss.
