# Glass UX contributor guidance

Read README.md, docs/ui-rules.md and the relevant component guide before changing code.
Read [the layout contract](docs/layout-contract.md) before composing a screen or documentation page.
Use Surface geometry props and Panel/drawer slots; material classes alone do not supply
padding or corners. Page headings and groups of panels sit on the canvas.
Keep library components independent of application branding, business entities and backend
contracts. Gallery fixtures belong to the gallery and must use fictional sample data.

Use React 19 and Base UI for keyboard, focus and ARIA behaviour. Components read semantic
CSS tokens, use data attributes for variants and adapt to their containers. Preserve
controlled and uncontrolled state, accessible names and skeleton dimensions.

Document public APIs with TSDoc. Regenerate API documentation with `pnpm docs:api` after
changing public types. Every public component must have a catalogue page and a working demo.
Run `pnpm check`, `pnpm docs:build` and affected browser checks.
Verify density, UI scale, radius, line weight, actual insets and scroll-edge clipping;
rendering and accessibility checks alone do not establish layout correctness.
Never commit node_modules, test output, credentials or .handoff notes.

The release package is built once and installed from the versioned GitHub release archive.
Do not add an installation-time build or make a consumer depend on an unpublished workspace.

For adoption into a consuming application, read docs/getting-started.md and docs/integration.md.
Bundled skills under skills/ cover adoption, component choice, forms, data views, assistant UI
and library authoring. Their guidance uses the API shipped with this exact release.
