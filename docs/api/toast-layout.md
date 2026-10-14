# ToastLayout

The inside of a toast. Shared by live toasts and the static preview.

`import { ToastLayout } from "glass-ux/toast"`

[Live examples](https://dastari.github.io/glass-ux/components/toast-layout)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| action | `ReactNode` | false, true | no | — | Trailing action for a notice or result. |
| close | `ReactNode` | false, true | yes | — | Closes the current overlay or view. |
| description | `ReactNode` | false, true | no | — | Additional content describing the value, state, or consequence. |
| title | `ReactNode` | false, true | yes | — | The heading or title content. |
| tone | `ToastTone` | "danger", "warning", "success", "info" | yes | — | The semantic tone. Use danger and warning for consequences and states. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
