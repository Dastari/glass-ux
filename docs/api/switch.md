# Switch

On or off, applied immediately. The track takes the accent when on and the glass thumb
travels on the spring curve. Use a Checkbox instead when the choice only applies after
a Save.

`import { Switch } from "glass-ux/switch"`

[Live examples](https://dastari.github.io/glass-ux/components/switch)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| description | `ReactNode` | See type | no | — | Second line: what turning it on does. |
| icons | `boolean \| undefined` | false, true | no | — | ✓ / ✕ inside the bead (md and lg). |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| label | `ReactNode` | See type | no | — | Label beside the switch. Omit when a Field (or an aria-label) names it. |
| size | `ChoiceSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| tone | `ChoiceTone \| undefined` | "danger", "warning", "success", "accent" | no | — | The "on" colour. Status tones only when the setting itself is a status (R3.3). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| checked | `boolean \| undefined` | false, true | no | — | Whether the switch is currently active.  To render an uncontrolled switch, use the `defaultChecked` prop instead. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| defaultChecked | `boolean \| undefined` | false, true | no | — | Whether the switch is initially active.  To render a controlled switch, use the `checked` prop instead. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| form | `string \| undefined` | See type | no | — | Identifies the form that owns the hidden input. Useful when the switch is rendered outside the form. |
| id | `string \| undefined` | See type | no | — | The id of the hidden input element.  When `nativeButton` is `true`, the id is applied to the root element. |
| inputRef | `React.Ref<HTMLInputElement> \| undefined` | See type | no | — | A ref to access the hidden `<input>` element. |
| name | `string \| undefined` | See type | no | — | Identifies the field when a form is submitted. |
| onCheckedChange | `((checked: boolean, eventDetails: SwitchRoot.ChangeEventDetails) => void) \| undefined` | See type | no | — | Event handler called when the switch is activated or deactivated. |
| readOnly | `boolean \| undefined` | false, true | no | — | Whether the user should be unable to activate or deactivate the switch. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| required | `boolean \| undefined` | false, true | no | — | Whether the user must activate the switch before submitting a form. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").SwitchRootState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| uncheckedValue | `string \| undefined` | See type | no | — | The value submitted with the form when the switch is off. By default, unchecked switches do not submit any value, matching native checkbox behavior. |
| value | `string \| undefined` | See type | no | — | The value submitted with the form when the switch is on. By default, switch submits the "on" value, matching native checkbox behavior. |

Also accepts the element’s standard HTML attributes and React DOM events.
