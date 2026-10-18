# UrlField

UrlInput bound to a string form field. Pair it with `urlSchema()`.

`import { UrlField } from "glass-ux/url-field"`

[Live examples](https://dastari.github.io/glass-ux/components/url-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| clearable | `boolean \| undefined` | false, true | no | — | Show a clear button while the field has a value. Escape also clears a filled field (and is then not propagated, so an enclosing dialog stays open); the button itself is a pointer affordance outside the tab order. |
| defaultScheme | `string \| undefined` | See type | no | — | Added when the text has none. Default "https". |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| icon | `ReactNode` | See type | no | — | Leading icon. Pass the icon without a size. |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| onClear | `(() => void) \| undefined` | See type | no | — | Called after the clear button or Escape empties the field. |
| onRevealedChange | `((revealed: boolean) => void) \| undefined` | See type | no | — | Called when revealed change occurs. The callback type specifies its arguments. |
| openable | `boolean \| undefined` | false, true | no | — | An "Open in a new tab" button while the value is a valid URL (default true). |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| requireTld | `boolean \| undefined` | false, true | no | — | Require a host with a dot or "localhost" (default true): rejects "https://intranet". |
| revealed | `boolean \| undefined` | false, true | no | — | Password boxes: whether the value shows as text. Leave unset for the box's own toggle. |
| schemes | `readonly string[] \| undefined` | See type | no | — | Schemes accepted, without the colon. Default ["https", "http"]. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard hint shown while the field is empty and unfocused ("mod+k" → ⌘K / Ctrl K). |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| trailing | `ReactNode` | See type | no | — | Any other trailing content (a status, a small action). |
| unit | `ReactNode` | See type | no | — | Unit after the value ("GB", "ms", "%"). |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |
| warnInsecure | `boolean \| undefined` | false, true | no | — | Say so in the hint when the address is http:// (default true when https is allowed). |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
