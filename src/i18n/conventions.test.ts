import ts from "typescript"
import { describe, expect, it } from "vitest"
import { registeredMessages, type Message } from "../lib/i18n/catalog.js"

import.meta.glob("../{ui,shell,windows,ai}/**/*messages.ts", { eager: true })

// A cascader path is a visual hierarchy, rather than a sentence or a list of choices.
// Its spaced slash is intentionally kept as a structural separator.
const structuralSeparators = new Set(["cascader.separator"])

function sample(name: string, alternate: boolean): string | number | boolean {
  if (name === "locale") return "en-AU"
  if (name === "state") return alternate ? "failed" : "executed"
  if (name === "view") return alternate ? "week" : "month"
  if (/^(expanded|keyboard|pointer|more|multiple)$/.test(name)) return alternate
  if (/^(count|total|position|index|step|length|minimum|maximum|limit|visible|interval|percent|running|n|lightness|chroma)$/.test(name)) return alternate ? 2 : 1
  return "Sample"
}

function examples(message: Message): string[] {
  if (typeof message === "string") return [message]
  const source = ts.createSourceFile("message.ts", `const message = ${message.toString()}`, ts.ScriptTarget.Latest, true)
  const statement = source.statements[0]
  if (!statement || !ts.isVariableStatement(statement)) throw new Error("Expected a message function")
  const fn = statement.declarationList.declarations[0]?.initializer
  if (!fn || !ts.isArrowFunction(fn)) throw new Error("Expected an arrow message")
  return [false, true].map((alternate) => {
    const args = fn.parameters.map(({ name }) => {
      if (ts.isObjectBindingPattern(name)) return Object.fromEntries(name.elements.map((part) => [part.name.getText(source), sample(part.name.getText(source), alternate)]))
      return sample(name.getText(source), alternate)
    })
    return message(...args)
  })
}

describe("message conventions", () => {
  it("uses short purpose keys and whole messages without boundary whitespace or separators", () => {
    for (const [namespace, { defaults }] of registeredMessages()) {
      for (const [key, message] of Object.entries(defaults)) {
        const id = `${namespace}.${key}`
        expect(key, id).toMatch(/^[a-z][A-Za-z]*$/)
        expect(key.length, id).toBeLessThanOrEqual(32)
        if (structuralSeparators.has(id)) continue
        for (const text of examples(message)) {
          expect(text, id).toBe(text.trim())
          expect(text, id).not.toMatch(/^[,·.:]/)
        }
      }
    }
  })

  it("keeps interpolation parameters named and typed in component descriptors", () => {
    const sources = import.meta.glob("../{ui,shell,windows,ai}/**/*messages.ts", { eager: true, query: "?raw", import: "default" }) as Record<string, string>
    for (const [path, source] of Object.entries(sources)) {
      expect(source, path).not.toMatch(/\bvalue\d+\b|:\s*unknown\b/)
    }
  })
})
