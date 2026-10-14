/**
 * AddressInput — a street address found by typing, then edited as structured fields.
 *
 * Anatomy (one field per row, R15.2):
 *   lookup     "Start typing an address": suggestions from the geocoder (debounced, stale
 *              requests cancelled, biased to the home region, limited to `countries`), with
 *              the data credit in the list's footer. "Enter manually" (the label row's aside)
 *              opens the fields without a lookup.
 *   fields     Street address · Unit, level or building · Suburb or town · State · Postcode ·
 *              Country — labels follow the country (ZIP code, Province…). A suggestion fills
 *              them all and they stay editable.
 *   map        optional (`map`): a small map with the pin from the lookup. Drag it, nudge it with
 *              the arrow keys or click the map to place it by hand (`pinned`); Reset returns to
 *              the lookup's point. MapLibre loads with the map, not with the field.
 *
 * Value: AddressValue (address.ts). Bound to a form (AddressField), each part is its own form
 * field (`address.line1`, `address.postcode`…), so the schema's messages land on the right
 * row and Save focuses the first one.
 *
 * Privacy: supply a host-owned geocoder adapter. The default adapter calls /api/geocode;
 * the consuming application implements that endpoint and owns its upstream privacy policy.
 */
import { lazy, Suspense, useMemo, useRef, useState, type ReactNode, type Ref } from "react"
import { useField } from "@tanstack/react-form"
import { IconHome, IconMapPin, IconSearch } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Autocomplete } from "../autocomplete/index.js"
import { Button } from "../button/index.js"
import type { OptionItem, OptionSource } from "../combobox/index.js"
import { CopyButton } from "../copy-button/index.js"
import { CountrySelect } from "../country-select/index.js"
import { countryName } from "../country-select/countries.js"
import { Field } from "../field/index.js"
import { useBoundField } from "../form/context.js"
import { firstError } from "../form/validation.js"
import { Input } from "../input/index.js"
import type { LngLatBox, MapConfig } from "../map/index.js"
import { Select } from "../select/index.js"
import {
  ADMIN1_REGIONS,
  addressConvention,
  addressLines,
  emptyAddress,
  formatAddress,
  isEmptyAddress,
  type AddressCountry,
  type AddressRegion,
  type AddressValue,
  type GeoPoint,
} from "./address.js"
import { createServerGeocoder, type AddressSuggestion, type GeocoderAdapter, type GeocoderBias } from "./geocoder.js"

// The map (and MapLibre) load only when an address field shows one.
const PinMap = lazy(() => import("../map/pin-map.js").then((module) => ({ default: module.PinMap })))

/** The default geocoder: Glass UX's server route (Photon behind it). One per page. */
let defaultGeocoder: GeocoderAdapter | null = null
const serverGeocoder = () => (defaultGeocoder ??= createServerGeocoder())

/* ── Parts: how each sub-field reads and writes ─────────────────────────────── */

export interface PartBinding<T> {
  value: T
  /** Called when change occurs. The callback type specifies its arguments. */
  onChange: (value: T) => void
  /** Called when blur occurs. The callback type specifies its arguments. */
  onBlur: () => void
  error?: string
  /** The form field's name ("general.address.line1"), when bound. */
  name?: string
}

/** One binding per part of the address. */
export interface AddressParts {
  line1: PartBinding<string>
  line2: PartBinding<string>
  locality: PartBinding<string>
  /** Geographical region to display. */
  region: PartBinding<AddressRegion>
  postcode: PartBinding<string>
  country: PartBinding<AddressCountry>
}

export type AddressErrors = Partial<Record<keyof AddressParts, string>>

/* ── Shared props ───────────────────────────────────────────────────────────── */

export interface AddressOptions {
  /** Where addresses come from. Default: Glass UX's server route (/api/geocode), Photon behind it. */
  geocoder?: GeocoderAdapter
  /** Lean suggestions towards this point: the workspace's home region. */
  bias?: GeocoderBias
  /** Only suggest addresses in these countries (ISO codes). */
  countries?: readonly string[]
  /** The country of a new address and the one not written on one-line addresses. Default "AU". */
  homeCountry?: string
  /** Show a map with the pin (MapLibre, lazy). Omit for no map. */
  map?: MapConfig
  /** The lookup's placeholder. */
  placeholder?: string
  disabled?: boolean
}

/** A box around the bias point, for a map with no pin yet: about a state at zoom 7. */
function biasBox(bias: GeocoderBias | undefined): LngLatBox | undefined {
  if (!bias) return undefined
  const span = 360 / 2 ** (bias.zoom ?? 7)
  return [bias.lng - span, bias.lat - span / 2, bias.lng + span, bias.lat + span / 2]
}

const sameStreet = (a: AddressValue, b: AddressValue) =>
  a.line1.trim().toLowerCase() === b.line1.trim().toLowerCase() && a.locality.trim().toLowerCase() === b.locality.trim().toLowerCase()

/**
 * The address a suggestion makes, given the current one: a unit typed for the same street stays,
 * and a pin placed by hand on the same address is kept (a new lookup never undoes it).
 */
export function applySuggestion(current: AddressValue, suggestion: AddressSuggestion): AddressValue {
  const next = suggestion.value
  const same = sameStreet(current, next)
  return {
    ...next,
    line2: same ? current.line2 : "",
    location: same && current.pinned ? current.location : next.location,
    pinned: same && current.pinned,
  }
}

/* ── The editor ─────────────────────────────────────────────────────────────── */

interface EditorProps extends AddressOptions {
  value: AddressValue
  /** Called when value change occurs. The callback type specifies its arguments. */
  onValueChange: (value: AddressValue) => void
  parts: AddressParts
  /** The lookup row's label ("Address", "Site address"). */
  label: ReactNode
  /** Supporting text in the field’s reserved message slot. Validation errors take precedence. */
  hint?: ReactNode
  /** Shows the optional-field indication without changing validation. */
  optional?: boolean
  required?: boolean
  /** An error for the address as a whole (no single part). */
  error?: string
  className?: string
}

function AddressEditor({
  value,
  onValueChange,
  parts,
  label,
  hint,
  optional,
  required,
  error,
  geocoder = serverGeocoder(),
  bias,
  countries,
  homeCountry = "AU",
  map,
  placeholder,
  disabled,
  className,
}: EditorProps) {
  const [manual, setManual] = useState(false)
  const [query, setQuery] = useState("")
  const expanded = manual || !isEmptyAddress(value)
  // Every suggestion seen, so a cached result list still resolves to its address.
  const seen = useRef(new Map<string, AddressSuggestion>())
  // The lookup's own point for this address, so a hand-placed pin can be reset.
  const [lookupPoint, setLookupPoint] = useState<GeoPoint | null>(value.pinned ? null : value.location)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const biasKey = bias ? `${bias.lat},${bias.lng},${bias.zoom ?? ""}` : ""
  const source = useMemo<OptionSource<string>>(
    () => ({
      debounceMs: geocoder.debounceMs ?? 300,
      minChars: geocoder.minChars ?? 3,
      search: async (text, { signal }) => {
        const results = await geocoder.search(text, { signal, bias, countries })
        for (const result of results) seen.current.set(result.id, result)
        return results.map(
          (result): OptionItem<string> => ({
            value: result.id,
            label: result.label,
            description: [result.description, result.value.country.code && result.value.country.code !== homeCountry ? result.value.country.name : ""].filter(Boolean).join(", "),
            icon: result.kind === "place" ? <IconHome /> : <IconMapPin />,
            meta: result.kind === "street" ? "Street" : undefined,
          })
        )
      },
    }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the source changes with the geocoder and what it is asked
    [geocoder, biasKey, countries?.join(), homeCountry]
  )

  const pick = (item: OptionItem<string>) => {
    const suggestion = seen.current.get(item.value)
    if (!suggestion) return
    const next = applySuggestion(value, suggestion)
    setLookupPoint(suggestion.value.location)
    onValueChange(next)
    setManual(true)
    // The list's own pick fills the box with the label; the fields hold the address now.
    requestAnimationFrame(() => setQuery(""))
  }

  const country = value.country.code || homeCountry
  const convention = addressConvention(country)
  const regions = ADMIN1_REGIONS[country]
  const attribution = geocoder.attribution

  const setLocation = (point: GeoPoint) => onValueChange({ ...value, location: { lat: point.lat, lng: point.lng }, pinned: true })

  const partField = (part: "line1" | "line2" | "locality" | "postcode", fieldLabel: string, options: { width?: "short" | "medium"; optional?: boolean; autoComplete: string; inputMode?: "numeric" | "text"; ref?: Ref<HTMLInputElement> }) => {
    const binding = parts[part]
    return (
      <Field label={fieldLabel} optional={options.optional} error={binding.error} name={binding.name} disabled={disabled}>
        <Input
          ref={options.ref}
          value={binding.value}
          onValueChange={(next) => binding.onChange(next)}
          onBlur={() => binding.onBlur()}
          width={options.width}
          autoComplete={options.autoComplete}
          inputMode={options.inputMode}
          invalid={Boolean(binding.error)}
          disabled={disabled}
        />
      </Field>
    )
  }

  return (
    <div className={cx("fa-address", className)} data-expanded={expanded ? "" : undefined}>
      <Field
        // Once the parts show, the lookup row is for finding another address; the parts carry the value.
        label={expanded ? "Find a different address" : label}
        hint={hint}
        optional={optional}
        required={required}
        error={error}
        disabled={disabled}
        aside={
          expanded || disabled ? undefined : (
            <Button
              variant="ghost"
              size="xs"
              className="fa-address-manual"
              onClick={() => {
                setManual(true)
                if (!value.country.code) onValueChange({ ...value, country: { code: homeCountry, name: countryName(homeCountry) } })
                requestAnimationFrame(() => firstFieldRef.current?.focus())
              }}
            >
              Enter manually
            </Button>
          )
        }
      >
        <Autocomplete<string>
          source={source}
          value={query}
          onValueChange={setQuery}
          onPick={pick}
          icon={<IconSearch />}
          placeholder={placeholder ?? "Start typing an address"}
          empty={(text) => `No addresses match “${text.trim()}”`}
          footer={
            <>
              {attribution.providerHref ? (
                <a href={attribution.providerHref} target="_blank" rel="noreferrer">
                  {attribution.provider}
                </a>
              ) : (
                attribution.provider
              )}
              <span aria-hidden>·</span>
              {attribution.dataHref ? (
                <a href={attribution.dataHref} target="_blank" rel="noreferrer">
                  {attribution.data}
                </a>
              ) : (
                attribution.data
              )}
            </>
          }
          disabled={disabled}
          invalid={Boolean(error)}
        />
      </Field>

      {expanded ? (
        <>
          {partField("line1", "Street address", { autoComplete: "address-line1", ref: firstFieldRef })}
          {partField("line2", "Unit, level or building", { optional: true, width: "medium", autoComplete: "address-line2" })}
          {partField("locality", convention.locality, { width: "medium", autoComplete: "address-level2" })}
          <Field label={convention.region} error={parts.region.error} name={parts.region.name} disabled={disabled} nativeLabel={!regions}>
            {regions ? (
              <Select<string>
                options={regions.map(([code, name]) => ({ value: code, label: name }))}
                value={value.region.code || null}
                onValueChange={(code) => {
                  const match = regions.find(([regionCode]) => regionCode === code)
                  parts.region.onChange(match ? { code: match[0], name: match[1] } : { code: "", name: "" })
                }}
                onBlur={() => parts.region.onBlur()}
                placeholder={`Choose a ${convention.region.toLowerCase().split(" or ")[0]}`}
                width="medium"
                invalid={Boolean(parts.region.error)}
                disabled={disabled}
              />
            ) : (
              <Input
                value={value.region.name}
                onValueChange={(name) => parts.region.onChange({ code: "", name })}
                onBlur={() => parts.region.onBlur()}
                width="medium"
                autoComplete="address-level1"
                invalid={Boolean(parts.region.error)}
                disabled={disabled}
              />
            )}
          </Field>
          {partField("postcode", convention.postcode, { width: "short", autoComplete: "postal-code", inputMode: country === "AU" || country === "NZ" ? "numeric" : "text" })}
          <Field label="Country" error={parts.country.error} name={parts.country.name} disabled={disabled}>
            <CountrySelect
              value={value.country.code || null}
              onValueChange={(code) => {
                const nextCountry = code ? { code, name: countryName(code) } : { code: "", name: "" }
                // A region from another country's list no longer applies.
                const keepRegion = !code || !ADMIN1_REGIONS[code] || ADMIN1_REGIONS[code]?.some(([regionCode]) => regionCode === value.region.code)
                onValueChange({ ...value, country: nextCountry, region: keepRegion ? value.region : { code: "", name: "" } })
              }}
              onBlur={() => parts.country.onBlur()}
              priority={[homeCountry, "AU", "NZ"].filter((code, index, list) => list.indexOf(code) === index)}
              width="medium"
              invalid={Boolean(parts.country.error)}
              disabled={disabled}
            />
          </Field>
          {map ? (
            <AddressMap
              value={value}
              map={map}
              fallback={biasBox(bias)}
              lookupPoint={lookupPoint}
              onPlace={setLocation}
              onReset={() => onValueChange({ ...value, location: lookupPoint, pinned: false })}
              disabled={disabled}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/* ── The map row ────────────────────────────────────────────────────────────── */

function AddressMap({
  value,
  map,
  fallback,
  lookupPoint,
  onPlace,
  onReset,
  disabled,
}: {
  value: AddressValue
  map: MapConfig
  fallback?: LngLatBox
  lookupPoint: GeoPoint | null
  /** Called when place occurs. The callback type specifies its arguments. */
  onPlace: (point: GeoPoint) => void
  /** Called when reset occurs. The callback type specifies its arguments. */
  onReset: () => void
  disabled?: boolean
}) {
  const where = value.location ? `${value.location.lat.toFixed(5)}, ${value.location.lng.toFixed(5)}` : ""
  const caption = !value.location
    ? "No position yet: choose a suggestion, or click the map to place the pin."
    : value.pinned
      ? `${where} · placed by hand`
      : `${where} · from the address. Drag the pin to adjust it.`
  return (
    <div className="fa-address-map">
      <span className="fa-label fa-address-map-label">
        Position
      </span>
      <Suspense fallback={<div className="fa-address-map-well glass-inset" aria-hidden />}>
        <PinMap
          config={map}
          value={value.location}
          onValueChange={disabled ? undefined : onPlace}
          label={`Map of ${formatAddress(value) || "the address"}`}
          fallback={fallback}
          className="fa-address-map-well"
        />
      </Suspense>
      <div className="fa-address-map-caption">
        <span className="fa-address-map-text">{caption}</span>
        {value.pinned && !disabled ? (
          <Button variant="ghost" size="xs" onClick={onReset} disabledReason={lookupPoint ? undefined : "Choose the address from the lookup first"}>
            Reset pin
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/* ── Standalone ─────────────────────────────────────────────────────────────── */

export interface AddressInputProps extends AddressOptions {
  value?: AddressValue
  defaultValue?: AddressValue
  /** Called when value change occurs. The callback type specifies its arguments. */
  onValueChange?: (value: AddressValue) => void
  /** The lookup's label. */
  label: ReactNode
  /** Supporting text in the field’s reserved message slot. Validation errors take precedence. */
  hint?: ReactNode
  /** Shows the optional-field indication without changing validation. */
  optional?: boolean
  required?: boolean
  /** Messages per part, for a form you manage yourself. */
  errors?: AddressErrors
  className?: string
}

/**
 * The address editor on its own (controlled or not). Inside a TanStack form, use AddressField
 * instead: it gives every part its own form field.
 */
export function AddressInput({ value, defaultValue, onValueChange, errors, homeCountry = "AU", ...rest }: AddressInputProps) {
  const [inner, setInner] = useState<AddressValue>(() => defaultValue ?? emptyAddress({ code: homeCountry, name: countryName(homeCountry) }))
  const current = value ?? inner
  const change = (next: AddressValue) => {
    if (value === undefined) setInner(next)
    onValueChange?.(next)
  }
  const binding = <K extends keyof AddressParts>(part: K): AddressParts[K] =>
    ({
      value: current[part],
      onChange: (next: AddressValue[K]) => change({ ...current, [part]: next }),
      onBlur: () => undefined,
      error: errors?.[part],
    }) as unknown as AddressParts[K]
  const parts: AddressParts = {
    line1: binding("line1"),
    line2: binding("line2"),
    locality: binding("locality"),
    region: binding("region"),
    postcode: binding("postcode"),
    country: binding("country"),
  }
  return <AddressEditor {...rest} homeCountry={homeCountry} value={current} onValueChange={change} parts={parts} />
}

/* ── Bound to a form ────────────────────────────────────────────────────────── */

interface PartApi<T> {
  name: string
  /** Controlled view state, including loading, empty and error states. */
  state: { value: T; meta: { errors: unknown[] } }
  handleChange: (value: T) => void
  handleBlur: () => void
}

/** One part of the bound address as its own form field. */
function usePart<T>(form: unknown, name: string): PartBinding<T> & { api: PartApi<T> } {
  const api = useField({ form: form as never, name: name as never }) as unknown as PartApi<T>
  return {
    api,
    name,
    value: api.state.value,
    onChange: (next) => api.handleChange(next),
    onBlur: () => api.handleBlur(),
    error: firstError(api.state.meta.errors),
  }
}

export interface AddressFieldProps extends AddressOptions {
  /** The lookup's label ("Address", "Site address"). */
  label: ReactNode
  /** Supporting text in the field’s reserved message slot. Validation errors take precedence. */
  hint?: ReactNode
  /** Shows the optional-field indication without changing validation. */
  optional?: boolean
  required?: boolean
  className?: string
}

/**
 * AddressInput bound to an AddressValue form field. Each part is its own form field
 * (`<name>.line1`…), so `addressSchema()`'s messages land on the right row. Pair it with
 * `addressSchema()`.
 */
export function AddressField({ label, hint, optional, required, className, ...options }: AddressFieldProps) {
  const { field, error } = useBoundField<AddressValue>()
  const form = field.form
  const base = field.name
  const line1 = usePart<string>(form, `${base}.line1`)
  const line2 = usePart<string>(form, `${base}.line2`)
  const locality = usePart<string>(form, `${base}.locality`)
  const region = usePart<AddressRegion>(form, `${base}.region`)
  const postcode = usePart<string>(form, `${base}.postcode`)
  const country = usePart<AddressCountry>(form, `${base}.country`)
  const parts: AddressParts = { line1, line2, locality, region, postcode, country }
  const value = field.state.value ?? emptyAddress()

  const change = (next: AddressValue) => {
    field.handleChange(next)
    // Parts showing an error re-check against the filled address at once.
    for (const part of [line1, line2, locality, region, postcode, country]) {
      if (part.error) void field.form.validateField(part.name as never, "change")
    }
  }

  return <AddressEditor {...options} label={label} hint={hint} optional={optional} required={required} error={error} className={className} value={value} onValueChange={change} parts={parts} />
}

/* ── Read-only ──────────────────────────────────────────────────────────────── */

export interface AddressViewProps {
  value: AddressValue
  /** The country left off the postal block. Default "AU". */
  homeCountry?: string
  /** A small map with the pin, when the address has a position. */
  map?: MapConfig
  /** A copy button for the one-line address. Default true. */
  copyable?: boolean
  /** Shown when the address is empty. */
  empty?: ReactNode
  className?: string
}

/**
 * An address to read, not edit: the postal block in a recessed well with Copy, and optionally
 * its map. Put it in a Field for a label ("Address") and a hint ("Change it in …").
 */
export function AddressView({ value, homeCountry = "AU", map, copyable = true, empty = "No address yet", className }: AddressViewProps) {
  const lines = addressLines(value, homeCountry)
  const blank = isEmptyAddress(value)
  return (
    <div className={cx("fa-address-view", className)}>
      <div className="fa-control fa-address-view-text" data-readonly="">
        <address className="fa-address-view-lines" data-empty={blank ? "" : undefined}>
          {blank ? empty : lines.map((line) => <span key={line}>{line}</span>)}
        </address>
        {copyable && !blank ? <CopyButton value={formatAddress(value, homeCountry)} label="Copy address" className="fa-input-btn" /> : null}
      </div>
      {map && value.location ? (
        <Suspense fallback={<div className="fa-address-map-well glass-inset" aria-hidden />}>
          <PinMap config={map} value={value.location} label={`Map of ${formatAddress(value, homeCountry)}`} className="fa-address-map-well" />
        </Suspense>
      ) : null}
    </div>
  )
}
