/** One component as the generators see it, for {@link DocsKitConfig.section}. */
export interface DocsKitComponent {
  /** Kebab-case identifier, also the API page's file name. */
  id: string;
  /** The exported name. */
  name: string;
  /** Package specifier, such as `"my-package/gauge"`. */
  entry: string;
  /** The entry's last path segment; each export of the `"."` entry is its own family. */
  family: string;
}

/**
 * A family documented on one page rather than one page per export, such as a set of icons that
 * share their props.
 */
export interface DocsKitCollection {
  /** Page and section identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** The family whose exports the page lists. */
  family: string;
  /** Other families kept out of the component catalogue. */
  alsoFamilies?: readonly string[];
  /** The source module, which may carry one shared `@packageDocumentation` comment. */
  file: string;
  /** Lead paragraph of the API page. */
  description: string;
  /** The sentence shown on the site's page. */
  summary: string;
  /** The export named in the page's import line. */
  sample: string;
  /** Extra Markdown after the import line. */
  prose?: string;
  /** Description for an export without its own TSDoc. */
  fallback?: (name: string) => string;
}

/** A gzip budget for one entry or one named import, in `glass-ux-docs check size`. */
export interface DocsKitBudget {
  /** Package specifier. */
  entry: string;
  /** Measures this import instead of the whole entry. */
  named?: string;
  /** Bytes after gzip. */
  gzip: number;
  /** Packages or `dist` modules that must stay out of the initial chunk. */
  forbid?: readonly string[];
}

/** The settings in `docs-kit.config.mjs`. Everything else comes from `package.json`. */
export interface DocsKitConfig {
  /** Display name. Default: the package name. */
  title?: string;
  /** Default: `homepage`. Live-example links use it; without one the pages omit them. */
  siteUrl?: string;
  /** Default `"src"`: how an export's target maps back to source. */
  srcDir?: string;
  /** Default `"dist"`. */
  outDir?: string;
  /** Default: every JavaScript key in `exports`. */
  entries?: {
    /** Leaves out exports such as `"."`, or everything under `/^\.\/testing/`. */
    exclude?: readonly (string | RegExp)[];
    /** Expands wildcards: `"./panels/*": ["layers", "adjust"]`. */
    expand?: Readonly<Record<string, readonly string[]>>;
    /** Extra TypeDoc entry points with no catalogue page: hooks, headless modules. */
    referenceOnly?: readonly string[];
    /**
     * Export keys to read after the rest, in this order. A component re-exported by two entries
     * is documented under the first one read.
     */
    last?: readonly string[];
  };
  /** Default `"<srcDir>/gallery"`: sections, demos, examples and generated files. */
  galleryDir?: string;
  /** Default `"docs"`. */
  docsDir?: string;
  /** Family id to root component: every export of the family joins that component's page. */
  families?: Readonly<Record<string, string>>;
  /** Component id to the related exports on its page, in display order. */
  familyMembers?: Readonly<Record<string, readonly string[]>>;
  /** Guide files under `docsDir`, routed and copied for the site. A bare id takes its title from the first heading. */
  guides?: readonly (string | { id: string; title: string })[];
  /** Text and links for `llms.txt`. Omit to skip it. */
  llms?: { intro: string; links: readonly { title: string; path: string }[] };
  /** Merged over the generic prop descriptions. */
  propDescriptions?: Readonly<Record<string, string>>;
  /** The section showing a component. Default: the section named after its family. */
  section?: (component: DocsKitComponent) => string | undefined;
  /** Families documented on one page. */
  collections?: readonly DocsKitCollection[];
  /** Family id to the badge on its pages. Default: "Component reference". */
  badges?: Readonly<Record<string, string>>;
  /** Default `"apps/docs/dist"`. */
  siteDir?: string;
  /** Default `".docs-kit/typedoc"`. Ignore it in git. */
  typedocDir?: string;
  /** Inputs for `glass-ux-docs check`. */
  checks?: {
    /** Folders for logical properties, tokens and CSS performance. Default: `srcDir`. */
    styleDirs?: readonly string[];
    /** Overrides `styleDirs` for the logical properties check. */
    logicalDirs?: readonly string[];
    /** Overrides `styleDirs` for component CSS in the tokens check. */
    tokenDirs?: readonly string[];
    /** Overrides `styleDirs` for the CSS performance check. */
    perfDirs?: readonly string[];
    /** Folders that may use fixed lengths. Default: the gallery and the site's source. */
    presentationDirs?: readonly string[];
    /** Files that map radius roles to steps. */
    radiusAllow?: readonly string[];
    /** The project's own forbidden terms. A string matches literally, ignoring case. */
    forbidden?: readonly (string | RegExp)[];
    /** Gzip budgets. `check size` runs only when there are some. */
    budgets?: readonly DocsKitBudget[];
    /** Checks citations such as R5.8 in `dirs` against a rules document. Omit to skip. */
    rules?: { file: string; dirs: readonly string[] };
  };
}

/** Types a project's config. It returns the config unchanged. */
export function defineDocsKit(config: DocsKitConfig): DocsKitConfig;

/** The file `glass-ux-docs` reads from the project root. */
export const CONFIG_FILE: "docs-kit.config.mjs";
