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

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
