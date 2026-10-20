---
name: glass-ux-adopt
description: Integrate Glass UX into an existing or new React application, including release installation, styling, providers and a verified first screen.
---

# Adopt Glass UX

Before composing UI, read and apply the installed package's `docs/ui-rules.md`, especially
Screen content rules. These defaults apply to consuming websites and applications unless
explicit user or project instructions say otherwise: do not overuse subheadings, add
motivational/irrelevant/cheerful/promotional copy, overexplain the page, push primary content
down with redundant framing, repeat a route title already named by navigation, or introduce
content shifts that move buttons or menus. Use factual labels and reserve asynchronous
content space. Deliberate long-form documents may contain necessary headings and prose.

Find the installed `glass-ux` package and read its `README.md`, `docs/getting-started.md` and
`docs/integration.md`. Those files match the installed release. Use its `docs/api/README.md`
to find component contracts; the live site is supplementary when versions differ.

Before writing layout, read `docs/layout-contract.md` and the token, materials and layout
rules in `docs/ui-rules.md`. Use `Surface` geometry props and Panel/drawer content slots.
Choose an explicit padding role for direct Surface children; never assume a raw glass class
supplies padding or corners. Headings and panel groups sit on the canvas.

Run `pnpm exec glass-ux check-layout` with the host stylesheet directories. Verify computed
insets and corners with non-default density, UI scale, radius and line weight. Inspect focus
rings and curved edges at scroll boundaries. Do not treat axe or successful rendering as
proof that the theme's geometry is respected.

Inspect the consuming project's framework, React version, styling pipeline and repository
instructions before editing. Preserve its router, authentication, data layer and product identity.
Glass UX supplies presentation and interaction primitives; it does not replace those services.

Install a versioned GitHub release archive, retain the package-manager lockfile, import the
shared CSS, use the documented Tailwind 4 build pipeline, and include the package in Tailwind source discovery. For Vite, install the glassUx() plugin before verifying the first screen. Fonts
and images ship with the package; do not recreate absolute `/fonts` assumptions.

Use public entries such as `glass-ux/button`, `glass-ux/form`, `glass-ux/data-table`,
`glass-ux/ai` and `glass-ux/appearance`. Do not copy the implementation into the project.
Supply the documented providers for the features in use, and register application-owned
palettes and marks before configuring appearance defaults. Numbers, money, dates and times
format in the page's `<html lang>`, then `en-US`. Set `lang` on the host page, or call
`configureLocale(tag)` from `glass-ux/locale` (on server and client for SSR). Wrap a region
that must differ in `LocaleProvider`.

For an existing application, migrate one coherent screen first. Check keyboard interaction,
focus return, light/dark/Solid appearance and a narrow container before broadening the migration.
For a new application, start with the verified root and form examples in the getting-started
guide. Run the consuming project's typecheck and affected tests.
