# WindowManagerProvider

Provide a window manager to the tree and connect it (load the persisted layout, join
cross-tab sync) before the first paint after hydration.

`import { WindowManagerProvider } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window-manager-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| manager | `WindowManager` | See type | yes | — | Window manager that owns descriptors, focus, layout and persistence. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
