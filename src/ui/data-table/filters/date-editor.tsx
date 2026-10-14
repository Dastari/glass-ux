import { useState, type FormEvent } from "react"
import { DateField, DateRangeField } from "../../date-picker/index.js"
import { isIsoDate, type IsoDate } from "../../date-picker/calendar-date.js"
import { Radio, RadioGroup } from "../../radio/index.js"
import { EditorFooter, type EditorProps } from "./editor-parts.js"
import { isPreset, samePreset } from "./semantics.js"
import { DATE_OP_LABELS, presetLabel } from "./summary.js"
import type { DateFilterSpec, DateFilterValue, DatePresetValue, DateRangeOp, EmptyOp } from "./types.js"

const presetKey = (preset: DatePresetValue) => ("days" in preset ? `${preset.op}:${preset.days}` : preset.op)

function keyOf(value: DateFilterValue | undefined): string | undefined {
  if (!value) return undefined
  return isPreset(value) ? presetKey(value) : value.op
}

const dayOf = (text: string | undefined): IsoDate | null => (text && isIsoDate(text.slice(0, 10)) ? text.slice(0, 10) : null)

/**
 * Presets first (they apply as you pick), then before, on or after, and between with a
 * date field or a range field. A picked or typed day applies at once; Enter also closes.
 */
export function DateEditor({ spec, label, value, onChange, onCommit }: EditorProps<DateFilterSpec, DateFilterValue>) {
  const [mode, setMode] = useState<string | undefined>(keyOf(value))
  const [at, setAt] = useState<IsoDate | null>(value && "at" in value ? dayOf(value.at) : null)
  const [range, setRange] = useState<{ start: IsoDate; end: IsoDate } | null>(
    value && value.op === "between" && dayOf(value.start) && dayOf(value.end) ? { start: dayOf(value.start)!, end: dayOf(value.end)! } : null
  )

  // A preset from a shared link that this column does not list is still shown, ticked.
  const presets = value && isPreset(value) && !spec.presets.some((preset) => samePreset(preset, value)) ? [value, ...spec.presets] : spec.presets
  const ranges = spec.operators.filter((op): op is DateRangeOp => op === "before" || op === "after" || op === "between")
  const empties = spec.operators.filter((op): op is EmptyOp => op === "isEmpty" || op === "isNotEmpty")

  const choose = (key: string) => {
    setMode(key)
    const preset = presets.find((entry) => presetKey(entry) === key)
    if (preset) return onChange(preset)
    if (key === "isEmpty" || key === "isNotEmpty") return onChange({ op: key })
    if ((key === "before" || key === "after") && at) return onChange({ op: key, at })
    if (key === "between" && range) return onChange({ op: "between", ...range })
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onCommit(value)
  }

  return (
    <form className="fa-dt-filter-form" onSubmit={submit} noValidate>
      <RadioGroup<string> value={mode ?? ""} onValueChange={(next) => choose(String(next))} aria-label={label} className="fa-dt-filter-date-options">
        {presets.map((preset) => (
          <Radio key={presetKey(preset)} value={presetKey(preset)} size="sm" label={presetLabel(preset)} />
        ))}
        {[...ranges, ...empties].map((op, index) => (
          <Radio key={op} value={op} size="sm" label={DATE_OP_LABELS[op]} className={index === 0 ? "fa-dt-filter-date-ranges" : undefined} />
        ))}
      </RadioGroup>
      {mode === "before" || mode === "after" ? (
        <DateField
          size="sm"
          width="full"
          value={at}
          aria-label={`${label} ${DATE_OP_LABELS[mode].toLowerCase()}`}
          onValueChange={(next) => {
            setAt(next)
            if (next) onChange({ op: mode, at: next })
            else if (value?.op === mode) onChange(undefined)
          }}
        />
      ) : null}
      {mode === "between" ? (
        <DateRangeField
          size="sm"
          width="full"
          value={range}
          aria-label={`${label} between`}
          startLabel={`${label} from`}
          endLabel={`${label} to`}
          onValueChange={(next) => {
            setRange(next)
            if (next) onChange({ op: "between", ...next })
            else if (value?.op === "between") onChange(undefined)
          }}
        />
      ) : null}
      <EditorFooter applied={value !== undefined} onClear={() => onCommit(undefined)} />
    </form>
  )
}
