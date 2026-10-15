# ButtonLink

A button-styled link with native navigation and open-in-new-tab behaviour.

`import { ButtonLink } from "glass-ux/button-link"`

[Live examples](https://dastari.github.io/glass-ux/components/button-link)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| block | `boolean \| undefined` | false, true | no | false | Stretch to the container width. |
| children | `ReactNode` | See type | yes | — | Visible link label. |
| icon | `ReactNode` | See type | no | — | Leading icon, automatically sized. |
| iconEnd | `ReactNode` | See type | no | — | Trailing icon, automatically sized. |
| render | `ReactElement<Record<string, unknown>, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | Router-owned anchor. Routing props, styles, ref and event handlers are preserved. |
| size | `ButtonSize \| undefined` | "xs", "sm", "md", "lg" | no | "md" | Shared control height and insets. Default: md. |
| variant | `ButtonVariant \| undefined` | "danger", "warning", "success", "primary", "secondary", "ghost", "soft", "danger-soft", "success-soft", "warning-soft" | no | "secondary" | Shared Button appearance. Default: secondary. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
