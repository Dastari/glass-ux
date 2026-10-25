import { useMessages } from "../../lib/i18n/index.js"
import { coordinatesFieldMessages, getCoordinatesFieldMessages } from "./messages.js"
import { lazy, Suspense, useState, useSyncExternalStore } from "react"
import { IconLocate, IconMapPin } from "../../icons/generated/icons.js"
import { useParsedText } from "../../lib/use-parsed-text.js"
import { Button, useActionFeedback } from "../button/index.js"
import { CopyButton } from "../copy-button/index.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import { Input, type InputProps } from "../input/index.js"
import type { LngLatBox, MapConfig } from "../map/index.js"
import { Popover } from "../popover/index.js"
import { toast } from "../toast/index.js"
import { formatCoordinates, formatDms, parseCoordinates, type LatLng } from "./coordinates.js"

// The map (and MapLibre) load only when the picker opens.
const PinMap = lazy(() => import("../map/pin-map.js").then((module) => ({ default: module.PinMap })))

/** What the control holds while its text cannot be read: NaN, or the out-of-range numbers it read. */
export const UNREADABLE: LatLng = { lat: Number.NaN, lng: Number.NaN }

/** Whether a point is present and both its latitude and longitude are finite numbers. Does not check the ranges. */
export const isReadable = (value: LatLng | null | undefined): value is LatLng => Boolean(value) && Number.isFinite(value?.lat) && Number.isFinite(value?.lng)

const samePoint = (a: LatLng | null, b: LatLng | null) =>
  a === b || (a !== null && b !== null && (Object.is(a.lat, b.lat) || (Number.isNaN(a.lat) && Number.isNaN(b.lat))) && (Object.is(a.lng, b.lng) || (Number.isNaN(a.lng) && Number.isNaN(b.lng))))

function readCoordinates(text: string): LatLng | null {
  if (!text.trim()) return null
  const result = parseCoordinates(text)
  if (result.ok) return result.value
  return result.raw ?? UNREADABLE
}

const showCoordinates = (value: LatLng | null) => (value && Number.isFinite(value.lat) && Number.isFinite(value.lng) && Math.abs(value.lat) <= 90 && Math.abs(value.lng) <= 180 ? formatCoordinates(value) : "")

type LocateState = "unknown" | "available" | "denied" | "unsupported"

/* Whether "Use my location" can work: the API exists, and the site has not been blocked. One
   store for every coordinates field; the permission is asked about once. */
let locateState: LocateState = "unknown"
const locateListeners = new Set<() => void>()
let permissionWatched = false

function subscribeLocate(listener: () => void) {
  locateListeners.add(listener)
  if (!permissionWatched && typeof navigator !== "undefined") {
    permissionWatched = true
    const notify = (next: LocateState) => {
      locateState = next
      for (const each of locateListeners) each()
    }
    if (!("geolocation" in navigator)) {
      notify("unsupported")
    } else {
      notify("available")
      navigator.permissions
        ?.query({ name: "geolocation" as PermissionName })
        .then((status) => {
          const update = () => notify(status.state === "denied" ? "denied" : "available")
          update()
          status.addEventListener("change", update)
        })
        .catch(() => undefined)
    }
  }
  return () => locateListeners.delete(listener)
}

const useLocateState = () =>
  useSyncExternalStore(
    subscribeLocate,
    () => locateState,
    () => "unknown" as LocateState
  )

function getGEOLOCATION_ERRORS(messages: typeof coordinatesFieldMessages.defaults): Record<number, string> { return {
  1: messages.locationIsBlockedForThisSiteAllowIt,
  2: messages.thisDeviceCouldNotWorkOutWhereIt,
  3: messages.findingTheLocationTookTooLongTryAgain,
} }


/** The device's position (rounded like everything else), or a rejection with a message. */
function currentPosition(messages = getCoordinatesFieldMessages()): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const parsed = parseCoordinates(`${position.coords.latitude}, ${position.coords.longitude}`)
        if (parsed.ok) resolve(parsed.value)
        else reject(new Error(parsed.error))
      },
      (error) => reject(new Error(getGEOLOCATION_ERRORS(messages)[error.code] ?? messages.theLocationIsNotAvailable)),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    )
  })
}

export interface CoordinatesInputProps extends Omit<InputProps, "value" | "defaultValue" | "onValueChange" | "type"> {
  /** The point; null when empty. While the text cannot be read it is UNREADABLE (NaN), or the out-of-range numbers. */
  value?: LatLng | null
  defaultValue?: LatLng | null
  /**
   * Called on each keystroke, map pick or located position with the parsed point, null when the
   * text is empty, or UNREADABLE (or the out-of-range numbers read) while it is invalid. Pair with
   * `value` to control it; use `defaultValue` otherwise.
   */
  onValueChange?: (value: LatLng | null) => void
  /** The map for "Pick on map". Without it there is no picker. */
  map?: MapConfig
  /** The area the picker shows when there is no point yet ([west, south, east, north]). */
  mapFallback?: LngLatBox
  /** A "Use my location" button (default true; hidden where the browser has no geolocation). */
  locate?: boolean
  /** A copy button while the value is valid (default true). */
  copyable?: boolean
}

/**
 * Latitude and longitude in one box. Paste anything a person has — decimal degrees, degrees
 * minutes seconds, a Google Maps, OpenStreetMap or Apple Maps link, a geo: URI — and it becomes
 * "-42.88334, 147.32688" when focus leaves. Optional buttons pick the point on a map or use
 * the device's location (the browser asks for permission; a blocked site says how to allow it).
 */
export function CoordinatesInput({
  value,
  defaultValue = null,
  onValueChange,
  map,
  mapFallback,
  locate = true,
  copyable = true,
  placeholder = "-42.88334, 147.32688",
  icon,
  trailing,
  onBlur,
  disabled,
  readOnly,
  ...rest
}: CoordinatesInputProps) {
  const messages = useMessages(coordinatesFieldMessages)

  const text = useParsedText<LatLng | null>({ value, defaultValue, onValueChange, parse: readCoordinates, format: showCoordinates, same: samePoint })
  const current = text.value
  const readable = isReadable(current) && showCoordinates(current) !== ""
  const locateStatus = useLocateState()
  const locating = useActionFeedback()
  const [picking, setPicking] = useState(false)
  const editable = !disabled && !readOnly

  const set = (point: LatLng | null) => text.onTextChange(point ? formatCoordinates(point) : "")

  const useMyLocation = () =>
    void locating.run(
      async () => set(await currentPosition(messages)),
      (error) => toast.danger(messages.locationNotFound, { description: error instanceof Error ? error.message : String(error) })
    )

  return (
    <Input
      autoComplete="off"
      spellCheck={false}
      inputMode="text"
      {...rest}
      disabled={disabled}
      readOnly={readOnly}
      data-identifier=""
      icon={icon === undefined ? <IconMapPin /> : icon}
      placeholder={placeholder}
      value={text.text}
      onValueChange={text.onTextChange}
      onBlur={(event) => {
        text.tidy()
        onBlur?.(event)
      }}
      trailing={
        <>
          {trailing}
          {copyable && readable ? <CopyButton value={formatCoordinates(current)} label={messages.copyCoordinates} className="fa-input-btn" /> : null}
          {map && editable ? (
            <Popover.Root open={picking} onOpenChange={setPicking}>
              <Popover.Trigger render={<Button variant="ghost" size="sm" className="fa-input-btn" icon={<IconMapPin />} aria-label={messages.pickOnMap} />} />
              <Popover.Popup size="lg" align="end" title={messages.pickOnMap} className="fa-coordinates-popup">
                <Suspense fallback={<div className="fa-coordinates-map fa-coordinates-map-loading glass-inset" aria-hidden />}>
                  <PinMap
                    config={map}
                    value={readable ? current : null}
                    onValueChange={(point) => set(point)}
                    label={messages.pickThePointClickTheMapOrDrag}
                    fallback={mapFallback}
                    zoom={15}
                    className="fa-coordinates-map"
                  />
                </Suspense>
                <p className="fa-coordinates-caption">{readable ? formatDms(current) : messages.clickTheMapToPlaceThePinThen}</p>
              </Popover.Popup>
            </Popover.Root>
          ) : null}
          {locate && editable && locateStatus !== "unsupported" && locateStatus !== "unknown" ? (
            <Button
              variant="ghost"
              size="sm"
              className="fa-input-btn"
              icon={<IconLocate />}
              aria-label={messages.useMyLocation}
              status={locating.status}
              disabledReason={locateStatus === "denied" ? messages.locationIsBlockedForThisSiteAllowIt2 : undefined}
              onClick={useMyLocation}
            />
          ) : null}
        </>
      }
    />
  )
}

export interface CoordinatesFieldProps
  extends FieldChrome,
    Omit<CoordinatesInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "onBlur" | "invalid" | "required" | "disabled" | "className"> {
  /** Show the point in degrees, minutes and seconds as the hint when none is given. Default true. */
  describe?: boolean
}

/** CoordinatesInput bound to a `{ lat, lng } | null` form field. Pair it with `coordinatesSchema()`. */
export function CoordinatesField({ label, hint, optional, required, aside, className, disabled, describe = true, ...control }: CoordinatesFieldProps) {
  const { field, error, root } = useBoundField<LatLng | null>()
  const value = field.state.value
  const derived = describe && isReadable(value) && showCoordinates(value) ? formatDms(value) : undefined
  return (
    <Field {...root} label={label} hint={hint ?? derived} optional={optional} required={required} aside={aside} className={className} disabled={disabled}>
      <CoordinatesInput
        {...control}
        name={field.name}
        value={value}
        onValueChange={(next) => field.handleChange(next)}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  )
}
