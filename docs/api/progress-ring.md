# ProgressRing

A compact circular progress for inline and icon-sized spots. `lg` prints the percentage.

`import { ProgressRing } from "glass-ux/progress"`

[Live examples](https://dastari.github.io/glass-ux/components/progress-ring)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Accessible name, e.g. "Uploading install.log". |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| max | `number \| undefined` | See type | no | 100 | Upper value or visible-item limit, as specified by the type. |
| size | `ProgressRingSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| tone | `ProgressTone \| undefined` | "danger", "success", "accent" | no | "accent" | The semantic tone. Use danger and warning for consequences and states. |
| value | `number \| null` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |
