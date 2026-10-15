# WindowScopeProvider

Everything in the workspace is a window: tiled, floating, snapped, maximised, minimised to the dock or popped out.

`import { WindowScopeProvider } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window-scope-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| value | `WindowScopes \| null \| undefined` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
