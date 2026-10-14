#!/usr/bin/env node
/**
 * Selector patterns that make every DOM change expensive (docs/performance.md).
 *
 * Chromium keys style invalidation on classes, ids and attributes. When a selector gives it
 * nothing to key on, it falls back to re-checking broadly on every node inserted or removed
 * anywhere in the document, which a virtualized table does on every wheel notch:
 *
 *   - a sibling combinator (+ or ~) whose following compound is universal (`*`, a bare
 *     pseudo-element or pseudo-classes only) while the preceding one names no class, id or
 *     attribute (`* + *`, `h2 + *`, `* + ::before`): the following siblings of every
 *     inserted node are re-styled with their whole subtrees. Use :where(:not(:first-child))
 *     for "every child but the first", or give the preceding compound a class.
 *   - :has() on the root (`:root:has()`, `html:has()`, `body:has()`): the root is re-styled
 *     whenever a node matching the argument's features is inserted. Set an attribute on the
 *     root from script instead.
 *
 * Escape hatch: `perf:allow <reason>` in a comment on the selector's line.
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

/** Split at top-level occurrences of the given characters (outside parentheses and brackets). */
function splitTop(text, test) {
  const parts = []
  let depth = 0
  let start = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === "(" || char === "[") depth += 1
    else if (char === ")" || char === "]") depth -= 1
    else if (depth === 0 && test(char, index)) {
      parts.push({ text: text.slice(start, index), separator: char })
      start = index + 1
    }
  }
  parts.push({ text: text.slice(start), separator: null })
  return parts
}

/** Drop :not(…) (it adds no keys) and unwrap :is(…)/:where(…) whose every argument is keyed. */
function flatten(compound) {
  return compound
    .replace(/:not\((?:[^()]|\([^()]*\))*\)/g, "")
    .replace(/:(?:is|where)\(((?:[^()]|\([^()]*\))*)\)/g, (_, list) =>
      splitTop(list, (char) => char === ",").every((part) => /[.#[]/.test(part.text)) ? ".keyed" : ""
    )
    .replace(/\((?:[^()]|\([^()]*\))*\)/g, "")
}

/** Chromium keys invalidation on a class, id or attribute in the compound. */
const isKeyed = (compound) => /[.#[]/.test(flatten(compound))

/** Matches any element: no class, id, attribute or type (`*`, `::before`, `:where(…)`). */
function isBare(compound) {
  const flat = flatten(compound)
  if (/[.#[]/.test(flat)) return false
  const type = flat.replace(/::?[\w-]+/g, "").trim()
  return type === "" || type === "*"
}

function checkSelector(selector, location) {
  const trimmed = selector.trim()
  if (!trimmed || trimmed.startsWith("@")) return
  if (/^(?::root|html|body)\b[^\s>+~]*:has\(/.test(trimmed))
    violations.push(`${location}  :has() on the root re-styles it on every matching insertion: ${trimmed}`)
  // Tokenize into compounds and combinators at the top level.
  const tokens = splitTop(trimmed.replace(/\s*([>+~])\s*/g, "$1").replace(/\s+/g, " "), (char) => char === " " || char === ">" || char === "+" || char === "~")
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index].separator !== "+" && tokens[index].separator !== "~") continue
    const left = tokens[index].text
    const right = tokens[index + 1].text
    if (!isKeyed(left) && isBare(right)) {
      violations.push(`${location}  universal sibling selector (re-styles siblings of every inserted node): ${trimmed}`)
      return
    }
  }
}

for (const file of walk(src)) {
  if (!file.endsWith(".css")) continue
  const source = readFileSync(file, "utf8")
  // Blank out comments but keep line numbers and any perf:allow markers' lines.
  const allowed = new Set()
  source.split("\n").forEach((line, index) => {
    if (/perf:allow\s+\S/.test(line)) allowed.add(index + 1)
  })
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
  // Every `selector {` (skipping at-rules and declarations inside nested blocks).
  const pattern = /([^{};]+)\{/g
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const prelude = match[1]
    if (/^\s*@/.test(prelude)) continue
    const startLine = text.slice(0, match.index + prelude.search(/\S/)).split("\n").length
    const lines = prelude.trim().split("\n").length
    if ([...Array(lines).keys()].some((offset) => allowed.has(startLine + offset))) continue
    // Keyframe stops (from, to, 40%) are not selectors.
    if (/^\s*(from|to|\d+%)(\s*,\s*(from|to|\d+%))*\s*$/.test(prelude)) continue
    for (const part of splitTop(prelude, (char) => char === ",")) {
      checkSelector(part.text, `${relative(root, file)}:${startLine}`)
    }
  }
}

if (violations.length) {
  console.error(`CSS performance violations (${violations.length}) — see docs/performance.md:\n  ${violations.join("\n  ")}`)
  process.exit(1)
}
console.log("css-perf: no selectors that re-style the document on every DOM change")
