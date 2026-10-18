#!/usr/bin/env node
/**
 * Fonts: copy the curated families into src/assets/fonts and generate
 *   src/styles/fonts.css           @font-face (font-display: block), a metric-matched fallback
 *                                  per family, and the role selectors [data-font-sans|display|mono]
 *   src/lib/appearance/fonts.ts    the options shown in Appearance and the files to preload
 *
 * Every family gets its own fallback face with ascent/descent/size overrides computed from
 * the font's real metrics (Capsize), so a choice never flashes and never moves text, even
 * when the web font is slow.
 *
 * Usage: node scripts/build-fonts.mjs [--check]
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createFontStack } from "@capsizecss/core"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const check = process.argv.includes("--check")

/** The curated set. `roles` decides where a family is offered. */
const FAMILIES = [
  { id: "inter", label: "Inter", pkg: "inter", metrics: "inter", roles: ["sans", "display"] },
  { id: "geist", label: "Geist", pkg: "geist", metrics: "geist", roles: ["sans", "display"] },
  { id: "ibm-plex-sans", label: "IBM Plex Sans", pkg: "ibm-plex-sans", metrics: "iBMPlexSans", roles: ["sans", "display"] },
  { id: "manrope", label: "Manrope", pkg: "manrope", metrics: "manrope", roles: ["sans", "display"] },
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans", pkg: "plus-jakarta-sans", metrics: "plusJakartaSans", roles: ["sans", "display"] },
  { id: "figtree", label: "Figtree", pkg: "figtree", metrics: "figtree", roles: ["sans", "display"] },
  { id: "dm-sans", label: "DM Sans", pkg: "dm-sans", metrics: "dMSans", roles: ["sans", "display"] },
  { id: "onest", label: "Onest", pkg: "onest", metrics: "onest", roles: ["sans", "display"] },
  { id: "outfit", label: "Outfit", pkg: "outfit", metrics: "outfit", roles: ["display"] },
  { id: "inter-tight", label: "Inter Tight", pkg: "inter-tight", metrics: "interTight", roles: ["display"] },
  { id: "jetbrains-mono", label: "JetBrains Mono", pkg: "jetbrains-mono", metrics: "jetBrainsMono", roles: ["mono"] },
  { id: "geist-mono", label: "Geist Mono", pkg: "geist-mono", metrics: "geistMono", roles: ["mono"] },
]
const SUBSETS = ["latin", "latin-ext"]
const DEFAULTS = { sans: "inter", display: "match", mono: "jetbrains-mono" }
const GENERIC = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
}

const outputs = new Map()
const fontFaces = []
const fallbackFaces = []
const options = { sans: [], display: [], mono: [] }
const preload = {}

for (const family of FAMILIES) {
  const pkgDir = join(root, "node_modules/@fontsource-variable", family.pkg)
  const version = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")).version
  const css = readFileSync(join(pkgDir, "wght.css"), "utf8")
  const isMono = family.roles.includes("mono")
  let cssFamily = ""
  for (const subset of SUBSETS) {
    const block = css.split("/* ").find((part) => part.startsWith(`${family.pkg}-${subset}-wght-normal */`))
    if (!block) continue
    cssFamily = block.match(/font-family: '([^']+)'/)[1]
    const weight = block.match(/font-weight: ([\d ]+);/)[1]
    const range = block.match(/unicode-range: ([^;]+);/)[1]
    const source = `${family.pkg}-${subset}-wght-normal.woff2`
    const target = `${family.pkg}-${version}-${subset}-wght-normal.woff2`
    outputs.set(join(root, "src/assets/fonts", target), { copyFrom: join(pkgDir, "files", source) })
    fontFaces.push(
      `@font-face {\n  font-family: "${cssFamily}";\n  font-style: normal;\n  font-display: block;\n  font-weight: ${weight};\n` +
        `  src: url("../assets/fonts/${target}") format("woff2-variations");\n  unicode-range: ${range.replace(/,/g, ", ")};\n}`
    )
    if (subset === "latin") preload[family.id] = `/fonts/${target}`
  }
  const metrics = (await import(`@capsizecss/metrics/${family.metrics}`)).default
  const fallbackMetrics = (await import(`@capsizecss/metrics/${isMono ? "courierNew" : "arial"}`)).default
  const { fontFaces: fallback } = createFontStack([{ ...metrics, familyName: cssFamily }, fallbackMetrics], {
    fontFaceFormat: "styleString",
  })
  fallbackFaces.push(fallback.trim())
  const stack = `"${cssFamily}", "${cssFamily} Fallback", ${isMono ? GENERIC.mono : GENERIC.sans}`
  for (const role of family.roles) options[role].push({ id: family.id, label: family.label, stack })
}

const roleRules = []
for (const role of ["sans", "display", "mono"]) {
  for (const option of options[role]) {
    // :root for the document; the plain attribute lets any element preview a family (an island).
    const own = `:root[data-font-${role}="${option.id}"],\n  [data-font-${role}="${option.id}"]`
    const selector = option.id === DEFAULTS[role] ? `:root,\n  ${own}` : own
    roleRules.push(`  ${selector} {\n    --font-${role}: ${option.stack};\n  }`)
  }
}
roleRules.push(`  :root:not([data-font-display]),\n  :root[data-font-display="match"] {\n    --font-display: var(--font-sans);\n  }`)
roleRules.push(`  /* Islands re-apply the family to their own subtree. */\n  [data-font-sans]:not(:root) {\n    font-family: var(--font-sans);\n  }`)

const header = (what) => `/* Generated by scripts/build-fonts.mjs — do not edit. ${what} */\n`
const fontsCss =
  header("Self-hosted families, metric-matched fallbacks and role selectors.") +
  "\n/* font-display: block + preloading means text is never painted in a fallback face and then\n" +
  "   swapped. The fallback faces only show if a font fails to load, and move nothing. */\n" +
  fontFaces.join("\n") +
  "\n\n" +
  fallbackFaces.join("\n") +
  "\n\n@layer base {\n" +
  roleRules.join("\n") +
  "\n}\n"

const fontImports = Object.entries(preload).map(([_id, url], index) => `import FONT_ASSET_${index} from "../../assets${url}?url"`).join("\n")
const fontPreloadEntries = Object.keys(preload).map((id, index) => `  ${JSON.stringify(id)}: FONT_ASSET_${index}`).join(",\n")

const fontsTs =
  "// Generated by scripts/build-fonts.mjs — do not edit.\n\n" + fontImports + "\n\n" +
  "/** The bundled font families per role (`sans`, `display`, `mono`) as `{ id, label }`, in menu order. */\n" +
  `export const FONT_OPTIONS = ${JSON.stringify(
    Object.fromEntries(Object.entries(options).map(([role, list]) => [role, list.map(({ id, label }) => ({ id, label }))])),
    null,
    2
  )} as const\n\n` +
  "/** The family id each role uses unless the project or person chooses another; `display` \"match\" uses the interface face. */\n" +
  `export const FONT_DEFAULTS = ${JSON.stringify(DEFAULTS)} as const\n\n` +
  "/** The latin file for each family, preloaded for the active choice so it never flashes. */\n" +
  `export const FONT_PRELOAD: Record<string, string> = {\n${fontPreloadEntries}\n}\n`

outputs.set(join(root, "src/styles/fonts.css"), { content: fontsCss })
outputs.set(join(root, "src/lib/appearance/fonts.ts"), { content: fontsTs })

const stale = []
for (const [path, { content, copyFrom }] of outputs) {
  const next = content ?? readFileSync(copyFrom)
  const same = existsSync(path) && Buffer.compare(readFileSync(path), Buffer.from(next)) === 0
  if (same) continue
  if (check) stale.push(path.replace(`${root}/`, ""))
  else {
    mkdirSync(dirname(path), { recursive: true })
    if (copyFrom) copyFileSync(copyFrom, path)
    else writeFileSync(path, next)
  }
}
if (check && stale.length) {
  console.error(`fonts: stale ${stale.length} file(s), run pnpm fonts:\n  ${stale.join("\n  ")}`)
  process.exit(1)
}
console.log(`fonts: ${FAMILIES.length} families, ${fontFaces.length} faces${check ? " current" : " generated"}`)
