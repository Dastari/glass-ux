import { useState, type ReactNode } from "react"
import { IconChevronRight } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { formatNumber } from "../format.js"

/** Children shown per object or array before "Show n more". */
const PAGE = 40
/** Depth that opens by default. */
const OPEN_DEPTH = 1
/** Strings longer than this are cut with "…" and the full value in the title. */
const STRING_MAX = 160

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

function kindOf(value: unknown) {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  return typeof value as "object" | "string" | "number" | "boolean"
}

function Scalar({ value }: { value: unknown }) {
  const kind = kindOf(value)
  if (kind === "string") {
    const text = value as string
    const cut = text.length > STRING_MAX
    return (
      <span className="fa-ai-json-value" data-type="string" title={cut ? text : undefined}>
        "{cut ? `${text.slice(0, STRING_MAX)}…` : text}"
      </span>
    )
  }
  return (
    <span className="fa-ai-json-value" data-type={kind}>
      {kind === "null" ? "null" : String(value)}
    </span>
  )
}

function summary(value: Json[] | Record<string, Json>) {
  if (Array.isArray(value)) return `${formatNumber(value.length)} ${value.length === 1 ? "item" : "items"}`
  const keys = Object.keys(value).length
  return `${formatNumber(keys)} ${keys === 1 ? "key" : "keys"}`
}

function Node({ name, value, depth }: { name?: ReactNode; value: unknown; depth: number }) {
  const kind = kindOf(value)
  const branch = kind === "array" || kind === "object"
  const [open, setOpen] = useState(depth < OPEN_DEPTH)
  const [shown, setShown] = useState(PAGE)

  const key = name !== undefined ? (
    <span className="fa-ai-json-key">
      {name}
      <span className="fa-ai-json-colon">:</span>
    </span>
  ) : null

  if (!branch) {
    return (
      <li className="fa-ai-json-row" role="treeitem" aria-selected={false}>
        <span className="fa-ai-json-spacer" />
        {key}
        <Scalar value={value} />
      </li>
    )
  }

  const entries = kind === "array" ? (value as Json[]).map((item, index) => [index, item] as const) : Object.entries(value as Record<string, Json>)
  const brackets = kind === "array" ? ["[", "]"] : ["{", "}"]
  return (
    <li className="fa-ai-json-row" role="treeitem" aria-expanded={open} aria-selected={false}>
      <button type="button" className="fa-ai-json-toggle" aria-label={open ? "Collapse" : "Expand"} onClick={() => setOpen((current) => !current)}>
        <IconChevronRight data-open={open ? "" : undefined} />
      </button>
      {key}
      <span className="fa-ai-json-punct">{brackets[0]}</span>
      {open ? null : (
        <>
          <span className="fa-ai-json-summary">{summary(value as Json[] | Record<string, Json>)}</span>
          <span className="fa-ai-json-punct">{brackets[1]}</span>
        </>
      )}
      {open ? (
        <>
          <ul className="fa-ai-json-children" role="group">
            {entries.slice(0, shown).map(([childKey, child]) => (
              <Node key={childKey} name={kind === "array" ? <span data-numeric>{childKey}</span> : childKey} value={child} depth={depth + 1} />
            ))}
            {entries.length > shown ? (
              <li className="fa-ai-json-row" role="treeitem" aria-selected={false}>
                <span className="fa-ai-json-spacer" />
                <button type="button" className="fa-ai-json-more" onClick={() => setShown((count) => count + PAGE * 5)}>
                  Show {formatNumber(Math.min(entries.length - shown, PAGE * 5))} more of {formatNumber(entries.length)}
                </button>
              </li>
            ) : null}
          </ul>
          <span className="fa-ai-json-close">
            <span className="fa-ai-json-punct">{brackets[1]}</span>
          </span>
        </>
      ) : null}
    </li>
  )
}

export interface JsonTreeProps {
  value: unknown
  /** Accessible name: "Arguments", "Result". */
  label: string
  /** The payload was cut by the server or the client; say so under the tree. */
  truncated?: string
  className?: string
}

/**
 * A read-only JSON viewer for tool arguments and results: collapsible objects and arrays,
 * typed values in the code colours, long arrays paged ("Show 200 more of 1,284") and long
 * strings cut with the full value on hover.
 */
export function JsonTree({ value, label, truncated, className }: JsonTreeProps) {
  return (
    <div className={cx("fa-ai-json", className)}>
      <ul className="fa-ai-json-root" role="tree" aria-label={label}>
        <Node value={value} depth={0} />
      </ul>
      {truncated ? <p className="fa-ai-json-truncated">{truncated}</p> : null}
    </div>
  )
}
