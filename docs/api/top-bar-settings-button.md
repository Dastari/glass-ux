# TopBarSettingsButton

The product's settings (Glass UX settings: the workspace dialog), an application-level gear.
Spreads props on the button, so it can open a dialog or be a link.

`import { TopBarSettingsButton } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/top-bar-settings-button)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| block | `boolean \| undefined` | false, true | no | — | Stretch to the container width. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| disabledReason | `string \| undefined` | See type | no | — | Why the button is disabled (R12.3). Keeps the button focusable (aria-disabled) so the reason is reachable by hover, focus and screen readers. |
| errorLabel | `ReactNode` | See type | no | — | Label shown after a failed action. Use onError to explain the failure. |
| iconEnd | `ReactNode` | See type | no | — | Trailing icon (chevrons, external-link). |
| label | `string` | See type | yes | — | The visible or accessible label for this component. |
| pendingLabel | `ReactNode` | See type | no | — | Label shown while the asynchronous action runs. Its width is reserved with the other feedback labels. |
| shape | `"circle" \| "default" \| undefined` | "circle", "default" | no | — | Circular instead of the control radius (send buttons, avatars-as-buttons). |
| shortcut | `string \| undefined` | See type | no | — | Keyboard shortcut shown in the tooltip, e.g. "mod+k". |
| size | `ButtonSize \| undefined` | "xs", "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| status | `ButtonStatus \| undefined` | "idle", "pending", "success", "error" | no | — | Opt in to in-place feedback. The button reserves the width of its widest face, so moving between idle → pending → success/error never moves anything around it. |
| successLabel | `ReactNode` | See type | no | — | Label shown after a successful action before returning to the resting state. |
| tooltip | `ReactNode` | See type | no | — | Tooltip content. Icon-only buttons always get a tooltip (R20.7): this prop overrides the default, which is the button's aria-label. Pass `false` only when a visible label sits right next to the button. |
| variant | `ButtonVariant \| undefined` | "danger", "warning", "success", "primary", "secondary", "ghost", "soft", "danger-soft", "success-soft", "warning-soft" | no | — | The named visual variant. It is rendered as a data attribute and styled through shared tokens. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
