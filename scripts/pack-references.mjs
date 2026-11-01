import { existsSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"

/** The relative imports, asset URLs and stylesheet references of a staged file, by type. */
export const REFERENCES = {
  ".js": /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*|new URL\(\s*)["'](\.{1,2}\/[^"']+)["']/g,
  ".d.ts": /(?:\bfrom\s*|\bimport\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g,
  ".css": /(?:@import\s+|url\(\s*)["']?(\.{1,2}\/[^"')\s]+)["']?/g,
}

/** The reference pattern for a staged path, or undefined for a file with none. */
export const referenceKind = (path) => (path.endsWith(".d.ts") ? ".d.ts" : Object.keys(REFERENCES).find((ext) => path.endsWith(ext)))

/**
 * Every export target and every relative import, asset URL and stylesheet reference must
 * resolve inside the staged package, so nothing left out is still needed.
 */
export function stagedProblems(stage, staged, exports) {
  const problems = []
  const exists = (path) => existsSync(join(stage, path))
  for (const [key, target] of Object.entries(exports)) {
    for (const file of typeof target === "string" ? [target] : Object.values(target)) {
      const path = file.replace(/^\.\//, "")
      const ok = path.includes("*") ? exists(path.slice(0, path.indexOf("*"))) : exists(path)
      if (!ok) problems.push(`export ${key} → ${file} is missing`)
    }
  }
  for (const path of staged) {
    const kind = referenceKind(path)
    if (!kind) continue
    for (const [, specifier] of readFileSync(join(stage, path), "utf8").matchAll(REFERENCES[kind])) {
      const target = relative(stage, resolve(join(stage, dirname(path)), specifier.replace(/[?#].*$/, "")))
      const candidates = kind === ".d.ts" ? [target, target.replace(/\.js$/, ".d.ts"), `${target}.d.ts`] : [target]
      if (!candidates.some(exists)) problems.push(`${path} → ${specifier} is missing`)
    }
  }
  return problems
}
