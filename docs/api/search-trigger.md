# SearchTrigger

The command search field. A button that looks like a field: it opens the palette.

`import { SearchTrigger } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/search-trigger)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| onOpen | `() => void` | See type | yes | — | Called when the person clicks the trigger or presses `shortcut` anywhere (unless a palette host already handled the key); open the command palette here. |
| placeholder | `string \| undefined` | See type | no | "Search…" | The prompt shown while the value is empty. It does not replace the field’s label. |
| shortcut | `string \| undefined` | See type | no | "mod+k" | Opens from anywhere (R11.5). Default mod+k. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
