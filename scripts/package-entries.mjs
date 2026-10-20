import { readFileSync } from "node:fs";

/**
 * Package specifiers for source modules. Only the named entries in package.json `exports`
 * resolve in a consumer: a module that is not an entry's target has no public path.
 */
export function entrySpecifiers(
  pkg = JSON.parse(readFileSync("package.json", "utf8")),
) {
  const bySource = new Map();
  for (const [key, target] of Object.entries(pkg.exports)) {
    const file = typeof target === "string" ? target : target.import;
    if (key.includes("*") || !file?.endsWith(".js")) continue;
    const source = file.replace(/^\.\/dist\//, "").replace(/\.js$/, "");
    const specifier = key === "." ? "glass-ux" : `glass-ux/${key.slice(2)}`;
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
export function publicSpecifier(source, entries = entrySpecifiers()) {
  if (entries.has(source)) return entries.get(source);
  if (source.startsWith("gallery/")) return `glass-ux/${source}`;
  return null;
}

/** Whether a package specifier resolves through package.json `exports` (patterns included). */
export function resolvesInPackage(
  specifier,
  pkg = JSON.parse(readFileSync("package.json", "utf8")),
) {
  if (specifier !== "glass-ux" && !specifier.startsWith("glass-ux/")) return true;
  const subpath = specifier === "glass-ux" ? "." : `./${specifier.slice(9)}`;
  return Object.keys(pkg.exports).some((key) => {
    if (!key.includes("*")) return key === subpath;
    const [before, after] = key.split("*");
    return (
      subpath.length > before.length + after.length &&
      subpath.startsWith(before) &&
      subpath.endsWith(after)
    );
  });
}
