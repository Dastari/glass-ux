/** Reading-order CSS uses logical properties. Physical geometry needs a same-line logical:allow reason. */
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import postcss from "postcss"

const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const path = join(dir, entry.name)
  return entry.isDirectory() ? walk(path) : path.endsWith(".css") ? [path] : []
})
const physical = /^(?:left|right|(?:margin|padding|border)-(?:left|right)(?:-[\w-]+)?|border-(?:top|bottom)-(?:left|right)-radius)$/
const failures = []
for (const file of ["styles", "ui", "shell", "windows", "ai"].flatMap(dir => walk(`src/${dir}`))) {
  // The table is maintained by the separate data-table RTL audit.
  if (file.startsWith("src/ui/data-table/")) continue
  const source = readFileSync(file, "utf8")
  const lines = source.split("\n")
  postcss.parse(source, { from: file }).walkDecls(decl => {
    const positionalValue = /^(?:text-align|float|clear)$/.test(decl.prop) && /\b(?:left|right)\b/.test(decl.value)
    const parts = postcss.list.space(decl.value)
    const asymmetric = /^(?:padding|margin|inset)$/.test(decl.prop) && parts.length === 4 && parts[1] !== parts[3]
    if (!physical.test(decl.prop) && !positionalValue && !asymmetric) return
    const line = decl.source.start.line
    if (/logical:allow\s+\S/.test(lines.slice(line - 1, decl.source.end.line).join("\n"))) return
    failures.push(`${file}:${line}: ${decl.prop}: ${decl.value}`)
  })
}
if (failures.length) {
  console.error(`${failures.join("\n")}\nUse logical CSS or document physical geometry with /* logical:allow <reason> */.`)
  process.exitCode = 1
} else console.log("logical: library CSS uses logical properties or documented physical geometry")
