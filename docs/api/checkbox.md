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
| description | `ReactNode` | false, true | no | — | Second line under the label. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| label | `ReactNode` | false, true | no | — | Label beside the box. Omit when a Field (or an aria-label) names it. |
| size | `ChoiceSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| tone | `ChoiceTone \| undefined` | "danger", "warning", "success", "accent" | no | — | The ticked colour. Status tones only when the choice is a status (R3.3). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
