#!/usr/bin/env node
/**
 * Pack the second release archive, glass-ux-docs-kit, from a staging copy. It carries the `glass-ux-docs`
 * bin and the parameterised scripts (scripts/docs-kit), the documentation page shell compiled to
 * dist/gallery, its two stylesheets and the site template. Nothing else from the gallery: the
 * shell is found by following imports from dist/gallery/docs-kit.js, relative imports leaving the
 * gallery become public `glass-ux/...` entries, and a module with no public entry stops the pack.
 * The private forbidden names in docs-kit.config.mjs are checked against the finished archive.
 *
 * Run after `pnpm build` (or `pnpm docs:build`).
 *   node scripts/pack-docs-kit.mjs --out .handoff/release   write the archive there
 *   node scripts/pack-docs-kit.mjs --check                  pack to a temporary folder, check, discard
 */
import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { gzipSync, gunzipSync } from "node:zlib"
import { dirname, join, relative, resolve } from "node:path"
import { forbiddenPattern, loadDocsKit } from "./docs-kit/lib/config.mjs"
import { entrySpecifiers, publicSpecifier } from "./docs-kit/lib/entries.mjs"
import { REFERENCES, referenceKind, stagedProblems } from "./pack-references.mjs"

const root = resolve(import.meta.dirname, "..")
const args = process.argv.slice(2)
const check = args.includes("--check")
const outIndex = args.indexOf("--out")
const out = outIndex === -1 ? join(root, ".handoff") : resolve(args[outIndex + 1])

/**
 * 0.13.1 measured 209 KB unpacked and 61 KB compressed: the scripts, the page shell, the site
 * template and the guide, with no demos, fixtures or generated API files. The limits leave about
 * 20% headroom so growth is a decision, not drift.
 */
const BUDGET = { unpacked: 250_000, archive: 75_000 }

/** The entry the kit's React surface is packed from. */
const SHELL = "gallery/docs-kit"

class PackError extends Error {}
const fail = (message) => {
  throw new PackError(message)
}

if (!existsSync(join(root, "dist/gallery/docs-kit.js"))) {
  console.error("pack-docs-kit: dist/gallery is missing. Run pnpm build first.")
  process.exit(1)
}

const kit = await loadDocsKit(root)
const { pkg } = kit
const stage = mkdtempSync(join(tmpdir(), "glass-ux-docs-kit-"))
const staged = []

const write = (path, text) => {
  mkdirSync(dirname(join(stage, path)), { recursive: true })
  writeFileSync(join(stage, path), text)
  staged.push(path)
}

function copyTree(from, to) {
  for (const entry of readdirSync(from, { withFileTypes: true }).toSorted((a, b) => (a.name < b.name ? -1 : 1))) {
    const source = join(from, entry.name)
    if (entry.isDirectory()) copyTree(source, `${to}/${entry.name}`)
    else {
      cpSync(source, join(stage, `${to}/${entry.name}`), { recursive: true })
      staged.push(`${to}/${entry.name}`)
    }
  }
}

/**
 * Copies a gallery module into `react/`, following its relative imports. Imports inside the
 * gallery stay relative and join the closure; imports leaving it become public entries.
 */
function stageShell() {
  const entries = entrySpecifiers(pkg, kit.outDir)
  const queue = [SHELL]
  const seen = new Set()
  while (queue.length) {
    const module = queue.pop()
    if (seen.has(module)) continue
    seen.add(module)
    if (/\.generated$|\/(?:fixtures|sections|demos|examples|guides|api)\//.test(module))
      fail(`the shell reaches ${module}, which belongs to Glass UX's own catalogue`)
    for (const extension of [".js", ".d.ts"]) {
      const from = join(root, kit.outDir, `${module}${extension}`)
      const kind = referenceKind(from)
      const text = readFileSync(from, "utf8")
        .replace(/\n\/\/# sourceMappingURL=\S+\s*$/, "\n")
        .replace(REFERENCES[kind], (match, specifier) => {
          const target = relative(join(root, kit.outDir), resolve(dirname(from), specifier)).replace(/\.js$/, "")
          if (target.startsWith("gallery/")) {
            if (!existsSync(join(root, kit.outDir, `${target}.js`))) fail(`${module} imports ${specifier}, which is not a module`)
            queue.push(target)
            return match
          }
          const entry = entries.get(target)
          if (!entry) fail(`${module} imports src/${target}, which no package entry exports`)
          return match.replace(specifier, publicSpecifier(target, entries, pkg.name))
        })
      write(`react/${module.slice("gallery/".length)}${extension}`, text)
    }
  }
}

try {
  stageShell()
  for (const sheet of ["documentation.css", "gallery.css"]) write(`styles/${sheet}`, readFileSync(join(root, "dist/gallery", sheet), "utf8"))
  write("styles.css", `@import "./styles/documentation.css";\n@import "./styles/gallery.css";\n`)
  copyTree(join(root, "scripts/docs-kit/lib"), "lib")
  copyTree(join(root, "scripts/docs-kit/templates"), "templates")
  write("README.md", readFileSync(join(root, "docs/docs-kit.md"), "utf8"))
  write("LICENSE", readFileSync(join(root, "LICENSE"), "utf8"))

  const [major, minor] = pkg.version.split(".")
  const exports = {
    "./config": { types: "./lib/config.d.ts", import: "./lib/config.mjs" },
    "./react": { types: "./react/docs-kit.d.ts", import: "./react/docs-kit.js" },
    "./styles.css": "./styles.css",
    "./package.json": "./package.json",
  }
  const manifest = {
    name: "glass-ux-docs-kit",
    version: pkg.version,
    description: "API pages, catalogue pages and documentation checks for packages built on glass-ux.",
    type: "module",
    license: pkg.license,
    repository: pkg.repository,
    homepage: pkg.homepage,
    bugs: pkg.bugs,
    engines: pkg.engines,
    sideEffects: ["**/*.css"],
    bin: { "glass-ux-docs": "./lib/bin.mjs" },
    exports,
    dependencies: { clsx: pkg.dependencies.clsx, postcss: pkg.devDependencies.postcss },
    // Released in lockstep: the shell uses the same minor's public entries.
    peerDependencies: {
      "glass-ux": `>=${major}.${minor}.0 <${major}.${Number(minor) + 1}.0`,
      react: pkg.peerDependencies.react,
      "react-dom": pkg.peerDependencies["react-dom"],
      typescript: ">=6 <7",
      typedoc: ">=0.28 <0.29",
      prettier: ">=3 <4",
      vite: ">=8 <9",
    },
    peerDependenciesMeta: { vite: { optional: true } },
  }
  write("package.json", `${JSON.stringify(manifest, null, 2)}\n`)

  const problems = stagedProblems(stage, staged, exports)
  if (problems.length) fail(`the staged package is incomplete:\n  ${problems.slice(0, 20).join("\n  ")}`)

  const unpacked = staged.reduce((total, path) => total + statSync(join(stage, path)).size, 0)
  const destination = check ? mkdtempSync(join(tmpdir(), "glass-ux-archive-")) : out
  mkdirSync(destination, { recursive: true })
  const archive = `${manifest.name}-${manifest.version}.tgz`
  execFileSync("pnpm", ["pack", "--pack-destination", destination], { cwd: stage, stdio: ["ignore", "ignore", "inherit"] })
  const archivePath = join(destination, archive)
  const tar = gunzipSync(readFileSync(archivePath))
  writeFileSync(archivePath, gzipSync(tar, { level: 9 }))
  const archiveBytes = statSync(archivePath).size

  // The finished archive, not the sources: names and contents, this project's list included.
  const text = tar.toString("utf8")
  const leaked = kit.checks.forbidden.map(forbiddenPattern).filter((term) => term.test(text))
  if (check) rmSync(destination, { recursive: true, force: true })
  if (leaked.length) {
    rmSync(archivePath, { force: true })
    fail(`the archive contains a forbidden name (${leaked.length} pattern)`)
  }

  const kb = (bytes) => `${(bytes / 1_000).toFixed(1)} KB`
  const shown = (path) => (path.startsWith(`${root}/`) ? relative(root, path) : path)
  console.log(
    `pack-docs-kit: ${staged.length} files, ${kb(unpacked)} unpacked, ${kb(archiveBytes)} archive` +
      (check ? " (checked, not kept)" : ` → ${shown(join(destination, archive))}`),
  )
  if (unpacked > BUDGET.unpacked) fail(`unpacked size ${kb(unpacked)} is over the ${kb(BUDGET.unpacked)} budget`)
  if (archiveBytes > BUDGET.archive) fail(`archive size ${kb(archiveBytes)} is over the ${kb(BUDGET.archive)} budget`)
} catch (error) {
  if (!(error instanceof PackError)) throw error
  console.error(`pack-docs-kit: ${error.message}`)
  process.exitCode = 1
} finally {
  rmSync(stage, { recursive: true, force: true })
}
