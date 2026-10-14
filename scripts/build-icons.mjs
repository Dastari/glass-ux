#!/usr/bin/env node
/**
 * Build the Glass UX icon set from src/icons/svg/*.svg into typed React components.
 *
 * The SVG files are the source of truth and must follow docs/icon-spec.md. This script
 * enforces the mechanical half of that spec so a non-conforming icon cannot ship:
 *
 *   - viewBox is exactly 0 0 24 24, no width/height/fill/stroke/style/transform attributes
 *   - only path, circle, rect, line, polyline, polygon, ellipse
 *   - class is absent (stroke), "t" (duotone tint fill) or "d" (solid dot)
 *   - tint shapes come before strokes (they paint underneath)
 *   - at most one tint element per icon, and a tint path is closed
 *   - solid dots (class d circles) have a radius of at least 1
 *   - numbers carry at most two decimals
 *   - every coordinate stays inside the 1.5 – 22.5 live area
 *
 * Usage: node scripts/build-icons.mjs [--check]
 *   --check  fail if the generated files are stale (for CI and pre-commit)
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join, dirname, basename } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const sourceDir = join(root, "src/icons/svg")
const outDir = join(root, "src/icons/generated")
const check = process.argv.includes("--check")

const ALLOWED_ELEMENTS = new Set(["path", "circle", "rect", "line", "polyline", "polygon", "ellipse"])
const ALLOWED_ATTRS = new Set([
  "d", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "x1", "y1", "x2", "y2", "points", "class",
])
const JSX_ATTR = { class: "className" }
const LIVE_MIN = 1.5
const LIVE_MAX = 22.5

const errors = []
const fail = (file, message) => errors.push(`${file}: ${message}`)

function pascal(name) {
  return name.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase())
}

/** Absolute points visited by a path (end points and control points). */
function pathPoints(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  const pts = []
  let i = 0
  let cmd = ""
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  const num = () => Number(tokens[i++])
  const counts = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++]
    const up = cmd.toUpperCase()
    const rel = cmd !== up
    if (up === "Z") {
      x = sx
      y = sy
      continue
    }
    const n = counts[up]
    if (n === undefined) throw new Error(`unsupported path command ${cmd}`)
    const args = Array.from({ length: n }, num)
    if (args.some(Number.isNaN)) throw new Error(`malformed path near command ${cmd}`)
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    switch (up) {
      case "M":
      case "L":
      case "T":
        x = ox + args[0]
        y = oy + args[1]
        pts.push([x, y])
        if (up === "M") {
          sx = x
          sy = y
          cmd = rel ? "l" : "L"
        }
        break
      case "H":
        x = ox + args[0]
        pts.push([x, y])
        break
      case "V":
        y = oy + args[0]
        pts.push([x, y])
        break
      case "C":
        pts.push([ox + args[0], oy + args[1]], [ox + args[2], oy + args[3]])
        x = ox + args[4]
        y = oy + args[5]
        pts.push([x, y])
        break
      case "S":
      case "Q":
        pts.push([ox + args[0], oy + args[1]])
        x = ox + args[2]
        y = oy + args[3]
        pts.push([x, y])
        break
      case "A":
        x = ox + args[5]
        y = oy + args[6]
        pts.push([x, y])
        break
    }
  }
  return pts
}

function elementBounds(tag, a) {
  const n = (k) => Number(a[k] ?? 0)
  switch (tag) {
    case "path":
      return pathPoints(a.d ?? "")
    case "circle":
      return [
        [n("cx") - n("r"), n("cy") - n("r")],
        [n("cx") + n("r"), n("cy") + n("r")],
      ]
    case "ellipse":
      return [
        [n("cx") - n("rx"), n("cy") - n("ry")],
        [n("cx") + n("rx"), n("cy") + n("ry")],
      ]
    case "rect":
      return [
        [n("x"), n("y")],
        [n("x") + n("width"), n("y") + n("height")],
      ]
    case "line":
      return [
        [n("x1"), n("y1")],
        [n("x2"), n("y2")],
      ]
    default: {
      const nums = (a.points ?? "").trim().split(/[\s,]+/).map(Number)
      const pts = []
      for (let k = 0; k + 1 < nums.length; k += 2) pts.push([nums[k], nums[k + 1]])
      return pts
    }
  }
}

function parseIcon(file) {
  const src = readFileSync(join(sourceDir, file), "utf8")
  const svg = src.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/)
  if (!svg) {
    fail(file, "no <svg> element")
    return null
  }
  const rootAttrs = Object.fromEntries([...svg[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
  if (rootAttrs.viewBox !== "0 0 24 24") fail(file, `viewBox must be "0 0 24 24" (got ${rootAttrs.viewBox})`)
  for (const key of Object.keys(rootAttrs)) {
    if (key !== "viewBox" && key !== "xmlns") fail(file, `root attribute ${key} is not allowed`)
  }
  const body = svg[2].replace(/<!--[\s\S]*?-->/g, "")
  const elements = []
  let seenStroke = false
  let tints = 0
  for (const m of body.matchAll(/<(\w+)\b([^>]*?)\/?>/g)) {
    const tag = m[1]
    if (!ALLOWED_ELEMENTS.has(tag)) {
      fail(file, `<${tag}> is not allowed`)
      continue
    }
    const attrs = Object.fromEntries([...m[2].matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]))
    for (const key of Object.keys(attrs)) {
      if (!ALLOWED_ATTRS.has(key)) fail(file, `<${tag}> attribute ${key} is not allowed`)
    }
    const role = attrs.class ?? "stroke"
    if (!["stroke", "t", "d"].includes(role)) fail(file, `class="${attrs.class}" must be t or d`)
    if (role === "t" && seenStroke) fail(file, "tint shapes (class t) must come before strokes")
    if (role === "t" && ++tints > 1) fail(file, "an icon has at most one tint element (one meaning region)")
    if (role === "t" && tag === "path" && !/z\s*$/i.test(attrs.d ?? "")) fail(file, "a tint path must be closed (end with Z)")
    if (role === "d" && tag === "circle" && Number(attrs.r) < 1) fail(file, `dot radius ${attrs.r} is under 1`)
    for (const value of Object.values(attrs)) {
      const loose = value.match(/\d*\.\d{3,}/)
      if (loose) fail(file, `<${tag}> number ${loose[0]} has more than two decimals`)
    }
    if (role === "stroke") seenStroke = true
    try {
      for (const [x, y] of elementBounds(tag, attrs)) {
        if (x < LIVE_MIN || x > LIVE_MAX || y < LIVE_MIN || y > LIVE_MAX) {
          fail(file, `<${tag}> reaches (${+x.toFixed(2)}, ${+y.toFixed(2)}) outside the ${LIVE_MIN}–${LIVE_MAX} live area`)
          break
        }
      }
    } catch (error) {
      fail(file, error.message)
    }
    elements.push({ tag, attrs, role })
  }
  if (!seenStroke && !elements.some((e) => e.role === "d")) fail(file, "an icon needs at least one stroke or dot")
  return { name: basename(file, ".svg"), elements }
}

function renderElement({ tag, attrs, role }) {
  const parts = Object.entries(attrs)
    .filter(([k]) => k !== "class")
    .map(([k, v]) => `${JSX_ATTR[k] ?? k}="${v}"`)
  if (role === "t") parts.unshift('className="fa-icon-tint"')
  if (role === "d") parts.unshift('className="fa-icon-dot"')
  return `<${tag} ${parts.join(" ")} />`
}

const files = readdirSync(sourceDir).filter((f) => f.endsWith(".svg")).toSorted()
const icons = files.map(parseIcon).filter(Boolean)
const names = new Set()
for (const icon of icons) {
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(icon.name)) fail(`${icon.name}.svg`, "file names are kebab-case")
  if (names.has(icon.name)) fail(`${icon.name}.svg`, "duplicate name")
  names.add(icon.name)
}

if (errors.length) {
  console.error(`Icon spec violations (${errors.length}):\n  ${errors.join("\n  ")}`)
  process.exit(1)
}

const header = "// Generated by scripts/build-icons.mjs from src/icons/svg. Do not edit.\n"
const iconsTsx =
  header +
  'import { createIcon } from "../../ui/icon/index.js"\n\n' +
  icons
    .map((icon) => {
      const body = icon.elements.map(renderElement)
      const children = body.length === 1 ? body[0] : `<>\n    ${body.join("\n    ")}\n  </>`
      return `export const Icon${pascal(icon.name)} = createIcon(\n  "${icon.name}",\n  ${children}\n)\n`
    })
    .join("\n")

const registryTs =
  header +
  "// The full set, for the design gallery only. Product code imports icons by name so\n" +
  "// unused icons are tree-shaken.\n" +
  'import * as icons from "./icons.js"\n\n' +
  "export const iconRegistry = [\n" +
  icons.map((icon) => `  { name: "${icon.name}", Icon: icons.Icon${pascal(icon.name)} },`).join("\n") +
  "\n] as const\n"

const outputs = { "icons.tsx": iconsTsx, "registry.ts": registryTs }
if (check) {
  const stale = Object.entries(outputs).filter(
    ([file, content]) => !existsSync(join(outDir, file)) || readFileSync(join(outDir, file), "utf8") !== content
  )
  if (stale.length) {
    console.error(`Generated icons are stale: ${stale.map(([f]) => f).join(", ")}. Run pnpm icons.`)
    process.exit(1)
  }
  console.log(`icons: ${icons.length} icons conform and generated files are current`)
} else {
  mkdirSync(outDir, { recursive: true })
  for (const [file, content] of Object.entries(outputs)) writeFileSync(join(outDir, file), content)
  console.log(`icons: generated ${icons.length} icons`)
}
