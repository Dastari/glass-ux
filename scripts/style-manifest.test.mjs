import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { buildStyleManifest, componentStyles, layerSheets, layerSplit } from "./style-manifest.mjs"

const root = join(import.meta.dirname, "..")
const manifest = buildStyleManifest(root)
const { components, entries } = manifest

test("lists the component stylesheets in the order components.css imports them", () => {
  assert.deepEqual(components, componentStyles(root))
  assert.ok(components.length > 100)
})

test("every entry's list is unique and in the global order", () => {
  for (const [entry, files] of Object.entries(entries)) {
    assert.equal(new Set(files).size, files.length, `${entry} repeats a stylesheet`)
    assert.ok(files.every((file) => components.includes(file)), `${entry} names a stylesheet components.css does not import`)
    const positions = files.map((file) => components.indexOf(file))
    assert.deepEqual(positions, positions.toSorted((a, b) => a - b), `${entry} is out of order`)
  }
})

test("the entries together reach every component stylesheet, in the global order", () => {
  const union = new Set(Object.values(entries).flat())
  assert.deepEqual(components.filter((file) => union.has(file)), components, "a stylesheet no entry loads would never reach an application")
})

test("closures follow imports, shared classes and custom properties", () => {
  const has = (entry, ...files) => files.forEach((file) => assert.ok(entries[entry].includes(file), `${entry} lacks ${file}`))
  const lacks = (entry, ...files) => files.forEach((file) => assert.ok(!entries[entry].includes(file), `${entry} should not load ${file}`))
  // Button renders an Icon and a Tooltip, which renders Kbd.
  has("./button", "ui/icon/icon.css", "ui/button/button.css", "ui/tooltip/tooltip.css", "ui/kbd/kbd.css")
  // Select's trigger is a field box; its rows and popup are shared recipes.
  has("./select", "ui/select/select.css", "ui/field/field.css")
  // A table needs its parts.
  has("./data-table", "ui/data-table/data-table.css", "ui/data-table/cells/cells.css", "ui/data-table/filters/filters.css", "ui/data-table/search/search.css")
  // Checkbox reads custom properties field.css declares.
  has("./checkbox", "ui/checkbox/checkbox.css", "ui/field/field.css")
  has("./charts", "ui/charts/core/frame.css", "ui/charts/pie/pie.css")
  // Entries stay small: no dependence on unrelated families.
  lacks("./button", "ui/data-table/data-table.css", "ui/charts/core/frame.css", "ui/select/select.css")
  lacks("./tooltip", "ui/button/button.css")
  assert.deepEqual(entries["./locale"], [])
  assert.deepEqual(entries["./icons"], ["ui/icon/icon.css"])
})

test("foundation, components and adaptations are index.css in its own order", () => {
  const sheets = layerSheets(root)
  const imports = (css) => [...css.matchAll(/@import "\.\/([^"]+)"/g)].map((m) => m[1])
  const { before, after } = layerSplit(root)
  assert.deepEqual(imports(sheets["foundation.css"]), before)
  assert.deepEqual(imports(sheets["adaptations.css"]), after)
  const index = imports(readFileSync(join(root, "src/styles/index.css"), "utf8"))
  assert.deepEqual([...before, "components.css", ...after], index)
  assert.match(sheets["foundation.css"], /@layer theme, base, components, utilities;/)
  assert.match(readFileSync(join(root, "src/styles/library.css"), "utf8"), /@layer theme, base, components, utilities;/)
  assert.deepEqual(after, ["flat.css", "print.css", "forced-colors.css"])
})
