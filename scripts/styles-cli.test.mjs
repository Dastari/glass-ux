import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { entryKey, renderStyles, runStyles, scanImports } from "../bin/styles.mjs"
import { buildStyleManifest } from "./style-manifest.mjs"

const root = join(import.meta.dirname, "..")
const { components, entries } = buildStyleManifest(root)
const manifest = { foundation: "styles/foundation.css", adaptations: "styles/adaptations.css", components, entries }

function app(files) {
  const dir = mkdtempSync(join(tmpdir(), "glass-ux-styles-"))
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true })
    writeFileSync(join(dir, name), text)
  }
  return dir
}
const quiet = { log: () => {}, error: () => {} }
const importsOf = (css) => [...css.matchAll(/@import "([^"]+)"/g)].map((m) => m[1])

test("names an entry however it is written", () => {
  for (const name of ["button", "glass-ux/button", "./button", "/button"]) assert.equal(entryKey(name), "./button")
  assert.equal(entryKey("glass-ux"), ".")
  assert.equal(entryKey("glass-ux/ai/table"), "./ai/table")
})

test("scans every import form in ts, tsx, js, jsx and mjs sources and nothing else", () => {
  const dir = app({
    "src/a.tsx": `import { Button } from "glass-ux/button"\nimport type { X } from 'glass-ux/dialog'\nexport * from "glass-ux/tooltip"`,
    "src/b.ts": `const m = await import("glass-ux/select")\nconst r = require("glass-ux/charts")`,
    "src/c.jsx": `import "glass-ux/data-table"`,
    "src/d.mjs": `import {\n  Input,\n} from "glass-ux/input"`,
    "src/e.js": `import { x } from "glass-ux/styles/foundation.css"; import "glass-ux/styles.css"; import "glass-ux/gallery/registry"`,
    "src/notes.md": `import "glass-ux/menu"`,
    "node_modules/pkg/index.js": `import "glass-ux/popover"`,
    "dist/out.js": `import "glass-ux/toast"`,
    "src/other.ts": `import { y } from "glass-ux-other/button"`,
  })
  try {
    assert.deepEqual(scanImports([dir]), ["/button", "/charts", "/data-table", "/dialog", "/input", "/select", "/tooltip"])
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test("writes foundation, the union of the stylesheets in the library's order, then adaptations", () => {
  const { css, components: used } = renderStyles(manifest, ["glass-ux/select", "glass-ux/button", "glass-ux/button"])
  const lines = importsOf(css)
  assert.equal(lines[0], "glass-ux/styles/foundation.css")
  assert.equal(lines.at(-1), "glass-ux/styles/adaptations.css")
  const wanted = new Set([...entries["./select"], ...entries["./button"]])
  assert.deepEqual(used, components.filter((file) => wanted.has(file)))
  assert.deepEqual(lines.slice(1, -1), used.map((file) => `glass-ux/styles/components/${file}`))
  assert.ok(used.length < components.length)
})

test("foundation + every component + adaptations is the full library stylesheet's order", () => {
  const { css } = renderStyles(manifest, ["."].concat(Object.keys(entries)))
  const index = [...readFileSync(join(root, "src/styles/index.css"), "utf8").matchAll(/@import "\.\/([^"]+)"/g)].map((m) => m[1])
  const split = index.indexOf("components.css")
  const flat = importsOf(css).flatMap((specifier) =>
    specifier === "glass-ux/styles/foundation.css" ? index.slice(0, split) : specifier === "glass-ux/styles/adaptations.css" ? index.slice(split + 1) : [specifier],
  )
  assert.deepEqual(flat, [...index.slice(0, split), ...components.map((file) => `glass-ux/styles/components/${file}`), ...index.slice(split + 1)])
})

test("--scan builds the sheet for an application's imports and --check follows it", () => {
  const dir = app({ "src/main.tsx": `import { Button } from "glass-ux/button"\nimport { Select } from "glass-ux/select"\n` })
  const out = join(dir, "glass-ux.css")
  try {
    assert.equal(runStyles(["--scan", join(dir, "src"), "--out", out], { manifest, ...quiet }), 0)
    const css = readFileSync(out, "utf8")
    assert.match(css, /Entries: glass-ux\/button, glass-ux\/select\./)
    assert.deepEqual(importsOf(css), importsOf(renderStyles(manifest, ["button", "select"]).css))
    assert.equal(runStyles(["--scan", join(dir, "src"), "--out", out, "--check"], { manifest, ...quiet }), 0)
    // A new import makes the file stale; so does a missing file.
    writeFileSync(join(dir, "src/more.tsx"), `import { Dialog } from "glass-ux/dialog"`)
    const errors = []
    assert.equal(runStyles(["--scan", join(dir, "src"), "--out", out, "--check"], { manifest, log() {}, error: (m) => errors.push(m) }), 1)
    assert.match(errors[0], /stale/)
    assert.equal(runStyles(["--scan", join(dir, "src"), "--out", join(dir, "none.css"), "--check"], { manifest, log() {}, error: (m) => errors.push(m) }), 1)
    assert.match(errors[1], /missing/)
    // Regenerating fixes it.
    assert.equal(runStyles(["--scan", join(dir, "src"), "--out", out], { manifest, ...quiet }), 0)
    assert.equal(runStyles(["--scan", join(dir, "src"), "--out", out, "--check"], { manifest, ...quiet }), 0)
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test("entries given on the command line join the scan; unknown ones are skipped; nothing found fails", () => {
  const dir = app({ "src/main.ts": `export {}` })
  const errors = []
  try {
    const out = join(dir, "out.css")
    assert.equal(runStyles(["data-table", "nonsense", "--out", out], { manifest, log() {}, error: (m) => errors.push(m) }), 0)
    assert.match(errors[0], /nonsense/)
    assert.ok(importsOf(readFileSync(out, "utf8")).includes("glass-ux/styles/components/ui/data-table/data-table.css"))
    assert.equal(runStyles(["--scan", join(dir, "src"), "--out", out], { manifest, log() {}, error: (m) => errors.push(m) }), 1)
    assert.match(errors.at(-1), /no glass-ux entries found/)
    assert.equal(runStyles(["--bogus"], { manifest, log() {}, error: (m) => errors.push(m) }), 1)
  } finally {
    rmSync(dir, { recursive: true })
  }
})
