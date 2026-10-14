# PhoneInput

A phone number with its country. The country picker (flag, ISO code, +calling code, search
by any of them) sets how national numbers are read; typing or pasting an international
number ("+64 21 123 4567", "0011 64…") switches it. The value is E.164; the box shows the
number in national or international form once focus leaves, never reformatting under the
caret. libphonenumber-js loads with the first phone control.

`import { PhoneInput } from "glass-ux/phone-field"`

[Live examples](https://dastari.github.io/glass-ux/components/phone-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| copyable | `boolean \| undefined` | false, true | no | true | A copy button for the E.164 value while it is valid. Default true. |
| countries | `readonly string[] \| undefined` | See type | no | — | Only these countries in the picker. |
| defaultCountry | `string \| undefined` | See type | no | "AU" | The country of national numbers until the person picks another: the workspace's own. Default "AU". |
| defaultValue | `string \| undefined` | See type | no | "" | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| display | `PhoneDisplay \| undefined` | "national", "international" | no | "national" | How the number shows once focus leaves: national "0412 345 678" (default) or international "+61 412 345 678". |
| extension | `boolean \| undefined` | false, true | no | false | An extension box for desk phones ("ext. 204"). Default false. |
| flags | `boolean \| undefined` | false, true | no | true | Flags in the picker and the box (SVG, lazy). Default true. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Marks the control invalid. Pair it with an accessible validation message. |
| kind | `PhoneKind \| undefined` | "mobile", "any" | no | "any" | Mobile numbers only (placeholder and icon; MobileField and mobileSchema check the type). |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when blur occurs. The callback type specifies its arguments. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| priority | `readonly string[] \| undefined` | See type | no | — | Countries listed first in the picker. Default: the default country, then AU and NZ. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| size | `"sm" \| "md" \| "lg" \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| value | `string \| undefined` | See type | no | — | E.164 ("+61412345678"), with ";ext=204" for an extension. While the text cannot be read, the text as typed. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | "medium" | Content width (R15.6). Default medium. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
