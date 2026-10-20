# ActionMenuItems

The rows of an action menu: groups in the fixed order (R12.2), set apart by space, with
one hairline before the destructive group. Shared by ActionMenu, ActionContextMenu and
the ActionBar's overflow so they can never differ.

`import { ActionMenuItems } from "glass-ux/actions"`

[Live examples](https://dastari.github.io/glass-ux/components/action-menu-items)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| groups | `ResolvedGroup<T>[]` | See type | yes | — | Action groups in display order. |
| onRun | `ActionRunHandler<T> \| undefined` | See type | no | — | Run chosen actions yourself instead of with the shared runner (confirm → run → toast). The handler then owns confirmation and feedback. A DataTable's `onAction` uses it. |
| surface | `ActionSurface` | "header", "menu", "context", "palette", "bulk" | yes | — | The surface the actions report as (menu, context, palette, bulk). |
| targets | `readonly T[]` | See type | yes | — | Selected entities passed to action visibility, enablement, confirmation and execution. |
