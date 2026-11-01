import { createContext, lazy, use, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { createComponentFamilies, type FamilyConfig, type FamilyEntry } from "./families.js";
import type { SectionGroup, SectionMeta } from "./types.js";

/** One catalogue entry in `site.generated.ts`. */
export interface SiteComponent extends FamilyEntry {
  entry: string;
  description: string;
  section: string;
}

/** A family documented on one page, such as a set of icons. */
export interface SiteCollection extends SiteComponent {
  /** The export named in the page's import line. */
  sample: string;
}

type SiteModule = { default: ComponentType };

/** Each export's focused demo and the specimens it shows. */
export type SiteCoverage = ReadonlyArray<{ id: string; specimens?: Array<{ key: string; title: string }> }>;

/** What component pages load on demand, from `site-content.generated.ts`. */
export interface SiteContent {
  /** The specimens each export's focused demo shows, from the demo generator. */
  loadCoverage: () => Promise<SiteCoverage>;
  /** Each focused demo's module, by path. */
  demoLoaders: Record<string, () => Promise<SiteModule>>;
  /** Fetches one export's API reference. */
  loadApi: (id: string) => Promise<unknown>;
  /** Fetches one export's complete usage source. */
  loadExample: (id: string) => Promise<string>;
}

/** What `glass-ux-docs api` writes to `site.generated.ts`: the project's catalogue and its loaders. */
export interface DocsSite {
  /** Display name. */
  title: string;
  /** The package the pages document. */
  packageName: string;
  /** Version the pages and links describe. */
  version: string;
  /** Repository home page, when `package.json` names one. */
  repositoryUrl: string | null;
  /** Where relative links in guides resolve; without one they stay as written. */
  docsSourceUrl: string | null;
  /** Generated catalogue. */
  catalogue: readonly SiteComponent[];
  /** Which exports share a document. */
  families: FamilyConfig;
  /** Guides in navigation order. */
  guides: readonly { id: string; title: string }[];
  /** Families documented on one page. */
  collections: readonly SiteCollection[];
  /** Family id to the badge on its pages. */
  badges: Readonly<Record<string, string>>;
  /** Each section's metadata, by module path. */
  sectionMetas: Record<string, unknown>;
  /** Each section's module, by path. */
  sectionLoaders: Record<string, () => Promise<SiteModule>>;
  /** Loads what component pages need, apart from navigation. */
  loadContent: () => Promise<SiteContent>;
  /** Fetches one guide's Markdown. */
  loadGuide: (id: string) => Promise<string>;
}

/** A section with its lazily loaded component. */
export interface SiteSection extends SectionMeta {
  Component: LazyExoticComponent<ComponentType>;
}

/** Gallery navigation groups in display order; sections sort by group, then by their `order`. */
export const GROUPS: SectionGroup[] = ["Foundations", "Components", "Patterns", "Charts", "AI", "Screens"];

const moduleId = (path: string) => path.split("/").pop()!.replace(/\.[^.]+$/, "");

/** Caches a loader's result per id, so pages sharing an export fetch it once. */
function once<T>(load: (id: string) => Promise<T>) {
  const promises = new Map<string, Promise<T>>();
  return (id: string) => {
    let promise = promises.get(id);
    if (!promise) {
      promise = load(id);
      promises.set(id, promise);
    }
    return promise;
  };
}

function createPageContent({ demoLoaders, loadApi, loadExample }: SiteContent, coverage: SiteCoverage) {
  const demoModules = new Map(Object.entries(demoLoaders).map(([path, loader]) => [moduleId(path), loader]));
  const loadDemo = once((id: string) => demoModules.get(id)?.() ?? Promise.reject(new Error(`No demo for ${id}.`)));
  return {
    specimens: new Map(coverage.map((entry) => [entry.id, entry.specimens ?? []])),
    loadDemo: (id: string) => (demoModules.has(id) ? loadDemo(id) : undefined),
    focusedDemos: new Map([...demoModules.keys()].map((id) => [id, lazy(() => loadDemo(id))])),
    loadApi: once(loadApi),
    loadExample: once(loadExample),
  };
}

function createRuntime(site: DocsSite) {
  const sections = Object.entries(site.sectionMetas)
    .flatMap(([path, meta]) => {
      const loader = site.sectionLoaders[path.replace(/\.meta\.js$/, ".section.js").replace(/\.meta\.ts$/, ".section.tsx")];
      return loader ? [{ ...(meta as SectionMeta), Component: lazy(loader) }] : [];
    })
    .toSorted((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.order - b.order);
  let content: Promise<ReturnType<typeof createPageContent>> | undefined;
  return {
    sections,
    findSection: (id: string): SiteSection | undefined => sections.find((section) => section.id === id),
    families: createComponentFamilies(site.catalogue, site.families),
    /** Component page content: a stable promise, so a page can suspend on it with `use`. */
    content: () =>
      (content ??= site.loadContent().then(async (loaded) => createPageContent(loaded, await loaded.loadCoverage()))),
  };
}

const runtimes = new WeakMap<DocsSite, ReturnType<typeof createRuntime>>();

/** One site's sections, families and cached loaders, shared by its pages. */
export function siteRuntime(site: DocsSite) {
  let runtime = runtimes.get(site);
  if (!runtime) {
    runtime = createRuntime(site);
    runtimes.set(site, runtime);
  }
  return runtime;
}

const DocsSiteContext = /* @__PURE__ */ createContext<DocsSite | null>(null);

/** Gives the documentation pages their project's generated `site`. Wrap the routes in it once. */
export function DocsKitProvider({ site, children }: { site: DocsSite; children: ReactNode }) {
  return <DocsSiteContext value={site}>{children}</DocsSiteContext>;
}

/** The `site` from the nearest {@link DocsKitProvider}. */
export function useDocsSite() {
  const site = use(DocsSiteContext);
  if (!site) throw new Error("Documentation pages need a DocsKitProvider.");
  return site;
}
