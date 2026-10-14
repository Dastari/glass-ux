---
name: glass-ux-adopt
description: Integrate Glass UX into an existing or new React application, including release installation, styling, providers and a verified first screen.
---

# Adopt Glass UX

Find the installed `glass-ux` package and read its `README.md`, `docs/getting-started.md` and
`docs/integration.md`. Those files match the installed release. Use its `docs/api/README.md`
to find component contracts; the live site is supplementary when versions differ.

Inspect the consuming project's framework, React version, styling pipeline and repository
instructions before editing. Preserve its router, authentication, data layer and product identity.
Glass UX supplies presentation and interaction primitives; it does not replace those services.

Install a versioned GitHub release archive, retain the package-manager lockfile, import the
shared CSS, use the documented Tailwind 4 build pipeline, and include the package in Tailwind source discovery. For Vite, install the glassUx() plugin before verifying the first screen. Fonts
and images ship with the package; do not recreate absolute `/fonts` assumptions.

Use public entries such as `glass-ux/button`, `glass-ux/form`, `glass-ux/data-table`,
`glass-ux/ai` and `glass-ux/appearance`. Do not copy the implementation into the project.
Supply the documented providers for the features in use, and register application-owned
palettes and marks before configuring appearance defaults.

For an existing application, migrate one coherent screen first. Check keyboard interaction,
focus return, light/dark/Solid appearance and a narrow container before broadening the migration.
For a new application, start with the verified root and form examples in the getting-started
guide. Run the consuming project's typecheck and affected tests.
