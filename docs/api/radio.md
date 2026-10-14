# Radio

One option of a RadioGroup. The chosen circle fills with the accent around a dot.

`import { Radio } from "glass-ux/radio"`

[Live examples](https://dastari.github.io/glass-ux/components/radio)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| description | `ReactNode` | false, true | no | — | Additional content describing the value, state, or consequence. |
| label | `ReactNode` | false, true | no | — | Label beside the circle. |
| size | `ChoiceSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| tone | `ChoiceTone \| undefined` | "danger", "warning", "success", "accent" | no | — | The semantic tone. Use danger and warning for consequences and states. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
