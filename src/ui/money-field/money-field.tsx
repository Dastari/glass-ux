import { Field as BaseField } from "@base-ui/react/field"
import { Select as BaseSelect } from "@base-ui/react/select"
import { useMemo } from "react"
import { IconCheck, IconChevronDown } from "../../icons/generated/icons.js"
import { DirectionPortal } from "../../lib/direction-portal.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { popupContainer } from "../../lib/popup-container.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { NumberField, type NumberFieldProps } from "../number-field/index.js"
import { moneyFieldMessages } from "./messages.js"
import { currencyName, currencySymbol, DEFAULT_CURRENCY, fromMinor, moneyFormat, toMinor } from "./money.js"

export interface MoneyInputProps extends Omit<NumberFieldProps, "format" | "unit" | "leading" | "value" | "defaultValue" | "onValueChange" | "min" | "max" | "step" | "largeStep"> {
  /** Minor units (cents), or 10^-fractionDigits of the currency with `fractionDigits`. Null when empty. */
  value?: number | null
  defaultValue?: number
  /**
   * Called with the amount in minor units (integer cents), or null when the box is empty, as it is
   * typed, stepped or scrubbed, and when the currency changes (see `onCurrencyChange`). Pair with
   * `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (minor: number | null) => void
  /** ISO 4217. Default AUD. With `currencies`, pass it with `onCurrencyChange`, or use `defaultCurrency`. */
  currency?: string
  /** The first currency when `currency` is not controlled. Default AUD. */
  defaultCurrency?: string
  /**
   * The currencies a person can choose from (ISO 4217, in this order). With two or more, a currency
   * picker sits at the start of the box, showing the chosen currency's symbol and code, and the
   * amount is shown without its symbol.
   */
  currencies?: readonly string[]
  /**
   * Called with the currency a person chose. The amount stays the same in major units, rounded to
   * the new currency's decimals (12.50 AUD becomes 12.50 EUR, or 13 JPY), and `onValueChange`
   * reports it in the new currency's minor units in the same event.
   */
  onCurrencyChange?: (currency: string) => void
  /**
   * How the currency is shown: "narrowSymbol" ("$", default), "symbol" ("A$", the locale's
   * unambiguous symbol) or "code" ("AUD"). In the picker, the symbol comes before the code.
   */
  currencyDisplay?: "narrowSymbol" | "symbol" | "code"
  /**
   * Hold amounts finer than the currency's minor unit (unit costs): the value counts
   * 10^-fractionDigits of the currency (4: 525 is $0.0525), shown with 2 to `fractionDigits`
   * decimals for AUD. At least the currency's own decimals. Pair with
   * `moneySchema({ fractionDigits })`, and use the same scale for `min`, `max` and `step`.
   */
  fractionDigits?: number
  /** Bounds in minor units. Default min 0 (no negatives) unless `allowNegative`. */
  min?: number
  /** Upper value or visible-item limit, as specified by the type. */
  max?: number
  /** Allows values below zero when validation also permits them. */
  allowNegative?: boolean
  /** Show the currency code after the amount ("AUD"), for screens with more than one currency. Default false. Not needed with a picker. */
  showCode?: boolean
  /** Step for the arrow keys, in minor units. Default one major unit ($1). */
  step?: number
}

/**
 * An amount of money held in minor units (integer cents), so totals never drift. It shows and
 * reads the locale's currency format ("$1,234.50"), and rounds to the currency's minor digits,
 * or to `fractionDigits` for finer amounts. With `currencies`, a picker at the start of the box
 * changes the currency.
 */
export function MoneyInput({
  value,
  defaultValue,
  onValueChange,
  currency: currencyProp,
  defaultCurrency = DEFAULT_CURRENCY,
  currencies,
  onCurrencyChange,
  currencyDisplay = "narrowSymbol",
  fractionDigits,
  min,
  max,
  allowNegative = false,
  showCode = false,
  step,
  steppers = false,
  disabled,
  readOnly,
  size,
  ...rest
}: MoneyInputProps) {
  const [currency, setCurrency] = useControllable(currencyProp, defaultCurrency, onCurrencyChange)
  const [amount, setAmount] = useControllable<number | null>(value, defaultValue ?? null, onValueChange)
  const picker = (currencies?.length ?? 0) > 1
  const major = (minor: number | null | undefined, code = currency) => (minor === null || minor === undefined ? minor : fromMinor(minor, code, fractionDigits))
  const minor = (next: number, code = currency) => toMinor(next, code, fractionDigits)

  const choose = (next: string) => {
    if (next === currency) return
    const held = major(amount)
    setCurrency(next)
    if (held !== null && held !== undefined) setAmount(minor(held, next))
  }

  // The picker shows the symbol, so the amount drops it; without one, `currencyDisplay` decides.
  const display = picker ? "none" : currencyDisplay === "code" ? "code" : "symbol"
  const format = moneyFormat(currency, display, fractionDigits)
  if (!picker && currencyDisplay === "symbol") format.currencyDisplay = "symbol"
  return (
    <NumberField
      {...rest}
      size={size}
      disabled={disabled}
      readOnly={readOnly}
      value={major(amount)}
      onValueChange={(next) => setAmount(next === null ? null : minor(next))}
      min={min !== undefined ? fromMinor(min, currency, fractionDigits) : allowNegative ? undefined : 0}
      max={max !== undefined ? fromMinor(max, currency, fractionDigits) : undefined}
      step={step !== undefined ? fromMinor(step, currency, fractionDigits) : 1}
      largeStep={step !== undefined ? fromMinor(step * 10, currency, fractionDigits) : 10}
      format={format}
      unit={showCode && !picker ? currency : undefined}
      leading={
        picker ? (
          <CurrencyPicker value={currency} currencies={currencies!} display={currencyDisplay} onValueChange={choose} disabled={disabled} readOnly={readOnly} />
        ) : undefined
      }
      steppers={steppers}
    />
  )
}

/* ── The currency picker inside the box ─────────────────────────────────────── */

interface CurrencyPickerProps {
  value: string
  currencies: readonly string[]
  display: "narrowSymbol" | "symbol" | "code"
  onValueChange: (currency: string) => void
  disabled?: boolean
  readOnly?: boolean
}

function CurrencyPicker({ value, currencies, display, onValueChange, disabled, readOnly }: CurrencyPickerProps) {
  const messages = useMessages(moneyFieldMessages)
  const locale = useLocale()
  const popup = usePopupMetrics()
  const codes = useMemo(() => [...new Set([value, ...currencies].map((code) => code.toUpperCase()))], [value, currencies])
  const symbolOf = (code: string) => (display === "code" ? "" : currencySymbol(code, locale, display === "symbol" ? "symbol" : "narrowSymbol"))
  const items = codes.map((code) => ({ value: code, label: currencyName(code, locale) }))
  // ISO 4217 codes are upper case; one that arrives in lower case is still the same code.
  const code = value.toUpperCase()
  const symbol = symbolOf(code)
  // Its own Field, so the picker never takes the money field's label or id (the amount input has them).
  return (
    <BaseField.Root render={<span />} className="fa-money-currency-field">
      <BaseSelect.Root items={items} value={code} onValueChange={(next) => next && onValueChange(next as string)} disabled={disabled} readOnly={readOnly}>
        <BaseSelect.Trigger className="fa-money-currency fa-pressable" aria-label={messages.currency(currencyName(code, locale), code)}>
          {symbol && symbol !== code ? <span className="fa-money-symbol">{symbol}</span> : null}
          <span className="fa-money-code">{code}</span>
          {readOnly ? null : <IconChevronDown className="fa-money-chevron" />}
        </BaseSelect.Trigger>
        <BaseSelect.Portal render={<DirectionPortal />} container={popupContainer()}>
          <BaseSelect.Positioner className="fa-select-positioner" alignItemWithTrigger={false} align="start" sideOffset={popup.offset} collisionPadding={popup.collisionPadding}>
            <BaseSelect.Popup className="glass-overlay fa-popup fa-select-popup fa-money-currency-popup" aria-label={messages.chooseACurrency}>
              <BaseSelect.List className="fa-select-list">
                {items.map((item) => {
                  const itemSymbol = symbolOf(item.value)
                  return (
                    <BaseSelect.Item key={item.value} value={item.value} label={item.label} className="fa-item fa-select-item">
                      <BaseSelect.ItemText className="fa-item-label">{item.label}</BaseSelect.ItemText>
                      <span className="fa-item-trail fa-money-option-meta">{itemSymbol && itemSymbol !== item.value ? `${item.value} · ${itemSymbol}` : item.value}</span>
                      <span className="fa-select-check" aria-hidden>
                        <BaseSelect.ItemIndicator className="fa-select-indicator">
                          <IconCheck />
                        </BaseSelect.ItemIndicator>
                      </span>
                    </BaseSelect.Item>
                  )
                })}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </BaseField.Root>
  )
}

export interface MoneyFieldProps
  extends FieldChrome,
    Omit<MoneyInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {}

/**
 * MoneyInput bound to a `number | null` (minor units) form field. Pair it with `moneySchema()`.
 * A currency picker changes the field's amount in the new currency's units; keep the currency in
 * its own field with `currency` and `onCurrencyChange`.
 */
export function MoneyField({ label, hint, optional, required, aside, className, disabled, width = "medium", ...control }: MoneyFieldProps) {
  const { field, error, root } = useBoundField<number | null>()
  return (
    <Field {...root} label={label} hint={hint} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <MoneyInput
        {...control}
        width={width}
        name={field.name}
        value={field.state.value ?? null}
        onValueChange={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  )
}
