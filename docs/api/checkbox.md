# Checkbox

A box that is ticked, unticked or mixed. Ticking fills it with the accent and draws the
✓ on the spring curve. Give it a `label` for a stand-alone row, or put it in a
horizontal Field for a label, description and message line.

`import { Checkbox } from "glass-ux/checkbox"`

[Live examples](https://dastari.github.io/glass-ux/components/checkbox)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| description | `ReactNode` | See type | no | — | Second line under the label. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| label | `ReactNode` | See type | no | — | Label beside the box. Omit when a Field (or an aria-label) names it. |
| size | `ChoiceSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| tone | `ChoiceTone \| undefined` | "danger", "warning", "success", "accent" | no | — | The ticked colour. Status tones only when the choice is a status (R3.3). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| checked | `boolean \| undefined` | false, true | no | — | Whether the checkbox is currently ticked.  To render an uncontrolled checkbox, use the `defaultChecked` prop instead. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| defaultChecked | `boolean \| undefined` | false, true | no | — | Whether the checkbox is initially ticked.  To render a controlled checkbox, use the `checked` prop instead. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| form | `string \| undefined` | See type | no | — | Identifies the form that owns the hidden input. Useful when the checkbox is rendered outside the form. |
| id | `string \| undefined` | See type | no | — | The id of the input element. |
| indeterminate | `boolean \| undefined` | false, true | no | — | Whether the checkbox is in a mixed state: neither ticked, nor unticked. |
| inputRef | `React.Ref<HTMLInputElement> \| undefined` | See type | no | — | A ref to access the hidden `<input>` element. |
| name | `string \| undefined` | See type | no | — | Identifies the field when a form is submitted. |
| onCheckedChange | `((checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => void) \| undefined` | See type | no | — | Event handler called when the checkbox is ticked or unticked. |
| parent | `boolean \| undefined` | false, true | no | — | Whether the checkbox controls a group of child checkboxes.  Must be used in a [Checkbox Group](https://base-ui.com/react/components/checkbox-group). |
| readOnly | `boolean \| undefined` | false, true | no | — | Whether the user should be unable to tick or untick the checkbox. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| required | `boolean \| undefined` | false, true | no | — | Whether the user must tick the checkbox before submitting a form. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").CheckboxRootState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| uncheckedValue | `string \| undefined` | See type | no | — | The value submitted with the form when the checkbox is unchecked. By default, unchecked checkboxes do not submit any value, matching native checkbox behavior. |
| value | `string \| undefined` | See type | no | — | The checkbox's value. Identifies it within a [Checkbox Group](https://base-ui.com/react/components/checkbox-group), falling back to `name` when omitted. When submitting a form, a checked box submits `value`; with no `value`, it submits the native "on". |

Also accepts the element’s standard HTML attributes and React DOM events.
