#!/usr/bin/env node
/**
 * Enforce token discipline (docs/ui-rules.md R3).
 *
 * TS/TSX under src (except generated code, src/styles and src/pwa):
 *   - no Tailwind arbitrary values (`p-[13px]`, `bg-[#fff]`) unless they wrap var(--token)
 *   - no raw colours (#hex, rgb(), hsl(), oklch()) and no px/rem/ms string literals
 *
 * Component CSS (src/ui, src/shell, src/windows, src/features, src/ai):
 *   - custom property definitions (`--x: …`) may hold raw values — they are component tokens
 *   - every other declaration must use tokens: no raw colours, no px/rem/em lengths except 0,
 *     no ms/s durations except 0s
 *
 * Gallery CSS (src/gallery) and documentation application CSS (apps/docs/src) follow the
 * same colour and duration rules. Their specimen frames and reading columns may use fixed
 * lengths, so lengths are not checked there.
 *
 * Escape hatch for a genuine exception: put `tokens:allow <reason>` in a comment on the
 * same line, or `tokens:allow-file <reason>` in the file's first comment for code whose job
 * is colour or unit maths. Reviewers see every use.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const src = join(root, "src")
const violations = []

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const rel = (p) => relative(root, p)
const skipTs = (p) =>
  /\/(generated|styles|pwa)\//.test(p) || p.endsWith("routeTree.gen.ts") || /\.(test|spec)\.tsx?$/.test(p)
const docsSrc = join(root, "apps", "docs", "src")
const cssScopes = ["ui", "shell", "windows", "features", "ai", "glassUx"].map((d) => join(src, d))
const presentationScopes = [join(src, "gallery"), docsSrc]

const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(|\boklch\((?!from var)/
// A string that *is* a CSS length/duration ("13px", "0 2rem", "300ms"), or any length
// inside a style={{ … }} object. Prose that mentions "8px" is fine.
const TS_UNIT_LITERAL = /["'`]\s*-?\d*\.?\d+(?:px|rem|ms)(?:\s+-?\d*\.?\d+(?:px|rem|ms)?)*\s*["'`]|style=\{\{[^}]*\d(?:px|rem|ms)\b/
const ARBITRARY = /\b[\w:-]+-\[(?!var\(--)[^\]]+\]/

const docsCss = walk(docsSrc).filter((file) => file.endsWith(".css"))

for (const file of [...walk(src), ...docsCss]) {
  const source = readFileSync(file, "utf8")
  if (/tokens:allow-file\s+\S/.test(source.slice(0, 600))) continue
  const lines = source.split("\n")
  if (/\.(tsx?|mts)$/.test(file) && !skipTs(file)) {
    lines.forEach((line, index) => {
      if (line.includes("tokens:allow")) return
      const trimmed = line.trim()
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return
      if (ARBITRARY.test(line)) violations.push(`${rel(file)}:${index + 1}  arbitrary Tailwind value: ${line.match(ARBITRARY)[0]}`)
      // Anchors ("#c106", href: "#…") look like hex colours; links are not colours.
      if (RAW_COLOUR.test(line) && !/\b(?:href|to|hash)\s*[=:]\s*["'`{]?\s*["'`]?#|#[a-z-]+["']/.test(line))
        violations.push(`${rel(file)}:${index + 1}  raw colour: ${trimmed.slice(0, 90)}`)
      if (TS_UNIT_LITERAL.test(line)) violations.push(`${rel(file)}:${index + 1}  raw length/duration: ${trimmed.slice(0, 90)}`)
    })
  }
  const component = cssScopes.some((scope) => file.startsWith(scope))
  if (file.endsWith(".css") && (component || presentationScopes.some((scope) => file.startsWith(scope)))) {
    let inComment = false
    // A declaration may continue over several lines (box-shadow lists, gradients): collect
    // it up to its semicolon and check the joined value, reported at its first line.
    let pending = null
    const check = ({ text, line, allowed }) => {
      if (allowed) return
      const declaration = text.match(/^\s*([a-z-]+)\s*:\s*([\s\S]+?);?\s*$/i)
      if (!declaration || declaration[1].startsWith("--")) return
      const value = declaration[2].replace(/url\([^)]*\)/g, "")
      if (RAW_COLOUR.test(value)) violations.push(`${rel(file)}:${line}  raw colour in ${declaration[1]}`)
      const length = component && value.match(/(?<![\w-])(?!0(?:px|rem|em)\b)\d*\.?\d+(?:px|rem|em)\b/)
      if (length) violations.push(`${rel(file)}:${line}  raw length ${length[0]} in ${declaration[1]}`)
      const duration = value.match(/(?<![\w-])(?!0s\b)\d*\.?\d+m?s\b/)
      if (duration) violations.push(`${rel(file)}:${line}  raw duration ${duration[0]} in ${declaration[1]}`)
    }
    lines.forEach((line, index) => {
      let text = line
      if (inComment) {
        if (!text.includes("*/")) return
        text = text.slice(text.indexOf("*/") + 2)
        inComment = false
      }
      text = text.replace(/\/\*.*?\*\//g, "")
      if (text.includes("/*")) {
        inComment = true
        text = text.slice(0, text.indexOf("/*"))
      }
      const allowed = line.includes("tokens:allow")
      if (pending) {
        pending.text += ` ${text.trim()}`
        pending.allowed ||= allowed
        if (/[;{}]/.test(text)) {
          check(pending)
          pending = null
        }
        return
      }
      if (/^\s*[a-z-]+\s*:/i.test(text) && !/[;{}]\s*$/.test(text)) {
        pending = { text: text.trimEnd(), line: index + 1, allowed }
        return
      }
      check({ text, line: index + 1, allowed })
    })
    if (pending) check(pending)
  }
}

if (violations.length) {
  console.error(`Token violations (${violations.length}) — see docs/ui-rules.md R3:\n  ${violations.join("\n  ")}`)
  process.exit(1)
}
console.log("tokens: no raw values outside the token layer")
