# WindowSwitcher

Phones: every open window in a bottom sheet, plus the routed view.

`import { WindowSwitcher } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window-switcher)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| onOpenChange | `(open: boolean) => void` | See type | yes | — | Called when open change occurs. The callback type specifies its arguments. |
| open | `boolean` | false, true | yes | — | Controls whether the overlay is open. |
| primaryLabel | `string \| undefined` | See type | no | "Current page" | Visible label for the primary action. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
