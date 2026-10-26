# Radio

One option of a RadioGroup. The chosen circle fills with the accent around a dot.
Each option is its own Field item, so inside a Field every radio keeps its own id and name.

`import { Radio } from "glass-ux/radio"`

[Live examples](https://dastari.github.io/glass-ux/components/radio)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| description | `ReactNode` | See type | no | — | Additional content describing the value, state, or consequence. |
| label | `ReactNode` | See type | no | — | Label beside the circle. |
| size | `ChoiceSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| tone | `ChoiceTone \| undefined` | "danger", "warning", "success", "accent" | no | — | The semantic tone. Use danger and warning for consequences and states. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| inputRef | `React.Ref<HTMLInputElement> \| undefined` | See type | no | — | A ref to access the hidden input element. |
| readOnly | `boolean \| undefined` | false, true | no | — | Whether the user should be unable to select the radio button. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| required | `boolean \| undefined` | false, true | no | — | Whether the user must choose a value before submitting a form. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").RadioRootState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `V` | See type | yes | — | The unique identifying value of the radio in a group. |

Also accepts the element’s standard HTML attributes and React DOM events.
