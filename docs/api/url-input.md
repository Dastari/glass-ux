# UrlInput

A web address. A missing scheme is added on blur ("https://"); the URL is written canonically.

`import { UrlInput } from "glass-ux/url-field"`

[Live examples](https://dastari.github.io/glass-ux/components/url-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Layout only (width, grid placement). Applied to the control box. |
| clearable | `boolean \| undefined` | false, true | no | — | Show a clear button while the field has a value. |
| defaultScheme | `string \| undefined` | See type | no | — | Added when the text has none. Default "https". |
| defaultValue | `string \| undefined` | See type | no | "" | The initial value when using the component without controlling its state. |
| icon | `ReactNode` | See type | no | — | Leading icon. Pass the icon without a size. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field (inside a Field, set `error` on the Field instead). |
| onClear | `(() => void) \| undefined` | See type | no | — | Called after the clear button empties the field. |
| onRevealedChange | `((revealed: boolean) => void) \| undefined` | See type | no | — | Called when revealed change occurs. The callback type specifies its arguments. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| openable | `boolean \| undefined` | false, true | no | true | An "Open in a new tab" button while the value is a valid URL (default true). |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| requireTld | `boolean \| undefined` | false, true | no | — | Require a host with a dot or "localhost" (default true): rejects "https://intranet". |
| revealed | `boolean \| undefined` | false, true | no | — | Password boxes: whether the value shows as text. Leave unset for the box's own toggle. |
| schemes | `readonly string[] \| undefined` | See type | no | — | Schemes accepted, without the colon. Default ["https", "http"]. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard hint shown while the field is empty and unfocused ("mod+k" → ⌘K / Ctrl K). |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| trailing | `ReactNode` | See type | no | — | Any other trailing content (a status, a small action). |
| unit | `ReactNode` | See type | no | — | Unit after the value ("GB", "ms", "%"). |
| value | `string \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
