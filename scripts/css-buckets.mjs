/**
 * Ship selectors Chromium can bucket (docs/performance.md, "Selector cost").
 *
 * Chromium files each rule under a key from its rightmost compound (a class, id, attribute or
 * type) and tries it only on elements with that key. A rightmost compound whose only key sits
 * in a list of several (`.x :is(.a, .b)`, `:where(h1, h2)`) gets no key, so the rule is tried
 * on every element at every style recalc. scripts/build.mjs rewrites such lists in the shipped
 * CSS into one selector per argument, which match the same elements with the same specificity:
 *
 *   :where(A, B)         → :where(A), :where(B)          (always: :where() has no specificity)
 *   :is(A, B)            → A, B                           (when A and B have equal specificity)
 *   :is(.a[x], .b)       → .a[x], .b.b                    (a repeated class keeps the rank)
 *   @scope (R) { :scope } → :scope:where(R)               (one per scoping root R)
 *
 * Only arguments made of type, class, id and attribute selectors are expanded, so a selector
 * list never becomes invalid where the forgiving :is() list would have dropped one argument.
 * The sources keep the compact lists; this runs on the copy in dist/.
 */
import postcss from "postcss"

/** Split at top-level occurrences of `separators` (outside parentheses, brackets and strings). */
function splitTop(text, separators) {
  const parts = []
  let depth = 0
  let quote = null
  let start = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quote) {
      if (char === "\\") index += 1
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (char === "(" || char === "[") depth += 1
    else if (char === ")" || char === "]") depth -= 1
    else if (depth === 0 && separators.includes(char)) {
      parts.push(text.slice(start, index))
      start = index + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

/** A compound of type, class, id and attribute selectors only: [ids, classes and attributes, types], or null. */
function simpleSpecificity(argument) {
  const text = argument.trim()
  const match = /^([a-z][\w-]*|\*)?((?:\.[\w-]+|#[\w-]+|\[[^\]]+\])*)$/i.exec(text)
  if (!match || text === "") return null
  const ids = (match[2].match(/#[\w-]+/g) ?? []).length
  const rest = (match[2].match(/\.[\w-]+|\[[^\]]+\]/g) ?? []).length
  const types = match[1] && match[1] !== "*" ? 1 : 0
  return [ids, rest, types]
}

/** Where the rightmost compound of `selector` starts. */
function lastCompoundStart(selector) {
  let depth = 0
  let quote = null
  let start = 0
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index]
    if (quote) {
      if (char === "\\") index += 1
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (char === "(" || char === "[") depth += 1
    else if (char === ")" || char === "]") depth -= 1
    else if (depth === 0 && /[\s>+~]/.test(char)) start = index + 1
  }
  return start
}

/** The first top-level :is( or :where( with several arguments in a compound: [start, end, name, args]. */
function findList(compound) {
  let depth = 0
  for (let index = 0; index < compound.length; index += 1) {
    const char = compound[index]
    if (char === "(" || char === "[") depth += 1
    else if (char === ")" || char === "]") depth -= 1
    else if (depth === 0 && char === ":") {
      const name = /^:(is|where)\(/.exec(compound.slice(index))?.[1]
      if (!name) continue
      const open = index + name.length + 1
      let inner = 0
      for (let end = open; end < compound.length; end += 1) {
        if (compound[end] === "(") inner += 1
        else if (compound[end] === ")") {
          inner -= 1
          if (inner === 0) {
            const args = splitTop(compound.slice(open + 1, end), [","]).map((arg) => arg.trim())
            if (args.length > 1) return [index, end + 1, name, args]
            break
          }
        }
      }
    }
  }
  return null
}

/** One selector as the bucketable selectors it is equivalent to (itself when it cannot be split). */
export function bucketSelector(selector, scopeRoots = null) {
  const trimmed = selector.trim()
  const start = lastCompoundStart(trimmed)
  const head = trimmed.slice(0, start)
  const compound = trimmed.slice(start)
  if (scopeRoots && compound === ":scope") {
    const roots = scopeRoots.map((root) => root.trim())
    if (roots.every((root) => root === ":root" || simpleSpecificity(root)))
      return roots.map((root) => `${head}:scope:where(${root})`)
  }
  const list = findList(compound)
  if (!list) return [trimmed]
  const [from, to, name, args] = list
  // Already keyed outside the list (`[data-palette]:where(:root, .x)`): nothing to gain.
  if (/^[a-z]/i.test(compound.slice(0, from)) || /[.#[]/.test((compound.slice(0, from) + compound.slice(to)).replace(/:[\w-]+\((?:[^()]|\([^()]*\))*\)/g, "")))
    return [trimmed]
  const specificities = args.map(simpleSpecificity)
  if (specificities.some((value) => value === null)) return [trimmed]
  let pieces = args
  if (name === "is" && new Set(specificities.map(String)).size > 1) {
    // Equal ids and types: a lower-ranked argument repeats its first class or attribute
    // (`.b` → `.b.b`), which ranks it with the others without changing what it matches.
    const [ids, rest, types] = specificities.reduce((top, value) => top.map((n, i) => Math.max(n, value[i])))
    if (specificities.some(([i, , t]) => i !== ids || t !== types)) return [trimmed]
    pieces = args.map((arg, index) => {
      const missing = rest - specificities[index][1]
      const first = /\.[\w-]+|\[[^\]]+\]/.exec(arg)?.[0]
      return missing === 0 ? arg : first ? arg + first.repeat(missing) : null
    })
    if (pieces.includes(null)) return [trimmed]
  }
  const before = compound.slice(0, from)
  const after = compound.slice(to)
  // A type selector must lead its compound: `:is(p, ul)::marker` → `p::marker`, but `.x:is(p, ul)` stays.
  if (name === "is" && before !== "" && args.some((arg) => /^[a-z*]/i.test(arg))) return [trimmed]
  return pieces.flatMap((arg) => bucketSelector(`${head}${before}${name === "where" ? `:where(${arg})` : arg}${after}`, scopeRoots))
}

/** The CSS with every bucketable list split (see the header). */
export function bucketCss(css) {
  const root = postcss.parse(css)
  let changed = false
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return
    const scope = rule.parent?.type === "atrule" && rule.parent.name === "scope" ? rule.parent : null
    const roots = scope ? splitTop(scope.params.trim().replace(/^\(|\)$/g, ""), [","]) : null
    if (scope && /\)\s*to\s*\(/.test(scope.params)) return
    const selectors = splitTop(rule.selector, [","])
    const next = selectors.flatMap((selector) => bucketSelector(selector, roots))
    if (next.length !== selectors.length || next.some((selector, index) => selector !== selectors[index].trim())) {
      rule.selector = [...new Set(next)].join(",\n")
      changed = true
    }
  })
  return changed ? root.toString() : css
}
