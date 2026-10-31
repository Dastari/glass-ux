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
Pack it with `pnpm pack:release`, not `pnpm pack`: the archive leaves out the gallery, source
maps and other docs-site-only files, and `pnpm pack:check` enforces its size budget. The
JavaScript ships as built, readable ESM: do not minify the package to fit the budget. Raising
the budget is a deliberate decision with its reason in `scripts/pack-release.mjs`.

## Working in this repository

- The docs app reads the built `dist`, not `src`: run `pnpm build` (after `pnpm docs:api` for
  catalogue changes) before checking a page in the dev server.
- Playwright reuses any server already on its port (4220 by default). When several checkouts
  or agents test at once, give each its own `GLASS_UX_DEV_PORT`, or a run can test another
  checkout's code and pass.
- `pnpm docs:api` and `pnpm docs:build` sometimes reorder a union in
  `docs/api/context-avatar.md` and `src/gallery/api/context-avatar.json`; revert that noise.
  When generated files (`docs/api/typedoc.json`, `src/gallery/*.generated.json`) conflict in a
  merge, take either side and regenerate rather than merging them by hand.
- Generated sources have their own authoring scripts: icons in `scripts/icon-authoring`
  (`pnpm icons`, rules in docs/icon-spec.md) and canvas artwork in `scripts/build-canvas.mjs`
  (alpha masks painted in palette roles). Never hand-edit their output.
- Component stylesheets sit beside their components; `pnpm build` writes
  `dist/styles/manifest.json` for `glass-ux styles` (selective stylesheets). The manifest
  finds styles through imports, `fa-*` class names in strings and shared custom properties,
  not through attribute- or element-only selectors (see `scripts/style-manifest.mjs`).
- Module-level `Object.assign`, `memo`, `createContext` and `lazy` wrappers carry
  `/* @__PURE__ */` (`pnpm pure:check`), or an unused part keeps its whole component in a bundle.
- The owner judges visual changes in a browser. Serve the built fixtures or docs on the LAN
  (`--host 0.0.0.0`) with an index page and keys or toggles to compare variants; built pages
  need relative or correct base asset paths, or fonts and artwork silently go missing.
  Compare isolated demos in fixed states (frozen clock, seeded randomness, same scroll
  position): whole docs-page diffs mislead, because scroll-spy, anchors, load timing and
  changed prose move everything.

## Words and direction

- Every built-in word is a message: declare it in the component's `messages.ts` with
  `defineMessages` (see `src/lib/i18n/catalog.ts`) and read it with `useMessages`. Keys name
  the purpose (`discardTitle`, not the English text), function messages take typed,
  meaningful parameters (an object beyond two), and sentences are whole messages, never
  fragments joined in code. `src/i18n/*.test.ts` enforces this.
- A new or changed message needs every language pack in `src/i18n/` updated; the pack
  coverage test fails otherwise. Translate as a native UI editor would, with each language's
  usual register and consistent terms.
- Numbers, percentages, lists, plurals, byte sizes, durations and weeks go through the cached
  helpers in `src/lib/locale/intl.ts` and their neighbours, never `new Intl.*` in render.
  Application text reaches a message as written (the message decides case), and count APIs
  take plural forms. `src/i18n/source.test.ts` guards the common slips; the `glass-ux-author`
  skill lists the helpers.
- Library CSS uses logical properties (`pnpm logical:check`). Physical geometry that must not
  mirror (chart x axes, the colour picker's axes) carries `/* logical:allow <reason> */`.
  In-house keyboard and pointer code follows the reading direction (`readingKey`, `isRtl`).
- Modules that need the client get `"use client"` at build time; keep formatting helpers,
  tokens, schemas and `appearanceBootScript` free of hooks so server components can call them.

## Releases

The owner releases without waiting for the GitHub e2e run (about 75 minutes), and still
decides when to publish. The local route:

1. `pnpm check`, the browser specs the change affects, `GLASS_UX_BASE=/glass-ux/ pnpm
   docs:build`, `pnpm pack:check`, and `pnpm test:production` for larger releases.
2. Bump `package.json`, the install URL in README.md and docs/getting-started.md, the
   CHANGELOG heading and docs/migration.md; run `pnpm docs:api` for the documentation version.
3. Assets as `release.yml` builds them: `node scripts/pack-release.mjs --out
   .handoff/release`, `tar -czf .handoff/release/glass-ux-docs.tar.gz -C apps/docs/dist .`,
   and `sha256sum *.tgz *.tar.gz > SHA256SUMS` in that folder.
4. Fast-forward `main`, push an annotated tag `vX.Y.Z`, then `gh release create vX.Y.Z
   <assets> --verify-tag --title … --notes-file …` (summary, changelog section, install
   command). Cancel the tag's Release run, which would only repeat the e2e; download the
   archive and check it against SHA256SUMS.

## Settled decisions

- Material level (Glass, Frosted, Solid) can be set per surface; live or baked blur is one
  application-wide setting (`configureAppearance({ glassRendering })`), not per surface.
- Images and media take no drop shadows or reflections; hover effects stay within the
  Image component's trimmed set and are off under Still or reduced motion.
- File type icons stay monochrome (applications colour them through `data-file-kind`); the
  PDF icon has no lettering. `endpoint` is the managed device; `desktop` is a workstation.

## Open follow-ups

- Slider: a visible value bubble over an end thumb overhangs while shown (fixing it shifts
  the bubble inward at the ends, a visual change for the owner to approve).
- Sparkline has no `gaps` option yet (LineChart has `gaps="bridge"`).
- Scheduler timeline: no per-cell render slot and no resource window in `onRangeChange`;
  DragDrop keyboard travel reaches only rendered (virtualised) rows, so keyboard moves between
  far rows use the event's arrow keys. `grip.svg` differs from its authoring definition.
- File context menus have no icon for "Copy path".
- Focus room (R11.10, `e2e/focus-reach.spec.ts`): Safari ignores `overflow-clip-margin`, so
  truncated titles and clipped frames still cut rings there; a shaded (bar-only) window cuts
  its title-bar buttons' rings by 1px.
- Native-speaker review: "chroma" in the Arabic and Hebrew colour picker messages, and
  "preview class" in Japanese, Korean, Arabic and Hebrew (`results.previewUnavailable`).
- Next.js support is verified with webpack (`pnpm test:next`), not Turbopack; forced colours
  only with Chromium's emulation, not Windows High Contrast itself.

- From the 0.12.0 audit:
  - Draggable rendered as an `li` keeps `role="button"` (axe `aria-allowed-role`/`list` on the
    drag-drop demos); fixing it changes consumers' role queries.
  - About 90 messages still insert a raw `count` without digit grouping.
  - money-field doesn't parse native digits.
  - Toasts with an action still close after 5 s.
  - Topology wraps `renderNode` controls inside an option.
  - Compact wrapped chip rows let neighbouring 24px hit areas share 2–4px.
  - Selective-style closures are wider than needed where a class has several defining sheets
    (Select loads tree-select.css).
  - `glass-ux styles --scan` counts type-only imports.

For adoption into a consuming application, read docs/getting-started.md and docs/integration.md.
Bundled skills under skills/ cover adoption, component choice, forms, data views, assistant UI
and library authoring. Their guidance uses the API shipped with this exact release.
