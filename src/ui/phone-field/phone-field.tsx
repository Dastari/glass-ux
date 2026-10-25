import { DirectionPortal } from "../../lib/direction-portal.js"
import { useMessages } from "../../lib/i18n/index.js"
import { phoneFieldMessages } from "./messages.js"
import { Combobox as BaseCombobox } from "@base-ui/react/combobox"
import { Input as BaseInput } from "@base-ui/react/input"
import { useMemo, useRef, useState, type ClipboardEvent, type FocusEvent, type MouseEvent, type Ref } from "react"
import { Field as BaseField } from "@base-ui/react/field"
import { IconCheck, IconChevronDown, IconSearch } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { useControllable } from "../../lib/use-controllable.js"
import { CopyButton } from "../copy-button/index.js"
import { matches, OptionRow } from "../combobox/index.js"
import { callingCodeOf, listCountries, MAIN_COUNTRY_FOR_CALLING_CODE, type Country } from "../country-select/countries.js"
import { CountryFlag } from "../country-select/flag.js"
import { Field, widthAttr, type FieldWidth } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import {
  countryOfValue,
  examplePhone,
  isInternationalText,
  joinPhoneValue,
  parsePhone,
  splitPhoneValue,
  usePhoneLibrary,
  type PhoneDisplay,
  type PhoneKind,
  type PhoneLib,
} from "./phone.js"
import { popupContainer } from "../../lib/popup-container.js"

export interface PhoneInputProps {
  /** E.164 ("+61412345678"), with ";ext=204" for an extension. While the text cannot be read, the text as typed. */
  value?: string
  defaultValue?: string
  /**
   * Called on each keystroke, paste, country or extension change with the E.164 value (";ext="
   * appended when there is one), or the text as typed while it cannot be read. Pair with `value`
   * to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (value: string) => void
  /** The country of national numbers until the person picks another: the workspace's own. Default "AU". */
  defaultCountry?: string
  /** Mobile numbers only (placeholder and icon; MobileField and mobileSchema check the type). */
  kind?: PhoneKind
  /** How the number shows once focus leaves: national "0412 345 678" (default) or international "+61 412 345 678". */
  display?: PhoneDisplay
  /** An extension box for desk phones ("ext. 204"). Default false. */
  extension?: boolean
  /** Only these countries in the picker. */
  countries?: readonly string[]
  /** Countries listed first in the picker. Default: the default country, then AU and NZ. */
  priority?: readonly string[]
  /** Flags in the picker and the box (SVG, lazy). Default true. */
  flags?: boolean
  /** A copy button for the E.164 value while it is valid. Default true. */
  copyable?: boolean
  size?: "sm" | "md" | "lg"
  /** Content width (R15.6). Default medium. */
  width?: FieldWidth
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Marks the control invalid. Pair it with an accessible validation message. */
  invalid?: boolean
  name?: string
  id?: string
  /** Called when the number input loses focus, after its text is reformatted. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  /** Layout only. */
  className?: string
  ref?: Ref<HTMLInputElement>
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
}

interface Display {
  country: string
  /** Plain text rendered or copied by the component. */
  text: string
  extension: string
}

/** What to show for a stored value: its country, its number in the display style, its extension. */
function displayOf(lib: PhoneLib | null, value: string, fallbackCountry: string, display: PhoneDisplay): Display {
  const { number, extension } = splitPhoneValue(value)
  const country = countryOfValue(lib, number) ?? fallbackCountry
  if (!lib || !number) return { country, text: number, extension }
  const parsed = parsePhone(lib, number, country)
  if (!parsed) return { country, text: number, extension }
  return { country, text: display === "national" ? parsed.national : parsed.international, extension }
}

/** Search a country by name, ISO code or calling code ("aus", "NZ", "+64", "64"). */
const countryMatches = (country: Country, query: string) => {
  const q = query.trim()
  if (!q) return true
  const digits = q.replace(/^\+/, "")
  if (/^\d+$/.test(digits)) return country.callingCode.startsWith(digits)
  return matches(`${country.name} ${country.code}`, q)
}

/**
 * The countries a query finds, best first: for a calling code, the exact code before longer
 * ones and the code's main country (+44 the UK, +1 the US) before the others that share it.
 */
export function searchCountries(list: readonly Country[], query: string): Country[] {
  const found = list.filter((country) => countryMatches(country, query))
  const digits = query.trim().replace(/^\+/, "")
  if (!/^\d+$/.test(digits)) return found
  const rank = (country: Country) => (country.callingCode === digits ? 0 : 2) + (MAIN_COUNTRY_FOR_CALLING_CODE[country.callingCode] === country.code ? 0 : 1)
  return found.toSorted((a, b) => rank(a) - rank(b))
}

/**
 * A phone number with its country. The country picker (flag, ISO code, +calling code, search
 * by any of them) sets how national numbers are read; typing or pasting an international
 * number ("+64 21 123 4567", "0011 64…") switches it. The value is E.164; the box shows the
 * number in national or international form once focus leaves, never reformatting under the
 * caret. libphonenumber-js loads with the first phone control.
 */
export function PhoneInput({
  value,
  defaultValue = "",
  onValueChange,
  defaultCountry = "AU",
  kind = "any",
  display = "national",
  extension = false,
  countries,
  priority,
  flags = true,
  copyable = true,
  size = "md",
  width = "medium",
  placeholder,
  disabled,
  readOnly,
  required,
  invalid,
  name,
  id,
  onBlur,
  className,
  ref,
  "aria-label": ariaLabel,
}: PhoneInputProps) {
  const messages = useMessages(phoneFieldMessages)

  const lib = usePhoneLibrary()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [focused, setFocused] = useState(false)
  const [current, setCurrent] = useControllable(value, defaultValue, onValueChange)
  const [view, setView] = useState<Display>(() => displayOf(lib, current, defaultCountry, display))
  // The value the view shows, and whether it was laid out with the library.
  const [shown, setShown] = useState({ value: current, withLibrary: Boolean(lib) })
  if (shown.value !== current) {
    // Changed from outside (a reset, another control): show the new value.
    setView(displayOf(lib, current, view.country || defaultCountry, display))
    setShown({ value: current, withLibrary: Boolean(lib) })
  } else if (lib && !shown.withLibrary) {
    // The library arrived: format the number, unless the person is typing in it.
    if (!focused) setView(displayOf(lib, current, view.country || defaultCountry, display))
    setShown({ value: current, withLibrary: true })
  }

  const emit = (next: string) => {
    setShown({ value: next, withLibrary: Boolean(lib) })
    setCurrent(next)
  }

  /** The value for a text, read in a country: E.164 when it parses, else the text as typed. */
  const valueFor = (text: string, country: string, ext: string) => {
    const parsed = lib ? parsePhone(lib, text, country) : null
    const raw = text.trim().replace(/^(0011|00)\s*/, "+")
    // Before the library loads, an international number is still stored as E.164.
    const number = parsed ? parsed.e164 : raw.startsWith("+") ? `+${raw.slice(1).replace(/[\s().-]/g, "")}` : text.trim()
    return joinPhoneValue(number, ext || parsed?.extension || "")
  }

  const setText = (text: string) => {
    let country = view.country
    // An international number names its own country: follow it in the picker.
    if (lib && isInternationalText(text)) {
      const found = parsePhone(lib, text, undefined)?.country
      if (found && found !== country) country = found
    }
    setView({ ...view, country, text })
    emit(valueFor(text, country, view.extension))
  }

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text/plain")
    if (!lib || !isInternationalText(pasted)) return
    const parsed = parsePhone(lib, pasted, undefined)
    if (!parsed?.country) return
    // A whole international number replaces the box: switch the country and show it in the display style.
    event.preventDefault()
    const ext = parsed.extension || view.extension
    setView({ country: parsed.country, text: display === "national" ? parsed.national : parsed.international, extension: ext })
    emit(joinPhoneValue(parsed.e164, ext))
  }

  const tidy = () => {
    if (!lib) return
    const parsed = parsePhone(lib, view.text, view.country)
    if (!parsed) return
    const country = parsed.country ?? view.country
    const text = display === "national" && country === view.country ? parsed.national : parsed.international
    if (text !== view.text || country !== view.country) setView({ ...view, country, text })
  }

  const chooseCountry = (country: string | null) => {
    if (!country || country === view.country) return
    // A national number is re-read in the new country; an international one keeps its digits.
    let text = view.text
    if (lib && isInternationalText(text)) {
      const parsed = parsePhone(lib, text, undefined)
      if (parsed) text = parsed.national.replace(/^0/, "")
    }
    setView({ ...view, country, text })
    emit(valueFor(text, country, view.extension))
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const setExtension = (ext: string) => {
    const digits = ext.replace(/\D/g, "")
    setView({ ...view, extension: digits })
    emit(joinPhoneValue(splitPhoneValue(current).number, digits))
  }

  const focusInput = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("input, button, a")) return
    event.preventDefault()
    inputRef.current?.focus()
  }

  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }

  const { number } = splitPhoneValue(current)
  const valid = lib && number.startsWith("+") ? parsePhone(lib, number, undefined)?.valid : false
  const example = lib ? examplePhone(lib, view.country, display) : undefined

  return (
    // The frame is a size container: in a narrow box the calling code, then the ISO code, give way to the number.
    <div className={cx("fa-phone-frame", className)} data-width={widthAttr(width)}>
    {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- forwards clicks on the box to the number input */}
    <div
      className="fa-control fa-input fa-phone"
      data-size={size}
      data-filled={view.text ? "" : undefined}
      data-readonly={readOnly ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      onMouseDown={focusInput}
    >
      <CountryPicker
        value={view.country}
        onValueChange={chooseCountry}
        countries={countries}
        priority={priority ?? [defaultCountry, "AU", "NZ"]}
        flags={flags}
        disabled={disabled}
        readOnly={readOnly}
      />
      <BaseInput
        ref={setRefs}
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete={kind === "mobile" ? "mobile tel" : "tel"}
        className="fa-control-input fa-phone-number"
        data-identifier=""
        value={view.text}
        onValueChange={setText}
        onPaste={onPaste}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          setFocused(false)
          tidy()
          onBlur?.(event)
        }}
        placeholder={placeholder ?? example}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
      />
      {extension ? (
        <span className="fa-phone-ext">
          <span className="fa-phone-ext-label" aria-hidden>
            {messages.ext} </span>
          <input
            className="fa-phone-ext-input"
            aria-label={messages.extension}
            inputMode="numeric"
            autoComplete="tel-extension"
            maxLength={8}
            value={view.extension}
            onChange={(event) => setExtension(event.target.value)}
            disabled={disabled}
            readOnly={readOnly}
          />
        </span>
      ) : null}
      {copyable && valid ? <CopyButton value={current} label={messages.copyNumber} className="fa-input-btn" /> : null}
    </div>
    </div>
  )
}

/* ── The country picker inside the box ──────────────────────────────────────── */

interface CountryPickerProps {
  value: string
  /** Called with the chosen ISO 3166-1 alpha-2 code, or null when the selection is cleared. */
  onValueChange: (country: string | null) => void
  countries?: readonly string[]
  priority: readonly string[]
  flags: boolean
  disabled?: boolean
  readOnly?: boolean
}

function CountryPicker({ value, onValueChange, countries, priority, flags, disabled, readOnly }: CountryPickerProps) {
  const messages = useMessages(phoneFieldMessages)

  const [query, setQuery] = useState("")
  const popup = usePopupMetrics()
  const locale = useLocale()
  const list = useMemo(
    () => listCountries({ phone: true, only: countries, priority: priority.filter((code, index) => priority.indexOf(code) === index), locale }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- identity follows the codes
    [countries?.join(), priority.join(), locale]
  )
  const chosen = list.find((country) => country.code === value)
  const filtered = useMemo(() => searchCountries(list, query), [list, query])
  const calling = callingCodeOf(value)
  // Its own Field, so the picker never takes the phone field's label or id (the number input has them).
  return (
    <BaseField.Root render={<span />} className="fa-phone-country-field">
    <BaseCombobox.Root
      items={list}
      value={chosen ?? null}
      onValueChange={(next) => {
        onValueChange((next as Country | null)?.code ?? null)
        setQuery("")
      }}
      onInputValueChange={setQuery}
      itemToStringLabel={(country: Country) => country.name}
      isItemEqualToValue={(a: Country, b: Country) => a.code === b.code}
      filteredItems={filtered}
      filter={null}
      disabled={disabled}
      readOnly={readOnly}
      autoHighlight
    >
      <BaseCombobox.Trigger
        className="fa-phone-country fa-pressable"
        aria-label={messages.country(chosen?.name ?? value, calling ? ` (+${calling})` : "")}
        disabled={disabled}
      >
        {flags ? <CountryFlag code={value} /> : null}
        <span className="fa-phone-country-code">{value}</span>
        {calling ? <span className="fa-phone-calling">+{calling}</span> : null}
        {readOnly ? null : <IconChevronDown className="fa-phone-chevron" />}
      </BaseCombobox.Trigger>
      <BaseCombobox.Portal render={<DirectionPortal />} container={popupContainer()}>
        <BaseCombobox.Positioner className="fa-select-positioner" align="start" sideOffset={popup.offset} collisionPadding={popup.collisionPadding}>
          <BaseCombobox.Popup className="glass-overlay fa-popup fa-phone-country-popup" aria-label={messages.chooseACountry}>
            <div className="fa-control fa-input fa-phone-country-search" data-size="sm">
              <IconSearch />
              <BaseCombobox.Input className="fa-control-input" placeholder={messages.countryOrCode} aria-label={messages.searchCountries} />
            </div>
            <BaseCombobox.Status className="sr-only">{query.trim() ? messages.countryCount(filtered.length, locale) : ""}</BaseCombobox.Status>
            <BaseCombobox.Empty className="fa-combobox-empty-slot">
              <div className="fa-combobox-empty">{messages.noCountryMatches(query.trim())}</div>
            </BaseCombobox.Empty>
            <BaseCombobox.List className="fa-select-list fa-phone-country-list">
              {(country: Country) => (
                <BaseCombobox.Item key={country.code} value={country} className="fa-item fa-select-item fa-option">
                  <OptionRow
                    item={{ value: country.code, label: country.name, icon: flags ? <CountryFlag code={country.code} /> : undefined, meta: `${country.code} · +${country.callingCode}` }}
                    query={query}
                    check={
                      <BaseCombobox.ItemIndicator className="fa-select-indicator">
                        <IconCheck />
                      </BaseCombobox.ItemIndicator>
                    }
                  />
                </BaseCombobox.Item>
              )}
            </BaseCombobox.List>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
    </BaseField.Root>
  )
}

/* ── Bound fields ───────────────────────────────────────────────────────────── */

export interface PhoneFieldProps extends FieldChrome, Omit<PhoneInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {}

/** PhoneInput bound to a string form field (E.164). Pair it with `phoneSchema()`. */
export function PhoneField({ label, hint, optional, required, aside, className, disabled, ...control }: PhoneFieldProps) {
  const { field, error, root } = useBoundField<string>()
  return (
    <Field {...root} label={label} hint={hint} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <PhoneInput
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

export interface MobileFieldProps extends Omit<PhoneFieldProps, "kind" | "extension"> {}

/** A mobile number (no extension). Pair it with `mobileSchema()`, which refuses landlines. */
export function MobileField(props: MobileFieldProps) {
  return <PhoneField {...props} kind="mobile" extension={false} />
}
