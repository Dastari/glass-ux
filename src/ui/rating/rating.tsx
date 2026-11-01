import { useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react"
import { IconStar } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { readingKey } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { ratingMessages } from "./messages.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

export interface RatingProps {
  /** The rating, from 0 to `max`; `null` is no rating. Pair with `onValueChange` to control it. */
  value?: number | null
  /** The starting rating when uncontrolled. Default `null`. */
  defaultValue?: number | null
  /** Called with the chosen rating, or `null` when it is cleared. */
  onValueChange?: (value: number | null) => void
  /** How many icons there are, and so the highest rating. Default 5. */
  max?: number
  /** `1` chooses whole icons; `0.5` also chooses half of one. A read-only display ignores it and fills to the exact value. Default 1. */
  step?: 1 | 0.5
  /** Choosing the current rating again, or pressing Delete or Backspace, clears it. Default false. */
  clearable?: boolean
  /** Show the rating without a way to change it. It is then a single image with the value as its name, not a group of choices, so it can sit in a list or card. */
  readOnly?: boolean
  disabled?: boolean
  /** Icon size. Default `md`. */
  size?: "sm" | "md" | "lg"
  /** The icon, drawn outlined when empty and filled when chosen. Pass it without a size. Default a star. */
  icon?: ReactNode
  /** Name for a native form submission (a hidden input carries the rating, empty for none). */
  name?: string
  /** Show the invalid state (set by RatingField when its error shows). */
  invalid?: boolean
  required?: boolean
  /** Words for a rating, such as "3 hearts out of 5". Default "3.5 of 5 stars". */
  valueText?: (value: number, max: number) => string
  /** The group's name when no Field or `aria-labelledby` names it. Default "Rating". For a read-only display, the name that precedes the value. */
  "aria-label"?: string
  /** Names the group by another element, such as a heading. Takes the place of `aria-label`. */
  "aria-labelledby"?: string
  /** Ids of elements that describe the rating, such as a hint. A Field adds its own message. */
  "aria-describedby"?: string
  /** Called when focus leaves the group, for form libraries' touched state. */
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void
  id?: string
  /** Formatting and wording locale; defaults to the nearest LocaleProvider. */
  locale?: string
  /** Layout only. */
  className?: string
}

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))

/** The ids of the Field around `element`: its label and its message line, so the group is named and described by them. */
function useFieldIds(ref: RefObject<HTMLElement | null>) {
  const [ids, setIds] = useState<{ label?: string; message?: string }>({})
  useIsomorphicLayoutEffect(() => {
    const field = ref.current?.closest(".fa-field")
    const label = field?.querySelector<HTMLElement>(".fa-field-label")?.id || undefined
    const message = field?.querySelector<HTMLElement>(".fa-field-message-slot > [id]")?.id || undefined
    if (label !== ids.label || message !== ids.message) setIds({ label, message })
  })
  return ids
}

/**
 * A rating chosen from a row of icons, or shown as one. It is a radio group: the question is
 * "which one of these?", each choice has a name ("3 of 5 stars"), and no choice is a real state
 * that a slider, which always has a value, cannot say. The group is one tab stop, on the chosen
 * icon (or the first). The arrow keys move and choose as native radios do: forward (Right, or
 * Left in a right-to-left language, and Down) raises the rating, back lowers it. Home and End go
 * to the ends, Space chooses the focused one, and with `clearable` Delete and Backspace clear it.
 *
 * `step={0.5}` splits every icon into two choices. Their pointer targets are half an icon wide, so
 * use `size="lg"` for touch. The fill starts at the reading start, so it mirrors in right-to-left
 * languages. Moving the pointer over the icons previews the rating by changing colour only; the
 * layout never moves.
 *
 * With `readOnly` it is an image named with its value ("Rating: 4.3 of 5 stars") that fills to the
 * exact value, for averages. Bind it to a form with `field.RatingField`.
 *
 * @example
 * <Rating aria-label="Service" defaultValue={3} onValueChange={save} />
 */
export function Rating({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  max = 5,
  step = 1,
  clearable = false,
  readOnly = false,
  disabled = false,
  size = "md",
  icon,
  name,
  invalid,
  required,
  valueText,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
  onBlur,
  id,
  locale: localeProp,
  className,
}: RatingProps) {
  const t = useMessages(ratingMessages, { locale: localeProp })
  const locale = useLocale(localeProp)
  const [value, setValue] = useControllable<number | null>(valueProp, defaultValue, onValueChange)
  const root = useRef<HTMLDivElement>(null)
  const ids = useFieldIds(root)
  const total = Math.max(1, Math.floor(max))
  const choices = Math.round(total / step)
  // Input rounds to a choice; a display fills to the exact value.
  const shown = readOnly ? clamp(value ?? 0, total) : clamp(Math.round((value ?? 0) / step) * step, total)
  const format = numberFormat(locale, { maximumFractionDigits: 1 })
  const describe = (amount: number) => (valueText ? valueText(amount, total) : t.valueText({ value: format.format(amount), total, locale }))
  const glyph: ReactNode = icon ?? <IconStar />
  const stars = Array.from({ length: total }, (_, index) => index)
  const faces = (
    <>
      <span className="fa-rating-base">{glyph}</span>
      <span className="fa-rating-fill">{glyph}</span>
    </>
  )
  const style = { "--_value": shown, "--_total": total } as CSSProperties

  if (readOnly) {
    return (
      <div
        ref={root}
        id={id}
        role="img"
        aria-label={t.display({ label: ariaLabel ?? t.label, value: shown > 0 ? describe(shown) : t.unrated })}
        className={cx("fa-rating", className)}
        data-size={size}
        data-readonly=""
        style={style}
      >
        {stars.map((index) => (
          <span key={index} className="fa-rating-star" style={{ "--_i": index } as CSSProperties}>
            <span className="fa-rating-glyph" aria-hidden>
              {faces}
            </span>
          </span>
        ))}
      </div>
    )
  }

  const select = (next: number | null) => {
    if (next !== (shown > 0 ? shown : null)) setValue(next)
  }
  const radios = () => Array.from(root.current?.querySelectorAll<HTMLElement>("[role=radio]") ?? [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const at = Number((event.target as HTMLElement).closest<HTMLElement>("[role=radio]")?.dataset.choice)
    if (!at) return
    const key = readingKey(event.key, event.currentTarget)
    if (clearable && (key === "Delete" || key === "Backspace")) {
      event.preventDefault()
      select(null)
      return
    }
    const to =
      key === "ArrowRight" || key === "ArrowDown"
        ? Math.min(choices, at + 1)
        : key === "ArrowLeft" || key === "ArrowUp"
          ? Math.max(1, at - 1)
          : key === "Home"
            ? 1
            : key === "End"
              ? choices
              : 0
    if (!to) return
    event.preventDefault()
    radios()[to - 1]?.focus()
    select(to * step)
  }

  // A preview is a colour change on the root: no state, no render, nothing moves.
  const preview = (event: PointerEvent<HTMLElement>, amount: number) => {
    if (event.pointerType === "touch") return
    root.current?.style.setProperty("--_hover", String(amount))
    root.current?.setAttribute("data-hovering", "")
  }
  const endPreview = () => root.current?.removeAttribute("data-hovering")

  const tabStop = shown > 0 ? Math.round(shown / step) : 1
  const described = [describedBy, ids.message].filter(Boolean).join(" ") || undefined
  return (
    // oxlint-disable-next-line jsx-a11y/interactive-supports-focus -- the radios inside carry the focus; the group takes the keys they bubble
    <div
      ref={root}
      id={id}
      role="radiogroup"
      aria-label={labelledBy || ids.label ? undefined : (ariaLabel ?? t.label)}
      aria-labelledby={labelledBy ?? (ariaLabel ? undefined : ids.label)}
      aria-describedby={described}
      aria-invalid={invalid || undefined}
      aria-required={required || undefined}
      aria-disabled={disabled || undefined}
      className={cx("fa-rating", className)}
      data-size={size}
      data-step={step === 0.5 ? "half" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      style={style}
      onKeyDown={onKeyDown}
      onPointerLeave={endPreview}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.(event)
      }}
    >
      {stars.map((index) => (
        <span key={index} className="fa-rating-star" style={{ "--_i": index } as CSSProperties}>
          <span className="fa-rating-glyph" aria-hidden>
            {faces}
          </span>
          {(step === 0.5 ? [0.5, 1] : [1]).map((part) => {
            const amount = index + part
            const choice = Math.round(amount / step)
            return (
              <button
                key={part}
                type="button"
                role="radio"
                className="fa-rating-hit"
                data-part={step === 0.5 ? (part === 1 ? "end" : "start") : undefined}
                data-choice={choice}
                aria-checked={shown === amount}
                aria-label={describe(amount)}
                tabIndex={choice === tabStop ? 0 : -1}
                disabled={disabled}
                onPointerEnter={(event) => preview(event, amount)}
                onClick={() => select(shown === amount && clearable ? null : amount)}
              />
            )
          })}
        </span>
      ))}
      {name ? <input type="hidden" name={name} value={shown > 0 ? shown : ""} /> : null}
    </div>
  )
}

export interface RatingFieldProps
  extends FieldChrome,
    Pick<RatingProps, "max" | "step" | "clearable" | "size" | "icon" | "valueText" | "locale" | "aria-describedby"> {}

/** Rating bound to a `number | null` form field. Pair it with `ratingSchema()`. */
export function RatingField({ label, hint, warning, optional, required, aside, className, disabled, ...control }: RatingFieldProps) {
  const { field, error, root } = useBoundField<number | null>()
  return (
    <Field {...root} label={label} hint={hint} warning={warning} optional={optional} required={required} aside={aside} className={className} disabled={disabled} nativeLabel={false}>
      <Rating
        {...control}
        name={field.name}
        value={field.state.value}
        onValueChange={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  )
}
