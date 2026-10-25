import { codeBlockMessages, getCodeBlockMessages } from "./messages.js"
/**
 * Lazy syntax highlighting. Shiki loads on the first code block that needs it: the core and
 * the JavaScript regex engine (no WASM), when the browser is idle. Each grammar loads the
 * first time a block in that language needs it, so a PowerShell answer never downloads the
 * TypeScript grammar (docs/performance.md). The theme is CSS variables (`--fa-code-*`, set
 * in code-block.css from our colour roles), so highlighted code follows the mode and
 * palette without re-rendering.
 */
import type { HighlighterCore } from "shiki/core"

export interface CodeToken {
  /** Content rendered by this slot or overlay. */
  content: string
  color?: string
}

/** Grammar aliases → the grammars we bundle. Anything else stays plain. */
const ALIASES: Record<string, string> = {
  powershell: "powershell",
  ps1: "powershell",
  ps: "powershell",
  pwsh: "powershell",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  json: "json",
  jsonc: "json",
  yaml: "yaml",
  yml: "yaml",
  typescript: "typescript",
  ts: "typescript",
  tsx: "typescript",
  javascript: "typescript",
  js: "typescript",
  sql: "sql",
  xml: "xml",
  ini: "ini",
  reg: "ini",
  conf: "ini",
  log: "log",
}

/** Display names for the language label. */
export const LANGUAGE_LABELS: Record<string, string> = {
  powershell: codeBlockMessages.defaults.languagePowershell,
  bash: codeBlockMessages.defaults.languageBash,
  json: codeBlockMessages.defaults.languageJson,
  yaml: codeBlockMessages.defaults.languageYaml,
  typescript: codeBlockMessages.defaults.languageTypescript,
  sql: codeBlockMessages.defaults.languageSql,
  xml: codeBlockMessages.defaults.languageXml,
  ini: codeBlockMessages.defaults.languageIni,
  log: codeBlockMessages.defaults.log,
  text: codeBlockMessages.defaults.text,
}

/** The bundled grammar for a language name or alias (case-insensitive, e.g. `ps1` → `powershell`), or `null` when none is bundled and the code stays plain. */
export function resolveLanguage(language: string | undefined) {
  const key = (language ?? "").toLowerCase().trim()
  return ALIASES[key] ?? null
}

/** The display name for a code block's language label: the bundled grammar's name, otherwise the given name as written, or "Text" when none is given. */
export function languageLabel(language: string | undefined, messages: ReturnType<typeof getCodeBlockMessages> = getCodeBlockMessages()) {
  const resolved = resolveLanguage(language)
  if (resolved === "log") return messages.log
  if (resolved === "text") return messages.text
  if (resolved) return LANGUAGE_LABELS[resolved] ?? resolved
  return language ? language : messages.text
}

/** Each grammar is its own chunk, fetched the first time a block in that language shows. */
const GRAMMARS: Record<string, () => Promise<unknown>> = {
  powershell: () => import("shiki/langs/powershell.mjs"),
  bash: () => import("shiki/langs/bash.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  xml: () => import("shiki/langs/xml.mjs"),
  ini: () => import("shiki/langs/ini.mjs"),
  log: () => import("shiki/langs/log.mjs"),
}

/** Resolve when the browser is idle (or soon), so highlighting never competes with a load. */
function whenIdle() {
  return new Promise<void>((resolve) => {
    if (typeof requestIdleCallback === "function") requestIdleCallback(() => resolve(), { timeout: 1500 })
    else setTimeout(resolve, 200)
  })
}

let loading: Promise<HighlighterCore> | null = null
const grammars = new Map<string, Promise<void>>()

/**
 * Load the shared Shiki highlighter once, after the browser is idle, with the CSS-variable
 * theme (`--fa-code-*`) and no grammars; later calls return the same promise.
 */
export function loadHighlighter(): Promise<HighlighterCore> {
  loading ??= (async () => {
    await whenIdle()
    const [{ createHighlighterCore, createCssVariablesTheme }, { createJavaScriptRegexEngine }] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
    ])
    const theme = createCssVariablesTheme({ name: "glassUx", variablePrefix: "--fa-code-", fontStyle: false })
    return createHighlighterCore({ themes: [theme], langs: [], engine: createJavaScriptRegexEngine() })
  })()
  return loading
}

async function loadGrammar(highlighter: HighlighterCore, lang: string) {
  let pending = grammars.get(lang)
  if (!pending) {
    const load = GRAMMARS[lang]
    pending = load ? highlighter.loadLanguage(load() as never) : Promise.resolve()
    grammars.set(lang, pending)
  }
  await pending
}

/** Tokenise `code` into lines of coloured runs, or null when the language is not bundled. */
export async function highlight(code: string, language: string | undefined): Promise<CodeToken[][] | null> {
  const lang = resolveLanguage(language)
  if (!lang) return null
  const highlighter = await loadHighlighter()
  await loadGrammar(highlighter, lang)
  const lines = highlighter.codeToTokensBase(code, { lang, theme: "glassUx" })
  return lines.map((line) => line.map((token) => ({ content: token.content, color: token.color })))
}
