# WindowScopeChip

The scope chip in a window's app bar: the organisation's avatar and name, shown only when
the window belongs to a scope other than the current one. Narrow windows keep the avatar,
and the tooltip names it. Part of the app bar's drag surface, like the title.

When the scope has a `chip` (WindowScopeInfo), that is drawn instead of the pill, and
`icon` replaces it in a narrow window.

`import { WindowScopeChip } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window-scope-chip)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| scope | `string \| null` | See type | yes | — | The window's scope id (`WindowEntry.scope`), or null for an unscoped window, which shows no chip. |
