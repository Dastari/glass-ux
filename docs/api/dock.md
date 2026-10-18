# Dock

The strip of open windows, grouped by scope when a `WindowScopeProvider` is present.
Clicking an item focuses, restores or minimises its window; a middle click closes it.
Renders nothing while no windows are open.

`import { Dock } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/dock)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| onOpenSwitcher | `(() => void) \| undefined` | See type | no | — | Called when the person presses the "All windows" button; open the `WindowSwitcher` here. The button is shown only when this is supplied. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
