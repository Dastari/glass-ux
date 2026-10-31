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

Styles ship per component. A component's stylesheet sits beside it (`select.tsx`,
`select.css`); `pnpm styles` regenerates `components.css`, and `pnpm build` writes
`dist/styles/manifest.json`, the sheets each entry needs for `glass-ux styles`. The manifest
follows imports, each module's own sheet, `fa-*` class names written in strings (a template
prefix such as `` `fa-chip-${tone}` `` counts) and custom properties or keyframes another
sheet declares. It cannot see a rule that matches only an attribute or element, so reach
another component's styles through its classes or by importing it. Put styles in
`@layer components`, use logical properties, and keep foundation tokens in the foundation
sheets. After changing a closure, render the demo with the selective stylesheet as well as
the full one.

Every word is a message, and every number, percentage, list, plural, date, duration, byte
size and week goes through the locale:
- Use the cached helpers in `src/lib/locale/intl.ts` (`numberFormat`, `formatPercent`,
  `listFormat`, `pluralRules`, `relativeTimeFormat`, `dateTimeFormat`), `formatByteSize`,
  `weekInfo` and `foldText` for search. Never write `new Intl.*` in a render path.
- Pass application text to messages as written. A message decides its own case: an English
  default that needs lower case calls `toLocaleLowerCase("en")` itself.
- Count-based APIs take plural forms (`Partial<Record<Intl.LDMLPluralRule, string>> &
  { other: string }`) chosen with `pluralRules`, never `count === 1`.
- Format a count before it reaches a message.
- `src/i18n/source.test.ts` rejects lower-casing message text, `=== 1` plurals, `}%` in JSX
  and `.join(", ")`.

Horizontal arrow keys go through `readingKey`. Add direction-bearing icons to the mirror list
in `src/ui/icon/icon.tsx`, and flip horizontal sweeps under `:dir(rtl)`.

Keep modules tree-shakable and renders cheap:
- Mark module-level `Object.assign`, `memo`, `createContext`, `lazy` and similar wrappers
  `/* @__PURE__ */` (`pnpm pure:check --fix` inserts them).
- Measure layout when a signature of the inputs changes or an observer fires, not after
  every render.
- Use the shared observers and media lists (`observeElementSizes`, `mediaList`).
- Stop timers when their text can no longer change.
- Pass copy or export text as a function so it is built on demand.
- Add a `check-bundle-size.mjs` budget, with `forbid` for heavy dependencies, when a new
  entry loads one on demand.

Accessibility patterns that are easy to get wrong:
- Keep ticking text (elapsed times, countdowns, relative times) out of `role="status"` and
  live regions. Announce state changes from a separate polite region.
- Visually hidden text is absolutely positioned. Inside a scroller, give it a positioned
  ancestor within the scroller, or it escapes and widens the page in RTL.
- Merge a caller's `aria-describedby` with your own ids instead of replacing it.
- Every drag has a single-pointer alternative, such as a Move menu (WCAG 2.5.7). Small
  buttons keep a 24px hit area through a pseudo-element sized with `--target-aa` (2.5.8).
- A pointer-opened popup closes on Escape wherever focus is.
- Plain character-key shortcuts respect `shortcutAllowed` (`configureShortcuts`).
- List items stay `li`: put interactive roles on an inner element.
- Add an axe scan and keyboard steps to the family's browser spec.
- Freeze the clock (`page.clock.setFixedTime`) in specs whose fixtures use fixed dates.

Document controlled/uncontrolled state, value units, valid options, defaults, callbacks and
keyboard behaviour. Name single selection `selectedId`, `defaultSelectedId` and
`onSelectedIdChange(id, details)` with `SelectionChangeDetails`, as Tree does. Add a live specimen with fictional fixtures, loaded/skeleton parity and
relevant disabled, empty, invalid, pending and error states.

Update the public package entry and API catalogue mapping. Run `pnpm docs:api`, `pnpm check`
(which includes `pure:check`, `size:check` and the style-manifest tests),
the static docs build and affected browser tests. Verify the packed artifact when changing
exports, dependencies or assets. Release and publication remain governed by the repository's
versioned release workflow and the user's requested scope.
Before publishing documentation, build with `GLASS_UX_BASE=/glass-ux/` and run
`pnpm test:production`. Its rendered-colour and syntax checks catch palette cascade and
lazy-chunk failures that control state and development-server checks can miss.
