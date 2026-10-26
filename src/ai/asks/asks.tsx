import { useMessages } from "../../lib/i18n/index.js"
import { asksMessages } from "./messages.js"
import { useContext, useEffect, useId, useRef } from "react"
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconHelp } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button } from "../../ui/button/index.js"
import { TruncatedText } from "../../ui/truncated-text/index.js"
import { AiSurfaceProvider } from "../surface/index.js"
import { StatusGlyph } from "../tool-activity/index.js"
import type { AiAsk } from "../types.js"
import { ApprovalCard } from "./approval.js"
import { MultiChoiceAsk, QuickRepliesAsk, RankAsk, SingleChoiceAsk } from "./choice.js"
import { AskPlacementContext, isAskPending, useAskDockApi, useAskDockState, useAskResolution, waitingLabel } from "./dock-state.js"
import { EntityPickerAsk } from "./entity-picker.js"
import { ClarifyAsk, ConfirmAsk, DateTimeAsk, FormAsk } from "./form.js"
import { AskRecord } from "./frame.js"

/**
 * Any human-in-the-loop ask by its type. Approvals and structured requests are rendered through application handlers
 * (AiApprovalView); the rest are the proposed structured asks (docs/ai-ui.md).
 *
 * Asks are never modal (R13.8). Inside a conversation a pending ask is pinned in the ask dock
 * above the composer and this place in the transcript shows a marker with Review; once it is
 * answered the marker becomes the record. On its own (outside a ConversationLog) the card
 * renders here.
 */
export function AskCard({ ask }: {
  /** The ask to render; its `type` picks the card. Inside a ConversationLog a pending ask moves to the ask dock and leaves a marker here. */
  ask: AiAsk
}) {
  const dock = useAskDockApi()
  const placement = useContext(AskPlacementContext)
  const resolution = useAskResolution(ask.id)
  const docked = dock !== null && placement === "inline" && isAskPending(ask) && !resolution

  useEffect(() => {
    if (!dock) return
    if (docked) dock.register(ask)
    else dock.unregister(ask.id)
  }, [dock, docked, ask])
  useEffect(() => () => dock?.unregister(ask.id), [dock, ask.id])

  return docked ? <AskMarker ask={ask} /> : <AskBody ask={ask} />
}

function AskBody({ ask }: { ask: AiAsk }) {
  switch (ask.type) {
    case "approval":
      return <ApprovalCard ask={ask} />
    case "single":
      return <SingleChoiceAsk ask={ask} />
    case "multi":
      return <MultiChoiceAsk ask={ask} />
    case "quick":
      return <QuickRepliesAsk ask={ask} />
    case "form":
      return <FormAsk ask={ask} />
    case "entity":
      return <EntityPickerAsk ask={ask} />
    case "datetime":
      return <DateTimeAsk ask={ask} />
    case "confirm":
      return <ConfirmAsk ask={ask} />
    case "rank":
      return <RankAsk ask={ask} />
    case "clarify":
      return <ClarifyAsk ask={ask} />
  }
}

/**
 * What waits: the approval shield for approvals, IconHelp for every other ask (a question is
 * not an approval). Pending tone either way.
 */
function PendingGlyph({ ask }: { ask: AiAsk }) {
  if (ask.type === "approval") return <StatusGlyph status="awaiting-approval" />
  return (
    <span className="fa-ai-status-glyph fa-ai-ask-question-glyph" data-status="awaiting-approval">
      <IconHelp />
    </span>
  )
}

/**
 * A pending ask's place in the transcript while the ask dock holds it: one line, the same
 * box as the record it becomes, and Review, which brings the ask to the front of the dock
 * and moves focus to it. Never a second interactive copy.
 */
export function AskMarker({ ask, className }: {
  /** The pending ask the dock holds; supplies the waiting label, the question and the id Review brings to the front. */
  ask: AiAsk
  className?: string
}) {
  const messages = useMessages(asksMessages)

  const dock = useAskDockApi()
  return (
    <AskRecord
      status="awaiting-approval"
      glyph={<PendingGlyph ask={ask} />}
      className={cx("fa-ai-ask-marker", className)}
      action={
        dock ? (
          <Button variant="ghost" size="sm" onClick={() => dock.show(ask.id)}>
            {messages.review} </Button>
        ) : undefined
      }
    >
      {waitingLabel(ask, messages)} · {ask.question}
    </AskRecord>
  )
}

function dockTone(ask: AiAsk) {
  if (ask.type === "approval") return ask.risk
  if (ask.type === "confirm" && ask.tone !== "accent") return ask.tone
  return undefined
}

/**
 * The ask dock (R13.8): every pending ask in the conversation, pinned directly above the
 * composer until it is answered. Oldest first; with several, one shows with "1 of 3" and
 * previous/next, the others keep their state (a half-filled form survives paging). It folds
 * to one line (the question) and unfolds upwards; its height is capped with the rest
 * scrolling inside, so the transcript always shows above it. Nothing is blocked: the
 * composer and the transcript keep working.
 */
export function AskDock({ className }: { className?: string }) {
  const messages = useMessages(asksMessages)

  const id = useId()
  const dock = useAskDockState()
  const items = useRef(new Map<string, HTMLDivElement>())
  const request = dock?.focusRequest

  useEffect(() => {
    if (!request) return
    const frame = requestAnimationFrame(() => items.current.get(request.id)?.focus())
    return () => cancelAnimationFrame(frame)
  }, [request])

  if (!dock || !dock.current) return null
  const { entries, current, collapsed } = dock
  const index = entries.indexOf(current)
  const count = entries.length

  return (
    <section className={cx("glass-overlay fa-ai-ask-dock", className)} data-collapsed={collapsed ? "" : undefined} data-tone={dockTone(current)} aria-label={messages.waitingForYou}>
      <div className="fa-ai-ask-dock-bar">
        <PendingGlyph ask={current} />
        {collapsed ? (
          <button type="button" className="fa-ai-ask-dock-summary fa-pressable" aria-expanded={false} aria-controls={`${id}-body`} onClick={() => dock.setCollapsed(false)}>
            <TruncatedText>{current.question}</TruncatedText>
          </button>
        ) : (
          <span className="fa-ai-ask-dock-label">{waitingLabel(current, messages)}</span>
        )}
        {count > 1 ? (
          <div className="fa-ai-ask-dock-pager" role="group" aria-label={messages.requests}>
            <span className="fa-ai-ask-dock-count" data-numeric aria-live="polite">
              {messages.requestPosition(index + 1, count)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={<IconChevronLeft />}
              aria-label={messages.previousRequest}
              disabledReason={index === 0 ? messages.thisIsTheOldestRequest : undefined}
              onClick={() => dock.setCurrent(entries[index - 1]!.id)}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<IconChevronRight />}
              aria-label={messages.nextRequest}
              disabledReason={index === count - 1 ? messages.thisIsTheNewestRequest : undefined}
              onClick={() => dock.setCurrent(entries[index + 1]!.id)}
            />
          </div>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          icon={collapsed ? <IconChevronUp /> : <IconChevronDown />}
          aria-label={collapsed ? messages.expand : messages.collapse}
          aria-expanded={!collapsed}
          aria-controls={`${id}-body`}
          onClick={() => dock.setCollapsed(!collapsed)}
        />
      </div>
      <div id={`${id}-body`} className="fa-ai-ask-dock-body" hidden={collapsed} data-scroll-container>
        <AskPlacementContext value="dock">
          <AiSurfaceProvider surface="float">
            {entries.map((ask) => (
              <div
                key={ask.id}
                ref={(node) => {
                  if (node) items.current.set(ask.id, node)
                  else items.current.delete(ask.id)
                }}
                className="fa-ai-ask-dock-item"
                role="region"
                aria-label={ask.question}
                tabIndex={-1}
                hidden={ask !== current}
              >
                <AskBody ask={ask} />
              </div>
            ))}
          </AiSurfaceProvider>
        </AskPlacementContext>
      </div>
    </section>
  )
}
