/** Shared parts of the filter editors: the props, the form, the footer, the condition select and the list input. */
import { useEffect, type ClipboardEvent, type FormEvent, type ReactNode } from "react"
import { Button } from "../../button/index.js"
import { Select } from "../../select/index.js"
import { TagInput } from "../../tag-input/index.js"
import { MAX_LIST_VALUES } from "./codec.js"
import type { FilterSpec } from "./types.js"

/** What every built-in editor receives. */
export interface EditorProps<S extends FilterSpec, V> {
  /** Typed rendering or field specification. */
  spec: S
  /** The filter's name for accessible labels ("Operating system"). */
  label: string
  value: V | undefined
  /** Apply now and stay open (live editors). Undefined removes the filter. */
  onChange: (value: V | undefined) => void
  /** Apply and close (Enter, Apply, Clear). Undefined removes the filter. */
  onCommit: (value: V | undefined) => void
  /** Register the function that applies a pending typed value: the popover calls it when
   *  it closes by a click outside (Esc discards). */
  onFlush?: (apply: (() => void) | null) => void
  /** Labels learnt from a server-loaded option list (for chips). */
  onLabels?: (labels: ReadonlyArray<readonly [string, string]>) => void
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Split a pasted list on new lines, commas, semicolons, tabs and spaces. */
export const splitPasted = (text: string) => [
  ...new Set(
    text
      .split(/[\s,;]+/)
      .map((part) => part.trim())
      .filter(Boolean)
  ),
]

/** Clear (when something is applied) and Apply (typed editors). Always the same box, so nothing moves. */
export function EditorFooter({ applied, onClear, apply }: { applied: boolean; onClear: () => void; apply?: boolean }) {
  return (
    <div className="fa-dt-filter-footer">
      <Button size="sm" variant="ghost" disabled={!applied} onClick={onClear}>
        Clear
      </Button>
      {apply ? (
        <Button size="sm" variant="primary" type="submit">
          Apply
        </Button>
      ) : null}
    </div>
  )
}

/** A form so Enter in any field applies; `draft()` is the value to apply, or null when incomplete. */
export function EditorForm({
  children,
  draft,
  onCommit,
  onFlush,
}: {
  children: ReactNode
  draft: () => unknown
  /** Called with the complete `draft()` value on submit (Enter) or when the registered flush runs; not called while the draft is null. */
  onCommit: (value: never) => void
  /** Called after each render with a function that commits the current draft, and with `null` on unmount; the popover calls it when it closes by a click outside. */
  onFlush?: (apply: (() => void) | null) => void
}) {
  useEffect(() => {
    onFlush?.(() => {
      const next = draft()
      if (next !== null) onCommit(next as never)
    })
    return () => onFlush?.(null)
  })
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = draft()
    if (next !== null) onCommit(next as never)
  }
  return (
    <form className="fa-dt-filter-form" onSubmit={submit} noValidate>
      {children}
    </form>
  )
}

export function ConditionSelect<O extends string>({ ops, labels, value, onChange }: { ops: readonly O[]; labels: Record<O, string>; value: O; onChange: (op: O) => void }) {
  if (ops.length < 2) return null
  return (
    <Select<O>
      size="sm"
      aria-label="Condition"
      options={ops.map((op) => ({ value: op, label: labels[op] }))}
      value={value}
      onValueChange={(next) => next && onChange(next)}
    />
  )
}

/** A list of pasted or typed values as chips. Pasting splits on lines, commas and spaces. */
export function ListInput({ values, onChange, label, validate }: { values: string[]; onChange: (values: string[]) => void; label: string; validate?: (value: string) => string | null }) {
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData("text")
    if (!/\s/.test(text.trim())) return
    event.preventDefault()
    event.stopPropagation()
    onChange([...new Set([...values, ...splitPasted(text)])].slice(0, MAX_LIST_VALUES))
  }
  return (
    <div className="fa-dt-filter-list-input" onPasteCapture={onPaste}>
      <TagInput size="sm" value={values} onValueChange={onChange} placeholder="Paste or type values" aria-label={`${label} values`} max={MAX_LIST_VALUES} validate={validate} />
    </div>
  )
}
