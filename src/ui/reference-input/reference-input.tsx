import { DirectionPortal } from "../../lib/direction-portal.js"
import { readingKey } from "../../lib/direction.js"
import { Combobox as BaseCombobox } from "@base-ui/react/combobox"
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode, type Ref } from "react"
import { IconCheck, IconChevronDown, IconPlus } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { tokenDuration } from "../../lib/motion.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { Button } from "../button/index.js"
import { OptionMore, OptionRow, OptionStatus, groupOptions, hasSecondLine, statusAnnouncement, useOptionCollection, useOptionSearch, type OptionItem, type OptionSource } from "../combobox/index.js"
import { EntityIdentity } from "../entity/index.js"
import { widthAttr, type FieldWidth } from "../field/index.js"
import { Menu } from "../menu/index.js"
import {
  addLinks,
  dedupeLinks,
  initialRelation,
  orderTargets,
  referenceKey,
  referenceQuery,
  relationsFor,
  setRelation,
  stepKind,
  type ReferenceKind,
  type ReferenceLink,
  type ReferenceRelation,
  type ReferenceSource,
  type ReferenceTarget,
} from "./references.js"
import { popupContainer } from "../../lib/popup-container.js"

/** How long a duplicate's existing chip flashes (mirrors --duration-slower). */
/** The flash runs --duration-slower (reference-input.css); clear it just after. */
const flashMs = () => tokenDuration("--duration-slower", 450) + 50

export interface ReferenceChipOptions {
  /** Chips in the input are sm (24px), like the AI composer's context chips. */
  size: "sm"
  /** Present while the link can be removed: the chip shows its ✕. */
  onRemove?: () => void
}

export interface ReferenceInputProps<R extends string = string> {
  value?: ReferenceLink<R>[]
  defaultValue?: ReferenceLink<R>[]
  /**
   * Called with the full, de-duplicated list of links whenever one is added, removed or given
   * another relation. Pair with `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (links: ReferenceLink<R>[]) => void
  /** The kinds that can be linked, in the order results group by. */
  kinds: readonly ReferenceKind[]
  /** Where @-search looks (debounced, cancellable, cached per kind). */
  source: ReferenceSource
  /** Relations a chip's menu offers. Omit for plain context chips (the AI composer). */
  relations?: readonly ReferenceRelation<R>[]
  /** The relation a new link starts with. Default: the first relation. */
  defaultRelation?: R
  /** Results from this organisation come first; others carry their organisation's name. */
  currentOrganisation?: string
  /**
   * Draw a linked entity as a chip. Pass the application's identity (the AI resolver's
   * chip tier) so a link looks the same here as in an answer. Default: EntityIdentity's chip.
   */
  renderChip?: (target: ReferenceTarget, options: ReferenceChipOptions) => ReactNode
  /** The glyph in a result row. Default: the kind's icon. */
  renderGlyph?: (target: ReferenceTarget) => ReactNode
  /** Why a target cannot be linked here ("This device"), or nothing. */
  disabledReason?: (target: ReferenceTarget) => string | undefined
  /** Most links allowed. */
  max?: number
  /** Show the kind filter chips in the popup (default when there is more than one kind). */
  kindFilter?: boolean
  /** `from`: backlinks, read with each relation's inverse label. Implies read-only. */
  direction?: "to" | "from"
  /** What a read-only input with no links says. */
  emptyText?: string
  placeholder?: string
  /** Available width or named width tier. */
  width?: FieldWidth
  disabled?: boolean
  readOnly?: boolean
  /** Marks the control invalid. Pair it with an accessible validation message. */
  invalid?: boolean
  name?: string
  id?: string
  /** Called when the search input loses focus, so a form can mark the field touched. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  /** Layout only. Applied to the control box. */
  className?: string
  ref?: Ref<HTMLInputElement>
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
  /** IDs of elements that provide the accessible name. */
  "aria-labelledby"?: string
}

/* ── Search: one derived source per (source, kind), so each kind keeps its own cache ── */

const TARGET_OF = new WeakMap<OptionItem, ReferenceTarget>()

function toOption(target: ReferenceTarget): OptionItem {
  const item: OptionItem = { value: referenceKey(target), label: target.label, description: target.description }
  TARGET_OF.set(item, target)
  return item
}

const SCOPED = new WeakMap<ReferenceSource, Map<string, OptionSource>>()

/** The source narrowed to one kind (or every kind), shaped for useOptionSearch. */
function scopedSource(source: ReferenceSource, kind: string | null): OptionSource {
  let byKind = SCOPED.get(source)
  if (!byKind) {
    byKind = new Map()
    SCOPED.set(source, byKind)
  }
  const id = kind ?? ""
  let derived = byKind.get(id)
  if (!derived) {
    const keep = (target: ReferenceTarget) => !kind || target.kind === kind
    derived = {
      debounceMs: source.debounceMs,
      minChars: source.minChars,
      suggestions: (source.suggestions ?? []).filter(keep).map(toOption),
      search: async (query, { signal }) => {
        const raw = await source.search(query, { kind: kind ?? undefined, signal })
        const result = Array.isArray(raw) ? { items: raw } : raw
        return { items: result.items.filter(keep).map(toOption), more: result.more }
      },
    }
    byKind.set(id, derived)
  }
  return derived
}

/* ── Parts ─────────────────────────────────────────────────────────────────── */

function DefaultChip({ target, kind, onRemove }: { target: ReferenceTarget; kind?: ReferenceKind; onRemove?: () => void }) {
  const Icon = kind?.icon
  return (
    <EntityIdentity
      tier="chip"
      size="sm"
      name={target.label}
      kind={kind?.noun}
      icon={target.image ? undefined : Icon ? <Icon /> : undefined}
      portrait={target.image ? { name: target.label, src: target.image } : undefined}
      onRemove={onRemove}
      preview={false}
    />
  )
}

/** Keys the chip itself handles (Base UI's chip navigation) must not swallow activation of what is inside it. */
function keepInside(event: KeyboardEvent<HTMLElement>) {
  if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Escape") event.stopPropagation()
}

interface RelationMenuProps<R extends string> {
  link: ReferenceLink<R>
  label: string
  options: readonly ReferenceRelation<R>[]
  /** Called with the relation chosen from the menu. */
  onChange: (relation: R) => void
}

/** The relation before a chip, as a menu button: "Assigned to ▾". */
function RelationMenu<R extends string>({ link, label, options, onChange }: RelationMenuProps<R>) {
  const current = options.find((relation) => relation.value === link.relation)
  return (
    <Menu.Root>
      <Menu.Trigger className="fa-ref-relation fa-pressable" aria-label={`Relation to ${label}: ${current?.label ?? link.relation}`} data-relation={link.relation}>
        <span className="fa-ref-relation-label">{current?.label ?? link.relation}</span>
        <IconChevronDown />
      </Menu.Trigger>
      <Menu.Popup align="start" aria-label={`Relation to ${label}`}>
        <Menu.RadioGroup value={link.relation} onValueChange={(next) => onChange(next as R)}>
          {options.map((relation) => (
            <Menu.RadioItem key={relation.value} value={relation.value}>
              {relation.label}
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </Menu.Popup>
    </Menu.Root>
  )
}

/* ── ReferenceInput ────────────────────────────────────────────────────────── */

/**
 * Link entities to the one being edited, the way the AI composer adds context: type @ (or
 * press Link…) to search people, devices, sites, tickets and documents, pick one, and it
 * becomes a chip. Results group by kind with the current organisation first; chips in the
 * popup narrow to one kind (Alt ← →). Each chip is the entity's own identity (pass the
 * application's renderer), removable with ✕ or Backspace, with a relation menu in front of
 * it. Linking an entity twice flashes the existing chip instead.
 *
 * Read-only (or `direction="from"` for backlinks) it lists the chips in a recessed well.
 */
export function ReferenceInput<R extends string = string>({
  value,
  defaultValue,
  onValueChange,
  kinds,
  source,
  relations,
  defaultRelation,
  currentOrganisation,
  renderChip,
  renderGlyph,
  disabledReason,
  max,
  kindFilter,
  direction = "to",
  emptyText = "None",
  placeholder = "Type @ to link",
  width,
  disabled,
  readOnly: readOnlyProp,
  invalid,
  name,
  id,
  onBlur,
  className,
  ref,
  ...aria
}: ReferenceInputProps<R>) {
  const popup = usePopupMetrics()
  const readOnly = Boolean(readOnlyProp) || direction === "from"
  const [inner, setInner] = useState<ReferenceLink<R>[]>(defaultValue ?? [])
  const links = value ?? inner
  const keys = links.map((link) => referenceKey(link.target))
  const [text, setText] = useState("")
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const fallback = (defaultRelation ?? relations?.[0]?.value ?? ("related" as R)) as R
  const kindOf = (kindId: string) => kinds.find((entry) => entry.id === kindId)
  const atMax = max !== undefined && links.length >= max
  const filterable = (kindFilter ?? kinds.length > 1) && kinds.length > 1
  const query = referenceQuery(text)
  const search = useOptionSearch(readOnly ? undefined : scopedSource(source, kind), query)

  const commit = (next: ReferenceLink<R>[]) => {
    const clean = dedupeLinks(next)
    if (value === undefined) setInner(clean)
    onValueChange?.(clean)
  }

  const flashChip = (key: string) => {
    clearTimeout(flashTimer.current)
    setFlash(null)
    requestAnimationFrame(() => setFlash(key))
    flashTimer.current = setTimeout(() => setFlash(null), flashMs())
  }

  const relationOf = (target: ReferenceTarget) => (relations ? initialRelation(target, relations, fallback) : fallback)

  // ── Results: ordered by kind, the current organisation first ────────────────
  const found = search.items.map((item) => TARGET_OF.get(item)).filter((target): target is ReferenceTarget => target !== undefined)
  const ordered = orderTargets(found, kinds, currentOrganisation)
  const targetByKey = new Map<string, ReferenceTarget>([...links.map((link) => [referenceKey(link.target), link.target] as const), ...ordered.map((target) => [referenceKey(target), target] as const)])
  const display: OptionItem[] = ordered.map((target) => {
    const key = referenceKey(target)
    const linked = keys.includes(key)
    const reason = linked ? undefined : (disabledReason?.(target) ?? (atMax ? `Up to ${max} ${max === 1 ? "link" : "links"}` : undefined))
    const Icon = kindOf(target.kind)?.icon
    const elsewhere = currentOrganisation && target.organisation && target.organisation.id !== currentOrganisation ? target.organisation.name : undefined
    return {
      value: key,
      label: target.label,
      description: target.description,
      group: kindOf(target.kind)?.plural ?? target.kind,
      icon: renderGlyph ? renderGlyph(target) : Icon ? <Icon /> : undefined,
      meta: elsewhere,
      disabled: Boolean(reason),
      disabledReason: reason,
    }
  })
  const collection = useOptionCollection(display)

  const onValueChangeFromList = (next: string[], reason: string) => {
    const added = next.filter((key) => !keys.includes(key))
    const removed = keys.filter((key) => !next.includes(key))
    if (reason === "item-press" && removed.length) {
      // Picking an entity that is already linked: show where it is, change nothing.
      flashChip(removed[0]!)
      setText("")
      setOpen(false)
      return
    }
    if (added.length) {
      const targets = added.map((key) => targetByKey.get(key)).filter((target): target is ReferenceTarget => target !== undefined)
      const result = addLinks(links, targets, relationOf, max)
      result.duplicates.forEach(flashChip)
      if (result.links.length !== links.length) commit(result.links)
      setText("")
      setOpen(false)
      return
    }
    if (removed.length) commit(links.filter((link) => !removed.includes(referenceKey(link.target))))
  }

  // After ✕ removes a chip, focus returns to the input (the chip it was on is gone).
  const [refocus, setRefocus] = useState(0)
  useEffect(() => {
    if (refocus) inputRef.current?.focus()
  }, [refocus])

  const remove = (key: string) => {
    commit(links.filter((link) => referenceKey(link.target) !== key))
    setRefocus((count) => count + 1)
  }

  const changeRelation = (key: string, relation: R) => {
    if (!relations) return
    commit(setRelation(links, key, relation, relations, fallback))
  }

  const startLink = () => {
    inputRef.current?.focus()
    setText((current) => (current.trimStart().startsWith("@") ? current : `@${current}`))
    setOpen(true)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement> & { preventBaseUIHandler: () => void }) => {
    if (filterable && open && event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault()
      event.preventBaseUIHandler()
      setKind((current) => stepKind(current, kinds, readingKey(event.key, event.currentTarget) === "ArrowRight" ? 1 : -1))
    }
  }

  const chipLabel = (link: ReferenceLink<R>) => {
    const relation = relations?.find((entry) => entry.value === link.relation)
    const said = direction === "from" ? (relation?.inverseLabel ?? relation?.label) : relation?.label
    const noun = kindOf(link.target.kind)?.noun
    return [said, noun, link.target.label].filter(Boolean).join(" ")
  }

  const chipFor = (target: ReferenceTarget, onRemove?: () => void) =>
    renderChip ? renderChip(target, { size: "sm", onRemove }) : <DefaultChip target={target} kind={kindOf(target.kind)} onRemove={onRemove} />

  // ── Read-only: the links in a recessed well ─────────────────────────────────
  if (readOnly) {
    return (
      <div
        className={cx("fa-control fa-input fa-multi fa-ref-input", className)}
        data-wrap=""
        data-readonly=""
        data-disabled={disabled ? "" : undefined}
        data-width={widthAttr(width)}
        id={id}
        role="group"
        aria-label={aria["aria-label"]}
        aria-labelledby={aria["aria-labelledby"]}
      >
        <div className="fa-multi-chips" role="list">
          {links.map((link) => {
            const relation = relations?.find((entry) => entry.value === link.relation)
            const said = direction === "from" ? (relation?.inverseLabel ?? relation?.label) : relation?.label
            return (
              <span key={referenceKey(link.target)} className="fa-ref-chip" role="listitem" aria-label={chipLabel(link)} data-relation={link.relation}>
                {said ? (
                  <span className="fa-ref-relation" data-static="">
                    {said}
                  </span>
                ) : null}
                {chipFor(link.target)}
              </span>
            )
          })}
          {links.length === 0 ? <span className="fa-ref-none">{emptyText}</span> : null}
        </div>
      </div>
    )
  }

  const status = search.status
  const quiet = status === "loading" || status === "error" || search.needsMore > 0
  const twoLine = hasSecondLine(display)
  const grouped = groupOptions(display) !== null
  const kindName = kind ? (kindOf(kind)?.plural ?? kind) : "Everything"

  return (
    <BaseCombobox.Root
      multiple
      items={collection}
      value={keys}
      onValueChange={(next, details) => onValueChangeFromList(next as string[], details.reason)}
      inputValue={text}
      onInputValueChange={(next, details) => {
        if (details.reason === "item-press") return
        setText(next)
      }}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        // Each search starts across every kind again.
        if (!next) setKind(null)
      }}
      filter={null}
      itemToStringLabel={(key: string) => targetByKey.get(key)?.label ?? key}
      autoHighlight
      disabled={disabled}
      name={name}
      id={id}
    >
      <BaseCombobox.InputGroup
        className={cx("fa-control fa-input fa-multi fa-ref-input", className)}
        data-size="md"
        data-wrap=""
        data-width={widthAttr(width)}
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
        data-has-value={links.length > 0 ? "" : undefined}
      >
        <BaseCombobox.Chips className="fa-multi-chips" aria-label={links.length > 0 ? `${links.length} ${links.length === 1 ? "link" : "links"}` : undefined}>
          {links.map((link) => {
            const key = referenceKey(link.target)
            const options = relations ? relationsFor(link.target, relations) : []
            return (
              <BaseCombobox.Chip
                key={key}
                className="fa-ref-chip"
                aria-label={chipLabel(link)}
                aria-description="Press Backspace or Delete to remove"
                data-flash={flash === key ? "" : undefined}
                data-relation={link.relation}
                data-reference={key}
              >
                {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- stops the chip's own keys from swallowing Enter on the buttons inside it */}
                <span className="fa-ref-chip-parts" onKeyDown={keepInside}>
                  {relations && options.length > 1 ? (
                    <RelationMenu link={link} label={link.target.label} options={options} onChange={(relation) => changeRelation(key, relation)} />
                  ) : relations && options[0] ? (
                    <span className="fa-ref-relation" data-static="">
                      {options[0].label}
                    </span>
                  ) : null}
                  {chipFor(link.target, disabled ? undefined : () => remove(key))}
                </span>
              </BaseCombobox.Chip>
            )
          })}
          <BaseCombobox.Input
            {...aria}
            ref={(node: HTMLInputElement | null) => {
              inputRef.current = node
              if (typeof ref === "function") ref(node)
              else if (ref) ref.current = node
            }}
            placeholder={links.length > 0 ? undefined : placeholder}
            aria-invalid={invalid || undefined}
            aria-keyshortcuts={filterable ? "Alt+ArrowLeft Alt+ArrowRight" : undefined}
            aria-description={links.length > 0 ? `${links.length} linked. From the start of the input, press Left Arrow to reach them.` : undefined}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            className="fa-control-input fa-multi-input"
          />
          {/* In the flow after the input, so it shares the last line instead of reserving a column. */}
          <Button
            variant="ghost"
            size="sm"
            className="fa-ref-add"
            icon={<IconPlus />}
            disabled={disabled}
            disabledReason={atMax ? `Up to ${max} ${max === 1 ? "link" : "links"}` : undefined}
            onMouseDown={(event) => event.preventDefault()}
            onClick={startLink}
          >
            Link…
          </Button>
        </BaseCombobox.Chips>
      </BaseCombobox.InputGroup>

      <BaseCombobox.Portal render={<DirectionPortal />} container={popupContainer()}>
        <BaseCombobox.Positioner className="fa-select-positioner" align="start" sideOffset={popup.offset} collisionPadding={popup.collisionPadding}>
          <BaseCombobox.Popup className="glass-overlay fa-popup fa-combobox-popup fa-ref-popup" aria-busy={status === "loading" || status === "refreshing" || undefined} data-status={status}>
            {filterable ? (
              <div className="fa-ref-kinds" role="group" aria-label="Kind">
                {[null, ...kinds.map((entry) => entry.id)].map((entry) => {
                  const spec = entry ? kindOf(entry) : undefined
                  const Icon = spec?.icon
                  return (
                    <button
                      key={entry ?? "all"}
                      type="button"
                      tabIndex={-1}
                      className="fa-ref-kind fa-pressable"
                      aria-pressed={kind === entry}
                      data-kind={entry ?? "all"}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setKind(entry)}
                    >
                      {Icon ? <Icon /> : null}
                      {spec?.plural ?? "All"}
                    </button>
                  )
                })}
              </div>
            ) : null}
            <BaseCombobox.Status className="sr-only">{[filterable ? `Showing ${kindName}.` : "", statusAnnouncement(status, display.length, query)].filter(Boolean).join(" ")}</BaseCombobox.Status>
            <div className="fa-ref-results" data-scroll-container>
              <OptionStatus status={status} twoLine={twoLine} needsMore={search.needsMore} onRetry={search.retry} />
              {atMax ? (
                <div className="fa-option-note">
                  Up to {max} {max === 1 ? "link" : "links"} — remove one to link another
                </div>
              ) : null}
              <BaseCombobox.Empty className="fa-combobox-empty-slot">
                {quiet ? null : <div className="fa-combobox-empty">{query ? `No ${kind ? kindName.toLowerCase() : "matches"} for “${query}”` : "Type a name to search"}</div>}
              </BaseCombobox.Empty>
              <BaseCombobox.List className="fa-select-list">
                {grouped
                  ? (group: { value: string; items: OptionItem[] }) => (
                      <BaseCombobox.Group key={group.value} items={group.items} className="fa-select-group">
                        {group.value ? <BaseCombobox.GroupLabel className="fa-popup-group-label">{group.value}</BaseCombobox.GroupLabel> : null}
                        <BaseCombobox.Collection>{(item: OptionItem) => <ResultRow key={item.value} item={item} query={query} />}</BaseCombobox.Collection>
                      </BaseCombobox.Group>
                    )
                  : (item: OptionItem) => <ResultRow key={item.value} item={item} query={query} />}
              </BaseCombobox.List>
              <OptionMore more={search.more} />
            </div>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  )
}

function ResultRow({ item, query }: { item: OptionItem; query: string }) {
  return (
    <BaseCombobox.Item
      value={item.value}
      disabled={item.disabled}
      className="fa-item fa-select-item fa-option"
      data-two-line={item.description || (item.disabled && item.disabledReason) ? "" : undefined}
    >
      <OptionRow
        item={item}
        query={query}
        check={
          <BaseCombobox.ItemIndicator className="fa-select-indicator">
            <IconCheck />
          </BaseCombobox.ItemIndicator>
        }
      />
    </BaseCombobox.Item>
  )
}
