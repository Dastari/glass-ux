# CheckboxGroup

Several related checkboxes sharing one value array. A checkbox with `parent` ticks or
clears the rest and shows the mixed state when only some are ticked (pass `allValues`).

`import { CheckboxGroup } from "glass-ux/checkbox"`

[Live examples](https://dastari.github.io/glass-ux/components/checkbox-group)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| legend | `ReactNode` | See type | no | — | Names the group (rendered as a fieldset legend in the field-label style). |
| orientation | `"horizontal" \| "vertical" \| undefined` | "horizontal", "vertical" | no | "vertical" | Direction of layout and keyboard navigation. |
| tone | `ChoiceTone \| undefined` | "danger", "warning", "success", "accent" | no | — | Tone for every checkbox in the group. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| allValues | `string[] \| undefined` | See type | no | — | Names of all checkboxes in the group. Use this when creating a parent checkbox. |
| defaultValue | `string[] \| undefined` | See type | no | — | Names of the checkboxes in the group that should be initially ticked.  To render a controlled checkbox group, use the `value` prop instead. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| onValueChange | `((value: string[], eventDetails: CheckboxGroupChangeEventDetails) => void) \| undefined` | See type | no | — | Event handler called when a checkbox in the group is ticked or unticked. Provides the new value as an argument. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").CheckboxGroupState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `string[] \| undefined` | See type | no | — | Names of the checkboxes in the group that should be ticked.  To render an uncontrolled checkbox group, use the `defaultValue` prop instead. |

Also accepts the element’s standard HTML attributes and React DOM events.
