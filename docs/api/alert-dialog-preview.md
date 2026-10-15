# AlertDialogPreview

The alert surface in the page flow, for documentation. Real parts, non-modal.

`import { AlertDialogPreview } from "glass-ux/alert-dialog"`

[Live examples](https://dastari.github.io/glass-ux/components/alert-dialog-preview)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| cancelLabel | `string \| undefined` | See type | no | "Cancel" | Visible label for cancelling or dismissing the request. |
| confirmLabel | `string` | See type | yes | — | Visible label naming the outcome of the confirmation. |
| description | `ReactNode` | See type | no | — | Additional content describing the value, state, or consequence. |
| pendingLabel | `string \| undefined` | See type | no | — | Label shown while the asynchronous action runs. Its width is reserved with the other feedback labels. |
| status | `ButtonStatus \| undefined` | "idle", "pending", "success", "error" | no | "idle" | Current operation or connection status. |
| title | `ReactNode` | See type | yes | — | The heading or title content. |
| tone | `AlertTone \| undefined` | "danger", "warning", "default" | no | "danger" | The semantic tone. Use danger and warning for consequences and states. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
