# ActionProvider

Supplies the services every action runs with — navigation, toasts, windows and the
confirm dialog — and mounts the toast viewport and confirm host they need. Mount once at
the app root, inside the router.

A nested ActionProvider mounts nothing: it inherits the outer services and overrides only
what it is given. A layout that owns a window manager wires `openWindow` this way.

`import { ActionProvider } from "glass-ux/actions"`

[Live examples](https://dastari.github.io/glass-ux/components/action-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| navigate | `((to: string) => void) \| undefined` | See type | no | — | Override navigation (tests, stories). Default: TanStack Router. |
| openWindow | `((kind: string, params: Record<string, string>) => void) \| undefined` | See type | no | — | Application callback opening a serialisable view in a managed window. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
