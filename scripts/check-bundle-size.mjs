#!/usr/bin/env node
// Bundles package entries the way a consumer's bundler would and checks their minified and
// gzip sizes against budgets. By default the sources are compiled per file as `tsc` emits them
// for the package, so no build is needed; `--dist` bundles the built dist/ instead.
//   node scripts/check-bundle-size.mjs            check the budgeted entries
//   node scripts/check-bundle-size.mjs --report   measure every public entry (slow)
//   node scripts/check-bundle-size.mjs --report glass-ux/form:FormStack   measure named imports
//   node scripts/check-bundle-size.mjs --explain glass-ux/form FormStack  list the largest modules
//   node scripts/check-bundle-size.mjs --json     print measurements as JSON
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import ts from 'typescript'
import { build } from 'vite'

const root = resolve(import.meta.dirname, '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const args = new Set(process.argv.slice(2))
const fromDist = args.has('--dist')

/**
 * Gzip budgets in bytes for a whole entry (`export *`) or a named import, plus packages that
 * must stay out of the initial chunk (they load on demand). Budgets leave about 10% headroom
 * over the measured size; raise one deliberately with the change that needs it.
 */
const BUDGETS = [
  { entry: 'glass-ux/icons', named: 'IconSearch', gzip: 1_000 },
  // Includes the shared Base UI direction context and script-aware localeDirection fallback.
  { entry: 'glass-ux/locale', gzip: 1_300 },
  { entry: 'glass-ux/button', named: 'Button', gzip: 34_000 },
  { entry: 'glass-ux/input', named: 'Input', gzip: 43_000 },
  { entry: 'glass-ux/form', named: 'FormStack', gzip: 1_000, forbid: ['@tanstack/form-core', '@tanstack/react-form'] },
  { entry: 'glass-ux/phone-field', named: 'PhoneField', gzip: 75_000, forbid: ['libphonenumber-js'] },
  { entry: 'glass-ux/rich-text', named: 'RichTextInput', gzip: 67_000, forbid: ['lexical', '@lexical/rich-text'] },
  { entry: 'glass-ux/map', named: 'GeoMap', gzip: 75_000, forbid: ['maplibre-gl'] },
  { entry: 'glass-ux/ai/code-block', named: 'CodeBlock', gzip: 40_000, forbid: ['shiki', '@shikijs/core'] },
  // Interface messages and the resolver add about 1–2 KB gzip to these compositions.
  { entry: 'glass-ux/ai/results', named: 'ResultBlock', gzip: 103_000, /* the shared Lightbox replaced the results' own */ forbid: ['d3-scale', '@tanstack/form-core'] },
  { entry: 'glass-ux/ai/message', named: 'AssistantMessage', gzip: 230_000, forbid: ['d3-scale', '@tanstack/form-core', 'shiki'] },
]

/** Packages large enough to be worth reporting when an entry pulls them in. */
const HEAVY = ['shiki', '@shikijs', 'maplibre-gl', 'lexical', '@lexical', 'd3-', 'libphonenumber-js', 'country-flag-icons', 'react-markdown', 'remark-', 'rehype-', 'micromark', 'mdast-', 'hast-', '@tanstack/', 'zod']
const EXTERNAL = /^(react|react-dom)(\/|$)/

function entryFile(spec) {
  // Bundled through the package's self-reference so `exports` and `sideEffects` apply as in a consumer.
  const key = spec === 'glass-ux' ? '.' : `./${spec.slice('glass-ux/'.length)}`
  const target = pkg.exports[key]
  const file = typeof target === 'string' ? target : target?.import
  if (!file || !file.endsWith('.js')) return null
  return join(root, file)
}

/** The source file tsc compiles to a dist/ module. */
function sourceOf(distFile) {
  const base = distFile.replace(`${join(root, 'dist')}/`, `${join(root, 'src')}/`).replace(/\.js$/, '')
  return ['.ts', '.tsx'].map((ext) => base + ext).find((file) => existsSync(file)) ?? null
}

/** Resolve package specifiers to sources and compile each file as `tsc -p tsconfig.build.json` does. */
const sourcePlugin = {
  name: 'size-source',
  enforce: 'pre',
  resolveId(id) {
    if (id !== 'glass-ux' && !id.startsWith('glass-ux/')) return null
    const file = entryFile(id)
    return file ? sourceOf(file) : null
  },
  load(id) {
    if (!id.startsWith(join(root, 'src/')) || !/\.tsx?$/.test(id)) return null
    return ts.transpileModule(readFileSync(id, 'utf8'), {
      fileName: id,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, isolatedModules: true },
    }).outputText
  },
}

function packageOf(id) {
  const m = id.replace(/\\/g, '/').match(/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/)
  return m?.[1] ?? null
}

async function measure(spec, named) {
  const file = entryFile(spec)
  if (!file) throw new Error(`${spec} has no JavaScript import target`)
  if (fromDist ? !existsSync(file) : !sourceOf(file)) throw new Error(`${spec}: no ${fromDist ? `${file}; run pnpm build` : 'source module'}`)
  const code = named ? `export { ${named} } from ${JSON.stringify(spec)}` : `export * from ${JSON.stringify(spec)}`
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    root,
    plugins: [{
      name: 'size-entry',
      enforce: 'pre',
      resolveId: (id) => (id === 'virtual:size-entry' ? '\0size-entry' : null),
      load: (id) => (id === '\0size-entry' ? code : null),
    }, ...(fromDist ? [] : [sourcePlugin])],
    build: {
      write: false,
      minify: true,
      modulePreload: false,
      reportCompressedSize: false,
      rollupOptions: { input: 'virtual:size-entry', preserveEntrySignatures: 'strict', external: (id) => EXTERNAL.test(id) },
    },
  })
  const chunks = (Array.isArray(result) ? result : [result]).flatMap((o) => o.output).filter((c) => c.type === 'chunk')
  const initial = chunks.filter((c) => c.isEntry || chunks.some((e) => e.isEntry && e.imports.includes(c.fileName)))
  const sum = (list) => list.reduce((n, c) => n + Buffer.byteLength(c.code), 0)
  const gz = (list) => gzipSync(list.map((c) => c.code).join('\n')).length
  const heavy = new Set()
  for (const chunk of initial) for (const id of Object.keys(chunk.modules)) {
    const name = packageOf(id)
    if (name && HEAVY.some((h) => name.startsWith(h))) heavy.add(name)
  }
  const modules = {}
  for (const chunk of initial) for (const [id, info] of Object.entries(chunk.modules)) {
    const name = packageOf(id) ?? id.replace(`${root}/`, '').replace(/\.tsx?$/, '.js').replace(/^src\//, 'dist/')
    modules[name] = (modules[name] ?? 0) + info.renderedLength
  }
  return { spec, named: named ?? '*', min: sum(initial), gzip: gz(initial), lazy: sum(chunks) - sum(initial), heavy: [...heavy].sort(), modules }
}

function publicEntries() {
  return Object.entries(pkg.exports)
    .filter(([key, value]) => !key.includes('*') && typeof value === 'object' && value.import?.endsWith('.js') && key !== './vite' && key !== './gallery')
    .map(([key]) => (key === '.' ? 'glass-ux' : `glass-ux/${key.slice(2)}`))
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`.padStart(9)
const started = performance.now()
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (args.has('--explain')) {
  // node scripts/check-bundle-size.mjs --explain glass-ux/form [FormStack]
  const [spec, named] = positional
  const row = await measure(spec, named)
  console.log(`${spec}${named ? ` { ${named} }` : ''}: min ${kb(row.min)} gzip ${kb(row.gzip)} lazy ${kb(row.lazy)}`)
  for (const [name, size] of Object.entries(row.modules).sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`${kb(size)}  ${name}`)
} else if (args.has('--report')) {
  const rows = []
  const named = positional.length ? positional : null
  for (const spec of named ?? publicEntries()) rows.push(await measure(...spec.split(':')))
  rows.sort((a, b) => b.gzip - a.gzip)
  if (args.has('--json')) console.log(JSON.stringify(rows.map(({ modules: _modules, ...r }) => r), null, 2))
  else for (const r of rows) console.log(`${(r.named === '*' ? r.spec : `${r.spec}:${r.named}`).padEnd(44)} min ${kb(r.min)}  gzip ${kb(r.gzip)}  lazy ${kb(r.lazy)}  ${r.heavy.join(' ')}`)
} else {
  const failures = []
  const rows = await Promise.all(BUDGETS.map(async (budget) => ({ budget, row: await measure(budget.entry, budget.named) })))
  for (const { budget, row } of rows) {
    const label = `${budget.entry}${budget.named ? ` { ${budget.named} }` : ''}`
    const leaked = (budget.forbid ?? []).filter((name) => name in row.modules)
    const ok = row.gzip <= budget.gzip && leaked.length === 0
    if (!ok) failures.push(leaked.length ? `${label} (bundles ${leaked.join(', ')})` : label)
    if (args.has('--json')) continue
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(42)} gzip ${kb(row.gzip)} / ${kb(budget.gzip)}  min ${kb(row.min)}${leaked.length ? `  bundles ${leaked.join(' ')}` : ''}`)
  }
  if (args.has('--json')) console.log(JSON.stringify(rows.map(({ row: { modules: _modules, ...row } }) => row), null, 2))
  console.log(`bundle size: ${rows.length} entries in ${((performance.now() - started) / 1000).toFixed(1)}s`)
  if (failures.length) {
    console.error(`Bundle budget exceeded: ${failures.join(', ')}`)
    process.exit(1)
  }
}
