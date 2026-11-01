# Docs kit: design (item 28)

Status: approved on 2026-11-01 with the recommended defaults, and built. The usage guide is
[docs-kit.md](../docs-kit.md). "As built" below records where the result differs from this proposal.

## Decision

Publish a **separate package, `glass-ux-docs-kit`**, as a second versioned archive on each glass-ux
release, and have glass-ux use it itself. A sister project adds it as a dev dependency and writes
one config file. The `glass-ux` archive does not change. The name avoids `glass-ux-docs`, which is
the private docs app, and `glass-ux-docs.tar.gz`, which is the built site.

Size does not force this. The scripts and page shell are about 150 KB of source against 0.13.1's
10.1 MB unpacked and 3.2 MB archive, with budgets of 11 MB and 3.5 MB. The reason is that every
application installing glass-ux would otherwise receive a documentation generator, and `typescript`,
`typedoc` and `prettier` would become its optional peers. It is a development tool for libraries.

## What stops this being reused today

| File | Hard-coded |
| --- | --- |
| `scripts/docs-api.mjs` | `src/ui`, the list `ai`, `shell`, `windows`, the appearance, locale and icons entries, TypeDoc entry points, the "Glass UX" name, the live-examples URL, the guide list and `llms.txt` text. |
| `scripts/package-entries.mjs` | The `glass-ux/` prefix, including `specifier.slice(9)`. |
| `scripts/component-demos.mjs`, `check-docs.mjs` | `src/gallery/...` paths. |
| `scripts/docs-site.mjs` | `apps/docs/dist` and the guide routes. |
| `scripts/check-logical.mjs`, `check-tokens.mjs`, `check-bundle-size.mjs` | Source folders, allow lists, the budget table. |
| `src/gallery/documentation.tsx`, `guide.tsx` | JSON imports, `import.meta.glob("./demos/*.js")`, and `fetch(new URL(..., import.meta.url))` beside the module. |
| `src/gallery/registry.ts` | `import.meta.glob` of sibling sections, which can't run from inside a package. |
| `src/gallery/component-families.ts` | `familyRoots`, a table of glass-ux families. |

`scripts/check-boundaries.mjs` also holds a list of names forbidden in this repository. That list
is private to it and must never be published; the kit takes its list from config.

## What is published

| Part | Contents | Comes from |
| --- | --- | --- |
| Bin `glass-ux-docs` | `api`, `site`, `check [docs\|tokens\|logical\|css-perf\|pure\|boundaries\|size]`, `init` | `scripts/`, parameterised |
| `glass-ux-docs-kit/config` | `defineDocsKit` and its types | New |
| `glass-ux-docs-kit/react` | `DocsKitProvider`, `ComponentDocumentation`, `FoundationDocumentation`, `ApiReference`, `LibraryGuide`, `CatalogueIndex`, and the specimens: `Specimen`, `OnCanvas`, `Example`, `Matrix`, `Rules`, `TokenTable`, `ContainerLab`, `SwapSlot`, `TierBox`, `TierRow` | `src/gallery/` |
| `glass-ux-docs-kit/styles.css` | `documentation.css` and `gallery.css` only | `src/gallery/` |
| `templates/docs-app` | The site frame from `apps/docs`, copied once by `init` | `apps/docs/` |

Peers: `glass-ux` in the same minor, `react`, `typescript`, `typedoc`, `prettier`. `glass-ux
check-layout` stays where it is, in the main package's bin.

Not published: glass-ux's demos, sections, fixtures, guides, `component-examples.tsx`, and the
hundreds of generated API files. Those stay docs-site-only and each project generates its own.

## How a sister package configures it

Entries come from `package.json` `exports`, which `package-entries.mjs` already reads, so a project
lists only exceptions. The package name, version, homepage and repository also come from there.

```ts
export interface DocsKitConfig {
  /** Display name. Default: the package name. */
  title?: string
  /** Default: `homepage`. Live-example links and `llms.txt` use it. */
  siteUrl?: string
  /** Default "src" and "dist": how an export's target maps back to source. */
  srcDir?: string
  outDir?: string
  /** Default: every key in `exports`. */
  entries?: {
    /** Leaves out exports such as "./gallery" or "./package.json". */
    exclude?: readonly (string | RegExp)[]
    /** Expands wildcards: `"./panels/*": ["layers", "adjust"]`. */
    expand?: Readonly<Record<string, readonly string[]>>
    /** Extra TypeDoc entry points with no catalogue page: hooks, headless modules. */
    referenceOnly?: readonly string[]
  }
  /** Default "src/gallery": sections, demos, examples and generated files. */
  galleryDir?: string
  /** Default "docs". */
  docsDir?: string
  /** Family id to root component, replacing `familyRoots`. */
  families?: Readonly<Record<string, string>>
  /** Guide files under `docsDir`, routed and copied for the site. */
  guides?: readonly string[]
  /** Text and links for `llms.txt`. Omit to skip it. */
  llms?: { intro: string; links: readonly { title: string; path: string }[] }
  /** Merged over the generic prop descriptions. */
  propDescriptions?: Readonly<Record<string, string>>
  /** Default "apps/docs/dist". */
  siteDir?: string
  checks?: {
    /** Folders for logical properties, tokens and CSS performance. Default: `srcDir`. */
    styleDirs?: readonly string[]
    /** The project's own forbidden terms. */
    forbidden?: readonly string[]
    /** Gzip budgets, in `check-bundle-size` form. */
    budgets?: readonly { entry: string; named?: string; gzip: number; forbid?: readonly string[] }[]
  }
}

export function defineDocsKit(config: DocsKitConfig): DocsKitConfig
```

```ts
// docs-kit.config.mjs in glass-ux-image
import { defineDocsKit } from "glass-ux-docs-kit/config"

export default defineDocsKit({
  title: "Glass UX Image",
  entries: { exclude: ["./package.json"], referenceOnly: ["src/core/index.ts"],
    expand: { "./panels/*": ["layers", "adjust", "histogram", "history"] } },
  guides: ["getting-started", "hosting"],
  checks: { forbidden: ["internal-codename"] },
})
```

```jsonc
// package.json
"scripts": {
  "docs:api": "glass-ux-docs api",
  "docs:build": "glass-ux-docs api && pnpm build && vite build apps/docs && glass-ux-docs site",
  "docs:check": "glass-ux-docs check docs",
  "check": "glass-ux-docs check && tsc --noEmit && vitest run"
},
"devDependencies": {
  "glass-ux-docs-kit": "https://github.com/Dastari/glass-ux/releases/download/vX.Y.Z/glass-ux-docs-kit-X.Y.Z.tgz"
}
```

A sister project writes `src/gallery/sections/<id>.meta.ts` and `<id>.section.tsx` as glass-ux does.
`glass-ux-docs api` generates `docs/api/*.md`, the JSON, the demos and `site.generated.ts`. That
generated module holds the `import.meta.glob` calls, because Vite resolves them relative to the file
containing them, so they have to sit in the project:

```tsx
import { site } from "../../src/gallery/site.generated"
import { ComponentDocumentation, DocsKitProvider } from "glass-ux-docs-kit/react"

<DocsKitProvider site={site}>
  <ComponentDocumentation id={id} />
</DocsKitProvider>
```

`documentation.tsx` and `guide.tsx` then read `catalogue`, `coverage`, `sections`, `loadDemo`,
`loadApi`, `loadExample` and `loadGuide` from `site` rather than from module-relative paths. That
is the one structural change to the page shell. The rendered pages stay the same, and the tests in
`docs-api.test.mjs` and `test:production` guard them.

Both sister packages use it identically. The IDE's section 16 stops needing to port the scripts, and
its `pnpm docs:check` becomes this. The image proposal's "same pipeline" likewise. An application
with no components to document has no reason to install it.

## The release rules

| Rule in AGENTS.md | How this meets it |
| --- | --- |
| Built once, installed from the versioned release archive | The kit is packed once, attached to the same GitHub release, and installed by URL. |
| No installation-time build | Published `.js`, `.mjs`, `.d.ts` and `.css`, with no `prepare` or `postinstall`. The consumer's own `pnpm docs:api` runs at its development time. |
| No dependency on an unpublished workspace | Peers are released packages. The URL names a released archive. |
| Archive budget | The main archive gains nothing. `excluded()` in `pack-release.mjs` already drops `dist/gallery/`, and the kit does not touch it. The kit gets its own budget, set from a measurement when packed. |
| Docs-site-only files stay out | They stay out of `glass-ux`. The kit carries only the shell, never demos or fixtures. |
| Readable ESM, not minified | Same. |

Packing follows the existing staging pattern. A new `scripts/pack-docs-kit.mjs`:

1. Copies the kit's modules from `dist/gallery/` and the parameterised scripts into a staging folder.
2. Rewrites relative imports such as `../ui/notice/index.js` to public entries using
   `publicSpecifier`, and fails on any module with no public entry. `docs-api.mjs` already applies
   that rule to examples. `cx` and `usePhoneLayout` have no public entry today, so the shell moves
   to `clsx` and `useMediaQuery` first.
3. Applies the same reference check as `pack-release.mjs`, then packs and checks its budget.

Sources stay in `src/gallery/` and the 149 sections and 400 demos keep importing `kit.tsx`
unchanged, so there is no source churn and no build cycle.

The release route gains one line at step 3 and one asset in `SHA256SUMS`, and `release.yml` the same.
glass-ux's own scripts become thin calls into the same parameterised code, with a
`docs-kit.config.mjs` at the root, so the kit cannot drift from what built this site.

## Left out

Library build tooling: `scripts/build.mjs`, `client-boundaries.mjs` and `style-manifest.mjs`. Sister
packages also need these to be "built like glass-ux", but that is a different request. Also left
out: icon and font authoring, `pack-release.mjs`, CI workflows (`pages.yml` is a short copy), the
showcase, and any hosted search.

## As built

- The parameterised scripts live in `scripts/docs-kit/lib`, with the template in
  `scripts/docs-kit/templates`; the staging copy keeps those two folders at the package root.
- The config gained what glass-ux's output needed to stay byte-identical: `entries.last` (the order
  in which entries claim a re-exported component), `section` (the family-to-section rules),
  `collections` (the icons page), `badges`, `familyMembers` (the second table in
  `component-families.ts`) and `typedocDir`. `checks` gained per-check folders, `radiusAllow` and
  `rules`, and `forbidden` accepts patterns as well as literal strings, since this repository's list
  uses word boundaries.
- `site` has `sectionMetas`, `sectionLoaders`, `loadGuide` and `loadContent`. `loadCoverage`, the
  demo loaders, `loadApi` and `loadExample` sit in a second generated module, `site-content.generated.ts`,
  that loads on demand. Vite inlines small assets as data URLs in the chunk holding the
  `new URL(...)` pattern, so in `site.generated.ts` they tripled glass-ux's first chunk, from 708 KB
  to 2.2 MB. `ComponentDocumentation` suspends on that module, so a page needs `Suspense`.
- `families.generated.json` carries the two family tables, because `component-families.ts` also runs
  under Playwright, where a module with `import.meta.glob` cannot load.
- `docs/docs-kit.md` ships as the kit's README and is excluded from the main archive.
- `clsx` and `postcss` are dependencies of the kit; `vite` is an optional peer for `check size`.

## Open decisions

These were settled on 2026-11-01 with the recommended option in each case.

1. **Separate package.** Recommended: yes, as above. The alternative is `glass-ux/docs-kit` inside
   the main archive. It fits the budget but gives every application a tool it will never run.
2. **Source location.** Recommended: stay in `src/gallery/` and pack from staging. A real
   `packages/docs-kit` workspace has cleaner boundaries, but `src/gallery` would then depend on a
   package that depends on glass-ux, inside one TypeScript build, so the whole gallery would have to
   leave the root build first.
3. **Site frame.** Recommended: a template copied once by `init`, since the 854-line `main.tsx`
   carries each site's brand, navigation and showcase. A `DocsSite` component would stay in step
   with fixes, but is a large public API for a frame that changes rarely.
4. **Version coupling.** Recommended: released in lockstep with glass-ux, with a peer on the same
   minor. An independent version would need a compatibility table.
5. **Library build tooling.** Recommended: a separate item if the owner wants it. Worth deciding now,
   because the `"use client"` transformer is the next thing both sister packages would copy.
