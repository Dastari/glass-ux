# ToastPreview

A static toast for documentation. Same classes and layout, no timers.

`import { ToastPreview } from "glass-ux/toast"`

[Live examples](https://dastari.github.io/glass-ux/components/toast-preview)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| action | `string \| undefined` | See type | no | — | Label of the toast's action button, drawn inert; omit for a toast without an action. |
| description | `string \| undefined` | See type | no | — | Additional content describing the value, state, or consequence. |
| title | `string` | See type | yes | — | The heading or title content. |
| tone | `ToastTone \| undefined` | "danger", "warning", "success", "info" | no | "info" | The semantic tone. Use danger and warning for consequences and states. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
