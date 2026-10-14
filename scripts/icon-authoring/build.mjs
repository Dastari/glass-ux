/**
 * Icon authoring: the geometric definitions (defs/*.mjs) that generate src/icons/svg.
 * Most icons are computed (arcs, tangents, polygons on circles) rather than hand-typed;
 * edit the definition and rebuild instead of editing the SVG.
 *
 *   node scripts/icon-authoring/build.mjs [--only a,b] [--list] [--out DIR]
 *
 * Then run `pnpm icons` to regenerate the React components and enforce the spec.
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { svg } from "./lib.mjs"
const outIndex = process.argv.indexOf("--out")
const dir = outIndex > 0 ? process.argv[outIndex + 1] : fileURLToPath(new URL("../../src/icons/svg", import.meta.url))
mkdirSync(dir, { recursive: true })
const all = {}
for (const f of readdirSync(new URL("./defs", import.meta.url)).filter((f) => f.endsWith(".mjs")).sort()) {
  const mod = await import(`./defs/${f}`)
  for (const [k, v] of Object.entries(mod.icons)) {
    if (all[k]) throw new Error(`duplicate ${k}`)
    all[k] = v
  }
}
const i = process.argv.indexOf("--only")
const only = i > 0 ? process.argv[i + 1].split(",") : null
if (process.argv.includes("--list")) { console.log(Object.keys(all).sort().join(",")); process.exit(0) }
let n = 0
for (const [name, fn] of Object.entries(all)) {
  if (only && !only.includes(name)) continue
  writeFileSync(`${dir}/${name}.svg`, svg(fn()))
  n++
}
console.log(`wrote ${n} icons`)
