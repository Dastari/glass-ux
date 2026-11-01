import { existsSync, readFileSync } from "node:fs";

const manifest = () => JSON.parse(readFileSync("package.json", "utf8"));

/** A package's `exports` as a map: a lone target or condition object is the `"."` entry. */
export function exportMap(pkg) {
  const { exports } = pkg;
  if (!exports) return {};
  return typeof exports === "string" ||
    !Object.keys(exports).some((key) => key.startsWith("."))
    ? { ".": exports }
    : exports;
}

const targetFile = (target) =>
  typeof target === "string" ? target : (target?.import ?? target?.default);

const specifierFor = (name, key) =>
  key === "." ? name : `${name}/${key.slice(2)}`;

/**
 * Package specifiers for source modules. Only the named entries in package.json `exports`
 * resolve in a consumer: a module that is not an entry's target has no public path.
 */
export function entrySpecifiers(pkg = manifest(), outDir = "dist") {
  const bySource = new Map();
  for (const [key, target] of Object.entries(exportMap(pkg))) {
    const file = targetFile(target);
    if (key.includes("*") || !file?.endsWith(".js")) continue;
    const source = file.replace(`./${outDir}/`, "").replace(/\.js$/, "");
    const specifier = specifierFor(pkg.name, key);
    // Two keys for one module (./appearance, ./lib/appearance): the shorter is the documented one.
    const known = bySource.get(source);
    if (!known || specifier.length < known.length) bySource.set(source, specifier);
  }
  return bySource;
}

/**
 * The package specifier for a module path relative to src/ without its extension
 * (`ui/button/index` → `glass-ux/button`). Gallery modules keep their workspace path
 * (`glass-ux/gallery/...`); any other module that is not an entry returns null.
 */
export function publicSpecifier(
  source,
  entries = entrySpecifiers(),
  name = manifest().name,
) {
  if (entries.has(source)) return entries.get(source);
  if (source.startsWith("gallery/")) return `${name}/${source}`;
  return null;
}

/** Whether a package specifier resolves through package.json `exports` (patterns included). */
export function resolvesInPackage(specifier, pkg = manifest()) {
  if (specifier !== pkg.name && !specifier.startsWith(`${pkg.name}/`)) return true;
  const subpath =
    specifier === pkg.name ? "." : `./${specifier.slice(pkg.name.length + 1)}`;
  return Object.keys(exportMap(pkg)).some((key) => {
    if (!key.includes("*")) return key === subpath;
    const [before, after] = key.split("*");
    return (
      subpath.length > before.length + after.length &&
      subpath.startsWith(before) &&
      subpath.endsWith(after)
    );
  });
}

const matches = (rule, key) =>
  rule instanceof RegExp ? rule.test(key) : rule === key;

/** The source file behind a built module, or null when there is none. */
export function sourceFile(file, { outDir, srcDir }) {
  const base = file
    .replace(new RegExp(`^(?:\\./)?${outDir}/`), `${srcDir}/`)
    .replace(/\.js$/, "");
  return [`${base}.ts`, `${base}.tsx`].find((path) => existsSync(path)) ?? null;
}

/**
 * The entries a project documents, read from `exports`: concrete JavaScript keys in sorted
 * order, wildcards through `entries.expand`, then `entries.last`. A component re-exported by
 * several entries belongs to the first read, so the order is part of the output.
 */
export function documentedEntries(kit) {
  const { exclude, expand, last } = kit.entries;
  const found = [];
  for (const [key, target] of Object.entries(exportMap(kit.pkg))) {
    if (exclude.some((rule) => matches(rule, key))) continue;
    const file = targetFile(target);
    if (!file?.endsWith(".js")) continue;
    const keys = key.includes("*")
      ? (expand[key] ?? []).map((name) => [key.replace("*", name), name])
      : [[key, undefined]];
    for (const [concrete, name] of keys) {
      const source = sourceFile(
        name === undefined ? file : file.replaceAll("*", name),
        kit,
      );
      if (!source) continue;
      found.push({
        key: concrete,
        file: source,
        entry: specifierFor(kit.name, concrete),
        // The root entry has no family of its own: each of its exports is one.
        family: concrete === "." ? null : concrete.split("/").pop(),
      });
    }
  }
  const rank = (entry) => {
    const index = last.indexOf(entry.key);
    return index < 0 ? -1 : index;
  };
  return found.sort(
    (a, b) =>
      rank(a) - rank(b) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
}
