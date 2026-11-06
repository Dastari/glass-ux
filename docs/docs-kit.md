# glass-ux-docs-kit

The documentation tooling Glass UX builds its own site with, for packages built on `glass-ux`:
generated API pages, catalogue pages with examples, usage and API sections, and the documentation
checks. It is a development tool. An application with no components to document has no reason to
install it.

It ships as a second archive on each `glass-ux` release, in the same version, with a peer on the
same minor. Install both from that release. Nothing builds at install time.

## Set up a package

The package needs `exports` in `package.json`, TypeScript sources under `src`, and a `tsconfig.json`
that includes `src/gallery` with `resolveJsonModule` on.

```sh
pnpm add -D \
  https://github.com/Dastari/glass-ux/releases/download/vX.Y.Z/glass-ux-X.Y.Z.tgz \
  https://github.com/Dastari/glass-ux/releases/download/vX.Y.Z/glass-ux-docs-kit-X.Y.Z.tgz
pnpm exec glass-ux-docs init
pnpm install
```

`init` runs once. It copies the site frame to `apps/docs`, writes `docs-kit.config.mjs`, creates
`src/gallery/sections`, adds the `docs:api`, `docs:dev`, `docs:build` and `docs:check` scripts and
the site's development dependencies, and ignores `.docs-kit/` and `apps/docs/dist/`. Anything that
already exists stays as it is, so the frame is yours to change. A later kit release does not touch
it.

Keep `src/gallery` out of the package's own build, as `exclude` in `tsconfig.build.json` or
equivalent. The site reads the sources directly.

## Document a component

Write a section beside the others. The id names the family, which is the last segment of the
export (`./tide-gauge` is the family `tide-gauge`).

```ts
// src/gallery/sections/tide-gauge.meta.ts
import type { SectionMeta } from "glass-ux-docs-kit/react";

export const meta: SectionMeta = {
  id: "tide-gauge",
  title: "Tide gauge",
  group: "Components",
  order: 10,
  summary: "A harbour's water level against its highest tide.",
};
```

```tsx
// src/gallery/sections/tide-gauge.section.tsx
import { Example, SectionPage, Specimen } from "glass-ux-docs-kit/react";
import { TideGauge } from "../../tide-gauge/index.js";

export default function TideGaugeSection() {
  return (
    <SectionPage>
      <Specimen title="Levels" description="Metres above chart datum.">
        <Example label="Low water">
          <TideGauge harbour="Port Vellum" level={1.2} />
        </Example>
      </Specimen>
    </SectionPage>
  );
}
```

Import components relatively, from their entry's index module: the generator rewrites those imports
to public entries for the usage example, and stops if a module has no public entry. Give every prop
TSDoc, because the API page reads it.

```sh
pnpm docs:api    # docs/api/*.md, the JSON, demos, examples and site.generated.ts
pnpm docs:dev    # the site, from source
pnpm docs:build  # the static site in apps/docs/dist
pnpm exec glass-ux-docs check
```

## Commands

| Command | Does |
| --- | --- |
| `glass-ux-docs api` | Generates API pages, JSON, focused demos, usage examples, the site modules, `llms.txt` and TypeDoc. |
| `glass-ux-docs site` | Copies the built page to each route, so a static host serves deep links, and adds TypeDoc under `api/`. |
| `glass-ux-docs check` | Runs every check below. `size` runs only with budgets. |
| `glass-ux-docs check docs` | Each component has a purpose, a live demo, a usage example and an API page, own props are described, public exports have TSDoc, and Markdown links resolve. |
| `glass-ux-docs check tokens` | No raw colours, lengths, durations or radius steps outside the token layer. |
| `glass-ux-docs check logical` | Library CSS uses logical properties, or carries `/* logical:allow <reason> */`. |
| `glass-ux-docs check css-perf` | No selectors or infinite animations that re-style or redraw on every change. |
| `glass-ux-docs check pure` | Module-level wrapper calls carry `/* @__PURE__ */`. |
| `glass-ux-docs check boundaries` | Forbidden terms stay out of `src` and `docs`, and components import no application code. |
| `glass-ux-docs check size` | Gzip budgets for entries and named imports. Needs the `vite` peer. |
| `glass-ux-docs init` | Copies the site frame and config, once. |

`glass-ux check-layout` stays in the main package's bin.

## Configure

`docs-kit.config.mjs` lists exceptions. The package name, version, homepage, repository and entries
come from `package.json`.

```ts
import { defineDocsKit } from "glass-ux-docs-kit/config";

export default defineDocsKit({
  title: "Tidewatch UI",
  entries: {
    exclude: ["."],
    expand: { "./panels/*": ["layers", "adjust"] },
    referenceOnly: ["src/core/index.ts"],
  },
  guides: ["setup", { id: "hosting", title: "Hosting" }],
  llms: {
    intro: "Tide gauges for harbour dashboards.",
    links: [{ title: "Setup", path: "docs/setup.md" }],
  },
  checks: {
    forbidden: ["internal-codename", /customer-\d+/i],
    budgets: [{ entry: "tidewatch-ui/tide-gauge", named: "TideGauge", gzip: 5_000 }],
  },
});
```

| Setting | Default | Meaning |
| --- | --- | --- |
| `title` | Package name | Display name. |
| `siteUrl` | `homepage` | Live-example links. Without one the pages omit them. |
| `srcDir`, `outDir` | `src`, `dist` | How an export's target maps back to source. |
| `entries.exclude` | None | Export keys or patterns left out. Non-JavaScript exports are skipped anyway. |
| `entries.expand` | None | Values for a wildcard export. A wildcard with none is skipped. |
| `entries.referenceOnly` | None | Extra TypeDoc entry points with no catalogue page. |
| `entries.last` | None | Export keys read last. A component re-exported by two entries belongs to the first read. |
| `galleryDir` | `src/gallery` | Sections, demos, examples and generated files. |
| `docsDir` | `docs` | Guides and generated API pages. |
| `families` | None | Family id to root component: its exports share that page. |
| `familyMembers` | None | Component id to the related exports on its page, in order. |
| `guides` | None | Guide files under `docsDir`. A bare id takes its title from the first heading. |
| `llms` | Skipped | Text and links for `llms.txt`. |
| `propDescriptions` | None | Merged over the generic prop descriptions. |
| `hooks` | None | Steps only your project has: `generate(kit)` runs in `api` after the demos, `check(kit)` returns failures for `check docs`, and `routes(kit)` lists further routes `site` writes. |
| `section` | The family | Function from a component to the section that shows it. |
| `collections` | None | Families documented on one page, such as icons. |
| `badges` | "Component reference" | Family id to the badge on its pages. |
| `siteDir` | `apps/docs/dist` | The built site. |
| `typedocDir` | `.docs-kit/typedoc` | TypeDoc's HTML output. |
| `checks.styleDirs` | `srcDir` | Folders for the CSS checks. `logicalDirs`, `tokenDirs` and `perfDirs` override it per check. |
| `checks.presentationDirs` | Gallery and site source | Folders that may use fixed lengths. |
| `checks.radiusAllow` | None | Files that map radius roles to steps. |
| `checks.forbidden` | None | Terms that must not appear. A string matches literally, ignoring case. |
| `checks.budgets` | None | Gzip budgets. |
| `checks.rules` | Skipped | A rules document and the folders whose citations it must define. |

The root export has no family of its own, so each of its components is one. A package with only
`"."` writes one section per component.

## The site

`glass-ux-docs api` writes `src/gallery/site.generated.ts` and `site-content.generated.ts`, which hold
the `import.meta.glob` calls because Vite resolves them against the file containing them. Component
page content stays in the second, which loads on demand, so navigation stays small. Pass `site` to
the provider:

```tsx
import { ComponentDocumentation, DocsKitProvider } from "glass-ux-docs-kit/react";
import { site } from "../../../src/gallery/site.generated";

<DocsKitProvider site={site}>
  <ComponentDocumentation id={id} />
</DocsKitProvider>;
```

Wrap the pages in `Suspense`: a component page loads that content on first render.

`FoundationDocumentation` shows any section in the Foundations group as a reference page, badged
"Foundation". A section that is a tool, a filter or a kit sets `badge` in its meta (`badge: "Tool"`),
or the page takes a `badge` prop.

`TemplateDocumentation` is a page for a whole screen: pass its `title`, `summary`, `screen` and the
`sources` to show under it. `TemplatePreview` draws the `screen` alone, inside your `shell` if you
pass one. Neither knows a catalogue, so give them a lazy component to load the screen with the page.

`glass-ux-docs-kit/react` exports the pages (`ComponentDocumentation`, `FoundationDocumentation`,
`TemplateDocumentation`, `TemplatePreview`, `ApiReference`, `UsageExample`, `LibraryGuide`,
`CatalogueIndex`), the specimens (`SectionPage`,
`Specimen`, `OnCanvas`, `Example`, `Matrix`, `Rules`, `TokenTable`, `ContainerLab`, `SwapSlot`,
`TierBox`, `TierRow`), `DocsKitProvider`, `useDocsSite` and `siteRuntime`.
`glass-ux-docs-kit/styles.css` holds the page and specimen styles. The frame's stylesheet imports it
and names the folders Tailwind scans.

Set `DOCS_BASE=/my-package/` for a site under a sub-path, such as GitHub Pages.
