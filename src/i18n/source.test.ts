import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

// Component code hands whole values to messages and to Intl; each language decides case,
// plurals, percent signs and list separators. These patterns bypassed that before.
const root = join(import.meta.dirname, "..")
const folders = ["ui", "shell", "windows", "ai"]

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) && !entry.name.endsWith("messages.ts") ? [path] : []
  })
}

const files = folders.flatMap((folder) => sources(join(root, folder))).map((path) => ({
  path: relative(root, path),
  lines: readFileSync(path, "utf8").split("\n"),
}))

const rules: { name: string; pattern: RegExp; tsx?: boolean }[] = [
  // "Weitere export Optionen": a message's argument or result lowercased in code.
  { name: "changes the case of text passed to a message", pattern: /messages\.\w+\([^;]*\.to(?:Lower|Upper)Case\(\)/ },
  { name: "changes the case of a message", pattern: /\b(?:messages|m|t)\.\w+\.to(?:Lower|Upper)Case\(\)/ },
  // English plural rules: a literal chosen by a count of one.
  { name: "chooses a literal by a count of one", pattern: /\b(?:count|n|total|length|size)\s*===\s*1\s*\?\s*["'`]/ },
  // Percent signs in visible text: German writes "50 %", Arabic "٪٥٠".
  { name: "writes a percent sign after a value in JSX", pattern: /\}%(?:<|\{|$)/, tsx: true },
  // Arabic separates with "،"; Intl.ListFormat knows each language's separator.
  { name: 'joins visible items with ", "', pattern: /\.join\(", "\)/, tsx: true },
]

describe("component source", () => {
  for (const rule of rules)
    it(`never ${rule.name}`, () => {
      const hits = files
        .filter((file) => !rule.tsx || file.path.endsWith(".tsx"))
        .flatMap((file) => file.lines.flatMap((line, index) => (rule.pattern.test(line) ? [`${file.path}:${index + 1}: ${line.trim()}`] : [])))
      expect(hits).toEqual([])
    })
})
