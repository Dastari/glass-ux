import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** The file `glass-ux-docs` reads from the project root. */
export const CONFIG_FILE = "docs-kit.config.mjs";

/** Types a project's config. It returns the config unchanged. */
export function defineDocsKit(config) {
  return config;
}

const repositoryUrl = (pkg) => {
  const url =
    typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
  return url
    ?.replace(/^git\+/, "")
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "");
};

const trailingSlash = (url) =>
  url && !url.endsWith("/") ? `${url}/` : (url ?? undefined);

/** A guide's title: the given one, else its first heading, else its file name. */
function guideTitle(id, docsDir) {
  const file = join(docsDir, `${id}.md`);
  const heading =
    existsSync(file) && /^#\s+(.+)$/m.exec(readFileSync(file, "utf8"))?.[1];
  return heading || id;
}

/** Applies the defaults and reads what `package.json` already states. */
export function resolveDocsKit(config, pkg) {
  const srcDir = config.srcDir ?? "src";
  const docsDir = config.docsDir ?? "docs";
  const galleryDir = config.galleryDir ?? `${srcDir}/gallery`;
  const siteDir = config.siteDir ?? "apps/docs/dist";
  const repository = repositoryUrl(pkg);
  const checks = config.checks ?? {};
  const styleDirs = checks.styleDirs ?? [srcDir];
  return {
    pkg,
    name: pkg.name,
    version: pkg.version,
    title: config.title ?? pkg.name,
    siteUrl: trailingSlash(config.siteUrl ?? pkg.homepage),
    repository,
    srcDir,
    outDir: config.outDir ?? "dist",
    galleryDir,
    docsDir,
    siteDir,
    typedocDir: config.typedocDir ?? ".docs-kit/typedoc",
    entries: {
      exclude: config.entries?.exclude ?? [],
      expand: config.entries?.expand ?? {},
      referenceOnly: config.entries?.referenceOnly ?? [],
      last: config.entries?.last ?? [],
    },
    families: config.families ?? {},
    familyMembers: config.familyMembers ?? {},
    guides: (config.guides ?? []).map((guide) =>
      typeof guide === "string"
        ? { id: guide, title: guideTitle(guide, docsDir) }
        : guide,
    ),
    llms: config.llms,
    propDescriptions: config.propDescriptions ?? {},
    section: config.section,
    collections: config.collections ?? [],
    badges: config.badges ?? {},
    checks: {
      logicalDirs: checks.logicalDirs ?? styleDirs,
      tokenDirs: checks.tokenDirs ?? styleDirs,
      perfDirs: checks.perfDirs ?? styleDirs,
      presentationDirs: checks.presentationDirs ?? [
        galleryDir,
        siteDir.replace(/dist$/, "src"),
      ],
      radiusAllow: checks.radiusAllow ?? [],
      forbidden: checks.forbidden ?? [],
      budgets: checks.budgets ?? [],
      rules: checks.rules,
    },
  };
}

/** Reads `package.json` and {@link CONFIG_FILE}, which is optional, from a project root. */
export async function loadDocsKit(root = process.cwd()) {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const file = resolve(root, CONFIG_FILE);
  const config = existsSync(file)
    ? (await import(pathToFileURL(file).href)).default
    : {};
  return resolveDocsKit(config, pkg);
}

/** A forbidden term as a pattern: a string matches literally, ignoring case. */
export function forbiddenPattern(term) {
  return term instanceof RegExp
    ? term
    : new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}
