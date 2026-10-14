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
| description | `ReactNode` | false, true | no | — | Second line: what turning it on does. |
| icons | `boolean \| undefined` | false, true | no | — | ✓ / ✕ inside the bead (md and lg). |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| label | `ReactNode` | false, true | no | — | Label beside the switch. Omit when a Field (or an aria-label) names it. |
| size | `ChoiceSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| tone | `ChoiceTone \| undefined` | "danger", "warning", "success", "accent" | no | — | The "on" colour. Status tones only when the setting itself is a status (R3.3). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
