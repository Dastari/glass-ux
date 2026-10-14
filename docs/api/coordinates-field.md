# CoordinatesField

CoordinatesInput bound to a `{ lat, lng } | null` form field. Pair it with `coordinatesSchema()`.

`import { CoordinatesField } from "glass-ux/coordinates-field"`

[Live examples](https://dastari.github.io/glass-ux/components/coordinates-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aside | `ReactNode` | false, true | no | — | Right side of the label row: a live value readout or a small link. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| clearable | `boolean \| undefined` | false, true | no | — | Show a clear button while the field has a value. |
| copyable | `boolean \| undefined` | false, true | no | — | A copy button while the value is valid (default true). |
| describe | `boolean \| undefined` | false, true | no | true | Show the point in degrees, minutes and seconds as the hint when none is given. Default true. |
| hint | `ReactNode` | false, true | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| icon | `ReactNode` | false, true | no | — | Leading icon. Pass the icon without a size. |
| label | `ReactNode` | false, true | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| locate | `boolean \| undefined` | false, true | no | — | A "Use my location" button (default true; hidden where the browser has no geolocation). |
| map | `MapConfig \| undefined` | See type | no | — | The map for "Pick on map". Without it there is no picker. |
| mapFallback | `LngLatBox \| undefined` | See type | no | — | The area the picker shows when there is no point yet ([west, south, east, north]). |
| onClear | `(() => void) \| undefined` | See type | no | — | Called after the clear button empties the field. |
| onRevealedChange | `((revealed: boolean) => void) \| undefined` | See type | no | — | Called when revealed change occurs. The callback type specifies its arguments. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| revealed | `boolean \| undefined` | false, true | no | — | Password boxes: whether the value shows as text. Leave unset for the box's own toggle. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard hint shown while the field is empty and unfocused ("mod+k" → ⌘K / Ctrl K). |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| trailing | `ReactNode` | false, true | no | — | Any other trailing content (a status, a small action). |
| unit | `ReactNode` | false, true | no | — | Unit after the value ("GB", "ms", "%"). |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
