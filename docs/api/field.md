# Field

Field namespace: `<Field label …>` plus the parts for custom layouts.

`import { Field } from "glass-ux/field"`

[Live examples](https://dastari.github.io/glass-ux/components/field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aside | `ReactNode` | false, true | no | — | Right side of the label row: a live value readout or a small link. |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| counter | `FieldCounter \| undefined` | See type | no | — | Right side of the message line: `{ value: 70, max: 500 }` renders "70 / 500". |
| description | `ReactNode` | false, true | no | — | Second line under the label in a horizontal field ("Automatically download…"). |
| error | `ReactNode` | false, true | no | — | Replaces the hint in place. Setting it marks the field and its control invalid. |
| hint | `ReactNode` | false, true | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| label | `ReactNode` | false, true | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| legend | `ReactNode` | false, true | no | — | A heading above a horizontal field ("Auto-updates"). Renders a fieldset legend. |
| message | `"auto" \| "reserve" \| undefined` | "auto", "reserve" | no | — | reserve: the message line always exists (default for vertical fields), so an error never moves anything (R9.1). auto: only rendered when there is a hint, error or counter. |
| nativeLabel | `boolean \| undefined` | false, true | no | true | Render the label as a native <label>. Set false for trigger controls (select, combobox trigger, slider, segmented) so clicking the label focuses instead of activating. |
| optional | `boolean \| undefined` | false, true | no | false | Marks the label "Optional". Prefer this over marking required fields. |
| orientation | `FieldOrientation \| undefined` | "horizontal", "vertical" | no | "vertical" | vertical: label above the control (text fields, selects). horizontal: control first, label and description beside it (switches, checkboxes). |
| required | `boolean \| undefined` | false, true | no | false | Shows the required marker. Pass `required` to the control as well. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
