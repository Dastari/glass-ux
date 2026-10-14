import { useEffect, useMemo, useState } from "react"
import { Button } from "../../button/index.js"
import { Checkbox } from "../../checkbox/index.js"
import { filterOptions, useOptionSearch, type OptionItem, type OptionSource, type SearchResult } from "../../combobox/index.js"
import { SearchField } from "../../input/index.js"
import { Select } from "../../select/index.js"
import { Skeleton } from "../../skeleton/index.js"
import { EditorFooter, type EditorProps } from "./editor-parts.js"
import { OPTIONS_OP_LABELS, optionLabel } from "./summary.js"
import type { OptionsFilterSpec, OptionsFilterValue, OptionsOp } from "./types.js"

/** A search box appears above this many options. */
export const SEARCH_ABOVE = 8
/** Placeholder rows while a server list loads. */
const SKELETON_ROWS = 6

type Loaded = { items: OptionItem[]; more: number; failed: boolean }
const fullLists = new WeakMap<OptionSource, Loaded>()

/**
 * The column's options: a static list, or a source searched with "" for the full list
 * (cached per source). Typing filters a complete list in place and searches the server
 * only when the server said it holds more.
 */
function useFilterOptions(spec: OptionsFilterSpec, query: string) {
  const source = spec.source
  const [loaded, setLoaded] = useState<Loaded | null>(() => (source ? (fullLists.get(source) ?? null) : null))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!source || loaded) return
    const controller = new AbortController()
    source
      .search("", { signal: controller.signal })
      .then((raw) => {
        if (controller.signal.aborted) return
        const result: SearchResult = Array.isArray(raw) ? { items: raw } : raw
        const next = { items: result.items, more: result.more ?? 0, failed: false }
        fullLists.set(source, next)
        setLoaded(next)
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ items: [], more: 0, failed: true })
      })
    return () => controller.abort()
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- attempt: Retry loads the list again
  }, [source, loaded, attempt])

  const serverSearch = Boolean(source && loaded && loaded.more > 0 && query.trim())
  const searched = useOptionSearch(serverSearch ? source : undefined, query)

  if (!source) return { items: filterOptions([...(spec.options ?? [])] as OptionItem[], query), total: spec.options?.length ?? 0, status: "idle" as const, retry: () => {} }
  const retry = () => {
    setLoaded(null)
    setAttempt((value) => value + 1)
  }
  if (!loaded) return { items: [], total: 0, status: "loading" as const, retry }
  if (loaded.failed) return { items: [], total: 0, status: "error" as const, retry }
  if (serverSearch) return { items: searched.items, total: loaded.items.length + loaded.more, status: searched.status, retry: searched.retry }
  return { items: filterOptions(loaded.items, query), total: loaded.items.length + loaded.more, status: "idle" as const, retry }
}

const isEmptyOp = (op: OptionsOp): op is "isEmpty" | "isNotEmpty" => op === "isEmpty" || op === "isNotEmpty"

/**
 * A checkbox list that applies as you tick. A search box appears above eight options;
 * Select all and None act on what the search shows. Values chosen earlier that the list
 * no longer offers stay listed (and ticked) at the top until you clear them.
 */
export function OptionsEditor({ spec, label, value, onChange, onCommit, onLabels }: EditorProps<OptionsFilterSpec, OptionsFilterValue>) {
  const [op, setOp] = useState<OptionsOp>(value?.op ?? spec.operators[0] ?? "in")
  const [query, setQuery] = useState("")
  const options = useFilterOptions(spec, query)
  const selected = useMemo(() => (value && "values" in value ? value.values : []), [value])

  useEffect(() => {
    if (spec.source && options.items.length) onLabels?.(options.items.map((item) => [item.value, item.label] as const))
  }, [spec.source, options.items, onLabels])

  const listOp: "in" | "notIn" = op === "notIn" ? "notIn" : "in"
  const apply = (values: string[]) => onChange(values.length ? { op: listOp, values } : undefined)
  const toggle = (item: string, checked: boolean) => apply(checked ? [...selected.filter((entry) => entry !== item), item] : selected.filter((entry) => entry !== item))

  const shownValues = new Set(options.items.map((item) => item.value))
  const orphans = query.trim() ? [] : selected.filter((entry) => !shownValues.has(entry))
  // A server-loaded set is open-ended: its search box is there from the start, so nothing moves when it loads.
  const showSearch = spec.source ? true : (spec.options?.length ?? 0) > SEARCH_ABOVE

  return (
    <div className="fa-dt-filter-form">
      {spec.operators.length > 1 ? (
        <Select<OptionsOp>
          size="sm"
          aria-label="Condition"
          options={spec.operators.map((entry) => ({ value: entry, label: OPTIONS_OP_LABELS[entry] }))}
          value={op}
          onValueChange={(next) => {
            if (!next) return
            setOp(next)
            if (isEmptyOp(next)) onChange({ op: next })
            else if (selected.length) onChange({ op: next, values: selected })
            else if (value && isEmptyOp(value.op)) onChange(undefined)
          }}
        />
      ) : null}
      {isEmptyOp(op) ? null : (
        <>
          {showSearch ? <SearchField size="sm" value={query} onValueChange={setQuery} placeholder="Search" aria-label={`Search ${label}`} /> : null}
          <div className="fa-dt-filter-bulk">
            <Button
              size="xs"
              variant="ghost"
              disabled={options.status === "loading" || !options.items.length}
              onClick={() => apply([...new Set([...selected, ...options.items.map((item) => item.value)])])}
            >
              Select all
            </Button>
            <Button size="xs" variant="ghost" disabled={!selected.length} onClick={() => apply(query.trim() ? selected.filter((entry) => !shownValues.has(entry)) : [])}>
              None
            </Button>
          </div>
          <div className="fa-dt-filter-options" role="group" aria-label={`${label} values`} aria-busy={options.status === "loading" || undefined} data-scroll-container="">
            {options.status === "loading"
              ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <div key={index} className="fa-dt-filter-option fa-dt-filter-option-skeleton" aria-hidden>
                    <Skeleton.Block className="fa-dt-filter-check-skeleton" radius="check" />
                    <Skeleton.Text type="body" width={`${48 + ((index * 17) % 40)}%`} />
                  </div>
                ))
              : null}
            {options.status === "error" ? (
              <div className="fa-dt-filter-note">
                <span>{label} did not load.</span>
                <Button size="xs" variant="ghost" onClick={options.retry}>
                  Retry
                </Button>
              </div>
            ) : null}
            {options.status !== "loading" && options.status !== "error" && !options.items.length && !orphans.length ? (
              <div className="fa-dt-filter-note">{query.trim() ? `No matches for "${query.trim()}"` : "Nothing to choose from"}</div>
            ) : null}
            {orphans.map((entry) => (
              <Checkbox key={`orphan-${entry}`} size="sm" className="fa-dt-filter-option" label={optionLabel(spec, entry)} checked onCheckedChange={(checked) => toggle(entry, checked)} />
            ))}
            {options.status === "loading"
              ? null
              : options.items.map((item) => (
                  <Checkbox
                    key={item.value}
                    size="sm"
                    className="fa-dt-filter-option"
                    label={item.label}
                    description={item.description}
                    checked={selected.includes(item.value)}
                    onCheckedChange={(checked) => toggle(item.value, checked)}
                  />
                ))}
          </div>
        </>
      )}
      <EditorFooter applied={value !== undefined} onClear={() => onCommit(undefined)} />
    </div>
  )
}
