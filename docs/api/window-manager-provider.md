# WindowManagerProvider

Provide a window manager to the tree and connect it (load the persisted layout, join
cross-tab sync) before the first paint after hydration.

`import { WindowManagerProvider } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window-manager-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| manager | `WindowManager` | See type | yes | — | The store from `createWindowManager`. Create it once (module scope or a ref); a new instance reconnects. |
