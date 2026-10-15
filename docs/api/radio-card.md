# RadioCard

A radio as a tile: title, description and the radio circle. Used where each option
needs a sentence, typically in a dialog ("Interactive session · View and control the
device"). Chosen = accent-soft fill with an accent edge.

`import { RadioCard } from "glass-ux/radio"`

[Live examples](https://dastari.github.io/glass-ux/components/radio-card)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| description | `ReactNode` | See type | no | — | One line that says what choosing this does ("View and control the device"). |
| icon | `ReactNode` | See type | no | — | Optional icon tile. Pass the icon without a size. |
| title | `ReactNode` | See type | yes | — | The heading or title content. |
| tone | `ChoiceTone \| undefined` | "danger", "warning", "success", "accent" | no | — | The semantic tone. Use danger and warning for consequences and states. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
