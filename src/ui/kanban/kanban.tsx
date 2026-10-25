import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { IconChevronLeft, IconChevronRight, IconPlus } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { motionScale, prefersReducedMotion, tokenDuration } from "../../lib/motion.js"
import { useRemPx } from "../../lib/rem.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { Button } from "../button/index.js"
import { DragDropProvider, Draggable, DropError, DropZone, type DropEvent } from "../drag-drop/index.js"
import { Segmented } from "../segmented/index.js"
import { Surface } from "../surface/index.js"
import { ToneDot } from "../tone-dot/index.js"
import type { BadgeTone } from "../badge/index.js"
import { kanbanMessages, type KanbanMessages } from "./messages.js"
import { cardsIn, moveCard, placeOf, type KanbanCardData } from "./move.js"

/** Below this board width (in rem) columns become full-width pages with a switcher. */
const NARROW_REM = 40
const CARD_TYPE = "kanban-card"

/** A column of the board. */
export interface KanbanColumn {
  /** Unique among the columns; cards name it in `columnId`. */
  id: string
  /** Its name, shown in its heading. */
  title: string
  /** Work-in-progress limit: the column refuses cards from other columns once it holds this many. */
  limit?: number
  /** A dot before the title. Status tones only when the column is a state (R3.3). */
  tone?: BadgeTone
}

/** A card with the fields the default card shows. Carry your own fields too. */
export interface KanbanItem extends KanbanCardData {
  /** The card's name: shown on the default card and used in announcements. */
  title: string
  /** A line of detail under the title: an identifier, a requester, a due date. */
  meta?: string
}

/** A card the person moved. */
export interface KanbanMove<C extends KanbanCardData = KanbanItem> {
  cardId: string
  /** The card as it was before the move. */
  card: C
  /** The column it left and the one it joined (the same for a reorder). */
  from: string
  to: string
  /** Its index in `from` before the move. */
  fromIndex: number
  /** Its index in `to` after the move. */
  index: number
  /** How it was moved. */
  input: "pointer" | "keyboard"
}

/** Props for {@link Kanban}. */
export interface KanbanProps<C extends KanbanCardData = KanbanItem> {
  /** The columns, in order. */
  columns: readonly KanbanColumn[]
  /** The cards (controlled). Order within a column is their order in this list. */
  cards?: readonly C[]
  /** The first cards when uncontrolled. */
  defaultCards?: readonly C[]
  /** Called with the whole list after a move, before `onCardMove` settles. Update `cards` here. */
  onCardsChange?: (cards: C[]) => void
  /**
   * Called after a card moves. Return a promise to save it: the column shows as saving, and a
   * rejection puts the card back where it was (reject with an Error whose message says why).
   */
  onCardMove?: (move: KanbanMove<C>) => void | Promise<unknown>
  /** The card's content inside its tile. Default: `KanbanCard` with `title` and `meta`. Buttons and links inside keep working. */
  renderCard?: (card: C, state: { dragging: boolean }) => ReactNode
  /** The card's name for announcements and its accessible name. Default `card.title`, else its id. */
  cardLabel?: (card: C) => string
  /** Adds an "Add card" button under each column; called with the column's id. */
  onAddCard?: (columnId: string) => void
  /** Content under each column instead of the "Add card" button: an inline form, a menu. */
  renderAddCard?: (column: KanbanColumn) => ReactNode
  /** Collapsed column ids (controlled). Collapsed columns still take dropped cards. */
  collapsedColumns?: readonly string[]
  /** Collapsed column ids when uncontrolled. */
  defaultCollapsedColumns?: readonly string[]
  /** Called with the collapsed column ids when the person collapses or expands one. */
  onCollapsedColumnsChange?: (ids: string[]) => void
  /** Cards are loading: each column shows placeholders in the cards' places. */
  loading?: boolean
  /** Heading level of the column titles. Default 3. */
  headingLevel?: 2 | 3 | 4
  /** Replace any of the wording (see `kanbanMessages`). */
  labels?: Partial<KanbanMessages>
  /** BCP 47 locale for the wording. Default the nearest `LocaleProvider`. */
  locale?: string
  /** The board's accessible name. */
  "aria-label"?: string
  /** Layout only. */
  className?: string
  /** Layout only. */
  style?: CSSProperties
}

const NO_IDS: readonly string[] = []

/**
 * A board of columns and cards. Cards drag between and within columns with the pointer,
 * touch (a short press) or the keyboard (Space lifts, arrows move, Space drops), and every
 * move is announced. A column with a `limit` refuses cards once full and says why; a move the
 * host rejects flies back. Column headings sit on the canvas above their lanes; cards are
 * card tiles. Columns collapse to a strip that still takes drops. The board scrolls sideways
 * and scrolls itself while a card nears its edges; in a narrow container each column fills
 * the width and a switcher moves between them.
 */
export function Kanban<C extends KanbanCardData = KanbanItem>({
  columns,
  cards: cardsProp,
  defaultCards,
  onCardsChange,
  onCardMove,
  renderCard,
  cardLabel,
  onAddCard,
  renderAddCard,
  collapsedColumns,
  defaultCollapsedColumns = NO_IDS,
  onCollapsedColumnsChange,
  loading = false,
  headingLevel = 3,
  labels,
  locale,
  "aria-label": ariaLabel,
  className,
  style,
}: KanbanProps<C>) {
  const t = useMessages(kanbanMessages, { labels, locale })
  const [cards, setCards] = useControllable<readonly C[]>(cardsProp, defaultCards ?? [], onCardsChange as ((next: readonly C[]) => void) | undefined)
  const [collapsed, setCollapsed] = useControllable<readonly string[]>(collapsedColumns, defaultCollapsedColumns, onCollapsedColumnsChange as ((next: readonly string[]) => void) | undefined)
  const boardId = useId()
  const zoneId = useCallback((columnId: string) => `${boardId}:${columnId}`, [boardId])
  const root = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const { width } = useElementSize(root)
  const rem = useRemPx()
  const narrow = width > 0 && width < NARROW_REM * rem

  const latest = useRef(cards)
  latest.current = cards
  const label = useCallback((card: C) => cardLabel?.(card) ?? (card as Partial<KanbanItem>).title ?? card.id, [cardLabel])

  /** Put a card back where it was, flying from where it is drawn now. */
  const restore = useCallback(
    (cardId: string, from: { columnId: string; index: number }) => {
      const selector = `[data-kanban-card="${CSS.escape(cardId)}"]`
      const before = root.current?.querySelector<HTMLElement>(selector)?.getBoundingClientRect()
      flushSync(() => setCards((current) => moveCard(current, cardId, from)))
      const element = root.current?.querySelector<HTMLElement>(selector)
      if (!before || !element || typeof element.animate !== "function" || prefersReducedMotion() || motionScale() < 0.1) return
      const after = element.getBoundingClientRect()
      element.animate([{ translate: `${before.left - after.left}px ${before.top - after.top}px` }, { translate: "0 0" }], {
        duration: tokenDuration("--duration-slow", 300),
        easing: getComputedStyle(element).getPropertyValue("--ease-glide").trim() || "ease",
      })
    },
    [setCards],
  )

  const drop = useCallback(
    (column: KanbanColumn) =>
      (event: DropEvent<C>): void | Promise<unknown> => {
        const card = event.item.data
        const current = latest.current
        const from = placeOf(current, card.id)
        if (!from) return
        const others = cardsIn(current, column.id).filter((entry) => entry.id !== card.id)
        const index = event.target.index ?? others.length
        setCards(moveCard(current, card.id, { columnId: column.id, index }))
        const result = onCardMove?.({ cardId: card.id, card, from: from.columnId, to: column.id, fromIndex: from.index, index, input: event.input })
        if (!result || typeof (result as Promise<unknown>).then !== "function") return
        return (result as Promise<unknown>).catch((error: unknown) => {
          restore(card.id, from)
          throw new DropError(error instanceof Error && error.message ? error.message : t.moveFailed(column.title))
        })
      },
    [onCardMove, restore, setCards, t],
  )

  const toggle = (columnId: string) => setCollapsed((current) => (current.includes(columnId) ? current.filter((id) => id !== columnId) : [...current, columnId]))

  // The column in view on a narrow board, for the switcher.
  const [active, setActive] = useState(columns[0]?.id ?? "")
  useEffect(() => {
    const element = scroller.current
    if (!narrow || !element) return
    let timer = 0
    const settle = () => {
      const lanes = [...element.querySelectorAll<HTMLElement>("[data-kanban-column]")]
      const left = element.getBoundingClientRect().left
      const nearest = lanes.reduce<HTMLElement | null>((best, lane) => (!best || Math.abs(lane.getBoundingClientRect().left - left) < Math.abs(best.getBoundingClientRect().left - left) ? lane : best), null)
      if (nearest) setActive(nearest.dataset.kanbanColumn ?? "")
    }
    const onScroll = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(settle, 120)
    }
    element.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.clearTimeout(timer)
      element.removeEventListener("scroll", onScroll)
    }
  }, [narrow])
  const showColumn = (columnId: string) => {
    setActive(columnId)
    const lane = scroller.current?.querySelector<HTMLElement>(`[data-kanban-column="${CSS.escape(columnId)}"]`)
    lane?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "nearest", inline: "start" })
  }

  const activeIndex = Math.max(0, columns.findIndex((column) => column.id === active))
  const byColumn = useMemo(() => new Map(columns.map((column) => [column.id, cardsIn(cards, column.id)])), [columns, cards])
  const Heading = `h${headingLevel}` as const

  return (
    <DragDropProvider>
      <div ref={root} role="region" aria-label={ariaLabel} aria-busy={loading || undefined} className={cx("fa-kanban", className)} style={style} data-narrow={narrow ? "" : undefined}>
        {narrow && columns.length > 1 ? (
          <div className="fa-kanban-switch">
            <Button size="sm" variant="ghost" icon={<IconChevronLeft />} aria-label={t.previousColumn} disabledReason={activeIndex <= 0 ? t.firstColumn : undefined} onClick={() => showColumn(columns[activeIndex - 1]!.id)} />
            <Segmented
              size="sm"
              aria-label={t.columns}
              value={active}
              onValueChange={showColumn}
              options={columns.map((column) => ({ value: column.id, label: `${column.title} ${loading ? "" : (byColumn.get(column.id)?.length ?? 0)}`.trim() }))}
            />
            <Button size="sm" variant="ghost" icon={<IconChevronRight />} aria-label={t.nextColumn} disabledReason={activeIndex >= columns.length - 1 ? t.lastColumn : undefined} onClick={() => showColumn(columns[activeIndex + 1]!.id)} />
          </div>
        ) : null}
        <div ref={scroller} className="fa-kanban-scroller">
          {columns.map((column) => {
            const list = byColumn.get(column.id) ?? []
            const isCollapsed = !narrow && collapsed.includes(column.id)
            const full = column.limit !== undefined && list.length >= column.limit
            const titleId = `${zoneId(column.id)}:title`
            const count = (
              <span className="fa-kanban-count" data-full={full && !loading ? "" : undefined} data-numeric aria-label={t.countLabel(list.length, column.limit)} data-loading={loading ? "" : undefined}>
                {t.count(list.length, column.limit)}
              </span>
            )
            const validate = (drag: { source: { zoneId: string | null } }) =>
              column.limit !== undefined && drag.source.zoneId !== zoneId(column.id) && (byColumn.get(column.id)?.length ?? 0) >= column.limit ? { status: "error" as const, reason: t.full(column.title, column.limit) } : true
            if (isCollapsed)
              return (
                <DropZone<C>
                  key={column.id}
                  id={zoneId(column.id)}
                  label={t.column(column.title)}
                  accept={CARD_TYPE}
                  validate={validate}
                  onDrop={drop(column)}
                  render={<section aria-labelledby={titleId} />}
                  className="fa-kanban-column"
                  data-kanban-column={column.id}
                  data-collapsed=""
                >
                  <Button size="sm" variant="ghost" icon={<IconChevronRight />} aria-label={t.expand(column.title)} onClick={() => toggle(column.id)} />
                  {column.tone ? <ToneDot tone={column.tone} /> : null}
                  <Heading id={titleId} className="fa-kanban-title">
                    {column.title}
                  </Heading>
                  {count}
                </DropZone>
              )
            return (
              <section key={column.id} className="fa-kanban-column" aria-labelledby={titleId} data-kanban-column={column.id}>
                <header className="fa-kanban-head">
                  {column.tone ? <ToneDot tone={column.tone} /> : null}
                  <Heading id={titleId} className="fa-kanban-title">
                    {column.title}
                  </Heading>
                  {count}
                  {narrow ? null : <Button className="fa-kanban-collapse" size="sm" variant="ghost" icon={<IconChevronLeft />} aria-label={t.collapse(column.title)} onClick={() => toggle(column.id)} />}
                </header>
                <div className="fa-kanban-lane-frame">
                  <DropZone<C>
                    id={zoneId(column.id)}
                    label={t.column(column.title)}
                    accept={CARD_TYPE}
                    sort="vertical"
                    validate={validate}
                    onDrop={drop(column)}
                    render={<ul aria-labelledby={titleId} />}
                    className="fa-kanban-lane"
                  >
                    {loading
                      ? [0, 1, 2].map((index) => <li key={index} className="fa-skel fa-shimmer fa-kanban-card fa-kanban-skeleton" aria-hidden />)
                      : list.map((card) => (
                          <Draggable<C>
                            key={card.id}
                            id={card.id}
                            type={CARD_TYPE}
                            data={card}
                            label={label(card)}
                            render={<Surface as="li" material="card" radius="tile" padding="tile" />}
                            className="fa-kanban-card"
                            data-kanban-card={card.id}
                          >
                            {({ dragging }) => (renderCard ? renderCard(card, { dragging }) : <KanbanCard title={label(card)} meta={(card as Partial<KanbanItem>).meta} />)}
                          </Draggable>
                        ))}
                  </DropZone>
                  {!loading && list.length === 0 ? (
                    <span className="fa-kanban-empty" aria-hidden>
                      {t.empty}
                    </span>
                  ) : null}
                </div>
                {renderAddCard ? (
                  <div className="fa-kanban-add">{renderAddCard(column)}</div>
                ) : onAddCard ? (
                  <div className="fa-kanban-add">
                    <Button size="sm" variant="ghost" icon={<IconPlus />} aria-label={t.addCardTo(column.title)} tooltip={false} onClick={() => onAddCard(column.id)}>
                      {t.addCard}
                    </Button>
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      </div>
    </DragDropProvider>
  )
}

/** Props for {@link KanbanCard}. */
export interface KanbanCardProps {
  /** The card's name. */
  title: ReactNode
  /** A line of detail under it: an identifier, a requester, a due date. */
  meta?: ReactNode
  /** Badges at the foot, start side: priority, type. */
  badges?: ReactNode
  /** People at the foot, end side: an AvatarGroup of assignees. */
  avatars?: ReactNode
  /** Anything else, between the meta line and the foot. */
  children?: ReactNode
  /** Layout only. */
  className?: string
}

/** The default card content: title, a meta line, then badges and avatars at its foot. Use it inside `renderCard` to add slots. */
export function KanbanCard({ title, meta, badges, avatars, children, className }: KanbanCardProps) {
  return (
    <div className={cx("fa-kanban-card-body", className)}>
      <span className="fa-kanban-card-title">{title}</span>
      {meta ? <span className="fa-kanban-card-meta">{meta}</span> : null}
      {children}
      {badges || avatars ? (
        <span className="fa-kanban-card-foot">
          <span className="fa-kanban-card-badges">{badges}</span>
          {avatars}
        </span>
      ) : null}
    </div>
  )
}
