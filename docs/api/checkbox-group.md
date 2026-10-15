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

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
