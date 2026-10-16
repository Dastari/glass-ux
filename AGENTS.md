# Glass UX contributor guidance

Read README.md, docs/ui-rules.md and the relevant component guide before changing code.
Read [the layout contract](docs/layout-contract.md) before composing a screen or documentation page.
Use Surface geometry props and Panel/drawer slots; material classes alone do not supply
padding or corners. Page headings and groups of panels sit on the canvas.
Keep library components independent of application branding, business entities and backend
contracts. Gallery fixtures belong to the gallery and must use fictional sample data.

For library examples and consuming websites/applications, follow the screen content rules
in docs/ui-rules.md unless explicit user or project instructions specify otherwise:

- Do not overuse subheadings or stack headings, captions and introductions that repeat a point.
- Do not add motivational, irrelevant, cheerful or promotional copy. Use factual, informational
  text; no slogans such as “A happy place for all your components” or “Great Tools. Great UI”.
- Do not add large paragraphs that overexplain the page or its obvious features.
- Do not push primary content down with unnecessary headers, toolbars, navigation or prose.
- Do not duplicate a route title already clearly supplied by a tab, breadcrumb or navigation.
- Do not inject content that unexpectedly moves buttons, menus or other interaction targets
  during loading, live updates, hover or focus. Reserve space and replace content in place.
Long-form documents may use necessary headings and prose when readers are expected to read
at length. Verify content placement and control stability on phones as well as desktops.

Use React 19 and Base UI for keyboard, focus and ARIA behaviour. Components read semantic
CSS tokens, use data attributes for variants and adapt to their containers. Preserve
controlled and uncontrolled state, accessible names and skeleton dimensions.

Document public APIs with TSDoc. Regenerate API documentation with `pnpm docs:api` after
changing public types. Every public component must have a catalogue page and a working demo.
Run `pnpm check`, `pnpm docs:build` and affected browser checks.
Verify density, UI scale, radius, line weight, actual insets and scroll-edge clipping;
rendering and accessibility checks alone do not establish layout correctness.
Before publishing docs, build with `GLASS_UX_BASE=/glass-ux/` and run
`pnpm test:production`. Check computed palette colours and highlighted code, not only
the selected controls or data attributes. The same tests accept `GLASS_UX_TEST_URL`
for verification after deployment.
Never commit node_modules, test output, credentials or .handoff notes.

The release package is built once and installed from the versioned GitHub release archive.
Do not add an installation-time build or make a consumer depend on an unpublished workspace.

For adoption into a consuming application, read docs/getting-started.md and docs/integration.md.
Bundled skills under skills/ cover adoption, component choice, forms, data views, assistant UI
and library authoring. Their guidance uses the API shipped with this exact release.
