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

`glass-ux-docs-kit` is a second archive on each release, in the same version: the bin and
scripts in `scripts/docs-kit`, the page shell and its stylesheets from `dist/gallery`, and the
site template. `scripts/pack-docs-kit.mjs` follows imports from `src/gallery/docs-kit.ts`, turns
imports leaving the gallery into public entries, refuses a module with no public entry, keeps
its own budget, and checks the finished archive for the forbidden names. The main archive
gains nothing from it, including `docs/docs-kit.md`, which `excluded()` leaves out.

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
- The docs scripts are the kit's: `scripts/docs-api.mjs`, `docs-site.mjs` and `check-*.mjs` are
  thin calls into `scripts/docs-kit/lib`, which must stay free of this project's names and paths.
  This project's tables, budgets and forbidden names live in `docs-kit.config.mjs`, which is never
  published. Pages read `site` (`site.generated.ts`) through `DocsKitProvider`; keep the shell free
  of module-relative loading. `component-families.ts` runs under Playwright too: no Vite globs.
  Steps only this project has, such as the page templates' public sources, their stale check and
  their routes, are `hooks` in that config and `scripts/template-examples.mjs`.
- Generated sources have their own authoring scripts: icons in `scripts/icon-authoring`
  (`pnpm icons`, rules in docs/icon-spec.md) and canvas artwork in `scripts/build-canvas.mjs`
  (alpha masks painted in palette roles), emoji data in `scripts/build-emoji.mjs` (`pnpm emoji`).
  Never hand-edit their output.
- Page templates are `src/gallery/templates/*.tsx`, one self-contained file per screen (plus
  `application-shell.tsx`, their frame), listed in `src/gallery/template-catalogue.ts`.
  `pnpm docs:api` writes their public source to `src/gallery/examples/template-*.tsx.txt` and
  refuses any import that is not a package entry; `pnpm docs:check` fails while one is stale.
  Lay them out with Tailwind utilities, never gallery CSS, so a copy works in a consumer. A Panel
  is its own container, so name the screen's (`@container/screen`) for a query inside one.
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
   .handoff/release`, `node scripts/pack-docs-kit.mjs --out .handoff/release`, `tar -czf
   .handoff/release/glass-ux-docs.tar.gz -C apps/docs/dist .`, and `sha256sum *.tgz *.tar.gz >
   SHA256SUMS` in that folder.
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
- Package size: the budgets rose to 13 MB unpacked and 4 MB archive for 0.14. The owner wants an
  optimisation pass after that release; `dist/ui` and the language packs are the largest parts.
- Native-speaker review: "chroma" in the Arabic and Hebrew colour picker messages, and
  "preview class" in Japanese, Korean, Arabic and Hebrew (`results.previewUnavailable`).
- Next.js support is verified with webpack (`pnpm test:next`), not Turbopack; forced colours
  only with Chromium's emulation, not Windows High Contrast itself.

- EmojiPicker draws in the system font, and this box has no emoji font: its glyphs have not been
  seen here, only their sizes and rows.
- PaneLayout moves panels with `moveBefore`, which Safari lacks: there `insertBefore` runs and
  scroll and focus are restored in the same task, but an iframe reloads. Hosts parking relies on
  React running a ref's cleanup while its slot is still in the document, so a React upgrade that
  changes that order breaks it.
- The keymap dispatcher listens on the main document only, so a popped-out window gets no keymap.
- `src/ui/comment-thread/comment-row.tsx` lazily imports `src/ai/markdown`, the only import from
  `ai` under `src/ui`. Moving it is not small: Markdown imports CodeBlock, EntityChip,
  CitationMarker, TableScroll and `entities` from `ai`, so it needs those injected first.
- Base UI warns once in a while in dev that a RadioGroup changes from uncontrolled to controlled
  (two in a full e2e run); not yet traced to a component.
- Dark Glass: `--code-comment` in a CodeBlock bare on a canvas is 3.72:1 at worst (Ruby on Hills)
  and about 4:1 on Network, Harbour and Facets. Line numbers are fine (5.59:1), and
  `e2e/code-tokens.spec.ts` holds only those in dark.
- `Base UI: CSS transitions and CSS animations both detected on Collapsible or Accordion panel`
  in dev, on pages with a Sidebar group or Accordion. Not yet traced to its rule.
- One Playwright page on the dev server stops loading after about 49,000 module requests (near
  33 loads of a catalogue page): a WebSocket fails, Vite reloads, and the page stays blank. Open
  a new page or change the appearance in place rather than navigating dozens of times in a test.

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
- A `start`/`end` Sheet opened after a page-level direction change inside the page keeps the
  earlier direction in production builds, but not in the dev server (`e2e/rtl.spec.ts:84`
  against `vite preview`; already present in 0.12.1).

For adoption into a consuming application, read docs/getting-started.md and docs/integration.md.
Bundled skills under skills/ cover adoption, component choice, forms, data views, assistant UI
and library authoring. Their guidance uses the API shipped with this exact release.
