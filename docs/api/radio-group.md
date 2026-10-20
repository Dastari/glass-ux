# RadioGroup

One choice from a few visible options. Arrow keys move and select; Tab leaves the group.

`import { RadioGroup } from "glass-ux/radio"`

[Live examples](https://dastari.github.io/glass-ux/components/radio-group)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| legend | `ReactNode` | See type | no | — | Names the group (a fieldset legend in the field-label style). |
| orientation | `"horizontal" \| "vertical" \| undefined` | "horizontal", "vertical" | no | "vertical" | Direction of layout and keyboard navigation. |
| tone | `ChoiceTone \| undefined` | "danger", "warning", "success", "accent" | no | — | Tone for every option in the group. |
| variant | `"list" \| "cards" \| undefined` | "list", "cards" | no | "list" | list: rows of radios. cards: RadioCard tiles that reflow by container width. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultValue | `V \| undefined` | See type | no | — | The uncontrolled value of the radio button that should be initially selected.  To render a controlled radio group, use the `value` prop instead. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| form | `string \| undefined` | See type | no | — | Identifies the form that owns the radio inputs. Useful when the radio group is rendered outside the form. |
| inputRef | `React.Ref<HTMLInputElement> \| undefined` | See type | no | — | A ref to access the hidden input element. |
| name | `string \| undefined` | See type | no | — | Identifies the field when a form is submitted. |
| onValueChange | `((value: V, eventDetails: RadioGroup.ChangeEventDetails) => void) \| undefined` | See type | no | — | Callback fired when the value changes. |
| readOnly | `boolean \| undefined` | false, true | no | — | Whether the user should be unable to select a different radio button in the group. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| required | `boolean \| undefined` | false, true | no | — | Whether the user must choose a value before submitting a form. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").RadioGroupState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `V \| undefined` | See type | no | — | The controlled value of the radio item that should be currently selected.  To render an uncontrolled radio group, use the `defaultValue` prop instead. |

Also accepts the element’s standard HTML attributes and React DOM events.
