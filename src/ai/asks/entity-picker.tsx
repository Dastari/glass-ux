import { useId, useMemo, useState, type KeyboardEvent } from "react"
import { IconSearch } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { ActionButton } from "../../ui/button/index.js"
import { OptionRow } from "../../ui/combobox/index.js"
import { Input } from "../../ui/input/index.js"
import { EntityChip, EntityGlyph, useEntityResolver } from "../entity-chip/index.js"
import { kindSpec } from "../entities.js"
import type { AiAsk, EntityRef } from "../types.js"
import { useAskAnswer } from "./choice.js"
import { AskLayout, AskShell } from "./frame.js"

type Ask = Extract<AiAsk, { type: "entity" }>

const key = (entity: EntityRef) => `${entity.kind}:${entity.id}`

export interface EntityOptionListProps {
  id: string
  /** The text being searched for; matches are emphasised. */
  query?: string
  options: EntityRef[]
  /** Marks the current destination or active choice. */
  active: number
  /** The selected state or collection. */
  selected: (entity: EntityRef) => boolean
  /** Called when pick occurs. The callback type specifies its arguments. */
  onPick: (entity: EntityRef) => void
  /** Called when active occurs. The callback type specifies its arguments. */
  onActive: (index: number) => void
  /** Content shown when there are no matching items. */
  empty?: string
  className?: string
}

/**
 * The option rows for entity search (the composer's @-mentions and entity-picker asks):
 * fa-item rows with the shared OptionRow — the entity glyph, the name with the match
 * emphasised, a data meta and a ✓ when picked. The input stays the combobox
 * (aria-activedescendant), so focus never leaves the text.
 */
export function EntityOptionList({ id, query = "", options, active, selected, onPick, onActive, empty = "No matches", className }: EntityOptionListProps) {
  if (!options.length) {
    return (
      <div className={cx("fa-ai-options-empty", className)} role="status">
        {empty}
      </div>
    )
  }
  return (
    <div id={id} role="listbox" className={cx("fa-ai-options", className)} aria-multiselectable>
      {options.map((entity, index) => {
        const picked = selected(entity)
        return (
          <div
            key={key(entity)}
            id={`${id}-${index}`}
            role="option"
            aria-selected={picked}
            className="fa-item fa-ai-option"
            data-highlighted={index === active ? "" : undefined}
            tabIndex={-1}
            onPointerMove={() => onActive(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(entity)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onPick(entity)
            }}
          >
            <OptionRow
              query={query}
              check={picked}
              item={{ value: key(entity), label: entity.label, icon: <EntityGlyph entity={entity} className="fa-ai-option-glyph" />, meta: entity.meta ?? entity.state?.label }}
            />
          </div>
        )
      })}
    </div>
  )
}

/**
 * Pick one or more entities: a search field over the application's resolver, the agent's
 * suggestions as the starting list, and the picks as removable chips.
 */
export function EntityPickerAsk({ ask }: { ask: Ask }) {
  const id = useId()
  const resolver = useEntityResolver()
  const { answered, submit, record } = useAskAnswer(ask)
  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<EntityRef[]>([])
  const [active, setActive] = useState(0)
  const spec = kindSpec(resolver.kinds, ask.entityKind)
  const options = useMemo(() => {
    const found = query.trim() && resolver.search ? resolver.search(query.trim(), ask.entityKind) : ask.suggestions
    return found.slice(0, 8)
  }, [query, resolver, ask.entityKind, ask.suggestions])
  const isPicked = (entity: EntityRef) => picked.some((item) => key(item) === key(entity))
  const toggle = (entity: EntityRef) => {
    if (!ask.multiple) {
      setPicked(isPicked(entity) ? [] : [entity])
      return
    }
    setPicked((current) => (isPicked(entity) ? current.filter((item) => key(item) !== key(entity)) : [...current, entity]))
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      setActive((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % Math.max(1, options.length))
    } else if (event.key === "Enter" && options[active]) {
      event.preventDefault()
      toggle(options[active]!)
    }
  }
  const labels = picked.map((entity) => entity.label)
  return (
    <AskShell resolved={answered} record={record}>
      <AskLayout
        id={id}
        icon={<spec.icon />}
        tone="accent"
        title={ask.question}
        meta={ask.detail}
        footerStart={
          <span className="fa-ai-ask-count" data-numeric aria-live="polite">
            {picked.length ? `${picked.length} selected` : `Choose ${ask.multiple ? spec.plural.toLowerCase() : `a ${spec.noun.toLowerCase()}`}`}
          </span>
        }
        footer={
          <ActionButton
            variant="primary"
            size="sm"
            disabledReason={picked.length ? undefined : `Choose ${ask.multiple ? "at least one" : "one"} first`}
            pendingLabel="Sending…"
            successLabel="Sent"
            onAction={() => submit({ type: "entities", ids: picked.map((entity) => entity.id), label: labels.join(", ") }, `Chose ${labels.join(", ")}`)}
          >
            {ask.submitLabel ?? "Use selected"}
          </ActionButton>
        }
      >
        <div className="fa-ai-picker">
          <div className="fa-ai-picker-chips" role="group" aria-label="Selected" data-empty={picked.length ? undefined : ""}>
            {picked.map((entity) => (
              <EntityChip key={key(entity)} entity={entity} size="sm" onRemove={() => toggle(entity)} />
            ))}
          </div>
          <Input
            icon={<IconSearch />}
            placeholder={`Search ${spec.plural.toLowerCase()}`}
            value={query}
            clearable
            onValueChange={(value) => {
              setQuery(value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded
            aria-controls={`${id}-list`}
            aria-activedescendant={options[active] ? `${id}-list-${active}` : undefined}
            aria-label={`Search ${spec.plural.toLowerCase()}`}
          />
          <EntityOptionList
            id={`${id}-list`}
            query={query}
            options={options}
            active={active}
            selected={isPicked}
            onPick={toggle}
            onActive={setActive}
            empty={`No ${spec.plural.toLowerCase()} match "${query}"`}
          />
        </div>
      </AskLayout>
    </AskShell>
  )
}
