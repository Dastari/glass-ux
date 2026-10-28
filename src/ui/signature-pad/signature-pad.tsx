import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react"
import { IconClose, IconUndo } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button } from "../button/index.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import {
  isSignatureEmpty,
  SIGNATURE_BOX_WIDTH,
  strokeOutline,
  typedFontSize,
  type DrawnSignature,
  type SignaturePoint,
  type SignatureStroke,
  type SignatureValue,
  type TypedSignature,
} from "./ink.js"
import { signaturePadMessages } from "./messages.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

export interface SignaturePadProps {
  /** The signature, or null when empty. Pair with `onValueChange` to control it. */
  value?: SignatureValue | null
  /** The starting signature when uncontrolled. */
  defaultValue?: SignatureValue | null
  /** Called after each stroke, undo, clear or typed change with the new signature (null when empty). */
  onValueChange?: (value: SignatureValue | null) => void
  /** Offer "Type instead", so people who cannot draw can sign with their typed name. Default true. */
  allowTyped?: boolean
  /** Width ÷ height of the signing area. Default 3. The pad keeps this shape at every width. */
  aspectRatio?: number
  /** Shows the signature without the toolbar; it cannot be changed. */
  readOnly?: boolean
  disabled?: boolean
  /** Show the invalid state (set by SignatureField when its error shows). */
  invalid?: boolean
  required?: boolean
  /** Name for a native form submission (a hidden input carries the value as JSON). */
  name?: string
  /** Called when focus leaves the pad, for form libraries' touched state. */
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void
  /** Accessible name when no Field label names the pad. */
  "aria-label"?: string
  /** Layout only. */
  className?: string
}

type Mode = SignatureValue["kind"]

/**
 * The ids of the Field around `element`, read from the rendered Field: its label, the control
 * id a native label points to (the typed name takes it), and the message line.
 */
function useFieldIds(ref: React.RefObject<HTMLElement | null>) {
  const [ids, setIds] = useState<{ label?: string; control?: string; message?: string }>({})
  useIsomorphicLayoutEffect(() => {
    const field = ref.current?.closest(".fa-field")
    const labelElement = field?.querySelector<HTMLElement>(".fa-field-label")
    const label = labelElement?.id || undefined
    const control = labelElement instanceof HTMLLabelElement ? labelElement.htmlFor || undefined : undefined
    const message = field?.querySelector<HTMLElement>(".fa-field-message-slot > [id]")?.id || undefined
    if (label !== ids.label || control !== ids.control || message !== ids.message) setIds({ label, control, message })
  })
  return ids
}

const round1 = (value: number) => Math.round(value * 10) / 10

/**
 * A handwritten signature as a form value. Draw with a mouse, pen or finger: strokes swell
 * and thin with speed and pen pressure, and are stored as points so the signature redraws
 * sharply at any size. "Type instead" takes a typed name for people who cannot draw.
 * Undo removes the last stroke and Clear empties the pad; with the pad focused, Delete
 * clears and Ctrl/Command+Z undoes. Export with `signatureToSvg` or `signatureToPng`.
 *
 * A drawing on its own does not establish who signed: the application records who, when
 * and what was agreed.
 */
export function SignaturePad({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  allowTyped = true,
  aspectRatio = 3,
  readOnly = false,
  disabled = false,
  invalid,
  required,
  name,
  onBlur,
  className,
  "aria-label": ariaLabel,
}: SignaturePadProps) {
  const t = useMessages(signaturePadMessages)
  const [value, setValue] = useControllable<SignatureValue | null>(valueProp, defaultValue, onValueChange)
  const [chosenMode, setChosenMode] = useState<Mode>(value?.kind ?? "drawn")
  const mode: Mode = value?.kind ?? chosenMode
  const rootRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const liveRef = useRef<SVGPathElement>(null)
  const typedRef = useRef<HTMLInputElement>(null)
  const stroke = useRef<{ id: number; start: number; points: SignaturePoint[] } | null>(null)
  const frame = useRef(0)
  /** The other mode's signature, restored when the person switches back. */
  const stash = useRef<{ drawn: DrawnSignature | null; typed: TypedSignature | null }>({ drawn: null, typed: null })
  const ids = useFieldIds(rootRef)
  const statusId = `${useId()}-status`
  const instructionsId = `${statusId}-help`

  const width = value?.kind === "drawn" ? value.width : SIGNATURE_BOX_WIDTH
  const height = value?.kind === "drawn" ? value.height : Math.round((SIGNATURE_BOX_WIDTH / aspectRatio) * 10) / 10
  const strokes = value?.kind === "drawn" ? value.strokes : []
  const empty = isSignatureEmpty(value)
  const editable = !readOnly && !disabled

  const point = (event: { clientX: number; clientY: number; pressure: number; pointerType: string }, start: number): SignaturePoint => {
    const svg = svgRef.current!
    const matrix = svg.getScreenCTM()?.inverse()
    const local = matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix) : new DOMPoint(0, 0)
    return {
      x: round1(local.x),
      y: round1(local.y),
      t: Math.round(performance.now() - start),
      p: event.pointerType === "pen" && event.pressure > 0 ? Math.round(event.pressure * 100) / 100 : 0.5,
    }
  }

  const drawLive = () => {
    frame.current = 0
    if (liveRef.current) liveRef.current.setAttribute("d", stroke.current ? strokeOutline(stroke.current.points) : "")
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!editable || mode !== "drawn" || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return
    event.preventDefault()
    surfaceRef.current?.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    const start = performance.now()
    stroke.current = { id: event.pointerId, start, points: [] }
    stroke.current.points.push(point(event, start))
    drawLive()
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = stroke.current
    if (!current || current.id !== event.pointerId) return
    const samples = event.nativeEvent.getCoalescedEvents?.() ?? []
    for (const sample of samples.length ? samples : [event.nativeEvent]) current.points.push(point(sample, current.start))
    if (!frame.current) frame.current = requestAnimationFrame(drawLive)
  }

  const finish = (event: PointerEvent<HTMLDivElement>) => {
    const current = stroke.current
    if (!current || current.id !== event.pointerId) return
    stroke.current = null
    cancelAnimationFrame(frame.current)
    frame.current = 0
    if (liveRef.current) liveRef.current.setAttribute("d", "")
    const done: SignatureStroke = current.points
    setValue((previous) => {
      const base = previous?.kind === "drawn" ? previous : { kind: "drawn" as const, width, height, strokes: [] }
      return { ...base, strokes: [...base.strokes, done] }
    })
  }

  const undo = () => {
    if (value?.kind !== "drawn") return
    const rest = value.strokes.slice(0, -1)
    setValue(rest.length ? { ...value, strokes: rest } : null)
  }

  const clear = () => {
    setValue(null)
    if (mode === "typed") typedRef.current?.focus()
    else surfaceRef.current?.focus()
  }

  const switchMode = () => {
    const next: Mode = mode === "drawn" ? "typed" : "drawn"
    if (value?.kind === "drawn") stash.current.drawn = value
    if (value?.kind === "typed") stash.current.typed = value
    setChosenMode(next)
    setValue(stash.current[next])
    requestAnimationFrame(() => (next === "typed" ? typedRef.current : surfaceRef.current)?.focus())
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!editable || event.target !== event.currentTarget) return
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault()
      setValue(null)
    } else if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      event.preventDefault()
      undo()
    }
  }

  const status = empty ? t.notSigned : t.signed
  const labelledBy = ariaLabel ? undefined : ids.label
  const describedBy = cx(statusId, editable && mode === "drawn" ? instructionsId : undefined, ids.message) || undefined
  const typedText = value?.kind === "typed" ? value.text : ""

  return (
    <div
      ref={rootRef}
      className={cx("fa-signature", className)}
      style={{ "--_ratio": `${width} / ${height}` } as CSSProperties}
      data-mode={mode}
      data-empty={empty ? "" : undefined}
      data-readonly={readOnly ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.(event)
      }}
    >
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- the drawing surface: pointer input draws, and as role=application it takes Delete and Ctrl/Command+Z */}
      <div
        ref={surfaceRef}
        className="fa-control fa-signature-surface"
        data-readonly={readOnly ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
        role={mode === "drawn" ? (editable ? "application" : "img") : undefined}
        aria-roledescription={mode === "drawn" && editable ? t.padRole : undefined}
        aria-label={mode === "drawn" ? ariaLabel : undefined}
        aria-labelledby={mode === "drawn" ? labelledBy : undefined}
        aria-describedby={mode === "drawn" ? describedBy : undefined}
        aria-invalid={mode === "drawn" && invalid ? true : undefined}
        aria-disabled={mode === "drawn" && disabled ? true : undefined}
        tabIndex={mode === "drawn" && editable ? 0 : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onKeyDown={onKeyDown}
      >
        <span className="fa-signature-line" aria-hidden />
        {mode === "drawn" ? (
          <>
            {empty && editable ? (
              <span className="fa-signature-placeholder" aria-hidden>
                {t.signHere}
              </span>
            ) : null}
            <svg ref={svgRef} className="fa-signature-ink" viewBox={`0 0 ${width} ${height}`} aria-hidden focusable="false">
              {strokes.map((points, index) => (
                <path key={index} d={strokeOutline(points)} />
              ))}
              <path ref={liveRef} d="" />
            </svg>
          </>
        ) : (
          <input
            ref={typedRef}
            id={ids.control}
            className="fa-signature-typed"
            style={{ "--_typed-size": `${(typedFontSize(typedText || t.typeYourName, width, height) / width) * 100}cqi` } as CSSProperties}
            value={typedText}
            placeholder={editable ? t.typeYourName : undefined}
            aria-label={ariaLabel ?? (ids.label ? undefined : t.typeYourName)}
            aria-labelledby={labelledBy}
            aria-describedby={cx(statusId, ids.message) || undefined}
            aria-invalid={invalid || undefined}
            required={required}
            readOnly={readOnly}
            disabled={disabled}
            autoComplete="name"
            spellCheck={false}
            onChange={(event) => setValue(event.target.value ? { kind: "typed", text: event.target.value } : null)}
          />
        )}
      </div>
      {editable ? (
        <div className="fa-signature-toolbar">
          {allowTyped ? (
            <Button variant="ghost" size="xs" onClick={switchMode}>
              {mode === "drawn" ? t.typeInstead : t.drawInstead}
            </Button>
          ) : null}
          {mode === "drawn" ? <Button variant="ghost" size="xs" icon={<IconUndo />} aria-label={t.undo} disabled={empty} onClick={undo} /> : null}
          <Button variant="ghost" size="xs" icon={<IconClose />} aria-label={t.clear} disabled={empty} onClick={clear} />
        </div>
      ) : null}
      <span id={statusId} className="sr-only">
        {status}
      </span>
      <span id={instructionsId} className="sr-only">
        {t.drawInstructions}
      </span>
      {name ? <input type="hidden" name={name} value={value ? JSON.stringify(value) : ""} /> : null}
    </div>
  )
}

export interface SignatureFieldProps extends FieldChrome, Omit<SignaturePadProps, "value" | "defaultValue" | "onValueChange" | "name" | "invalid" | "onBlur" | "className" | "disabled" | "required"> {}

/** SignaturePad bound to a `SignatureValue | null` form field. Pair it with `signatureSchema()`. */
export function SignatureField({ label, hint, warning, optional, required, aside, className, disabled, ...control }: SignatureFieldProps) {
  const { field, error, root } = useBoundField<SignatureValue | null>()
  return (
    <Field {...root} label={label} hint={hint} warning={warning} optional={optional} required={required} aside={aside} className={className} disabled={disabled} nativeLabel={false}>
      <SignaturePad
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
