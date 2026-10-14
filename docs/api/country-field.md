# CountryField

CountrySelect bound to a `string | null` form field (ISO code). Pair it with `countrySchema()`.

`import { CountryField } from "glass-ux/country-select"`

[Live examples](https://dastari.github.io/glass-ux/components/country-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aside | `ReactNode` | false, true | no | — | Right side of the label row: a live value readout or a small link. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| countries | `readonly string[] \| undefined` | See type | no | — | Only these ISO codes. |
| empty | `((query: string) => ReactNode) \| undefined` | See type | no | — | Text for the empty row. Default: No matches for “query”. |
| flags | `boolean \| undefined` | false, true | no | — | Flags beside the names (SVG, lazy; never emoji). Default true. |
| hint | `ReactNode` | false, true | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `ReactNode` | false, true | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| locale | `string \| undefined` | See type | no | — | Names in this locale. Default en-AU. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| priority | `readonly string[] \| undefined` | See type | no | — | Codes listed first, in this order: the workspace's own country, then its neighbours. Default ["AU", "NZ"]. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| size | `SelectSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | "medium" | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
