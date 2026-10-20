# ActionBar

The entity header's actions (R12.1): the top-priority actions as buttons, the primary
right-most, the rest under "More actions ▾". It adapts to its container, not the
viewport: as the space narrows, buttons move into the More menu (lowest priority
first), More becomes ⋯, and at the narrowest everything collapses into a single ⋯
menu (R21.2). The bar is right-aligned and one control tall at every level, so the
primary never moves and nothing around it shifts.

`import { ActionBar } from "glass-ux/actions"`

[Live examples](https://dastari.github.io/glass-ux/components/action-bar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| available | `number \| undefined` | See type | no | — | The room the bar may use, when its container decides it: an entity header, where the name and facts keep their width first. The bar then folds buttons into More to fit and is only as wide as what it shows, so the room it leaves stays with its neighbours. Omitted, the bar measures its own box and asks for room for every button. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| label | `string` | See type | yes | — | The target's name, for accessible names: "More actions for NST-C106". |
| maxButtons | `number \| undefined` | See type | no | 3 | Most buttons to promote when there is room (the primary included). |
| onLevelChange | `((level: ActionBarLevel, count: number) => void) \| undefined` | See type | no | — | Report the current level (tests, stories). |
| set | `ActionSet<T>` | See type | yes | — | Shared action definitions used by menus, headers and the command palette. |
| targets | `readonly T[]` | See type | yes | — | Selected entities passed to action visibility, enablement, confirmation and execution. |
