# TimeZoneSelect

Choose an IANA time zone by typing a city or region ("hobart", "new york"). Each row shows the
zone's abbreviation and offset now, so daylight saving is visible. The value is the IANA name.

`import { TimeZoneSelect } from "glass-ux/time-zone-select"`

[Live examples](https://dastari.github.io/glass-ux/components/time-zone-select)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the control box. |
| defaultValue | `string \| null \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| empty | `((query: string) => ReactNode) \| undefined` | See type | no | — | Text for the empty row. Default: No matches for “query”. |
| icon | `ReactNode` | See type | no | — | Leading icon. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Marks the control invalid. Pair it with an accessible validation message. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for zone abbreviations and the local time. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when the text input loses focus, so a form can mark the field touched. |
| onValueChange | `((value: string \| null) => void) \| undefined` | See type | no | — | Called with the chosen option's value when one is picked, or null when the selection is cleared. Typing alone does not call it. Pair with `value` to control it; use `defaultValue` otherwise. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| size | `SelectSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| suggested | `readonly string[] \| undefined` | See type | no | — | Zones listed first under "Suggested". Default: this browser's zone and UTC. |
| value | `string \| null \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |
| zones | `readonly string[] \| undefined` | See type | no | — | Only these zones. |
