import { readingKey } from "../../lib/direction.js"
import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { flushSync } from "react-dom"
import { IconArrowDown } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { prefersReducedMotion, scaledDuration } from "../../lib/motion.js"
import { observeElementSizes } from "../../lib/resize-observer.js"
import { remPx } from "../../lib/rem.js"
import { Tooltip } from "../../ui/tooltip/index.js"
import { AskDock, AskDockProvider } from "../asks/index.js"
import { AiSurfaceProvider, type AiSurface } from "../surface/index.js"

/** Within this many px of the end counts as "at the bottom". */
const PIN_THRESHOLD = 48

/** Below this width (in rem) the ask dock starts folded to one line. */
const NARROW_REM = 30
/**
 * From this many children the log lays out and paints only the turns near the viewport
 * (content-visibility, conversation.css). Shorter logs render every turn: a turn that
 * renders late changes the page's layout, which a short log does not need to risk.
 */
const LONG_TRANSCRIPT = 20

const reducedMotion = () => typeof document !== "undefined" && prefersReducedMotion()

interface LogApi {
  scrollToBottom: (smooth?: boolean) => void
  scrollToTurn: (index: number) => void
  pinned: boolean
}

const LogContext = createContext<LogApi | null>(null)

/** Scroll the conversation from anywhere inside it (composer send, turn navigator). */
export function useConversationLog() {
  return useContext(LogContext)
}

export interface TurnAnchor {
  /** The turn's number: the `index` given to its Turn (its `data-turn`), which the navigator scrolls to. */
  index: number
  /** The prompt, one line, for the navigator's tooltip. */
  preview: string
}

export interface ConversationLogProps extends Omit<ComponentProps<"div">, "children"> {
  children?: ReactNode
  /** canvas: the full-page conversation · panel: docked panes, windows, the gallery. */
  surface?: AiSurface
  /** Prompts for the turn navigator (shown when the log is wide enough). */
  turns?: TurnAnchor[]
  /** Polite announcement for completed answers (never per token). */
  announcement?: string
  /** Floats over the bottom of the log on the reading column: the composer. */
  footer?: ReactNode
  /**
   * The empty conversation: shown centred above the composer until the first message (the
   * hero). While set, the composer sits with it in the middle; when it clears, the same
   * composer moves to its floating place at the bottom.
   */
  landing?: ReactNode
  /** Under the composer on the landing: suggestions. */
  landingFooter?: ReactNode
  /** Accessible name. */
  label?: string
}

/**
 * The conversation: a scrolling log on a centred reading column, with the composer floating
 * over its bottom edge.
 *
 * Column    a reading column (--reading-column) centred in the log, the convention every chat
 *           follows (R5.4). Wide blocks (tables, charts, code, images) break out wider,
 *           centred on the text, up to --reading-column-wide and never past the log. Spare
 *           width is for the context panel beside the log, never for longer lines.
 * Composer  floats over the transcript in glass-overlay, a small gap from the bottom, on the
 *           column. The log runs the full height behind it; its end is padded by the
 *           composer's measured height, so the last message scrolls clear of it, and growing
 *           the composer never moves what you read (if you were at the end, you stay there).
 * Asks      pending asks are pinned in the ask dock directly above the composer (R13.8); the
 *           transcript holds a marker at the ask's place. "Scroll to end" floats above both
 *           while you are not at the end.
 * Landing   with `landing` set, the hero, composer and suggestions sit in the middle. The first
 *           message clears it and the same composer (focus, caret, attachments intact) moves
 *           to the bottom with a FLIP transition on --duration-slower; instant with motion off.
 * Pinning   while the reader is at the bottom, new content keeps the bottom in view, so
 *           streaming text, folding asks and arriving results move what is above, never the
 *           newest lines. Scrolled up, nothing moves: the pill says "New messages" (R9.4).
 * A11y      role="log" without per-token chatter: completed answers are announced through
 *           one polite live region; the scroller is keyboard scrollable (R20.6).
 */
export function ConversationLog({
  children,
  surface = "panel",
  turns,
  announcement,
  footer,
  landing,
  landingFooter,
  label = "Conversation",
  className,
  ...rest
}: ConversationLogProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const columnRef = useRef<HTMLDivElement>(null)
  const floatRef = useRef<HTMLDivElement>(null)
  /** The floating part's last settled box: where a landing → conversation move starts. */
  const lastBox = useRef<DOMRect | null>(null)
  const pinnedRef = useRef(true)
  /** The scroll position at the last scroll event: a reader leaves the end by moving up. */
  const lastTop = useRef(0)
  const narrowRef = useRef(false)
  const lastHeight = useRef(0)
  const [pinned, setPinned] = useState(true)
  const [unseen, setUnseen] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [arrived, setArrived] = useState(false)
  const [activeTurn, setActiveTurn] = useState(turns?.length ?? 0)
  const landingMode = landing !== undefined && landing !== null && landing !== false

  const scrollToBottom = useCallback((smooth = false) => {
    const element = scrollRef.current
    if (!element) return
    pinnedRef.current = true
    setPinned(true)
    setUnseen(false)
    element.scrollTo({ top: element.scrollHeight, behavior: smooth && !reducedMotion() ? "smooth" : "auto" })
  }, [])

  const scrollToTurn = useCallback((index: number) => {
    const element = scrollRef.current?.querySelector<HTMLElement>(`[data-turn="${index}"]`)
    const root = rootRef.current
    if (!element || !root) return
    setActiveTurn(index)
    const scroll = () => element.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" })
    // A long transcript lays out far turns at an estimate, so a scroll would aim at the wrong
    // place. Lay every turn out for one frame first (data-measure): each records its real
    // size, keeps it when it is skipped again, and the scroll lands where it should.
    if (!root.hasAttribute("data-long")) return scroll()
    root.dataset.measure = ""
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        delete root.dataset.measure
        scroll()
      })
    )
  }, [])

  // The floating part's height pads the end of the log, so the last message scrolls clear of
  // the composer; the scrollbar's width keeps the composer on the same column as the text.
  // Measured when the ResizeObserver reports, after the browser's layout and before paint, so
  // mounting forces no layout mid-commit and a growing composer never shows a frame where it
  // covers the end. Every read comes before the writes, and unchanged values are not written.
  useLayoutEffect(() => {
    const root = rootRef.current
    const scroller = scrollRef.current
    const float = floatRef.current
    if (!root || !scroller || !float) return
    const apply = () => {
      const box = float.dataset.flip ? null : float.getBoundingClientRect()
      const dock = `${float.offsetHeight}px`
      const gutter = `${(scroller.offsetWidth - scroller.clientWidth) / 2}px`
      const narrowNow = root.clientWidth < NARROW_REM * remPx()
      if (box) lastBox.current = box
      if (root.style.getPropertyValue("--_dock-h") !== dock) root.style.setProperty("--_dock-h", dock)
      if (root.style.getPropertyValue("--_sb") !== gutter) root.style.setProperty("--_sb", gutter)
      if (pinnedRef.current) scroller.scrollTop = scroller.scrollHeight
      return narrowNow
    }
    if (typeof ResizeObserver === "undefined") {
      setNarrow(apply())
      return
    }
    const observer = observeElementSizes(() => {
      const narrowNow = apply()
      // Only a change of layout is committed here, at once so the first frame is right. Flushing
      // on every resize would also commit whatever else is pending (the next streamed words)
      // after the log has followed the end, and leave the reader short of it.
      if (narrowNow === narrowRef.current) return
      narrowRef.current = narrowNow
      flushSync(() => setNarrow(narrowNow))
    })
    observer.observe(float)
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  // Keep the bottom in view while pinned; otherwise flag unseen growth.
  useEffect(() => {
    const element = scrollRef.current
    const column = columnRef.current
    if (!element || !column) return
    lastHeight.current = column.offsetHeight
    const observer = observeElementSizes(() => {
      const height = column.offsetHeight
      const grew = height > lastHeight.current + 1
      lastHeight.current = height
      if (pinnedRef.current) element.scrollTop = element.scrollHeight
      else if (grew) setUnseen(true)
    })
    observer.observe(column)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Landing → conversation: the composer keeps its node (no remount) and slides from where it
  // was to its floating place (FLIP). The starting box is the last one recorded: after every
  // commit and whenever the floating part or the log resizes (see the observer above).
  const lastMode = useRef(landingMode)
  const [previousMode, setPreviousMode] = useState(landingMode)
  if (previousMode !== landingMode) {
    setPreviousMode(landingMode)
    if (!landingMode) setArrived(true)
  }
  useLayoutEffect(() => {
    const float = floatRef.current
    if (lastMode.current === landingMode || !float) return
    lastMode.current = landingMode
    const from = lastBox.current
    if (!landingMode) {
      const scroller = scrollRef.current
      if (scroller) scroller.scrollTop = scroller.scrollHeight
    }
    if (!from || reducedMotion()) return
    const box = float.getBoundingClientRect()
    const dx = from.left - box.left
    const dy = from.top - box.top
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    float.style.setProperty("--_flip-x", `${dx}px`)
    float.style.setProperty("--_flip-y", `${dy}px`)
    float.dataset.flip = "from"
    void float.offsetWidth
    float.dataset.flip = "to"
    const done = () => {
      float.removeEventListener("transitionend", onEnd)
      delete float.dataset.flip
      lastBox.current = float.getBoundingClientRect()
    }
    // Only the float's own transform ends the move; the composer's transitions bubble here too.
    const onEnd = (event: TransitionEvent) => {
      if (event.target === float && event.propertyName === "transform") done()
    }
    float.addEventListener("transitionend", onEnd)
    const fallback = setTimeout(done, scaledDuration(1200) + 50)
    return () => {
      clearTimeout(fallback)
      done()
    }
  }, [landingMode])
  // Record the floating part's box after every commit (declared after the FLIP, so the FLIP
  // reads the previous one), never mid-transition.
  useLayoutEffect(() => {
    const float = floatRef.current
    if (float && !float.dataset.flip) lastBox.current = float.getBoundingClientRect()
  })

  const onScroll = () => {
    const element = scrollRef.current
    if (!element) return
    const top = element.scrollTop
    const atBottom = top + element.clientHeight >= element.scrollHeight - PIN_THRESHOLD
    // A reader leaves the end only by moving up. Content that grew below between a follow and
    // this event (a streamed word, the completed answer's actions) leaves the position where it
    // was: the observers bring the end back into view, and the reader stays pinned.
    const leaving = !atBottom && top < lastTop.current - 1
    lastTop.current = top
    const next = atBottom || (pinnedRef.current && !leaving)
    if (next !== pinnedRef.current) {
      pinnedRef.current = next
      setPinned(next)
    }
    if (atBottom) setUnseen(false)
    if (turns?.length) {
      const probe = element.getBoundingClientRect().top + Math.min(element.clientHeight * 0.3, 240)
      let current = turns[0]!.index
      for (const turn of turns) {
        const node = element.querySelector<HTMLElement>(`[data-turn="${turn.index}"]`)
        if (node && node.getBoundingClientRect().top <= probe) current = turn.index
      }
      setActiveTurn(current)
    }
  }

  const pill = !pinned && !landingMode

  return (
    <LogContext value={{ scrollToBottom, scrollToTurn, pinned }}>
      <AiSurfaceProvider surface={surface}>
        <AskDockProvider narrow={narrow}>
          <div
            {...rest}
            ref={rootRef}
            className={cx("fa-ai-conversation", className)}
            data-surface={surface}
            data-layout={landingMode ? "landing" : "conversation"}
            data-pinned={pinned ? "" : undefined}
            data-arrived={arrived ? "" : undefined}
            data-long={Children.count(children) >= LONG_TRANSCRIPT ? "" : undefined}
          >
            {turns && turns.length > 1 && !landingMode ? <TurnNavigator turns={turns} active={activeTurn} onNavigate={scrollToTurn} /> : null}
            <div
              ref={scrollRef}
              className="fa-ai-conversation-scroll"
              role="log"
              aria-live="off"
              aria-label={label}
              // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll region must be keyboard scrollable (R20.6)
              tabIndex={0}
              onScroll={onScroll}
            >
              <div ref={columnRef} className="fa-ai-conversation-column">
                {children}
              </div>
            </div>
            {landingMode ? (
              <div className="fa-ai-conversation-landing" data-part="top">
                {landing}
              </div>
            ) : null}
            <div className="fa-ai-conversation-dock">
              <div ref={floatRef} className="fa-ai-conversation-float">
                <button
                  type="button"
                  className="glass-overlay fa-pressable fa-ai-new-pill"
                  data-visible={pill ? "" : undefined}
                  aria-hidden={!pill}
                  tabIndex={pill ? 0 : -1}
                  onClick={() => scrollToBottom(true)}
                >
                  <IconArrowDown />
                  {unseen ? "New messages" : "Scroll to end"}
                </button>
                <AiSurfaceProvider surface="float">
                  <AskDock />
                  {footer ? <div className="fa-ai-conversation-footer">{footer}</div> : null}
                </AiSurfaceProvider>
              </div>
            </div>
            {landingMode ? (
              <div className="fa-ai-conversation-landing" data-part="bottom">
                {landingFooter}
              </div>
            ) : null}
            <div className="fa-ai-sr" aria-live="polite" role="status">
              {announcement}
            </div>
          </div>
        </AskDockProvider>
      </AiSurfaceProvider>
    </LogContext>
  )
}

/**
 * Jump between prompts on wide screens: a column of dashes beside the log, one per turn.
 * The current turn is the accent dash; neighbours of the pointer grow so the target is easy
 * to hit. Each dash names its prompt in a tooltip; arrow keys, Home and End move.
 */
export function TurnNavigator({ turns, active, onNavigate }: {
  /** One dash per prompt, in order: the turn's `index` (its Turn `index`) and a one-line preview for the tooltip. */
  turns: TurnAnchor[]
  /** The `index` of the current turn; its dash is the accent and the one Tab reaches. */
  active: number
  /** Called with a turn's `index` (not its position in `turns`) when its dash is clicked or reached with the arrow keys, Home or End. */
  onNavigate: (index: number) => void
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const [pointer, setPointer] = useState<number | null>(null)
  const move = (event: KeyboardEvent, position: number) => {
    const key = readingKey(event.key, event.currentTarget)
    const next =
      key === "ArrowUp" || key === "ArrowLeft"
        ? Math.max(0, position - 1)
        : key === "ArrowDown" || key === "ArrowRight"
          ? Math.min(turns.length - 1, position + 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? turns.length - 1
              : null
    if (next === null) return
    event.preventDefault()
    refs.current[next]?.focus()
    onNavigate(turns[next]!.index)
  }
  return (
    <nav className="fa-ai-turns" aria-label="Conversation turns" onPointerLeave={() => setPointer(null)}>
      {turns.map((turn, position) => {
        const distance = pointer === null ? 9 : Math.abs(pointer - position)
        return (
          <Tooltip key={turn.index} content={turn.preview} side="inline-end" describe={false}>
            <button
              ref={(node) => {
                refs.current[position] = node
              }}
              type="button"
              className="fa-ai-turn-dash"
              aria-label={`Prompt ${position + 1}: ${turn.preview}`}
              aria-current={turn.index === active ? "step" : undefined}
              data-near={distance === 0 ? "0" : distance === 1 ? "1" : distance === 2 ? "2" : undefined}
              tabIndex={turn.index === active ? 0 : -1}
              onClick={() => onNavigate(turn.index)}
              onPointerEnter={() => setPointer(position)}
              onFocus={() => setPointer(position)}
              onBlur={() => setPointer(null)}
              onKeyDown={(event) => move(event, position)}
            >
              <span aria-hidden />
            </button>
          </Tooltip>
        )
      })}
    </nav>
  )
}
