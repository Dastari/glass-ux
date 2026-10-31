#!/usr/bin/env node
// Module-scope wrapper calls must carry `/* @__PURE__ */`. A bundler cannot tell that
// `const X = Object.assign(Base, {...})` or `const X = memo(...)` has no side effect, so it keeps
// the call, and with it everything the call references, even when X is never imported.
//   node scripts/check-pure.mjs          list unannotated calls (exit 1)
//   node scripts/check-pure.mjs --fix    insert the annotation
// Calls with real side effects (`defineMessages` registers a catalogue, subscriptions, ...) are
// deliberately not listed here.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

const fix = process.argv.includes('--fix')
const PURE_CALLS = new Set([
  'Object.assign',
  'memo', 'forwardRef', 'lazy', 'createContext',
  'createFormHook', 'createFormHookContexts', 'tableFeatures', 'metaHelper', 'createToastManager',
])
// `React.memo` and `BaseToast.createToastManager` count as `memo` and `createToastManager`.
const calleeName = (text) => (text === 'Object.assign' ? text : text.split('.').pop())

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name)
  return entry.isDirectory() ? walk(path) : [path]
})
const skipped = /^src\/(gallery|test)\/|\.(test|spec|generated)\.|\.d\.ts$/

const failures = []
for (const file of walk('src').filter((f) => /\.tsx?$/.test(f) && !skipped.test(f))) {
  const text = readFileSync(file, 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const missing = []
  // Only what runs when the module loads: stop at function and class bodies.
  const visit = (node) => {
    if (ts.isFunctionLike(node) || ts.isClassLike(node)) return
    if (ts.isCallExpression(node) && PURE_CALLS.has(calleeName(node.expression.getText(source)))) {
      const annotated = /[@#]__PURE__/.test(text.slice(node.getFullStart(), node.getStart(source)))
      if (!annotated) missing.push(node.getStart(source))
    }
    ts.forEachChild(node, visit)
  }
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) if (declaration.initializer) visit(declaration.initializer)
  }
  if (!missing.length) continue
  if (fix) {
    let next = text
    for (const position of [...missing].sort((a, b) => b - a)) next = `${next.slice(0, position)}/* @__PURE__ */ ${next.slice(position)}`
    writeFileSync(file, next)
  }
  for (const position of missing) failures.push(`${file}:${source.getLineAndCharacterOfPosition(position).line + 1}`)
}

if (fix) console.log(`pure: annotated ${failures.length} call(s)\n${failures.join('\n')}`)
else if (failures.length) {
  console.error(`${failures.join('\n')}\nModule-scope Object.assign/memo/forwardRef/lazy/createContext calls need /* @__PURE__ */ so unused exports tree-shake.`)
  process.exitCode = 1
} else console.log('pure: module-scope wrapper calls are annotated for tree-shaking')
