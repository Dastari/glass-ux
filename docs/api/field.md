# Field

Field namespace: `<Field label …>` plus the parts for custom layouts.

`import { Field } from "glass-ux/field"`

[Live examples](https://dastari.github.io/glass-ux/components/field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| counter | `FieldCounter \| undefined` | See type | no | — | Right side of the message line: `{ value: 70, max: 500 }` renders "70 / 500". |
| description | `ReactNode` | See type | no | — | Second line under the label in a horizontal field ("Automatically download…"). |
| error | `ReactNode` | See type | no | — | Replaces the hint in place. Setting it marks the field and its control invalid. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| legend | `ReactNode` | See type | no | — | A heading above a horizontal field ("Auto-updates"). Renders a fieldset legend. |
| message | `"auto" \| "reserve" \| undefined` | "auto", "reserve" | no | — | reserve: the message line always exists (default for vertical fields), so an error never moves anything (R9.1). auto: only rendered when there is a hint, error or counter. |
| nativeLabel | `boolean \| undefined` | false, true | no | true | Render the label as a native <label>. Set false for trigger controls (select, combobox trigger, slider, segmented) so clicking the label focuses instead of activating. |
| optional | `boolean \| undefined` | false, true | no | false | Marks the label "Optional". Prefer this over marking required fields. |
| orientation | `FieldOrientation \| undefined` | "horizontal", "vertical" | no | "vertical" | vertical: label above the control (text fields, selects). horizontal: control first, label and description beside it (switches, checkboxes). |
| required | `boolean \| undefined` | false, true | no | false | Shows the required marker. Pass `required` to the control as well. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actionsRef | `React.RefObject<FieldRootActions \| null> \| undefined` | See type | no | — | A ref to imperative actions. - `validate`: Validates the field when called. |
| dirty | `boolean \| undefined` | false, true | no | — | Whether the field's value has been changed from its initial value. Useful when the field state is controlled by an external library. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. Takes precedence over the `disabled` prop on the `<Field.Control>` component. |
| invalid | `boolean \| undefined` | false, true | no | — | Whether the field is invalid. Useful when the field state is controlled by an external library. |
| name | `string \| undefined` | See type | no | — | Identifies the field when a form is submitted. Takes precedence over the `name` prop on the `<Field.Control>` component. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").FieldRootState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| touched | `boolean \| undefined` | false, true | no | — | Whether the field has been touched. Useful when the field state is controlled by an external library. |
| validate | `((value: unknown, formValues: Form.Values) => string \| string[] \| null \| void \| Promise<string \| string[] \| null \| void>) \| undefined` | See type | no | — | A function for custom validation. Return a string or an array of strings with the error message(s) if the value is invalid. Returning nothing, `null`, an empty string, or an empty array means the value is valid. Asynchronous functions are supported, but they do not prevent form submission when using `validationMode="onSubmit"`. |
| validationDebounceTime | `number \| undefined` | See type | no | — | How long to wait between `validate` callbacks if `validationMode="onChange"` is used. Specified in milliseconds. |
| validationMode | `import("../../form/Form.mjs").FormValidationMode \| undefined` | "onBlur", "onChange", "onSubmit" | no | — | Determines when the field should be validated. This takes precedence over the `validationMode` prop on `<Form>`.  - `onSubmit`: triggers validation when the form is submitted, and re-validates on change after submission. - `onBlur`: triggers validation when the control loses focus. - `onChange`: triggers validation on every change to the control value. |

Also accepts the element’s standard HTML attributes and React DOM events.
