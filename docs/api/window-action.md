# WindowAction

One window action with a priority (see the module comment). Outside `Window.Actions` or a
frame's `actions` it renders its children as they are.

`import { WindowAction } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window-action)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The action as it shows in the app bar: a ghost sm Button, a Segmented, a Menu trigger. |
| disabled | `boolean \| undefined` | false, true | no | — | The More menu item is disabled. |
| icon | `ReactNode` | See type | no | — | The item's icon in the More menu. |
| label | `string` | See type | yes | — | Names the action as an item in the More menu once it has folded away. |
| menu | `ReactNode` | See type | no | — | The action's own content for the More menu, in place of one item: a submenu (`Menu.Submenu`) for an action that opens a menu, radio items for a Segmented choice. |
| onSelect | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person chooses the action from the More menu. |
| priority | `WindowActionPriority \| undefined` | "primary", "secondary" | no | "secondary" | `secondary` (the default) folds into the More menu when the app bar runs out of room, the last ones first; `primary` always stays in the bar. |
