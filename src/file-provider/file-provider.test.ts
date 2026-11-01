import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { describe, expect, it } from "vitest"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "../..")
const contract = join(here, "index.ts")
const memory = join(here, "memory.ts")

/** Compiles real files with one lib and no ambient types, keeping what the compiler would emit. */
function compile(files: string[], lib: string[]) {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: lib.map((name) => `lib.${name}.d.ts`),
    types: [],
    strict: true,
    noUncheckedIndexedAccess: true,
    isolatedModules: true,
    skipLibCheck: false,
    noEmit: false,
    declaration: true,
    rootDir: root,
    outDir: join(root, "file-provider-test-output"),
  }
  const emitted = new Map<string, string>()
  const program = ts.createProgram(files, options)
  program.emit(undefined, (name, text) => emitted.set(name.split("/").pop()!, text))
  const diagnostics = ts.getPreEmitDiagnostics(program).map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n"))
  return { diagnostics, emitted, program }
}

describe("glass-ux/file-provider", () => {
  const libs = [
    ["es2023", "webworker"],
    ["es2023", "dom"],
  ]

  it.each(libs)("compiles against %s and %s with no ambient types", (...lib) => {
    expect(compile([contract], lib).diagnostics).toEqual([])
  })

  it.each(libs)("memoryFiles compiles against %s and %s, so it runs in a worker", (...lib) => {
    expect(compile([memory], lib).diagnostics).toEqual([])
  })

  it("has no imports and declares nothing with a value", () => {
    const source = ts.createSourceFile(contract, readFileSync(contract, "utf8"), ts.ScriptTarget.Latest, true)
    for (const statement of source.statements) {
      expect(ts.isImportDeclaration(statement), statement.getText()).toBe(false)
      expect(ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement), statement.getText()).toBe(true)
      expect(statement.getFirstToken()?.kind, statement.getText()).toBe(ts.SyntaxKind.ExportKeyword)
    }
  })

  it("emits no runtime code", () => {
    const { emitted } = compile([contract], ["es2023", "webworker"])
    const javascript = emitted.get("index.js")
    expect(javascript).toBeDefined()
    const output = ts.createSourceFile("index.js", javascript!, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    expect(output.statements.map((statement) => statement.getText())).toEqual(["export {};"])
    expect(emitted.get("index.d.ts")).not.toMatch(/\bimport\b|\brequire\b/)
  })

  it("is declared as an entry in package.json", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { exports: Record<string, { types: string; import: string }> }
    expect(pkg.exports["./file-provider"]?.types).toBe("./dist/file-provider/index.d.ts")
    expect(pkg.exports["./file-provider/memory"]?.import).toBe("./dist/file-provider/memory.js")
  })
})
