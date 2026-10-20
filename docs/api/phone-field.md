# PhoneField

PhoneInput bound to a string form field (E.164). Pair it with `phoneSchema()`.

`import { PhoneField } from "glass-ux/phone-field"`

[Live examples](https://dastari.github.io/glass-ux/components/phone-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| copyable | `boolean \| undefined` | false, true | no | — | A copy button for the E.164 value while it is valid. Default true. |
| countries | `readonly string[] \| undefined` | See type | no | — | Only these countries in the picker. |
| defaultCountry | `string \| undefined` | See type | no | — | The country of national numbers until the person picks another: the workspace's own. Default "AU". |
| display | `PhoneDisplay \| undefined` | "national", "international" | no | — | How the number shows once focus leaves: national "0412 345 678" (default) or international "+61 412 345 678". |
| extension | `boolean \| undefined` | false, true | no | — | An extension box for desk phones ("ext. 204"). Default false. |
| flags | `boolean \| undefined` | false, true | no | — | Flags in the picker and the box (SVG, lazy). Default true. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| kind | `PhoneKind \| undefined` | "any", "mobile" | no | — | Mobile numbers only (placeholder and icon; MobileField and mobileSchema check the type). |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| priority | `readonly string[] \| undefined` | See type | no | — | Countries listed first in the picker. Default: the default country, then AU and NZ. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| size | `"sm" \| "md" \| "lg" \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width (R15.6). Default medium. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. Takes precedence over the `disabled` prop on the `<Field.Control>` component. |
