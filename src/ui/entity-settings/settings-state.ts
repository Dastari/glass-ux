/**
 * The rules behind EntitySettingsDialog, pure so they are tested once
 * (settings-state.test.ts):
 *
 *   resolveSetting   where a setting's value comes from: workspace → organisation → site →
 *                    the entity (R6.9), and which level enforces it
 *   SettingsSaveError / SettingsConflictError   what a refused save says
 *   tabMarkers       which tabs carry unsaved changes or errors (the rail's dots)
 *   SecretValue      a write-only secret in a form: keep, replace or clear, never the value
 */

/* ── Inheritance ───────────────────────────────────────────────────────────── */

/**
 * One level's value for a setting. `null` or `undefined`: this level does not set it.
 *
 * The levels, broadest first: the workspace, the entity's organisation, its site, the
 * entity. A parent organisation never passes settings down: it is not a level of its
 * children.
 */
export interface SettingLayer<T> {
  /** "workspace", "organisation", "site", "device". */
  scope: string
  /** Who sets it, as the UI names them: "the workspace", "Orbit Workspace", "Central studio (site)", "this device". */
  label: string
  value: T | null | undefined
  /** This level enforces its value: narrower levels cannot override it. */
  enforced?: boolean
}

export interface ResolvedSetting<T> {
  /** The effective value (the fallback when no scope sets it). */
  value: T | undefined
  /** The scope the effective value comes from; undefined when it is the built-in default. */
  source?: SettingLayer<T>
  /** The entity (the last, narrowest layer) sets its own value. */
  overridden: boolean
  /** What the entity gets without its own value: the parents' effective value and source. */
  inherited: { value: T | undefined; source?: SettingLayer<T> }
  /** The broadest level that enforces a value; the entity's own value is then ignored. */
  enforced?: SettingLayer<T>
}

const isSet = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined

/**
 * Resolve a setting across its levels. `layers` run broadest first (workspace) to narrowest
 * last (the entity being edited). The broadest level that enforces a value wins outright;
 * otherwise the narrowest level that sets a value wins.
 */
export function resolveSetting<T>(layers: readonly SettingLayer<T>[], fallback?: T): ResolvedSetting<T> {
  const parents = layers.slice(0, -1)
  const own = layers.at(-1)
  const enforced = parents.find((layer) => layer.enforced && isSet(layer.value))
  if (enforced) {
    const inherited = { value: enforced.value as T, source: enforced }
    return { value: inherited.value, source: enforced, overridden: false, inherited, enforced }
  }
  const parentSource = parents.findLast((layer) => isSet(layer.value))
  const inherited = { value: parentSource ? (parentSource.value as T) : fallback, source: parentSource }
  if (own && isSet(own.value)) return { value: own.value, source: own, overridden: true, inherited }
  return { value: inherited.value, source: inherited.source, overridden: false, inherited }
}

/* ── Dirty and error tracking per tab ──────────────────────────────────────── */

/** Read "snmp.port" or "links[0].relation" from a values object. */
export function getPath(values: unknown, path: string): unknown {
  const parts = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
  let current: unknown = values
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/** Structural equality for form values (plain objects, arrays, primitives, dates). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))
  const aKeys = Object.keys(a).filter((key) => (a as Record<string, unknown>)[key] !== undefined)
  const bKeys = Object.keys(b).filter((key) => (b as Record<string, unknown>)[key] !== undefined)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
}

/** Does a field name fall under one of a tab's prefixes ("snmp" owns "snmp.port")? */
export function ownsField(prefixes: readonly string[], field: string) {
  const name = field.replace(/\[(\d+)\]/g, ".$1")
  return prefixes.some((prefix) => name === prefix || name.startsWith(`${prefix}.`))
}

export type TabMarker = "dirty" | "error" | "saved"

export interface TabFields {
  value: string
  /** Field names or prefixes the tab edits. */
  fields?: readonly string[]
}

/** What the markers read about one field: its errors, and whether it still holds its saved value. */
export interface FieldMarkerState {
  errors?: readonly unknown[]
  /** False once the value differs from the saved one (TanStack Form's `isDefaultValue`). */
  isDefaultValue?: boolean
}

/**
 * Each tab's dot: `error` when a field it owns has an error, else `dirty` when a field it
 * owns differs from its saved value, else none.
 */
export function tabMarkers(tabs: readonly TabFields[], fields: Readonly<Record<string, FieldMarkerState | undefined>>): Record<string, TabMarker | undefined> {
  const entries = Object.entries(fields)
  const errored = entries.filter(([, meta]) => (meta?.errors ?? []).some(Boolean)).map(([name]) => name)
  const changed = entries.filter(([, meta]) => meta?.isDefaultValue === false).map(([name]) => name)
  const markers: Record<string, TabMarker | undefined> = {}
  for (const tab of tabs) {
    const prefixes = tab.fields ?? []
    if (!prefixes.length) continue
    if (errored.some((name) => ownsField(prefixes, name))) markers[tab.value] = "error"
    else if (changed.some((name) => ownsField(prefixes, name))) markers[tab.value] = "dirty"
  }
  return markers
}

/* ── Saving ────────────────────────────────────────────────────────────────── */

export interface SettingsSaveOutcome {
  /** Field errors by form path ("snmp.authPassword"): shown at the field, the tab marked. */
  fieldErrors?: Record<string, string>
  /** Documents someone else saved first: the tab marked, a notice beside Save with Reload. */
  conflicts?: readonly SettingsConflict[]
  /**
   * Fields (names or prefixes) whose documents did save, when only some did: those tabs
   * show ✓ and their values become the baseline (the caller passes the saved document back).
   */
  saved?: readonly string[]
}

/**
 * A save that did not fully go through. Each tab saves its own document, so a save can
 * succeed for some tabs, refuse fields in another and conflict in a third; the outcome says
 * which. `message` goes in a toast.
 */
export class SettingsSaveError extends Error {
  readonly fieldErrors: Readonly<Record<string, string>>
  readonly conflicts: readonly SettingsConflict[]
  readonly saved: readonly string[]
  constructor(message: string, outcome: SettingsSaveOutcome | Record<string, string> = {}) {
    super(message)
    this.name = "SettingsSaveError"
    const isOutcome = "fieldErrors" in outcome || "conflicts" in outcome || "saved" in outcome
    const parts = (isOutcome ? outcome : { fieldErrors: outcome as Record<string, string> }) as SettingsSaveOutcome
    this.fieldErrors = parts.fieldErrors ?? {}
    this.conflicts = parts.conflicts ?? []
    this.saved = parts.saved ?? []
  }
}

/** Someone else saved part of the document since it was loaded. */
export interface SettingsConflict {
  /** The field names or prefixes whose document changed ("snmp"). */
  fields: readonly string[]
  /** Who saved it: "Jamie Wells". */
  changedBy: string
}

/**
 * One document refused because it changed since the dialog opened (each tab saves its own
 * document with its own version). Separate from field errors: the user's edits stay until
 * they reload.
 */
export class SettingsConflictError extends SettingsSaveError {
  constructor(message: string, conflicts: readonly SettingsConflict[]) {
    super(message, { conflicts })
    this.name = "SettingsConflictError"
  }
}

/* ── Secrets ───────────────────────────────────────────────────────────────── */

/**
 * A write-only secret as a form holds it (BR notes: secrets are never returned). The server
 * says only whether one is stored; the form records what to do with it.
 */
export interface SecretValue {
  /** The server holds a value. */
  stored: boolean
  /** keep: leave it · replace: send `value` · clear: remove it. */
  action: "keep" | "replace" | "clear"
  /** The new value while replacing. Empty otherwise. */
  value: string
}

export const secretValue = (stored: boolean): SecretValue => ({ stored, action: "keep", value: "" })

/** Will a value be stored after saving? */
export const secretWillBeSet = (secret: SecretValue) => (secret.action === "replace" ? secret.value.length > 0 : secret.action === "keep" && secret.stored)

/** What to send: nothing when kept, the new value, or null to clear. */
export const secretPatch = (secret: SecretValue): string | null | undefined =>
  secret.action === "replace" ? (secret.value.length > 0 ? secret.value : undefined) : secret.action === "clear" ? null : undefined
