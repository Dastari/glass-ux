import { Button as BaseButton } from "@base-ui/react/button"
import { useId, type CSSProperties, type ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { levelGaugeMessages } from "./messages.js"

/** A level's meaning: status tones only (R3.3), or neutral. */
export type LevelTone = "neutral" | "info" | "success" | "warning" | "danger"

/** One step of the scale, in order from lowest to highest. */
export interface GaugeLevel<V extends string = string> {
  value: V
  label: string
  tone: LevelTone
}

/** What each segment shows: filled to the level, traced where an earlier higher level was, striped where it rose. */
export type LevelSegmentState = "filled" | "risen" | "traced" | "empty"

export interface LevelGaugeProps<V extends string = string> {
  /** What is rated: "Final risk". Part of the accessible name; shown above the segments at `md`. */
  label: string
  /** The scale, lowest first: two to about six levels. */
  levels: readonly GaugeLevel<V>[]
  /** The level now, or null/undefined when not rated (the `fallback` shows, in the same space). */
  value: V | null | undefined
  /** An earlier level, such as before mitigation: segments down from it are traced, or striped up to `value` when it rose. */
  previous?: V | null
  /** Names `previous`: "Before mitigation". Default "Previously". */
  previousLabel?: string
  /** One line under the label at `md`. */
  note?: ReactNode
  /** `sm` (default): segments and the level's name in a line, for table cells and footers. `md`: the label, the note, full-width segments and the scale's names beneath. */
  size?: "sm" | "md"
  /** Makes the gauge a button (an explanation of the levels, normally). */
  onPress?: () => void
  /** Shown instead of the level's name when `value` is not on the scale. Default "Not rated". */
  fallback?: ReactNode
  /** Layout only. */
  className?: string
}

/** Each segment's state, from the level now and an earlier one. */
export function levelSegments(count: number, at: number, before: number): LevelSegmentState[] {
  return Array.from({ length: count }, (_, index) => {
    if (at < 0) return "empty"
    if (index <= at) return before >= 0 && before < at && index > before ? "risen" : "filled"
    return before > at && index <= before ? "traced" : "empty"
  })
}

/**
 * A small ordered scale — Low, Moderate, High — showing where something stands: segments
 * fill to the level in its tone, and the level's name follows in that tone's text colour.
 * An earlier level (before mitigation) stays visible: segments it reached are traced in its
 * tone when the level came down, and the segments gained are striped when it rose. With
 * `onPress` the whole gauge is a button.
 */
export function LevelGauge<V extends string = string>({
  label,
  levels,
  value,
  previous,
  previousLabel,
  note,
  size = "sm",
  onPress,
  fallback,
  className,
}: LevelGaugeProps<V>) {
  const messages = useMessages(levelGaugeMessages)
  const noteId = useId()
  const at = levels.findIndex((level) => level.value === value)
  const before = previous == null ? -1 : levels.findIndex((level) => level.value === previous)
  const level = at >= 0 ? levels[at] : undefined
  const earlier = before >= 0 && before !== at ? levels[before] : undefined
  const states = levelSegments(levels.length, at, earlier ? before : -1)
  const priorName = previousLabel ?? messages.previously
  const name = level
    ? earlier
      ? messages.withPrevious({ label, value: level.label, previousLabel: priorName, previous: earlier.label })
      : messages.named({ label, value: level.label })
    : messages.named({ label, value: typeof fallback === "string" ? fallback : messages.notRated })

  const segments = (
    <span className="fa-level-gauge-segments" aria-hidden>
      {levels.map((item, index) => {
        const state = states[index]!
        // Filled and striped segments take the level now; traced ones the earlier level.
        const tone = state === "traced" ? earlier?.tone : state === "empty" ? undefined : level?.tone
        return <span key={item.value} className="fa-level-gauge-segment" data-state={state} data-tone={tone} />
      })}
    </span>
  )
  const reading = (
    <span className="fa-level-gauge-value" data-tone={level?.tone} data-unrated={level ? undefined : ""} aria-hidden>
      {level ? level.label : (fallback ?? messages.notRated)}
    </span>
  )
  const body =
    size === "md" ? (
      <>
        <span className="fa-level-gauge-head" aria-hidden>
          <span className="fa-level-gauge-label">{label}</span>
          {reading}
        </span>
        {note || earlier ? (
          <span className="fa-level-gauge-note">
            {earlier ? <span aria-hidden>{messages.previousLine({ previousLabel: priorName, previous: earlier.label })}</span> : null}
            {note ? <span id={noteId}>{note}</span> : null}
          </span>
        ) : null}
        {segments}
        <span className="fa-level-gauge-scale" aria-hidden>
          {levels.map((item, index) => (
            <span key={item.value} data-current={index === at ? "" : undefined}>
              {item.label}
            </span>
          ))}
        </span>
      </>
    ) : (
      <>
        {segments}
        {reading}
      </>
    )

  const shared = {
    className: cx("fa-level-gauge", className),
    "data-size": size,
    style: { "--_levels": levels.length } as CSSProperties,
  }
  if (onPress)
    return (
      <BaseButton {...shared} className={cx(shared.className, "fa-pressable")} data-pressable="" aria-label={name} aria-describedby={size === "md" && note ? noteId : undefined} onClick={onPress}>
        {body}
      </BaseButton>
    )
  return (
    <span {...shared}>
      <span className="sr-only">{name}</span>
      {body}
    </span>
  )
}
