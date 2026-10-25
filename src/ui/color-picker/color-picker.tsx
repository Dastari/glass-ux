import { Slider as BaseSlider } from "@base-ui/react/slider"
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import { IconEyedropper } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { Button } from "../button/index.js"
import { Input } from "../input/index.js"
import { Tooltip } from "../tooltip/index.js"
import { clampToGamut, cssColor, formatHex, hueGradient, maxChroma, paintArea, parseHex, peakChroma, type Oklch } from "./color.js"
import { colorPickerMessages } from "./messages.js"

/** A preset colour: a hex value, or a hex value with a name for its tooltip and accessible name. */
export type ColorSwatch = string | { value: string; label: string }

/** Props shared by ColorPicker and ColorField. */
export interface ColorPickerBaseProps {
  /** The colour as hex (`#rrggbb`, or `#rrggbbaa` with `alpha`). Pair with `onValueChange` to control it. */
  value?: string
  /** The starting colour when uncontrolled. Default: a mid blue. */
  defaultValue?: string
  /** Called with the new hex colour on every change, while dragging too. */
  onValueChange?: (value: string) => void
  /** Called with the hex colour when a change is finished: the pointer is released, a key is pressed, a swatch is chosen or the hex field commits. */
  onValueCommit?: (value: string) => void
  /** Offer an opacity slider and keep alpha in the value (`#rrggbbaa`). Default false. */
  alpha?: boolean
  /** Preset colours shown under the controls. */
  swatches?: ColorSwatch[]
  /** Offer the browser's eyedropper where it has one (`window.EyeDropper`). Default true. */
  eyeDropper?: boolean
  disabled?: boolean
  /** Formatting and wording locale; defaults to the nearest LocaleProvider. */
  locale?: string
  /** Wording overrides for this picker. */
  labels?: Partial<typeof colorPickerMessages.defaults>
}

export interface ColorPickerProps extends ColorPickerBaseProps {
  /** Layout only. */
  className?: string
  id?: string
  /** Accessible name for the picker group when no visible label names it. */
  "aria-label"?: string
  /** IDs of elements that name the picker. */
  "aria-labelledby"?: string
}

interface EyeDropperResult {
  sRGBHex: string
}
type EyeDropperConstructor = new () => { open(): Promise<EyeDropperResult> }

const eyeDropperSupported = () => typeof window !== "undefined" && "EyeDropper" in window

/** Where an empty picker starts: a mid blue, in the middle of the area. */
const NEUTRAL: Oklch = { l: 0.62, c: 0.15, h: 255, a: 1 }

/** A hex value as OKLCH, keeping `previousHue` for greys (their hue is undefined). */
function readColor(hex: string | undefined, previousHue: number): Oklch | null {
  if (!hex) return null
  const parsed = parseHex(hex)
  if (!parsed) return null
  return parsed.c < 0.002 ? { ...parsed, h: previousHue } : parsed
}

const swatchValue = (swatch: ColorSwatch) => (typeof swatch === "string" ? swatch : swatch.value)
const swatchLabel = (swatch: ColorSwatch) => (typeof swatch === "string" ? swatch : swatch.label)

/**
 * A colour picker in OKLCH, the space the library's palettes use: an area of lightness and
 * chroma at the chosen hue (colours the screen cannot show are drawn faintly, and choosing one
 * moves to the nearest colour that can be shown), a hue slider, an optional opacity slider, a
 * hex field, preset swatches and the browser's eyedropper where available. Values are hex.
 *
 * Keyboard: in the area, ↑ ↓ change lightness and ← → chroma (Shift for larger steps, Page
 * Up/Down for lightness by 10%, Home/End for no chroma and the most). The sliders follow the
 * slider pattern.
 */
export function ColorPicker({
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  alpha = false,
  swatches,
  eyeDropper = true,
  disabled = false,
  locale,
  labels,
  className,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: ColorPickerProps) {
  const t = useMessages(colorPickerMessages, { labels, locale })
  const [color, setColor] = useState<Oklch>(() => readColor(value ?? defaultValue, NEUTRAL.h) ?? NEUTRAL)
  const latest = useRef(color)
  latest.current = color
  const emittedHex = useRef<string | null>(null)

  // Follow a controlled value that changes from outside (not our own echo).
  useEffect(() => {
    if (value === undefined || value === emittedHex.current) return
    const next = readColor(value, latest.current.h)
    if (next && formatHex(next, alpha) !== formatHex(latest.current, alpha)) setColor(next)
  }, [value, alpha])

  const hex = formatHex(color, alpha)
  const update = useCallback(
    (next: Oklch, commit = false) => {
      const fitted = clampToGamut(next)
      setColor(fitted)
      const out = formatHex(fitted, alpha)
      emittedHex.current = out
      onValueChange?.(out)
      if (commit) onValueCommit?.(out)
    },
    [alpha, onValueChange, onValueCommit],
  )
  const commit = () => onValueCommit?.(formatHex(latest.current, alpha))

  const peak = useMemo(() => Math.max(0.01, peakChroma(color.h)), [color.h])
  const groupLabel = ariaLabelledBy ? undefined : (ariaLabel ?? t.picker)

  return (
    <div
      id={id}
      role="group"
      aria-label={groupLabel}
      aria-labelledby={ariaLabelledBy}
      className={cx("fa-color-picker", className)}
      data-disabled={disabled ? "" : undefined}
      style={{ "--_colour": cssColor({ ...color, a: 1 }), "--_colour-alpha": cssColor(color) } as CSSProperties}
    >
      <ColorArea color={color} peak={peak} disabled={disabled} label={t.area} valueText={t.areaValue} onChange={update} onCommit={commit} />
      <div className="fa-color-sliders">
        <ColorSlider
          label={t.hue}
          value={Math.round(color.h)}
          max={360}
          track={hueGradient()}
          disabled={disabled}
          onChange={(h) => update({ ...latest.current, h })}
          onCommit={commit}
        />
        {alpha ? (
          <ColorSlider
            label={t.alpha}
            value={Math.round(color.a * 100)}
            max={100}
            unit="%"
            alpha
            track={`linear-gradient(to right, transparent, ${cssColor({ ...color, a: 1 })})`}
            disabled={disabled}
            onChange={(a) => update({ ...latest.current, a: a / 100 })}
            onCommit={commit}
          />
        ) : null}
      </div>
      <div className="fa-color-inputs">
        <span className="fa-color-preview" data-alpha={alpha ? "" : undefined} aria-hidden />
        <HexInput hex={hex} label={t.hex} disabled={disabled} onCommit={(next) => {
          const parsed = readColor(next, latest.current.h)
          if (parsed) update(alpha ? parsed : { ...parsed, a: 1 }, true)
        }} />
        {eyeDropper ? <EyeDropperButton label={t.eyeDropper} disabled={disabled} onPick={(picked) => {
          const parsed = readColor(picked, latest.current.h)
          if (parsed) update({ ...parsed, a: latest.current.a }, true)
        }} /> : null}
      </div>
      {swatches?.length ? (
        <div className="fa-color-swatches" role="group" aria-label={t.swatches}>
          {swatches.map((swatch) => {
            const swatchHex = swatchValue(swatch)
            const parsed = parseHex(swatchHex)
            if (!parsed) return null
            const pressed = formatHex(parsed, alpha) === hex
            return (
              <Tooltip key={swatchHex} content={swatchLabel(swatch)}>
                <button
                  type="button"
                  className="fa-color-swatch fa-pressable"
                  aria-label={swatchLabel(swatch)}
                  aria-pressed={pressed}
                  disabled={disabled}
                  style={{ "--_swatch": cssColor(parsed) } as CSSProperties}
                  onClick={() => update(readColor(swatchHex, latest.current.h) ?? parsed, true)}
                />
              </Tooltip>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/** The lightness × chroma area with its thumb (a 2D slider). */
function ColorArea({
  color,
  peak,
  disabled,
  label,
  valueText,
  onChange,
  onCommit,
}: {
  color: Oklch
  peak: number
  disabled: boolean
  label: string
  valueText: (lightness: number, chroma: number) => string
  onChange: (next: Oklch) => void
  onCommit: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  // Repaint when the hue changes; lightness and chroma only move the thumb.
  useLayoutEffect(() => {
    if (canvas.current) paintArea(canvas.current, color.h, peak)
  }, [color.h, peak])

  const fromPointer = (event: PointerEvent<HTMLElement>) => {
    const rect = box.current!.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
    const l = 1 - y
    onChange({ ...color, l, c: Math.min(x * peak, maxChroma(l, color.h)) })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const big = event.shiftKey
    const lStep = big ? 0.1 : 0.01
    const cStep = (peak / 100) * (big ? 10 : 1)
    let { l, c } = color
    switch (event.key) {
      case "ArrowUp":
        l += lStep
        break
      case "ArrowDown":
        l -= lStep
        break
      case "PageUp":
        l += 0.1
        break
      case "PageDown":
        l -= 0.1
        break
      case "ArrowRight":
        c += cStep
        break
      case "ArrowLeft":
        c -= cStep
        break
      case "Home":
        c = 0
        break
      case "End":
        c = maxChroma(l, color.h)
        break
      default:
        return
    }
    event.preventDefault()
    l = Math.min(1, Math.max(0, l))
    c = Math.min(Math.max(0, c), maxChroma(l, color.h))
    onChange({ ...color, l, c })
    onCommit()
  }

  const lightness = Math.round(color.l * 100)
  return (
    <div
      ref={box}
      className="fa-color-area"
      data-disabled={disabled ? "" : undefined}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        dragging.current = true
        fromPointer(event)
        event.currentTarget.querySelector<HTMLElement>(".fa-color-area-thumb")?.focus({ preventScroll: true })
      }}
      onPointerMove={(event) => {
        if (dragging.current) fromPointer(event)
      }}
      onPointerUp={() => {
        if (!dragging.current) return
        dragging.current = false
        onCommit()
      }}
      onPointerCancel={() => {
        dragging.current = false
      }}
    >
      <canvas ref={canvas} className="fa-color-area-canvas" width={256} height={160} aria-hidden />
      <div
        className="fa-color-area-thumb"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={lightness}
        aria-valuetext={valueText(lightness, Number(color.c.toFixed(3)))}
        aria-disabled={disabled || undefined}
        onKeyDown={disabled ? undefined : onKeyDown}
        style={{ "--_x": String(Math.min(1, color.c / peak)), "--_y": String(1 - color.l) } as CSSProperties}
      />
    </div>
  )
}

/** A hue or opacity slider on Base UI's slider, with a gradient track. */
function ColorSlider({
  label,
  value,
  max,
  unit = "°",
  track,
  alpha = false,
  disabled,
  onChange,
  onCommit,
}: {
  label: string
  value: number
  max: number
  unit?: string
  track: string
  alpha?: boolean
  disabled: boolean
  onChange: (value: number) => void
  onCommit: () => void
}) {
  return (
    <BaseSlider.Root
      className="fa-color-slider"
      data-alpha={alpha ? "" : undefined}
      value={value}
      min={0}
      max={max}
      step={1}
      largeStep={10}
      disabled={disabled}
      onValueChange={(next) => onChange(next as number)}
      onValueCommitted={onCommit}
      style={{ "--_track": track, "--_f": String(value / max) } as CSSProperties}
    >
      <BaseSlider.Control className="fa-color-slider-control">
        <BaseSlider.Track className="fa-color-slider-track">
          <BaseSlider.Thumb className="fa-color-slider-thumb" aria-label={label} getAriaValueText={(_, v) => `${v}${unit}`} />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  )
}

/** The hex field: edits freely, commits on Enter or blur, and reverts when the text is not a colour. */
function HexInput({ hex, label, disabled, onCommit }: { hex: string; label: string; disabled: boolean; onCommit: (hex: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const id = useId()
  const finish = () => {
    if (draft !== null && parseHex(draft)) onCommit(draft.startsWith("#") ? draft : `#${draft}`)
    setDraft(null)
  }
  return (
    <Input
      id={id}
      size="sm"
      className="fa-color-hex"
      aria-label={label}
      spellCheck={false}
      autoComplete="off"
      disabled={disabled}
      value={draft ?? hex}
      invalid={draft !== null && !parseHex(draft)}
      onValueChange={(next) => setDraft(String(next))}
      onBlur={finish}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          finish()
        } else if (event.key === "Escape" && draft !== null) {
          event.preventDefault()
          event.stopPropagation()
          setDraft(null)
        }
      }}
    />
  )
}

/** The eyedropper button; renders nothing where the browser has no EyeDropper. */
function EyeDropperButton({ label, disabled, onPick }: { label: string; disabled: boolean; onPick: (hex: string) => void }) {
  const [supported, setSupported] = useState(false)
  useEffect(() => setSupported(eyeDropperSupported()), [])
  if (!supported) return null
  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        size="sm"
        icon={<IconEyedropper />}
        aria-label={label}
        disabled={disabled}
        onClick={async () => {
          try {
            const Dropper = (window as unknown as { EyeDropper: EyeDropperConstructor }).EyeDropper
            onPick((await new Dropper().open()).sRGBHex)
          } catch {
            // Escape cancels the eyedropper; nothing changes.
          }
        }}
      />
    </Tooltip>
  )
}
