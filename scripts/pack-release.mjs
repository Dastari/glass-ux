#!/usr/bin/env node
/**
 * Pack the release archive from a staging copy of the package. The archive carries the
 * library, its types, styles and fonts, the rules, guides, API pages and skills. It leaves out
 * what only the documentation site uses: the gallery (published on GitHub Pages and as the
 * glass-ux-docs.tar.gz release asset), source maps, the TypeDoc JSON model and brand source
 * artwork. The workspace manifest keeps its `./gallery` entries for the docs app; the staged
 * manifest drops them, with the scripts and devDependencies.
 *
 * Run after `pnpm build` (or `pnpm docs:build`). Plain `pnpm pack` still packs everything.
 *   node scripts/pack-release.mjs --out .handoff/release   write the archive there
 *   node scripts/pack-release.mjs --check                  pack to a temporary folder, check, discard
 */
import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const args = process.argv.slice(2)
const check = args.includes("--check")
const outIndex = args.indexOf("--out")
const out = outIndex === -1 ? join(root, ".handoff") : resolve(args[outIndex + 1])

/** Budgets with about 15% headroom; raise one deliberately with the change that needs it. */
const BUDGET = { unpacked: 7_000_000, archive: 2_400_000 }

/** Paths relative to the package root that the release leaves out. */
const excluded = (path) =>
  path.startsWith("dist/gallery/") ||
  path.endsWith(".map") ||
  path === "docs/api/typedoc.json" ||
  (path.startsWith("public/brand/") && path !== "public/brand/glass-ux.svg")

class PackError extends Error {}
const fail = (message) => {
  throw new PackError(message)
}

if (!existsSync(join(root, "dist/index.js"))) {
  console.error("pack-release: dist/ is missing. Run pnpm build first.")
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
const stage = mkdtempSync(join(tmpdir(), "glass-ux-release-"))
const staged = []

function copy(path) {
  const from = join(root, path)
  if (statSync(from).isDirectory()) {
    for (const name of readdirSync(from).toSorted()) copy(`${path}/${name}`)
  } else if (!excluded(path)) {
    cpSync(from, join(stage, path))
    staged.push(path)
  }
}

try {
  for (const entry of [...pkg.files, "LICENSE", "README.md", "CHANGELOG.md"]) {
    if (existsSync(join(root, entry)) && !staged.includes(entry)) copy(entry)
  }

  // The maps are not shipped, so the comments pointing at them go too.
  for (const path of staged.filter((file) => file.endsWith(".js"))) {
    const file = join(stage, path)
    const text = readFileSync(file, "utf8")
    const stripped = text.replace(/\n\/\/# sourceMappingURL=\S+\s*$/, "\n")
    if (stripped !== text) writeFileSync(file, stripped)
  }

  const exports = Object.fromEntries(Object.entries(pkg.exports).filter(([key]) => !key.startsWith("./gallery")))
  const { scripts: _scripts, devDependencies: _devDependencies, ...manifest } = pkg
  writeFileSync(join(stage, "package.json"), `${JSON.stringify({ ...manifest, exports }, null, 2)}\n`)

  // Every export target and every relative import, asset URL and stylesheet reference must
  // resolve inside the staged package, so nothing left out is still needed.
  const problems = []
  const exists = (path) => existsSync(join(stage, path))
  for (const [key, target] of Object.entries(exports)) {
    for (const file of typeof target === "string" ? [target] : Object.values(target)) {
      const path = file.replace(/^\.\//, "")
      const ok = path.includes("*") ? exists(path.slice(0, path.indexOf("*"))) : exists(path)
      if (!ok) problems.push(`export ${key} → ${file} is missing`)
    }
  }
  const references = {
    ".js": /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|new URL\(\s*)["'](\.{1,2}\/[^"']+)["']/g,
    ".d.ts": /(?:\bfrom\s*|\bimport\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g,
    ".css": /(?:@import\s+|url\(\s*)["']?(\.{1,2}\/[^"')\s]+)["']?/g,
  }
  for (const path of staged) {
    const kind = path.endsWith(".d.ts") ? ".d.ts" : Object.keys(references).find((ext) => path.endsWith(ext))
    if (!kind) continue
    for (const [, specifier] of readFileSync(join(stage, path), "utf8").matchAll(references[kind])) {
      const target = relative(stage, resolve(join(stage, dirname(path)), specifier.replace(/[?#].*$/, "")))
      const candidates = kind === ".d.ts" ? [target, target.replace(/\.js$/, ".d.ts"), `${target}.d.ts`] : [target]
      if (!candidates.some(exists)) problems.push(`${path} → ${specifier} is missing`)
    }
  }
  if (problems.length) fail(`the staged package is incomplete:\n  ${problems.slice(0, 20).join("\n  ")}`)

  const unpacked = staged.reduce((total, path) => total + statSync(join(stage, path)).size, 0)
  const destination = check ? mkdtempSync(join(tmpdir(), "glass-ux-archive-")) : out
  const archive = `${pkg.name}-${pkg.version}.tgz`
  execFileSync("pnpm", ["pack", "--pack-destination", destination], { cwd: stage, stdio: ["ignore", "ignore", "inherit"] })
  const archiveBytes = statSync(join(destination, archive)).size
  if (check) rmSync(destination, { recursive: true, force: true })

  const mb = (bytes) => `${(bytes / 1_000_000).toFixed(1)} MB`
  const shown = (path) => (path.startsWith(`${root}/`) ? relative(root, path) : path)
  console.log(
    `pack-release: ${staged.length + 1} files, ${mb(unpacked)} unpacked, ${mb(archiveBytes)} archive` +
      (check ? " (checked, not kept)" : ` → ${shown(join(destination, archive))}`),
  )
  if (unpacked > BUDGET.unpacked) fail(`unpacked size ${mb(unpacked)} is over the ${mb(BUDGET.unpacked)} budget`)
  if (archiveBytes > BUDGET.archive) fail(`archive size ${mb(archiveBytes)} is over the ${mb(BUDGET.archive)} budget`)
} catch (error) {
  if (!(error instanceof PackError)) throw error
  console.error(`pack-release: ${error.message}`)
  process.exitCode = 1
} finally {
  rmSync(stage, { recursive: true, force: true })
}
