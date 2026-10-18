# CoordinatesInput

Latitude and longitude in one box. Paste anything a person has — decimal degrees, degrees
minutes seconds, a Google Maps, OpenStreetMap or Apple Maps link, a geo: URI — and it becomes
"-42.88334, 147.32688" when focus leaves. Optional buttons pick the point on a map or use
the device's location (the browser asks for permission; a blocked site says how to allow it).

`import { CoordinatesInput } from "glass-ux/coordinates-field"`

[Live examples](https://dastari.github.io/glass-ux/components/coordinates-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Layout only (width, grid placement). Applied to the control box. |
| clearable | `boolean \| undefined` | false, true | no | — | Show a clear button while the field has a value. Escape also clears a filled field (and is then not propagated, so an enclosing dialog stays open); the button itself is a pointer affordance outside the tab order. |
| copyable | `boolean \| undefined` | false, true | no | true | A copy button while the value is valid (default true). |
| defaultValue | `LatLng \| null \| undefined` | See type | no | null | The initial value when using the component without controlling its state. |
| icon | `ReactNode` | See type | no | — | Leading icon. Pass the icon without a size. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field (inside a Field, set `error` on the Field instead). |
| locate | `boolean \| undefined` | false, true | no | true | A "Use my location" button (default true; hidden where the browser has no geolocation). |
| map | `MapConfig \| undefined` | See type | no | — | The map for "Pick on map". Without it there is no picker. |
| mapFallback | `LngLatBox \| undefined` | See type | no | — | The area the picker shows when there is no point yet ([west, south, east, north]). |
| onClear | `(() => void) \| undefined` | See type | no | — | Called after the clear button or Escape empties the field. |
| onRevealedChange | `((revealed: boolean) => void) \| undefined` | See type | no | — | Called when revealed change occurs. The callback type specifies its arguments. |
| onValueChange | `((value: LatLng \| null) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| revealed | `boolean \| undefined` | false, true | no | — | Password boxes: whether the value shows as text. Leave unset for the box's own toggle. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard hint shown while the field is empty and unfocused ("mod+k" → ⌘K / Ctrl K). |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| trailing | `ReactNode` | See type | no | — | Any other trailing content (a status, a small action). |
| unit | `ReactNode` | See type | no | — | Unit after the value ("GB", "ms", "%"). |
| value | `LatLng \| null \| undefined` | See type | no | — | The point; null when empty. While the text cannot be read it is UNREADABLE (NaN), or the out-of-range numbers. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
