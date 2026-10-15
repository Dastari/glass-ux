# CopyButton

Copies a value and confirms in place: the icon becomes a drawn ✓ for the feedback hold,
or ✕ when the clipboard refuses (R9.2), and a polite announcement says "Copied". The
button keeps its size throughout. Inside an Input's box, give it `className="fa-input-btn"`.

`import { CopyButton } from "glass-ux/copy-button"`

[Live examples](https://dastari.github.io/glass-ux/components/copy-button)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| block | `boolean \| undefined` | false, true | no | — | Stretch to the container width. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| disabledReason | `string \| undefined` | See type | no | — | Why the button is disabled (R12.3). Keeps the button focusable (aria-disabled) so the reason is reachable by hover, focus and screen readers. |
| errorLabel | `ReactNode` | See type | no | — | Label shown after a failed action. Use onError to explain the failure. |
| iconEnd | `ReactNode` | See type | no | — | Trailing icon (chevrons, external-link). |
| label | `string \| undefined` | See type | no | "Copy" | Names what is copied: "Copy IP address". Also its tooltip. Default "Copy". |
| pendingLabel | `ReactNode` | See type | no | — | Label shown while the asynchronous action runs. Its width is reserved with the other feedback labels. |
| shape | `"circle" \| "default" \| undefined` | "circle", "default" | no | — | Circular instead of the control radius (send buttons, avatars-as-buttons). |
| shortcut | `string \| undefined` | See type | no | — | Keyboard shortcut shown in the tooltip, e.g. "mod+k". |
| showLabel | `boolean \| undefined` | false, true | no | false | Show the label beside the icon (default: icon only, with the label as its tooltip). |
| size | `ButtonSize \| undefined` | "xs", "sm", "md", "lg" | no | "sm" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| successLabel | `ReactNode` | See type | no | — | Label shown after a successful action before returning to the resting state. |
| tooltip | `ReactNode` | See type | no | — | Tooltip content. Icon-only buttons always get a tooltip (R20.7): this prop overrides the default, which is the button's aria-label. Pass `false` only when a visible label sits right next to the button. |
| value | `string \| (() => string)` | See type | yes | — | The text to copy, or a function that returns it when pressed. |
| variant | `ButtonVariant \| undefined` | "danger", "warning", "success", "primary", "secondary", "ghost", "soft", "danger-soft", "success-soft", "warning-soft" | no | "ghost" | The named visual variant. It is rendered as a data attribute and styled through shared tokens. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
